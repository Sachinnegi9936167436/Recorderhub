package com.academically.recordhub.utils

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WhatsAppAudioRecorder(private val context: Context) {
    private var mediaRecorder: MediaRecorder? = null
    private var isRecording = false
    private var currentOutputFile: File? = null
    private var recordingStartTimeMs: Long = 0

    fun startRecording(contactTitle: String): File? {
        if (isRecording) return currentOutputFile

        try {
            val outputDir = File(context.filesDir, "whatsapp_recordings")
            if (!outputDir.exists()) outputDir.mkdirs()

            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val safeContact = contactTitle.replace("[^a-zA-Z0-9]".toRegex(), "_")
            currentOutputFile = File(outputDir, "WA_CALL_${timestamp}_${safeContact}.m4a")

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128000)
                setOutputFile(currentOutputFile?.absolutePath)
                prepare()
                start()
            }

            isRecording = true
            recordingStartTimeMs = System.currentTimeMillis()
            Log.d("WhatsAppAudioRecorder", "Started WhatsApp call audio recording: ${currentOutputFile?.name}")
            return currentOutputFile
        } catch (e: Exception) {
            Log.e("WhatsAppAudioRecorder", "Failed to start WhatsApp audio recording", e)
            isRecording = false
            currentOutputFile = null
            return null
        }
    }

    fun stopRecording(): File? {
        if (!isRecording) return null

        return try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false
            val durationSec = (System.currentTimeMillis() - recordingStartTimeMs) / 1000
            Log.d("WhatsAppAudioRecorder", "Stopped WhatsApp call audio recording. Duration: ${durationSec}s File: ${currentOutputFile?.absolutePath}")
            currentOutputFile
        } catch (e: Exception) {
            Log.e("WhatsAppAudioRecorder", "Error stopping WhatsApp audio recording", e)
            mediaRecorder = null
            isRecording = false
            null
        }
    }

    fun isCurrentlyRecording(): Boolean = isRecording
}
