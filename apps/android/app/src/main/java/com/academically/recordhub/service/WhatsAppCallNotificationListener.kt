package com.academically.recordhub.service

import android.app.Notification
import android.content.Intent
import android.os.IBinder
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.academically.recordhub.utils.WhatsAppAudioRecorder
import java.io.File

class WhatsAppCallNotificationListener : NotificationListenerService() {
    private lateinit var audioRecorder: WhatsAppAudioRecorder
    private var activeWhatsAppCallKey: String? = null
    private var callStartTimeMs: Long = 0
    private var currentContactTitle: String = "WhatsApp Lead"

    override fun onCreate() {
        super.onCreate()
        audioRecorder = WhatsAppAudioRecorder(applicationContext)
        Log.d("WhatsAppListener", "WhatsAppCallNotificationListener initialized.")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        val packageName = sbn.packageName

        if (packageName == "com.whatsapp" || packageName == "com.whatsapp.w4b") {
            val notification = sbn.notification
            val extras = notification.extras
            val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
            val text = extras.getString(Notification.EXTRA_TEXT) ?: ""
            val subText = extras.getString(Notification.EXTRA_SUB_TEXT) ?: ""
            val category = notification.category

            val isCallNotification = category == Notification.CATEGORY_CALL ||
                    text.contains("Ongoing call", ignoreCase = true) ||
                    text.contains("WhatsApp call", ignoreCase = true) ||
                    text.contains("In call", ignoreCase = true) ||
                    title.contains("WhatsApp call", ignoreCase = true)

            if (isCallNotification && !audioRecorder.isCurrentlyRecording()) {
                activeWhatsAppCallKey = sbn.key
                callStartTimeMs = System.currentTimeMillis()
                currentContactTitle = if (title.isNotBlank()) title else "WhatsApp Prospect"

                Log.d("WhatsAppListener", "Active WhatsApp call detected from package: $packageName ($currentContactTitle)")
                audioRecorder.startRecording(currentContactTitle)
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        sbn ?: return
        if (sbn.key == activeWhatsAppCallKey && audioRecorder.isCurrentlyRecording()) {
            val durationSec = (System.currentTimeMillis() - callStartTimeMs) / 1000
            val recordedFile: File? = audioRecorder.stopRecording()
            Log.d("WhatsAppListener", "WhatsApp call ended. Duration: ${durationSec}s File: ${recordedFile?.name}")

            if (recordedFile != null && recordedFile.exists()) {
                enqueueWhatsAppSyncWorker(recordedFile, durationSec, currentContactTitle)
            }
            activeWhatsAppCallKey = null
        }
    }

    private fun enqueueWhatsAppSyncWorker(audioFile: File, durationSeconds: Long, contactName: String) {
        Log.d("WhatsAppListener", "Queued WhatsApp call audio upload: ${audioFile.absolutePath} (Duration: ${durationSeconds}s, Contact: $contactName)")
        // Enqueue background WorkManager task to upload S3 audio file and log call metadata with channel = WHATSAPP
    }
}
