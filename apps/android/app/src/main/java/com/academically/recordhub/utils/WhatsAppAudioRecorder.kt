package com.academically.recordhub.utils

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

class WhatsAppAudioRecorder(private val context: Context) {
    private var isRecording = AtomicBoolean(false)
    private var currentOutputFile: File? = null
    private var recordingStartTimeMs: Long = 0
    private var recordingThread: Thread? = null

    private var agc: AutomaticGainControl? = null
    private var aec: AcousticEchoCanceler? = null
    private var ns: NoiseSuppressor? = null

    private var maxPeakAmplitudeObserved = 0
    private var totalDataBytesWritten = 0L

    fun startRecording(contactTitle: String): File? {
        if (isRecording.getAndSet(true)) {
            Log.w(TAG, "Recording already in progress.")
            return currentOutputFile
        }

        maxPeakAmplitudeObserved = 0
        totalDataBytesWritten = 0L
        recordingStartTimeMs = System.currentTimeMillis()

        val recordingsDir = File(context.filesDir, "whatsapp_recordings")
        if (!recordingsDir.exists()) {
            recordingsDir.mkdirs()
        }

        val dateStr = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val cleanTitle = contactTitle.replace("[^a-zA-Z0-9_+]".toRegex(), "_").take(20)
        val fileName = "WA_${cleanTitle}_${dateStr}.wav"
        val outputFile = File(recordingsDir, fileName)
        currentOutputFile = outputFile

        Log.i(TAG, "Starting WhatsApp call audio recording -> ${outputFile.name}")

        recordingThread = thread(start = true, name = "RecordHub-WhatsAppAudioThread") {
            recordAudioPcm(outputFile)
        }

        return outputFile
    }

    @SuppressLint("MissingPermission")
    private fun recordAudioPcm(outputFile: File) {
        val sampleRate = 16000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        val bufferSize = Math.max(minBufferSize, 4096)

        val sourcesToTry = mutableListOf(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            MediaRecorder.AudioSource.MIC,
            MediaRecorder.AudioSource.CAMCORDER
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            sourcesToTry.add(MediaRecorder.AudioSource.UNPROCESSED)
        }
        sourcesToTry.add(MediaRecorder.AudioSource.DEFAULT)

        var audioRecord: AudioRecord? = null
        var selectedSource = -1

        for (source in sourcesToTry) {
            try {
                val candidate = AudioRecord(
                    source,
                    sampleRate,
                    channelConfig,
                    audioFormat,
                    bufferSize * 2
                )
                if (candidate.state == AudioRecord.STATE_INITIALIZED) {
                    candidate.startRecording()
                    if (candidate.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                        audioRecord = candidate
                        selectedSource = source
                        Log.d(TAG, "Successfully initialized AudioRecord with source $source")
                        break
                    }
                    candidate.stop()
                }
                candidate.release()
            } catch (e: Exception) {
                Log.w(TAG, "AudioSource $source failed initialization: ${e.message}")
            }
        }

        if (audioRecord == null) {
            Log.e(TAG, "All candidate AudioSources failed for WhatsApp call recording.")
            isRecording.set(false)
            return
        }

        attachAudioEffects(audioRecord.audioSessionId)

        var fos: FileOutputStream? = null
        try {
            fos = FileOutputStream(outputFile)
            // Write 44-byte dummy header
            fos.write(ByteArray(44))

            val shortBuffer = ShortArray(bufferSize)
            val byteBuffer = ByteArray(bufferSize * 2)
            val softwareGainFactor = 3.5f

            while (isRecording.get()) {
                val readSamples = audioRecord.read(shortBuffer, 0, shortBuffer.size)
                if (readSamples > 0) {
                    var bufferMaxPeak = 0
                    for (i in 0 until readSamples) {
                        val originalSample = shortBuffer[i].toInt()
                        val absPeak = Math.abs(originalSample)
                        if (absPeak > bufferMaxPeak) bufferMaxPeak = absPeak

                        // Apply software gain multiplier with clipping prevention
                        var amplified = (originalSample * softwareGainFactor).toInt()
                        if (amplified > 32767) amplified = 32767
                        else if (amplified < -32768) amplified = -32768

                        byteBuffer[i * 2] = (amplified and 0xFF).toByte()
                        byteBuffer[i * 2 + 1] = ((amplified shr 8) and 0xFF).toByte()
                    }

                    if (bufferMaxPeak > maxPeakAmplitudeObserved) {
                        maxPeakAmplitudeObserved = bufferMaxPeak
                    }

                    fos.write(byteBuffer, 0, readSamples * 2)
                    totalDataBytesWritten += (readSamples * 2)
                } else if (readSamples < 0) {
                    Log.w(TAG, "AudioRecord read error code: $readSamples")
                    break
                }
            }

            fos.flush()
        } catch (e: Exception) {
            Log.e(TAG, "Error in PCM recording stream: ${e.message}", e)
        } finally {
            try { fos?.close() } catch (_: Exception) {}
            try {
                audioRecord.stop()
                audioRecord.release()
            } catch (e: Exception) {
                Log.w(TAG, "Error stopping AudioRecord: ${e.message}")
            }
            releaseAudioEffects()

            // Update WAV header on file
            if (outputFile.exists() && totalDataBytesWritten > 0) {
                try {
                    val raf = RandomAccessFile(outputFile, "rw")
                    writeWavHeader(raf, totalDataBytesWritten, sampleRate, 1, 16)
                    raf.close()
                } catch (e: Exception) {
                    Log.e(TAG, "Error writing WAV header to file: ${e.message}")
                }
            }
        }
    }

