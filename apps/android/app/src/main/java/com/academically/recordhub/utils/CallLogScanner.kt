package com.academically.recordhub.utils

import android.content.Context
import android.os.Build
import android.provider.CallLog
import android.provider.Settings
import android.util.Log
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.local.CallEventEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

object CallLogScanner {

    private const val TAG = "CallLogScanner"

    suspend fun scanRecentCallLogs(context: Context): Int = withContext(Dispatchers.IO) {
        var importedCount = 0
        val db = AppDatabase.getInstance(context)
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "ANDROID_DEVICE"
        val deviceId = "ANDROID-${Build.MODEL.replace(" ", "_")}-$androidId"

        try {
            db.callEventDao().clearDemoData()
            db.callEventDao().resetAllToPendingSync()

            // Get or initialize exact account / app creation timestamp cutoff
            val prefs = context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
            var installTimeMs = prefs.getLong("account_created_at", prefs.getLong("app_installed_at", 0L))
            if (installTimeMs == 0L) {
                installTimeMs = try {
                    context.packageManager.getPackageInfo(context.packageName, 0).firstInstallTime
                } catch (e: Exception) {
                    System.currentTimeMillis()
                }
                prefs.edit().putLong("app_installed_at", installTimeMs).apply()
            }

            val allDbEventsInitial = db.callEventDao().getAllEvents()
            val claimedPaths = allDbEventsInitial
                .mapNotNull { it.recordingPath }
                .filter { it.isNotBlank() }
                .toMutableSet()

            val resolver = context.contentResolver
            val selection = "${CallLog.Calls.DATE} >= ?"
            val selectionArgs = arrayOf(installTimeMs.toString())

            val cursor = resolver.query(
                CallLog.Calls.CONTENT_URI,
                null,
                selection,
                selectionArgs,
                "${CallLog.Calls.DATE} DESC"
            )

            cursor?.use { c ->
                val numberIdx = c.getColumnIndex(CallLog.Calls.NUMBER)
                val typeIdx = c.getColumnIndex(CallLog.Calls.TYPE)
                val dateIdx = c.getColumnIndex(CallLog.Calls.DATE)
                val durationIdx = c.getColumnIndex(CallLog.Calls.DURATION)
                val accountIdx = c.getColumnIndex(CallLog.Calls.PHONE_ACCOUNT_COMPONENT_NAME)
                val nameIdx = c.getColumnIndex(CallLog.Calls.CACHED_NAME)

                while (c.moveToNext() && importedCount < 2000) {
                    val dateMs = if (dateIdx >= 0) c.getLong(dateIdx) else System.currentTimeMillis()
                    if (dateMs < installTimeMs) {
                        // Ignore calls prior to the exact installation timestamp
                        continue
                    }
                    val rawNumber = if (numberIdx >= 0) c.getString(numberIdx) else null
                    if (rawNumber.isNullOrEmpty()) continue

                    val type = if (typeIdx >= 0) c.getInt(typeIdx) else CallLog.Calls.INCOMING_TYPE
                    val durationSec = if (durationIdx >= 0) c.getInt(durationIdx) else 30
                    val accountName = if (accountIdx >= 0) c.getString(accountIdx) ?: "" else ""
                    val cachedName = if (nameIdx >= 0) c.getString(nameIdx) ?: "" else ""

                    val isWhatsApp = accountName.lowercase().contains("whatsapp") ||
                            rawNumber.lowercase().contains("whatsapp") ||
                            cachedName.lowercase().contains("whatsapp")

                    val direction = when (type) {
                        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                        CallLog.Calls.MISSED_TYPE -> "MISSED"
                        else -> "INCOMING"
                    }

                    val cleanDigits = rawNumber.replace("\\D".toRegex(), "").takeLast(10)
                    val formattedPhone = if (cleanDigits.length == 10) "+91 ${cleanDigits.chunked(5).joinToString(" ")}" else (if (cachedName.isNotBlank()) cachedName else rawNumber)
                    val idempotencyKey = if (isWhatsApp) "WA_LOG-$dateMs-$cleanDigits" else "SYS-LOG-$dateMs-$cleanDigits"
                    val endTimeMs = dateMs + (durationSec * 1000L)

                    // Skip duplicate import if a call for the same number/time window already exists in Room DB
                    val existingEvents = db.callEventDao().getPendingSyncEvents()
                    val isDuplicate = existingEvents.any { existing ->
                        val existingDigits = existing.phoneNumber.replace("\\D".toRegex(), "").takeLast(10)
                        existingDigits == cleanDigits && Math.abs(existing.startTime - dateMs) < 120000
                    }

                    if (isDuplicate) {
                        Log.d(TAG, "Skipping system call log import for $cleanDigits as matching event already exists.")
                        continue
                    }

                    val isMissedOrUnanswered = type == CallLog.Calls.MISSED_TYPE || 
                            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && type == CallLog.Calls.REJECTED_TYPE) ||
                            durationSec <= 0

                    val callStatus = if (isMissedOrUnanswered) "UNANSWERED" else "ANSWERED"
                    val effectiveDurationSec = if (isMissedOrUnanswered) 0 else durationSec

                    val audioFile = if (isMissedOrUnanswered) null else SimCallRecordingScanner.findAudioForCall(
                        context, 
                        rawNumber, 
                        dateMs, 
                        endTimeMs, 
                        claimedPaths
                    )

                    if (audioFile != null && audioFile.exists()) {
                        claimedPaths.add(audioFile.absolutePath)
                        claimedPaths.add(audioFile.name)
                    }

                    val entity = CallEventEntity(
                        deviceId = deviceId,
                        idempotencyKey = idempotencyKey,
                        phoneNumber = formattedPhone,
                        direction = direction,
                        status = callStatus,
                        startTime = dateMs,
                        endTime = endTimeMs,
                        durationSeconds = effectiveDurationSec,
                        simSlot = 0,
                        isPrivate = false,
                        recordingPath = audioFile?.absolutePath,
                        recordingStatus = if (audioFile != null && audioFile.exists()) "PENDING_UPLOAD" else "NONE",
                        disposition = if (isWhatsApp) "WhatsApp Call" else "Imported Phone Call",
                        syncStatus = "PENDING"
                    )

                    val insertedRowId = db.callEventDao().insertCallEvent(entity)
                    if (insertedRowId > 0) {
                        importedCount++
                    }
                }
            }

            // Secondary pass: Attach audio recordings strictly 1-to-1 to existing calls in Room DB missing recording paths
            val allDbEvents = db.callEventDao().getAllEvents()
            val waDir = File(context.filesDir, "whatsapp_recordings")

            for (evt in allDbEvents) {
                if (evt.recordingPath.isNullOrEmpty() || evt.recordingStatus == "NONE") {
                    // Try SIM audio recording scanner with claimedPaths set
                    var matchedFile = SimCallRecordingScanner.findAudioForCall(
                        context, 
                        evt.phoneNumber, 
                        evt.startTime, 
                        evt.endTime,
                        claimedPaths
                    )

                    // WhatsApp call audio recording is currently PAUSED (only native SIM call recordings are active)
                    /*
                    if (matchedFile == null && waDir.exists() && waDir.isDirectory) {
                        val waFiles = waDir.listFiles() ?: emptyArray()
                        matchedFile = waFiles.firstOrNull { file ->
                            !claimedPaths.contains(file.absolutePath) && !claimedPaths.contains(file.name) &&
                            (file.name.endsWith(".wav") || file.name.endsWith(".m4a")) && file.length() > 0 &&
                            Math.abs(evt.startTime - file.lastModified()) < 120000
                        }
                    }
                    */

                    if (matchedFile != null && matchedFile.exists()) {
                        claimedPaths.add(matchedFile.absolutePath)
                        claimedPaths.add(matchedFile.name)
                        Log.i(TAG, "Linking audio recording ${matchedFile.name} strictly to call ${evt.idempotencyKey}")
                        db.callEventDao().insertCallEvent(
                            evt.copy(
                                recordingPath = matchedFile.absolutePath,
                                recordingStatus = "PENDING_UPLOAD",
                                syncStatus = "PENDING"
                            )
                        )
                        importedCount++
                    }
                }
            }

            Log.i(TAG, "Imported/linked $importedCount call events with audio recordings")
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning system call logs: ${e.message}", e)
        }

        return@withContext importedCount
    }
}
