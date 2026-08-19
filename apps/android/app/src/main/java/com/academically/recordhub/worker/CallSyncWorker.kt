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
        .connectTimeout(4, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()

    override suspend fun doWork(): Result {
        val db = AppDatabase.getInstance(applicationContext)
        val pendingEvents = db.callEventDao().getPendingSyncAndRecordingEvents()

        if (pendingEvents.isEmpty()) {
            Log.d("CallSyncWorker", "No pending call events or audio recordings to sync.")
            return Result.success()
        }

        val pendingCallSyncs = pendingEvents.filter { it.syncStatus == "PENDING" }
        val pendingAudioUploads = pendingEvents.filter { 
            !it.recordingPath.isNullOrEmpty() && File(it.recordingPath).exists() && it.recordingStatus != "SYNCED" 
        }

        AppLogManager.log("SYNC", "CallSyncWorker", "Found ${pendingCallSyncs.size} call logs and ${pendingAudioUploads.size} audio recordings pending sync.")

        val prefs = applicationContext.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
        val customApiUrl = prefs.getString("custom_api_url", null)

        val endpoints = mutableListOf<String>()
        if (!customApiUrl.isNullOrBlank()) {
            var formatted = customApiUrl.trim()
            if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
                formatted = "http://$formatted"
            }
            if (!formatted.endsWith("/")) {
                formatted = "$formatted/"
            }
            if (!formatted.endsWith("api/v1/")) {
                formatted = "${formatted.removeSuffix("/")}/api/v1/"
            }
            endpoints.add(formatted)
        }

        // Production Cloud Server & Host PC Wi-Fi IP (Port 4000 Nest.js & Port 3000 Next.js) plus emulator fallbacks
        endpoints.addAll(
            listOf(
                "https://recorderhub-gold.vercel.app/api/v1/",
                "http://192.168.31.86:3000/api/v1/",
                "http://192.168.31.86:4000/api/v1/",
                "http://10.0.2.2:3000/api/v1/",
                "http://10.0.2.2:4000/api/v1/"
            )
        )

        val uniqueEndpoints = endpoints.distinct()
        var syncSuccessful = false

        for (baseUrl in uniqueEndpoints) {
            try {
                AppLogManager.log("SYNC", "CallSyncWorker", "Attempting connection to $baseUrl ...")

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

                if (pendingCallSyncs.isNotEmpty()) {
                    val dtoList = pendingCallSyncs.map { evt ->
                        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                            timeZone = TimeZone.getTimeZone("UTC")
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
                            counselorEmail = counselorEmail
                        )
                    }

                    val request = BatchSyncRequest(callEvents = dtoList)
                    val response = api.batchSyncCalls(authHeader, request)

                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        val syncedKeys = body.syncedIds + body.duplicates
                        if (syncedKeys.isNotEmpty()) {
                            db.callEventDao().markEventsSynced(syncedKeys)
                            AppLogManager.log("SYNC", "CallSyncWorker", "SUCCESSFULLY synced ${syncedKeys.size} call events to API ($baseUrl)")
                        }
                        syncSuccessful = true
                    } else {
                        AppLogManager.log("WARN", "CallSyncWorker", "API batch call sync to $baseUrl status ${response.code()}")
                    }
                } else {
                    syncSuccessful = true
                }

                // Upload Audio Recording files if available
                if (syncSuccessful && pendingAudioUploads.isNotEmpty()) {
                    for (evt in pendingAudioUploads) {
                        uploadAudioFile(api, baseUrl, authHeader, db, evt)
                    }
                }

                if (syncSuccessful) break
            } catch (e: Exception) {
                AppLogManager.log("ERROR", "CallSyncWorker", "Could not reach $baseUrl: ${e.message}")
            }
        }

        return if (syncSuccessful) {
            Result.success()
        } else {
            AppLogManager.log("ERROR", "CallSyncWorker", "Batch sync failed across all endpoints. Will retry...")
            Result.retry()
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
                else -> "audio/wav"
            }

            val prefs = applicationContext.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
            val counselorEmail = prefs.getString("counselor_email", null)

            val initReq = UploadInitiateRequest(
                callId = evt.idempotencyKey,
                fileSizeBytes = file.length(),
                mimeType = mimeType,
                checksumSha256 = "dummy_checksum_${file.name.hashCode()}",
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
                        .build()

                    val putResponse = httpClient.newCall(putRequest).execute()
                    if (putResponse.isSuccessful) {
                        uploadSuccess = true
                        AppLogManager.log("SYNC", "AWS S3", "Direct AWS S3 PUT upload succeeded for ${file.name}!")
                    } else {
                        AppLogManager.log("WARN", "AWS S3", "Direct S3 PUT status ${putResponse.code}. Switching to server upload fallback...")
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
                    api.completeUpload(authHeader, uploadInfo.recordingId, compReq)
                    db.callEventDao().updateRecordingStatus(evt.idempotencyKey, "SYNCED")
                    AppLogManager.log("SYNC", "RecordingSync", "Uploaded & linked audio recording ${file.name} successfully!")
                }
            } else {
                AppLogManager.log("ERROR", "RecordingSync", "initiateUpload failed with status code ${initRes.code()}")
            }
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "RecordingSync", "Audio upload error: ${e.message}")
        }
    }
}