    fun stopRecording(): File? {
        if (!isRecording.getAndSet(false)) return currentOutputFile

        try {
            recordingThread?.join(3000)
        } catch (e: Exception) {
            Log.w(TAG, "Interrupted while waiting for recording thread to complete", e)
        }
        recordingThread = null

        val durationSec = (System.currentTimeMillis() - recordingStartTimeMs) / 1000
        val targetFile = currentOutputFile

        if (targetFile != null && targetFile.exists()) {
            if (totalDataBytesWritten <= 44L) {
                Log.w(TAG, "Recording file is empty (bytes: $totalDataBytesWritten). Deleting blank file.")
                try { targetFile.delete() } catch (_: Exception) {}
                currentOutputFile = null
            } else {
                Log.d(TAG, "Stopped WhatsApp call audio recording. Duration: ${durationSec}s File: ${targetFile.absolutePath} Size: ${targetFile.length()} bytes Peak Amplitude: $maxPeakAmplitudeObserved")
            }
        }

        return currentOutputFile
    }

    private fun attachAudioEffects(audioSessionId: Int) {
        try {
            if (AutomaticGainControl.isAvailable()) {
                agc = AutomaticGainControl.create(audioSessionId)?.apply { enabled = true }
                Log.d(TAG, "AutomaticGainControl attached to session $audioSessionId")
            }
            if (AcousticEchoCanceler.isAvailable()) {
                aec = AcousticEchoCanceler.create(audioSessionId)?.apply { enabled = true }
                Log.d(TAG, "AcousticEchoCanceler attached to session $audioSessionId")
            }
            if (NoiseSuppressor.isAvailable()) {
                ns = NoiseSuppressor.create(audioSessionId)?.apply { enabled = true }
                Log.d(TAG, "NoiseSuppressor attached to session $audioSessionId")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not attach hardware audio effects: ${e.message}")
        }
    }

    private fun releaseAudioEffects() {
        try { agc?.release(); agc = null } catch (_: Exception) {}
        try { aec?.release(); aec = null } catch (_: Exception) {}
        try { ns?.release(); ns = null } catch (_: Exception) {}
    }

    private fun writeWavHeader(
        raf: RandomAccessFile,
        pcmDataLength: Long,
        sampleRate: Int,
        channels: Int,
        bitsPerSample: Int
    ) {
        val totalDataLen = pcmDataLength + 36
        val byteRate = sampleRate * channels * bitsPerSample / 8
        val blockAlign = channels * bitsPerSample / 8

        val header = ByteArray(44)
        header[0] = 'R'.code.toByte()
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()

        header[4] = (totalDataLen and 0xff).toByte()
        header[5] = ((totalDataLen shr 8) and 0xff).toByte()
        header[6] = ((totalDataLen shr 16) and 0xff).toByte()
        header[7] = ((totalDataLen shr 24) and 0xff).toByte()

        header[8] = 'W'.code.toByte()
        header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte()
        header[11] = 'E'.code.toByte()

        header[12] = 'f'.code.toByte()
        header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte()
        header[15] = ' '.code.toByte()

        header[16] = 16
        header[17] = 0
        header[18] = 0
        header[19] = 0

        header[20] = 1
        header[21] = 0

        header[22] = channels.toByte()
        header[23] = 0

        header[24] = (sampleRate and 0xff).toByte()
        header[25] = ((sampleRate shr 8) and 0xff).toByte()
        header[26] = ((sampleRate shr 16) and 0xff).toByte()
        header[27] = ((sampleRate shr 24) and 0xff).toByte()

        header[28] = (byteRate and 0xff).toByte()
        header[29] = ((byteRate shr 8) and 0xff).toByte()
        header[30] = ((byteRate shr 16) and 0xff).toByte()
        header[31] = ((byteRate shr 24) and 0xff).toByte()

        header[32] = blockAlign.toByte()
        header[33] = 0

        header[34] = bitsPerSample.toByte()
        header[35] = 0

        header[36] = 'd'.code.toByte()
        header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte()
        header[39] = 'a'.code.toByte()

        header[40] = (pcmDataLength and 0xff).toByte()
        header[41] = ((pcmDataLength shr 8) and 0xff).toByte()
        header[42] = ((pcmDataLength shr 16) and 0xff).toByte()
        header[43] = ((pcmDataLength shr 24) and 0xff).toByte()

        raf.seek(0)
        raf.write(header, 0, 44)
    }

    fun isCurrentlyRecording(): Boolean = isRecording.get()

    companion object {
        private const val TAG = "WhatsAppAudioRecorder"
    }
}
