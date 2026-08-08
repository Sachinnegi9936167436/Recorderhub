package com.academically.recordhub.utils

import android.content.Context
import android.provider.CallLog
import android.util.Log
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.local.CallEventEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object CallLogScanner {

    private const val TAG = "CallLogScanner"

    suspend fun scanRecentCallLogs(context: Context): Int = withContext(Dispatchers.IO) {
        var importedCount = 0
        val db = AppDatabase.getInstance(context)
        try {
            db.callEventDao().clearDemoData()
            val resolver = context.contentResolver

            val cursor = resolver.query(
                CallLog.Calls.CONTENT_URI,
                null,
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )

            cursor?.use { c ->
                val numberIdx = c.getColumnIndex(CallLog.Calls.NUMBER)
                val typeIdx = c.getColumnIndex(CallLog.Calls.TYPE)
                val dateIdx = c.getColumnIndex(CallLog.Calls.DATE)
                val durationIdx = c.getColumnIndex(CallLog.Calls.DURATION)

                while (c.moveToNext() && importedCount < 50) {
                    val rawNumber = if (numberIdx >= 0) c.getString(numberIdx) else null
                    if (rawNumber.isNullOrEmpty()) continue

                    val type = if (typeIdx >= 0) c.getInt(typeIdx) else CallLog.Calls.INCOMING_TYPE
                    val dateMs = if (dateIdx >= 0) c.getLong(dateIdx) else System.currentTimeMillis()
                    val durationSec = if (durationIdx >= 0) c.getInt(durationIdx) else 30

                    val direction = when (type) {
                        CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                        CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                        CallLog.Calls.MISSED_TYPE -> "MISSED"
                        else -> "INCOMING"
                    }

                    val cleanDigits = rawNumber.replace("\\D".toRegex(), "").takeLast(10)
                    val idempotencyKey = "SYS-LOG-$dateMs-$cleanDigits"
                    val endTimeMs = dateMs + (durationSec * 1000L)

                    val entity = CallEventEntity(
                        deviceId = "ANDROID-XIAOMI-PROD",
                        idempotencyKey = idempotencyKey,
                        phoneNumber = rawNumber,
                        direction = direction,
                        status = if (type == CallLog.Calls.MISSED_TYPE) "MISSED" else "ANSWERED",
                        startTime = dateMs,
                        endTime = endTimeMs,
                        durationSeconds = Math.max(1, durationSec),
                        simSlot = 0,
                        isPrivate = false,
                        disposition = "Imported Phone Call",
                        syncStatus = "PENDING"
                    )

                    val insertedRowId = db.callEventDao().insertCallEvent(entity)
                    if (insertedRowId > 0) {
                        importedCount++
                    }
                }
            }

            Log.i(TAG, "Imported $importedCount new call events from phone CallLog")
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning system call logs: ${e.message}", e)
        }

        return@withContext importedCount
    }
}
