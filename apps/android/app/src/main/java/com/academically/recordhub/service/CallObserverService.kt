package com.academically.recordhub.service

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.CallLog
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.academically.recordhub.RecordHubApp
import com.academically.recordhub.utils.AppLogManager
import com.academically.recordhub.utils.CallLogScanner
import com.academically.recordhub.worker.CallSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class CallObserverService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO)
    private var telephonyManager: TelephonyManager? = null
    private var lastState = TelephonyManager.CALL_STATE_IDLE
    private var callStartTimeMs: Long = 0
    private var incomingNumber: String = ""
    private var callLogContentObserver: ContentObserver? = null

    override fun onCreate() {
        super.onCreate()
        startForegroundServiceNotification()
        registerCallStateListener()
        registerCallLogContentObserver()
        ensureWhatsAppListenerActive()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        registerCallStateListener()
        registerCallLogContentObserver()
        return START_STICKY
    }

    private fun registerCallLogContentObserver() {
        if (callLogContentObserver != null) return
        try {
            if (ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.READ_CALL_LOG
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                val handler = Handler(Looper.getMainLooper())
                callLogContentObserver = object : ContentObserver(handler) {
                    override fun onChange(selfChange: Boolean) {
                        super.onChange(selfChange)
                        Log.i(TAG, "SIM Call Log change detected via ContentObserver. Triggering auto-scan & server sync...")
                        triggerAutoScanAndSync()
                    }
                }
                contentResolver.registerContentObserver(
                    CallLog.Calls.CONTENT_URI,
                    true,
                    callLogContentObserver!!
                )
                AppLogManager.log("INFO", TAG, "Registered CallLog ContentObserver for automatic SIM call log sync.")
            } else {
                Log.w(TAG, "READ_CALL_LOG permission not granted yet for ContentObserver.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering CallLog ContentObserver: ${e.message}")
        }
    }

    private fun triggerAutoScanAndSync() {
        serviceScope.launch {
            try {
                // Initial scan after 1.5s
                delay(1500)
                var count = CallLogScanner.scanRecentCallLogs(applicationContext)
                AppLogManager.log("SYNC", TAG, "Auto-scanned $count SIM call log(s) on initial pass.")

                // Secondary scan after 3.5s to catch delayed native audio file encoding
                delay(3500)
                val retryCount = CallLogScanner.scanRecentCallLogs(applicationContext)
                if (retryCount > 0) {
                    count += retryCount
                    AppLogManager.log("SYNC", TAG, "Linked $retryCount additional audio recording(s) on secondary scan pass.")
                }

                val syncRequest = androidx.work.OneTimeWorkRequestBuilder<CallSyncWorker>().build()
                androidx.work.WorkManager.getInstance(applicationContext).enqueueUniqueWork(
                    "CallSyncWorkerOneTime",
                    androidx.work.ExistingWorkPolicy.REPLACE,
                    syncRequest
                )
                AppLogManager.log("SYNC", TAG, "Enqueued immediate CallSyncWorker for automatic server upload.")
            } catch (e: Exception) {
                AppLogManager.log("ERROR", TAG, "Error auto-syncing SIM calls: ${e.message}")
            }
        }
    }

    private fun ensureWhatsAppListenerActive() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val componentName = android.content.ComponentName(this, WhatsAppCallNotificationListener::class.java)
                android.service.notification.NotificationListenerService.requestRebind(componentName)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting rebind for WhatsApp listener: ${e.message}")
        }
    }

    private fun startForegroundServiceNotification() {
        val notification: Notification = NotificationCompat.Builder(this, RecordHubApp.SERVICE_CHANNEL_ID)
            .setContentTitle("RecordHub Active Monitoring")
            .setContentText("Sales call tracking active for Academically Global Healthcare Academy")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
            } else {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            }
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun registerCallStateListener() {
        try {
            if (ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.READ_PHONE_STATE
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    telephonyManager?.registerTelephonyCallback(
                        mainExecutor,
                        object : android.telephony.TelephonyCallback(), android.telephony.TelephonyCallback.CallStateListener {
                            override fun onCallStateChanged(state: Int) {
                                handleCallState(state, incomingNumber)
                            }
                        }
                    )
                } else {
                    telephonyManager?.listen(callStateListener, PhoneStateListener.LISTEN_CALL_STATE)
                }
            } else {
                Log.w(TAG, "READ_PHONE_STATE permission not granted yet. Listener will activate once permission is granted.")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException registering TelephonyManager listener: ${e.message}")
        }
    }

    private val callStateListener = object : PhoneStateListener() {
        override fun onCallStateChanged(state: Int, phoneNumber: String?) {
            super.onCallStateChanged(state, phoneNumber)
            if (!phoneNumber.isNullOrEmpty()) {
                incomingNumber = phoneNumber
            }
            handleCallState(state, incomingNumber)
        }
    }

    private fun handleCallState(state: Int, phone: String) {
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                lastState = state
                callStartTimeMs = System.currentTimeMillis()
                Log.i(TAG, "Call State: RINGING from $phone")
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (lastState != TelephonyManager.CALL_STATE_RINGING) {
                    callStartTimeMs = System.currentTimeMillis()
                }
                lastState = state
                Log.i(TAG, "Call State: OFFHOOK (Active Call)")
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                if (lastState == TelephonyManager.CALL_STATE_OFFHOOK || lastState == TelephonyManager.CALL_STATE_RINGING) {
                    Log.i(TAG, "SIM Call Ended (IDLE). Triggering automatic call log scan and server sync...")
                    triggerAutoScanAndSync()
                }
                lastState = state
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        telephonyManager?.listen(callStateListener, PhoneStateListener.LISTEN_NONE)
        callLogContentObserver?.let {
            try {
                contentResolver.unregisterContentObserver(it)
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering CallLog ContentObserver: ${e.message}")
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "CallObserverService"
        private const val NOTIFICATION_ID = 9001
    }
}
