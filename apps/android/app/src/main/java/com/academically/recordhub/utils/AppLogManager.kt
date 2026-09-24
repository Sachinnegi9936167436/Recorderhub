package com.academically.recordhub.utils

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class LogEntry(
    val id: Long = System.nanoTime(),
    val timestamp: String,
    val level: String, // INFO, SYNC, WARN, ERROR
    val tag: String,
    val message: String
)

object AppLogManager {
    private const val MAX_LOGS = 150
    private val logBuffer = ArrayDeque<LogEntry>(MAX_LOGS)
    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs

    private val timeFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)

    init {
        log("INFO", "System", "RecorderHub Telemetry Engine Started.")
        log("SYNC", "CallSyncWorker", "Periodic Call & S3 Upload Worker Ready.")
        log("INFO", "WhatsAppListener", "Notification Listener Service Listening for VoIP Calls.")
    }

    @Synchronized
    fun log(level: String, tag: String, message: String) {
        val timeStr = timeFormat.format(Date())
        val entry = LogEntry(timestamp = timeStr, level = level, tag = tag, message = message)

        // Log to Android Logcat
        when (level) {
            "ERROR" -> Log.e(tag, message)
            "WARN" -> Log.w(tag, message)
            else -> Log.i(tag, message)
        }

        // Keep last 150 logs in memory ring buffer for UI
        if (logBuffer.size >= MAX_LOGS) {
            logBuffer.removeLast()
        }
        logBuffer.addFirst(entry)
        _logs.value = ArrayList(logBuffer)
    }

    @Synchronized
    fun clear() {
        logBuffer.clear()
        _logs.value = emptyList()
        log("INFO", "System", "Logs cleared by user.")
    }
}
