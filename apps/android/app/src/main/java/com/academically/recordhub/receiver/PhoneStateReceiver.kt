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

        // Ensure CallObserverService is running
        try {
            val serviceIntent = Intent(context, CallObserverService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not start CallObserverService from PhoneStateReceiver: ${e.message}")
        }

        // When call ends (IDLE state), trigger auto-scan & immediate server sync via WorkManager
        if (stateStr == TelephonyManager.EXTRA_STATE_IDLE) {
            AppLogManager.log("SYNC", TAG, "SIM Call ended (IDLE detected via BroadcastReceiver). Scheduling CallSyncWorker...")

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
