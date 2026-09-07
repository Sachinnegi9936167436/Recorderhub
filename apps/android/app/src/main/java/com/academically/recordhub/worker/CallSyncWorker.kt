package com.academically.recordhub.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.local.CallEventEntity
import com.academically.recordhub.data.remote.BatchSyncRequest
import com.academically.recordhub.data.remote.CallEventDto
import com.academically.recordhub.data.remote.RecordHubApi
import com.academically.recordhub.data.remote.UploadInitiateRequest
import com.academically.recordhub.utils.AppLogManager
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class CallSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    override suspend fun doWork(): Result {
        try {
            com.academically.recordhub.utils.CallLogScanner.scanRecentCallLogs(applicationContext)
        } catch (e: Exception) {
            Log.w("CallSyncWorker", "Error pre-scanning call logs: ${e.message}")
        }

        val db = AppDatabase.getInstance(applicationContext)
        val pendingEvents = db.callEventDao().getPendingSyncAndRecordingEvents()

        if (pendingEvents.isEmpty()) {
            Log.d("CallSyncWorker", "No pending call events or audio recordings to sync.")
            return Result.success()
        }

        val pendingCallSyncs = pendingEvents.filter { 
            it.syncStatus == "PENDING" || (it.recordingStatus == "PENDING_UPLOAD" && !it.recordingPath.isNullOrEmpty() && File(it.recordingPath).exists())
        }
        val pendingAudioUploads = pendingEvents.filter { 
            !it.recordingPath.isNullOrEmpty() && File(it.recordingPath).exists() && it.recordingStatus != "SYNCED" 
        }

        AppLogManager.log("SYNC", "CallSyncWorker", "Found ${pendingCallSyncs.size} call logs and ${pendingAudioUploads.size} audio recordings pending sync.")

        val prefs = applicationContext.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)

        val baseUrl = com.academically.recordhub.data.remote.ApiConstants.DEFAULT_BASE_URL
        var syncSuccessful = false

        try {
            AppLogManager.log("SYNC", "CallSyncWorker", "Connecting to Cloud API: $baseUrl ...")

            val retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(httpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            val api = retrofit.create(RecordHubApi::class.java)

            val counselorEmail = prefs.getString("counselor_email", null)
            var counselorName = prefs.getString("counselor_name", null)

            if (counselorName.isNullOrBlank() && !counselorEmail.isNullOrBlank()) {
                counselorName = counselorEmail.substringBefore("@")
                    .replace(".", " ")
                    .replace("_", " ")
                    .split(" ")
                    .joinToString(" ") { word -> word.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.US) else it.toString() } }
            }

            val token = prefs.getString("access_token", null)
            val authHeader = if (!token.isNullOrBlank()) "Bearer $token" else "Bearer mock_jwt_token"

            // Validate counselor account status with server (cached for 12 hours to avoid excessive invocations)
            val lastValidated = prefs.getLong("last_session_validation_ts", 0L)
            val now = System.currentTimeMillis()
            val shouldValidateSession = !counselorEmail.isNullOrBlank() && (now - lastValidated > 12 * 60 * 60 * 1000L)

            if (shouldValidateSession && !counselorEmail.isNullOrBlank()) {
                try {
                    val valResp = api.validateSession(
                        authHeader,
                        com.academically.recordhub.data.remote.ValidateSessionRequest(counselorEmail)
                    )
                    if (valResp.code() == 401) {
                        AppLogManager.log("WARN", "CallSyncWorker", "Counselor account ($counselorEmail) deleted/deactivated by admin. Clearing local session.")
                        prefs.edit().putBoolean("is_logged_in", false).remove("access_token").apply()
                        return Result.failure()
                    } else if (valResp.isSuccessful) {
                        prefs.edit().putLong("last_session_validation_ts", now).apply()
                    }
                } catch (e: Exception) {
                    AppLogManager.log("INFO", "CallSyncWorker", "Session validation check skipped (offline/network): ${e.message}")
                }
            }

            val uploadUrlsMap = mutableMapOf<String, com.academically.recordhub.data.remote.UploadUrlInfo>()

            if (pendingCallSyncs.isNotEmpty()) {
                // Sync in chunks of 25 to prevent HTTP timeouts on mobile networks
                val chunks = pendingCallSyncs.chunked(25)
                var totalSynced = 0

                for (chunk in chunks) {
                    val dtoList = chunk.map { evt ->
                        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                            timeZone = TimeZone.getTimeZone("UTC")
                        }
                        val hasRec = !evt.recordingPath.isNullOrEmpty() && File(evt.recordingPath).exists() && evt.recordingStatus != "SYNCED"
                        val recFile = if (hasRec) File(evt.recordingPath!!) else null
                        val ext = recFile?.extension?.lowercase()
                        val mime = when (ext) {
                            "mp3" -> "audio/mpeg"
                            "m4a" -> "audio/mp4"
                            "amr" -> "audio/amr"
                            "wav" -> "audio/wav"
                            "3gp" -> "audio/3gpp"
                            "aac" -> "audio/aac"
                            "ogg" -> "audio/ogg"
                            else -> "audio/mp4"
                        }

                        CallEventDto(
                            deviceId = evt.deviceId,
                            idempotencyKey = evt.idempotencyKey,
                            phoneNumber = evt.phoneNumber,
                            direction = evt.direction,
                            status = evt.status,
                            startTime = isoFormat.format(Date(evt.startTime)),
                            endTime = isoFormat.format(Date(evt.endTime)),
                            durationSeconds = evt.durationSeconds,
                            simSlot = evt.simSlot,
                            isPrivate = evt.isPrivate,
                            disposition = evt.disposition,
                            channel = if (evt.disposition.contains("WhatsApp", ignoreCase = true) || evt.idempotencyKey.startsWith("WA_")) "WHATSAPP" else "CELLULAR",
                            agentName = counselorName,
                            counselorEmail = counselorEmail,
                            hasRecording = hasRec,
                            fileSizeBytes = recFile?.length(),
                            mimeType = mime
                        )
                    }

                    val request = BatchSyncRequest(callEvents = dtoList)
                    val response = api.batchSyncCalls(authHeader, request)

                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        val syncedKeys = body.syncedIds + body.duplicates
                        if (syncedKeys.isNotEmpty()) {
                            db.callEventDao().markEventsSynced(syncedKeys)
                            totalSynced += syncedKeys.size
                        }
                        body.uploadUrls?.forEach { uploadInfo ->
                            uploadUrlsMap[uploadInfo.idempotencyKey] = uploadInfo
                        }
                    } else if (response.code() == 401) {
                        AppLogManager.log("WARN", "CallSyncWorker", "401 Unauthorized in batch sync. Counselor deleted by admin. Logging out.")
                        prefs.edit().putBoolean("is_logged_in", false).remove("access_token").apply()
                        return Result.failure()
                    } else {
                        AppLogManager.log("WARN", "CallSyncWorker", "Batch chunk sync status: ${response.code()}")
                    }
                }

                if (totalSynced > 0 || pendingCallSyncs.isEmpty()) {
                    AppLogManager.log("SYNC", "CallSyncWorker", "SUCCESSFULLY synced $totalSynced call events to Cloud API ($baseUrl)")
                    syncSuccessful = true
                }
            } else {
                syncSuccessful = true
            }

            // Upload Audio Recording files directly to AWS S3 (0 extra Vercel invocations)
            if (syncSuccessful && pendingAudioUploads.isNotEmpty()) {
                for (evt in pendingAudioUploads) {
                    val directUploadInfo = uploadUrlsMap[evt.idempotencyKey]
                    if (directUploadInfo != null) {
                        uploadAudioDirect(api, authHeader, directUploadInfo, evt, db)
                    } else {
                        // Fallback to initiate upload if direct presigned URL was not in response
                        uploadAudioFile(api, baseUrl, authHeader, db, evt)
                    }
                }
            }
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "CallSyncWorker", "Could not reach $baseUrl: ${e.message}")
        }

        return if (syncSuccessful) {
            Result.success()
        } else {
            AppLogManager.log("ERROR", "CallSyncWorker", "Batch sync failed across all endpoints. Will retry...")
            Result.retry()
        }
    }

    private suspend fun uploadAudioDirect(
        api: RecordHubApi,
        authHeader: String,
        uploadInfo: com.academically.recordhub.data.remote.UploadUrlInfo,
        evt: CallEventEntity,
        db: AppDatabase
    ): Boolean {
        try {
            val file = File(evt.recordingPath ?: return false)
            if (!file.exists() || file.length() == 0L) return false

            val ext = file.extension.lowercase()
            val mimeType = when (ext) {
                "mp3" -> "audio/mpeg"
                "m4a" -> "audio/mp4"
                "amr" -> "audio/amr"
                "wav" -> "audio/wav"
                "3gp" -> "audio/3gpp"
                "aac" -> "audio/aac"
                "ogg" -> "audio/ogg"
                else -> "audio/mp4"
            }

            AppLogManager.log("SYNC", "AWS S3", "Starting 1-step direct AWS S3 PUT for ${file.name} (${file.length()} bytes)")
            val reqBody = file.asRequestBody(mimeType.toMediaTypeOrNull())
            val putRequest = Request.Builder()
                .url(uploadInfo.presignedPutUrl)
                .put(reqBody)
                .header("Content-Type", mimeType)
                .build()

            val putResponse = httpClient.newCall(putRequest).execute()
            if (putResponse.isSuccessful) {
                try {
                    val compReq = com.academically.recordhub.data.remote.UploadCompleteRequest(callId = evt.idempotencyKey)
                    api.completeUpload(authHeader, uploadInfo.recordingId, compReq)
                } catch (cErr: Exception) {
                    Log.w("CallSyncWorker", "completeUpload notification warning: ${cErr.message}")
                }
                db.callEventDao().updateRecordingStatus(evt.idempotencyKey, "SYNCED")
                AppLogManager.log("SYNC", "AWS S3", "Direct 1-Step AWS S3 PUT upload succeeded for ${file.name} to ${uploadInfo.s3Key}!")
                return true
            } else {
                AppLogManager.log("WARN", "AWS S3", "Direct 1-Step S3 PUT returned status ${putResponse.code}. Switching to fallback...")
                return false
            }
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "AWS S3", "Direct 1-Step S3 PUT error for ${evt.idempotencyKey}: ${e.message}")
            return false
        }
    }

    private suspend fun uploadAudioFile(
        api: RecordHubApi,
        baseUrl: String,
        authHeader: String,
        db: AppDatabase,
        evt: CallEventEntity
    ) {
        try {
            val file = File(evt.recordingPath ?: return)
            if (!file.exists() || file.length() == 0L) return

            AppLogManager.log("SYNC", "RecordingSync", "Initiating upload for ${file.name} (${file.length()} bytes)")

            val ext = file.extension.lowercase()
            val mimeType = when (ext) {
                "mp3" -> "audio/mpeg"
                "m4a" -> "audio/mp4"
                "amr" -> "audio/amr"
                "wav" -> "audio/wav"
                "3gp" -> "audio/3gpp"
                "aac" -> "audio/aac"
                "ogg" -> "audio/ogg"
                else -> "audio/mp4"
            }

            val prefs = applicationContext.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
            val counselorEmail = prefs.getString("counselor_email", null)

            val initReq = UploadInitiateRequest(
                callId = evt.idempotencyKey,
                fileSizeBytes = file.length(),
                mimeType = mimeType,
                checksumSha256 = "sha256_${file.name.hashCode()}_${file.length()}",
                durationSeconds = evt.durationSeconds,
                deviceId = evt.deviceId,
                counselorEmail = counselorEmail
            )

            val initRes = api.initiateUpload(authHeader, initReq)
            if (initRes.isSuccessful && initRes.body() != null) {
                val uploadInfo = initRes.body()!!
                val putUrl = uploadInfo.presignedPutUrl
                val reqBody = file.asRequestBody(mimeType.toMediaTypeOrNull())

                var uploadSuccess = false

                // Attempt 1: Direct AWS S3 presigned PUT URL
                try {
                    val putRequest = Request.Builder()
                        .url(putUrl)
                        .put(reqBody)
                        .header("Content-Type", mimeType)
                        .build()

                    val putResponse = httpClient.newCall(putRequest).execute()
                    if (putResponse.isSuccessful) {
                        uploadSuccess = true
                        AppLogManager.log("SYNC", "AWS S3", "Direct AWS S3 PUT upload succeeded for ${file.name} to bucket ${uploadInfo.s3Key}!")
                    } else {
                        AppLogManager.log("WARN", "AWS S3", "Direct S3 PUT returned status ${putResponse.code}. Body: ${putResponse.body?.string()}. Switching to server upload fallback...")
                    }
                } catch (s3Err: Exception) {
                    AppLogManager.log("WARN", "AWS S3", "Direct S3 PUT exception: ${s3Err.message}. Switching to server upload fallback...")
                }

                // Attempt 2: Server Fallback Upload
                if (!uploadSuccess) {
                    val rawFallback = uploadInfo.fallbackUploadUrl ?: ""
                    val fallbackTargetUrl = if (rawFallback.isNotBlank() && !rawFallback.contains("localhost")) {
                        rawFallback
                    } else {
                        "${baseUrl.removeSuffix("/")}/recordings/${uploadInfo.recordingId}/upload-data"
                    }

                    AppLogManager.log("SYNC", "ServerFallback", "Uploading binary audio to server endpoint: $fallbackTargetUrl")

                    val fallbackRequest = Request.Builder()
                        .url(fallbackTargetUrl)
                        .put(reqBody)
                        .header("Content-Type", mimeType)
                        .build()

                    val fallbackResponse = httpClient.newCall(fallbackRequest).execute()
                    if (fallbackResponse.isSuccessful) {
                        uploadSuccess = true
                        AppLogManager.log("SYNC", "ServerFallback", "Server audio upload succeeded for ${file.name}!")
                    } else {
                        AppLogManager.log("ERROR", "ServerFallback", "Server fallback upload failed with status ${fallbackResponse.code}")
                    }
                }

                if (uploadSuccess) {
                    val compReq = com.academically.recordhub.data.remote.UploadCompleteRequest(callId = evt.idempotencyKey)
                    try {
                        api.completeUpload(authHeader, uploadInfo.recordingId, compReq)
                    } catch (cErr: Exception) {
                        Log.w("CallSyncWorker", "completeUpload notification warning: ${cErr.message}")
                    }
                    db.callEventDao().updateRecordingStatus(evt.idempotencyKey, "SYNCED")
                    AppLogManager.log("SYNC", "RecordingSync", "Uploaded & linked audio recording ${file.name} successfully to AWS S3!")
                }
            } else {
                AppLogManager.log("ERROR", "RecordingSync", "initiateUpload failed with status code ${initRes.code()}")
            }
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "RecordingSync", "Audio upload error: ${e.message}")
        }
    }
}
