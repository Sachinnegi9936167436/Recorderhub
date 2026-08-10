package com.academically.recordhub.service

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.local.CallEventEntity
import com.academically.recordhub.utils.AppLogManager
import com.academically.recordhub.utils.WhatsAppAudioRecorder
import com.academically.recordhub.worker.CallSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File

class WhatsAppCallNotificationListener : NotificationListenerService() {
    private lateinit var audioRecorder: WhatsAppAudioRecorder
    private var isCallRecordingActive: Boolean = false
    private var activeCallNotificationKey: String? = null
    private var activeCallNotificationId: Int = -1
    private var callStartTimeMs: Long = 0
    private var currentContactTitle: String = "WhatsApp Contact"
    private var currentCallDirection: String = "OUTGOING"

    override fun onCreate() {
        super.onCreate()
        audioRecorder = WhatsAppAudioRecorder(applicationContext)
        AppLogManager.log("INFO", "WhatsAppListener", "WhatsApp NotificationListenerService Initialized.")
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        AppLogManager.log("INFO", "WhatsAppListener", "NotificationListenerService Connected to OS successfully!")
        scanActiveWhatsAppNotifications()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        AppLogManager.log("WARN", "WhatsAppListener", "NotificationListenerService Disconnected. Requesting rebind...")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                requestRebind(ComponentName(this, WhatsAppCallNotificationListener::class.java))
            } catch (e: Exception) {
                AppLogManager.log("ERROR", "WhatsAppListener", "Error rebinding listener: ${e.message}")
            }
        }
    }

    private fun scanActiveWhatsAppNotifications() {
        try {
            val activeNotifications = activeNotifications ?: return
            for (sbn in activeNotifications) {
                processNotificationPosted(sbn)
            }
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "WhatsAppListener", "Error scanning active notifications: ${e.message}")
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        processNotificationPosted(sbn)
    }

    private fun processNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName

        val isWhatsAppPackage = packageName.startsWith("com.whatsapp") ||
                packageName == "com.gbwhatsapp" ||
                packageName == "com.whatsapp.clone" ||
                packageName == "com.whatsapp.dual"

        if (!isWhatsAppPackage) return

        val notification = sbn.notification
        val extras = notification.extras

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            ?: extras.getCharSequence("android.title")?.toString() ?: ""

        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getCharSequence("android.text")?.toString() ?: ""

        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
        val category = notification.category ?: ""
        val tag = sbn.tag ?: ""

        val combinedStr = "$title $text $subText $category $tag".lowercase()

        // Explicitly ignore text/chat message notifications
        val isTextMessage = combinedStr.contains("messages") || 
                combinedStr.contains("message") || 
                combinedStr.contains("unread") || 
                combinedStr.contains("reply") || 
                combinedStr.contains("chat") ||
                title.lowercase().contains("messages)")

        if (isTextMessage) return

        val actions = notification.actions
        val hasCallActions = actions != null && actions.any { action ->
            val actionTitle = action.title?.toString()?.lowercase() ?: ""
            actionTitle.contains("decline") || actionTitle.contains("answer") || actionTitle.contains("hang") ||
            actionTitle.contains("mute") || actionTitle.contains("speaker") || actionTitle.contains("call") ||
            actionTitle.contains("end") || actionTitle.contains("reject")
        }

        val hasExplicitCallPhrase = combinedStr.contains("whatsapp call") ||
                combinedStr.contains("voice call") ||
                combinedStr.contains("video call") ||
                combinedStr.contains("ongoing voice call") ||
                combinedStr.contains("ongoing video call") ||
                combinedStr.contains("incoming voice call") ||
                combinedStr.contains("incoming video call") ||
                combinedStr.contains("calling...") ||
                combinedStr.contains("ringing...") ||
                combinedStr.contains("आवाज कॉल") ||
                combinedStr.contains("वीडियो कॉल")

        val isCallNotification = category == Notification.CATEGORY_CALL ||
                (hasCallActions && (hasExplicitCallPhrase || tag.contains("call", ignoreCase = true))) ||
                hasExplicitCallPhrase

        if (isCallNotification) {
            activeCallNotificationKey = sbn.key
            activeCallNotificationId = sbn.id

            if (!isCallRecordingActive) {
                isCallRecordingActive = true
                callStartTimeMs = System.currentTimeMillis()

                currentCallDirection = if (combinedStr.contains("incoming") || combinedStr.contains("आगमन")) {
                    "INCOMING"
                } else {
                    "OUTGOING"
                }

                currentContactTitle = when {
                    title.isNotBlank() && !title.equals("WhatsApp", ignoreCase = true) -> title
                    text.isNotBlank() && !text.contains("call", ignoreCase = true) -> text
                    else -> "WhatsApp Contact"
                }

                AppLogManager.log("INFO", "WhatsAppListener", "Active WhatsApp call DETECTED: $packageName ($currentContactTitle) [$currentCallDirection]")
                audioRecorder.startRecording(currentContactTitle)
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        sbn ?: return
        val packageName = sbn.packageName
        val isWhatsAppPackage = packageName.startsWith("com.whatsapp") ||
                packageName == "com.gbwhatsapp" ||
                packageName == "com.whatsapp.clone" ||
                packageName == "com.whatsapp.dual"

        if (isWhatsAppPackage && isCallRecordingActive) {
            val isTargetNotification = sbn.key == activeCallNotificationKey || sbn.id == activeCallNotificationId
            if (!isTargetNotification) return

            // Debounce: verify if any remaining active notification is still a WhatsApp call before ending call
            val hasOtherCallNotification = try {
                activeNotifications?.any { other ->
                    other.packageName.startsWith("com.whatsapp") &&
                    other.key != sbn.key &&
                    (other.notification.category == Notification.CATEGORY_CALL ||
                     (other.tag ?: "").contains("call", ignoreCase = true))
                } == true
            } catch (e: Exception) {
                false
            }

            if (!hasOtherCallNotification) {
                AppLogManager.log("INFO", "WhatsAppListener", "WhatsApp notification REMOVED for $packageName. Finishing call tracking.")
                finishWhatsAppCall()
            }
        }
    }

    private fun finishWhatsAppCall() {
        if (!isCallRecordingActive) return
        isCallRecordingActive = false

        val durationSec = Math.max(1L, (System.currentTimeMillis() - callStartTimeMs) / 1000)
        val recordedFile: File? = audioRecorder.stopRecording()
        AppLogManager.log("INFO", "WhatsAppListener", "WhatsApp call FINISHED. Duration: ${durationSec}s File: ${recordedFile?.name ?: "Metadata Only"}")

        saveAndSyncWhatsAppCall(recordedFile, durationSec, currentContactTitle, currentCallDirection)
        activeCallNotificationKey = null
        activeCallNotificationId = -1
    }

    private fun saveAndSyncWhatsAppCall(audioFile: File?, durationSeconds: Long, contactName: String, direction: String) {
        val context = applicationContext
        val db = AppDatabase.getInstance(context)
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "ANDROID_WHATSAPP_DEVICE"
        val deviceId = "ANDROID-${Build.MODEL.replace(" ", "_")}-$androidId"

        // Clean phone digits if contactName contains a raw phone number with possible time prefixes
        val digitsOnly = contactName.replace("\\D".toRegex(), "")
        val cleanPhone = if (digitsOnly.length >= 10) "+91 ${digitsOnly.takeLast(10).chunked(5).joinToString(" ")}" else contactName

        val idempotencyKey = "WA_${System.currentTimeMillis()}_${cleanPhone.hashCode()}"

        val event = CallEventEntity(
            deviceId = deviceId,
            idempotencyKey = idempotencyKey,
            phoneNumber = cleanPhone,
            direction = direction,
            status = "ANSWERED",
            startTime = callStartTimeMs,
            endTime = System.currentTimeMillis(),
            durationSeconds = durationSeconds.toInt(),
            simSlot = 0,
            isPrivate = false,
            recordingPath = audioFile?.absolutePath,
            recordingStatus = if (audioFile != null && audioFile.exists()) "PENDING_UPLOAD" else "NONE",
            disposition = "WhatsApp Call",
            syncStatus = "PENDING"
        )

        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Check if a call for the same number was created in local DB within the last 90 seconds
                val recentEvents = db.callEventDao().getPendingSyncEvents()
                val existingMatch = recentEvents.firstOrNull { existing ->
                    val existingDigits = existing.phoneNumber.replace("\\D".toRegex(), "").takeLast(10)
                    val currentDigits = cleanPhone.replace("\\D".toRegex(), "").takeLast(10)
                    (existing.disposition.contains("WhatsApp", ignoreCase = true) || existing.idempotencyKey.startsWith("WA_")) &&
                    existingDigits == currentDigits &&
                    Math.abs(existing.startTime - callStartTimeMs) < 90000
                }

                if (existingMatch != null) {
                    AppLogManager.log("SYNC", "WhatsAppListener", "Merging with existing WhatsApp call record (${existingMatch.idempotencyKey}) instead of creating duplicate.")
                    val updatedDuration = Math.max(existingMatch.durationSeconds, durationSeconds.toInt())
                    val updatedRecording = audioFile?.absolutePath ?: existingMatch.recordingPath
                    val updatedStatus = if (updatedRecording != null && File(updatedRecording).exists()) "PENDING_UPLOAD" else existingMatch.recordingStatus

                    db.callEventDao().insertCallEvent(
                        existingMatch.copy(
                            durationSeconds = updatedDuration,
                            recordingPath = updatedRecording,
                            recordingStatus = updatedStatus,
                            endTime = Math.max(existingMatch.endTime, System.currentTimeMillis()),
                            syncStatus = "PENDING"
                        )
                    )
                } else {
                    db.callEventDao().insertCallEvent(event)
                    AppLogManager.log("SYNC", "WhatsAppListener", "Saved WhatsApp call to Room DB: $cleanPhone (${durationSeconds}s)")
                }

                val syncRequest = OneTimeWorkRequestBuilder<CallSyncWorker>().build()
                WorkManager.getInstance(context).enqueueUniqueWork(
                    "CallSyncWorkerOneTime",
                    ExistingWorkPolicy.REPLACE,
                    syncRequest
                )
            } catch (e: Exception) {
                AppLogManager.log("ERROR", "WhatsAppListener", "Failed to save WhatsApp call event: ${e.message}")
            }
        }
    }
}
