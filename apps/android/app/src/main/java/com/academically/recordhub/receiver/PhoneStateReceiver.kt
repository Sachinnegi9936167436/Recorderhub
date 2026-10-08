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
import com.academically.recordhub.utils.AppLogManager
import com.academically.recordhub.worker.CallSyncWorker

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

        // 1. Ensure WhatsApp Listener is active (safe, rate-limited rebind check)
        try {
            if (com.academically.recordhub.service.WhatsAppCallNotificationListener.isNotificationListenerEnabled(context)) {
                if (!com.academically.recordhub.service.WhatsAppCallNotificationListener.isConnected || com.academically.recordhub.service.WhatsAppCallNotificationListener.instance == null) {
                    com.academically.recordhub.service.WhatsAppCallNotificationListener.triggerRebind(context)
                }
            }
        } catch (_: Exception) {}

        // 2. When call ends (IDLE state), delegate scan & sync immediately to WorkManager.
        // NOTE: Never call startForegroundService from a background BroadcastReceiver (causes Android 12+ FGS crashes / ANRs).
        // NOTE: Never execute heavy disk/audio scanning inside onReceive or goAsync (causes BroadcastQueue timeout ANRs).
        if (stateStr == TelephonyManager.EXTRA_STATE_IDLE) {
            AppLogManager.log("SYNC", TAG, "SIM Call ended (IDLE detected via BroadcastReceiver). Enqueuing CallSyncWorker...")

            try {
                // Pass 1: Run after 2.5s (allowing Android telephony provider & OEM dialers on Xiaomi/Samsung/Vivo to finish writing audio)
                val primarySync = OneTimeWorkRequestBuilder<CallSyncWorker>()
                    .setInitialDelay(2500, java.util.concurrent.TimeUnit.MILLISECONDS)
                    .build()
                WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                    "CallSyncWorkerOneTime",
                    ExistingWorkPolicy.REPLACE,
                    primarySync
                )

                // Pass 2: Secondary safety pass after 10s for slow OEM encoders
                val secondarySync = OneTimeWorkRequestBuilder<CallSyncWorker>()
                    .setInitialDelay(10, java.util.concurrent.TimeUnit.SECONDS)
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
