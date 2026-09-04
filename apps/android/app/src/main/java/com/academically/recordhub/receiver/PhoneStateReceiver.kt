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

        // When call ends (IDLE state), trigger auto-scan & immediate server sync
        if (stateStr == TelephonyManager.EXTRA_STATE_IDLE) {
            AppLogManager.log("SYNC", TAG, "SIM Call ended (IDLE detected via BroadcastReceiver). Triggering auto-scan & upload...")
            
            val pendingResult = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    // Initial pass: wait 4.5s for OEM dialer (Xiaomi/Samsung/Vivo) to finish saving audio file
                    delay(4500)
                    val count = CallLogScanner.scanRecentCallLogs(context.applicationContext)
                    AppLogManager.log("SYNC", TAG, "PhoneStateReceiver scanned $count call log(s). Enqueuing CallSyncWorker...")

                    val syncRequest = OneTimeWorkRequestBuilder<CallSyncWorker>().build()
                    WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                        "CallSyncWorkerOneTime",
                        ExistingWorkPolicy.REPLACE,
                        syncRequest
                    )

                    // Secondary safety scan for slow OEM encoders
                    delay(8000)
                    val retryCount = CallLogScanner.scanRecentCallLogs(context.applicationContext)
                    if (retryCount > 0) {
                        AppLogManager.log("SYNC", TAG, "Linked $retryCount additional recording(s) on secondary scan. Re-syncing...")
                        val secondarySync = OneTimeWorkRequestBuilder<CallSyncWorker>().build()
                        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                            "CallSyncWorkerOneTime",
                            ExistingWorkPolicy.REPLACE,
                            secondarySync
                        )
                    }
                } catch (e: Exception) {
                    AppLogManager.log("ERROR", TAG, "Error in PhoneStateReceiver async scan: ${e.message}")
                } finally {
                    try {
                        pendingResult.finish()
                    } catch (_: Exception) {}
                }
            }
        }
    }

    companion object {
        private const val TAG = "PhoneStateReceiver"
    }
}
