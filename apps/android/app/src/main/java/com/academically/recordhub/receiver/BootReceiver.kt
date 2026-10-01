package com.academically.recordhub.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.academically.recordhub.service.CallObserverService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (Intent.ACTION_BOOT_COMPLETED == action || Intent.ACTION_MY_PACKAGE_REPLACED == action) {
            Log.i("BootReceiver", "Boot / Package Replaced detected. Restoring RecordHub background sync & services.")

            val prefs = context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
            val isLoggedIn = prefs.getBoolean("is_logged_in", false)
            if (!isLoggedIn) return

            // 1. Re-enqueue WorkManager periodic & immediate sync
            try {
                val syncWorkRequest = androidx.work.PeriodicWorkRequestBuilder<com.academically.recordhub.worker.CallSyncWorker>(
                    15, java.util.concurrent.TimeUnit.MINUTES
                ).build()
                androidx.work.WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    "CallSyncWorkerPeriodic",
                    androidx.work.ExistingPeriodicWorkPolicy.UPDATE,
                    syncWorkRequest
                )

                val oneTime = androidx.work.OneTimeWorkRequestBuilder<com.academically.recordhub.worker.CallSyncWorker>().build()
                androidx.work.WorkManager.getInstance(context).enqueueUniqueWork(
                    "CallSyncWorkerOneTime",
                    androidx.work.ExistingWorkPolicy.REPLACE,
                    oneTime
                )
            } catch (e: Exception) {
                Log.w("BootReceiver", "Error re-scheduling WorkManager on boot: ${e.message}")
            }

            // 2. Re-trigger WhatsApp NotificationListener
            try {
                if (com.academically.recordhub.service.WhatsAppCallNotificationListener.isNotificationListenerEnabled(context)) {
                    com.academically.recordhub.service.WhatsAppCallNotificationListener.triggerRebind(context)
                }
            } catch (e: Exception) {
                Log.w("BootReceiver", "Error rebinding WhatsApp listener on boot: ${e.message}")
            }

            // 3. Safe Foreground Service launch
            try {
                val serviceIntent = Intent(context, CallObserverService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } catch (e: Exception) {
                Log.w("BootReceiver", "Foreground service launch restricted on boot: ${e.message}")
            }
        }
    }
}
