package com.academically.recordhub.utils

import android.content.Context
import android.os.Build
import android.provider.CallLog
import android.provider.Settings
import android.util.Log
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.local.CallEventEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.withContext
import java.io.File

object CallLogScanner {

    private const val TAG = "CallLogScanner"
    private val scanMutex = Mutex()

    suspend fun scanRecentCallLogs(context: Context): Int = withContext(Dispatchers.IO) {
        if (!scanMutex.tryLock()) {
            Log.d(TAG, "Concurrent scanRecentCallLogs already running. Skipping duplicate pass.")
            return@withContext 0
        }
        var importedCount = 0
        val db = AppDatabase.getInstance(context)
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "ANDROID_DEVICE"
        val deviceId = "ANDROID-${Build.MODEL.replace(" ", "_")}-$androidId"

        try {
            db.callEventDao().clearDemoData()

            val prefs = context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()
            var accountCutoffMs = prefs.getLong("account_created_at", 0L)
            if (accountCutoffMs == 0L || accountCutoffMs > now) {
                // If timestamp missing or in the future due to server clock difference, default to 7 days ago
                accountCutoffMs = now - (7 * 24 * 60 * 60 * 1000L)
                prefs.edit().putLong("account_created_at", accountCutoffMs).apply()
            }

            // Cap scan window to recent 7 days or account creation timestamp (with a 5-minute safety buffer)
            val sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000L)
            val safeAccountCutoff = maxOf(accountCutoffMs - (5 * 60 * 1000L), sevenDaysAgo)
            val effectiveCutoffMs = safeAccountCutoff.coerceAtMost(now)

            val allDbEventsInitial = db.callEventDao().getEventsSince(effectiveCutoffMs).toMutableList()
            val claimedPaths = allDbEventsInitial
                .mapNotNull { it.recordingPath }
                .filter { it.isNotBlank() }
                .toMutableSet()

            val resolver = context.contentResolver
            val selection = "${CallLog.Calls.DATE} >= ?"
            val selectionArgs = arrayOf(effectiveCutoffMs.toString())

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
                val accountIdIdx = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) c.getColumnIndex(CallLog.Calls.PHONE_ACCOUNT_ID) else -1
                val nameIdx = c.getColumnIndex(CallLog.Calls.CACHED_NAME)

                while (c.moveToNext() && importedCount < 100) {
                    val dateMs = if (dateIdx >= 0) c.getLong(dateIdx) else System.currentTimeMillis()
                    if (dateMs < effectiveCutoffMs) {
                        // Strictly ignore all calls prior to effective cutoff date
                        continue
                    }
                    val rawNumber = if (numberIdx >= 0) c.getString(numberIdx) else null
                    if (rawNumber.isNullOrEmpty()) continue

                    val type = if (typeIdx >= 0) c.getInt(typeIdx) else CallLog.Calls.INCOMING_TYPE
                    val durationSec = if (durationIdx >= 0) c.getInt(durationIdx) else 30
                    val accountName = if (accountIdx >= 0) c.getString(accountIdx) ?: "" else ""
                    val accountId = if (accountIdIdx >= 0) c.getString(accountIdIdx) ?: "" else ""
                    val cachedName = if (nameIdx >= 0) c.getString(nameIdx) ?: "" else ""

                    val isWhatsApp = accountName.lowercase().contains("whatsapp") ||
                            accountId.lowercase().contains("whatsapp") ||
                            rawNumber.lowercase().contains("whatsapp") ||
                            cachedName.lowercase().contains("whatsapp")

                    val direction = when (type) {
                        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                        CallLog.Calls.MISSED_TYPE -> "MISSED"
                        else -> "INCOMING"
                    }

                    val cleanDigits = PhoneUtils.NON_DIGITS_REGEX.replace(rawNumber, "")
                    val formattedPhone = PhoneUtils.formatInternationalNumber(rawNumber, cachedName)
                    val idempotencyKey = if (isWhatsApp) "WA_LOG-$dateMs-$cleanDigits" else "SYS-LOG-$dateMs-$cleanDigits"
                    val endTimeMs = dateMs + (durationSec * 1000L)

                    // Skip duplicate import if this exact call already exists in Room DB (by unique idempotencyKey or exact timestamp)
                    val isDuplicate = allDbEventsInitial.any { existing ->
                        existing.idempotencyKey == idempotencyKey || (existing.startTime == dateMs && existing.phoneNumber == formattedPhone)
                    }

                    if (isDuplicate) {
                        Log.d(TAG, "Skipping system call log import for $cleanDigits as exact matching event already exists.")
                        continue
                    }

                    val isMissedOrUnanswered = type == CallLog.Calls.MISSED_TYPE || 
                            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && type == CallLog.Calls.REJECTED_TYPE) ||
                            durationSec <= 0

                    val callStatus = if (isMissedOrUnanswered) "UNANSWERED" else "ANSWERED"
                    val effectiveDurationSec = if (isMissedOrUnanswered) 0 else durationSec

                    val audioFile = if (isMissedOrUnanswered || isWhatsApp) null else SimCallRecordingScanner.findAudioForCall(
                        context, 
                        rawNumber, 
                        dateMs, 
                        endTimeMs, 
                        claimedPaths,
                        effectiveDurationSec
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
                        allDbEventsInitial.add(entity)
                    }
                }
            }

            // Secondary pass: Attach audio recordings strictly to recent SIM/Cellular calls (limit to last 24h & max 10 calls to prevent slow scans)
            val twentyFourHoursAgo = now - (24 * 60 * 60 * 1000L)
            val unlinkedCutoffMs = maxOf(effectiveCutoffMs, twentyFourHoursAgo)
            val unlinkedEvents = db.callEventDao().getUnlinkedSimEvents(unlinkedCutoffMs).take(10)

            for (evt in unlinkedEvents) {
                val matchedFile = SimCallRecordingScanner.findAudioForCall(
                    context, 
                    evt.phoneNumber, 
                    evt.startTime, 
                    evt.endTime,
                    claimedPaths,
                    evt.durationSeconds
                )

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

            Log.i(TAG, "Imported/linked $importedCount call events with audio recordings")
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning system call logs: ${e.message}", e)
        } finally {
            scanMutex.unlock()
        }

        return@withContext importedCount
    }
}
