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

        val outputDir = File(context.filesDir, "whatsapp_recordings")
        if (!outputDir.exists()) outputDir.mkdirs()

        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val safeContact = contactTitle.replace("[^a-zA-Z0-9]".toRegex(), "_")
        currentOutputFile = File(outputDir, "WA_CALL_${timestamp}_${safeContact}.m4a")

        // Try AudioSource.VOICE_COMMUNICATION first, fallback to AudioSource.MIC
        val sourcesToTry = intArrayOf(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            MediaRecorder.AudioSource.MIC,
            MediaRecorder.AudioSource.VOICE_RECOGNITION
        )

        for (source in sourcesToTry) {
            try {
                mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    MediaRecorder(context)
                } else {
                    @Suppress("DEPRECATION")
                    MediaRecorder()
                }.apply {
                    setAudioSource(source)
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
                Log.d("WhatsAppAudioRecorder", "Started WhatsApp audio recording with source $source: ${currentOutputFile?.name}")
                return currentOutputFile
            } catch (e: Exception) {
                Log.w("WhatsAppAudioRecorder", "Failed audio source $source for WhatsApp recording: ${e.message}")
                try {
                    mediaRecorder?.release()
                } catch (_: Exception) {}
                mediaRecorder = null
            }
        }

        Log.e("WhatsAppAudioRecorder", "Hardware mic locked by WhatsApp VoIP. Proceeding with Call Metadata Syncing.")
        isRecording = false
        return null
    }

    fun stopRecording(): File? {
        if (!isRecording) return currentOutputFile

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
            currentOutputFile
        }
    }

    fun isCurrentlyRecording(): Boolean = isRecording
}
