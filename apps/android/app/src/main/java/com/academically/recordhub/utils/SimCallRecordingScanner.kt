package com.academically.recordhub.utils

import android.content.Context
import android.os.Environment
import android.util.Log
import java.io.File

object SimCallRecordingScanner {

    private const val TAG = "SimCallRecordingScanner"

    private val RECORDING_FOLDERS = listOf(
        "/MIUI/sound_recorder/call_rec",
        "/Recordings/Call",
        "/Music/Recordings/Call",
        "/CallRecordings",
        "/Call",
        "/SoundRecorder",
        "/Recordings",
        "/MIUI/sound_recorder"
    )

    fun findAudioForCall(context: Context, phoneNumber: String, startTimeMs: Long, endTimeMs: Long): File? {
        val root = Environment.getExternalStorageDirectory()
        val cleanPhone = phoneNumber.replace("\\D".toRegex(), "").takeLast(10)

        for (relPath in RECORDING_FOLDERS) {
            val dir = File(root, relPath)
            if (dir.exists() && dir.isDirectory) {
                val files = dir.listFiles() ?: continue
                for (file in files) {
                    if (file.isFile && isAudioFile(file.name) && file.length() > 0) {
                        val fileLastModified = file.lastModified()
                        val fileNameClean = file.name.replace("\\D".toRegex(), "")

                        // Check if file timestamp matches call window (within 5 minutes) or file name contains phone number
                        val timeDiffMs = Math.abs(fileLastModified - endTimeMs)
                        val isTimeMatch = timeDiffMs < 5 * 60 * 1000L // within 5 mins of call
                        val isPhoneMatch = cleanPhone.isNotBlank() && fileNameClean.contains(cleanPhone)

                        if (isTimeMatch || isPhoneMatch) {
                            Log.i(TAG, "Matched SIM call audio recording: ${file.absolutePath} for phone: $phoneNumber")
                            return file
                        }
                    }
                }
            }
        }

        return null
    }

    private fun isAudioFile(name: String): Boolean {
        val lower = name.lowercase()
        return lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".aac") ||
                lower.endsWith(".amr") || lower.endsWith(".wav") || lower.endsWith(".3gp") || lower.endsWith(".ogg")
    }
}
