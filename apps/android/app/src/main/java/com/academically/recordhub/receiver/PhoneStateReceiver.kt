package com.academically.recordhub.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.TelephonyManager
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.academically.recordhub.service.CallObserverService
import com.academically.recordhub.utils.AppLogManager
import com.academically.recordhub.utils.CallLogScanner
import com.academically.recordhub.worker.CallSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class PhoneStateReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != TelephonyManager.ACTION_PHONE_STATE_CHANGED && action != "android.intent.action.NEW_OUTGOING_CALL") {
            return
        }

        val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: ""
        
        Log.i(TAG, "PhoneStateReceiver received state: $stateStr for number: $incomingNumber")

        val prefs = context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
        val isLoggedIn = prefs.getBoolean("is_logged_in", false)
        if (!isLoggedIn) return

        // 1. Ensure WhatsApp Listener is active
        try {
            if (com.academically.recordhub.service.WhatsAppCallNotificationListener.isNotificationListenerEnabled(context)) {
                if (!com.academically.recordhub.service.WhatsAppCallNotificationListener.isConnected || com.academically.recordhub.service.WhatsAppCallNotificationListener.instance == null) {
                    com.academically.recordhub.service.WhatsAppCallNotificationListener.triggerRebind(context)
                }
            }
        } catch (_: Exception) {}

        // 2. Safely attempt to start CallObserverService without crashing on Android 12+ FGS restrictions
        try {
            val serviceIntent = Intent(context, CallObserverService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Foreground service start deferred (Android 12+ FGS restriction): ${e.message}")
        }

        // 3. When call ends (IDLE state), trigger auto-scan & immediate server sync via WorkManager
        if (stateStr == TelephonyManager.EXTRA_STATE_IDLE) {
            AppLogManager.log("SYNC", TAG, "SIM Call ended (IDLE detected via BroadcastReceiver). Scheduling CallSyncWorker...")

            // Immediate pass via coroutine
            val pendingResult = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    delay(1500)
                    CallLogScanner.scanRecentCallLogs(context.applicationContext)
                } catch (e: Exception) {
                    Log.w(TAG, "Instant scan error in PhoneStateReceiver: ${e.message}")
                } finally {
                    try {
                        pendingResult.finish()
                    } catch (_: Exception) {}
                }
            }

            try {
                // Pass 1: Run after 4s (allowing OEM dialers on Samsung/Xiaomi/Vivo to finish writing audio)
                val primarySync = OneTimeWorkRequestBuilder<CallSyncWorker>()
                    .setInitialDelay(4, java.util.concurrent.TimeUnit.SECONDS)
                    .build()
                WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                    "CallSyncWorkerOneTime",
                    ExistingWorkPolicy.REPLACE,
                    primarySync
                )

                // Pass 2: Secondary safety pass after 12s for slow OEM encoders
                val secondarySync = OneTimeWorkRequestBuilder<CallSyncWorker>()
                    .setInitialDelay(12, java.util.concurrent.TimeUnit.SECONDS)
                    .build()
                WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                    "CallSyncWorkerSecondary",
                    ExistingWorkPolicy.REPLACE,
                    secondarySync
                )
            } catch (e: Exception) {
                AppLogManager.log("ERROR", TAG, "Failed to schedule CallSyncWorker from PhoneStateReceiver: ${e.message}")
            }
        }
    }

    companion object {
        private const val TAG = "PhoneStateReceiver"
    }
}
