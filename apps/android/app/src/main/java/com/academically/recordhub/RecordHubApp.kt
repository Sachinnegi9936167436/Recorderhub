package com.academically.recordhub

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.work.Configuration
import androidx.work.WorkManager

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import com.academically.recordhub.service.CallObserverService
import com.academically.recordhub.worker.CallSyncWorker
import java.util.concurrent.TimeUnit

class RecordHubApp : Application(), Configuration.Provider {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        startBackgroundMonitoringIfLoggedIn()
    }

    private fun startBackgroundMonitoringIfLoggedIn() {
        try {
            val prefs = getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
            val isLoggedIn = prefs.getBoolean("is_logged_in", false)
            if (isLoggedIn) {
                // 1. Start persistent Foreground Service
                val serviceIntent = Intent(this, CallObserverService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }

                // 2. Schedule 15-minute fallback Periodic WorkManager
                val syncWorkRequest = PeriodicWorkRequestBuilder<CallSyncWorker>(
                    15, TimeUnit.MINUTES
                ).build()
                WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                    "CallSyncWorkerPeriodic",
                    ExistingPeriodicWorkPolicy.KEEP,
                    syncWorkRequest
                )
            }
        } catch (e: Exception) {
            Log.e("RecordHubApp", "Error initializing background monitoring in Application: ${e.message}")
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                SERVICE_CHANNEL_ID,
                "RecordHub Active Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Persistent indicator active during business call logging."
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()

    companion object {
        const val SERVICE_CHANNEL_ID = "recordhub_service_channel"
    }
}
