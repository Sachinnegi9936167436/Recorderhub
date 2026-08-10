package com.academically.recordhub

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.service.CallObserverService
import com.academically.recordhub.ui.screens.MainContainerScreen
import com.academically.recordhub.ui.screens.OnboardingScreen
import com.academically.recordhub.ui.screens.PermissionsScreen
import com.academically.recordhub.ui.theme.RecordHubTheme
import com.academically.recordhub.utils.AppLogManager
import com.academically.recordhub.utils.CallLogScanner
import com.academically.recordhub.worker.CallSyncWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AppLogManager.log("INFO", "System", "MainActivity onCreate - Initializing RecordHub App.")

        startCallObserverService()
        schedulePeriodicCallSync()

        setContent {
            RecordHubTheme {
                val prefs = remember { getSharedPreferences("recordhub_prefs", MODE_PRIVATE) }
                val isLoggedIn = remember { prefs.getBoolean("is_logged_in", false) }
                var currentStep by remember { mutableStateOf(if (isLoggedIn) 2 else 0) }
                val scope = rememberCoroutineScope()

                val db = remember { AppDatabase.getInstance(applicationContext) }
                val trackedCallsFlow = db.callEventDao().getTrackedCallsFlow().collectAsState(initial = emptyList())
                val privateCallsFlow = db.callEventDao().getPrivateCallsFlow().collectAsState(initial = emptyList())

                val safFolderLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                    contract = androidx.activity.result.contract.ActivityResultContracts.OpenDocumentTree()
                ) { uri: android.net.Uri? ->
                    if (uri != null) {
                        try {
                            contentResolver.takePersistableUriPermission(
                                uri,
                                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                            )
                            AppLogManager.log("INFO", "UI_Action", "SAF Recording Folder Authorized: $uri")
                            android.widget.Toast.makeText(
                                applicationContext,
                                "Authorized Call Recording Folder!",
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                        } catch (e: Exception) {
                            AppLogManager.log("ERROR", "UI_Action", "Error authorizing SAF folder permission: ${e.message}")
                        }
                    }
                }

                val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                    contract = androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()
                ) { permissions ->
                    AppLogManager.log("INFO", "UI_Action", "Permissions Result Handled: ${permissions.filterValues { it }.keys}")
                    scope.launch(Dispatchers.IO) {
                        CallLogScanner.scanRecentCallLogs(applicationContext)
                        triggerImmediateSync()
                    }
                    startCallObserverService()
                    currentStep = 2
                }

                LaunchedEffect(Unit) {
                    scope.launch(Dispatchers.IO) {
                        AppLogManager.log("SYNC", "Background", "Initial CallLog Scanner & AWS S3 Sync Triggered.")
                        CallLogScanner.scanRecentCallLogs(applicationContext)
                        triggerImmediateSync()
                    }
                }

                when (currentStep) {
                    0 -> OnboardingScreen(onProceedToPermissions = { 
                        AppLogManager.log("INFO", "UI_Action", "User tapped 'Get Started' on Onboarding Screen.")
                        currentStep = 1 
                    })
                    1 -> PermissionsScreen(onPermissionsGranted = {
                        AppLogManager.log("INFO", "UI_Action", "User tapped 'Grant All Permissions' Button.")
                        val perms = mutableListOf(
                            android.Manifest.permission.READ_CALL_LOG,
                            android.Manifest.permission.READ_PHONE_STATE,
                            android.Manifest.permission.RECORD_AUDIO
                        )
                        if (Build.VERSION.SDK_INT >= 33) {
                            perms.add("android.permission.POST_NOTIFICATIONS")
                        }
                        permissionLauncher.launch(perms.toTypedArray())

                        if (!isNotificationListenerEnabled(applicationContext)) {
                            try {
                                AppLogManager.log("INFO", "UI_Action", "Opening Notification Listener Settings for WhatsApp...")
                                val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                startActivity(intent)
                            } catch (e: Exception) {
                                AppLogManager.log("ERROR", "UI_Action", "Error opening Notification Listener settings: ${e.message}")
                            }
                        }
                    })
                    else -> MainContainerScreen(
                        trackedCalls = trackedCallsFlow.value,
                        privateCalls = privateCallsFlow.value,
                        onTogglePrivate = { callId ->
                            AppLogManager.log("INFO", "UI_Action", "User toggled privacy for call ID: $callId")
                            scope.launch {
                                db.callEventDao().setPrivateState(callId, true)
                            }
                        },
                        onSelectSafFolder = {
                            AppLogManager.log("INFO", "UI_Action", "User tapped 'Change Call Recording Folder' Button.")
                            safFolderLauncher.launch(null)
                        },
                        onScanCallLogs = {
                            AppLogManager.log("INFO", "UI_Action", "User tapped 'Scan & Sync Call Logs' Button.")
                            scope.launch(Dispatchers.IO) {
                                val count = CallLogScanner.scanRecentCallLogs(applicationContext)
                                triggerImmediateSync()

                                withContext(Dispatchers.Main) {
                                    android.widget.Toast.makeText(
                                        applicationContext,
                                        "Scanned call logs & syncing all call events to Cloud!",
                                        android.widget.Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                        },
                        onLogout = {
                            AppLogManager.log("INFO", "UI_Action", "User tapped 'Log Out' Button.")
                            prefs.edit().putBoolean("is_logged_in", false).apply()
                            currentStep = 0
                        }
                    )
                }
            }
        }
    }

    private fun startCallObserverService() {
        try {
            AppLogManager.log("INFO", "Background", "Starting CallObserverService Foreground Telephony Monitor.")
            val intent = Intent(this, CallObserverService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "Background", "Failed to start CallObserverService: ${e.message}")
        }
    }

    private fun schedulePeriodicCallSync() {
        try {
            AppLogManager.log("SYNC", "Background", "Enqueuing 15-Minute Periodic CallSyncWorker for AWS S3 Sync.")
            val syncWorkRequest = PeriodicWorkRequestBuilder<CallSyncWorker>(
                15, TimeUnit.MINUTES
            ).build()

            WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
                "CallSyncWorkerPeriodic",
                ExistingPeriodicWorkPolicy.KEEP,
                syncWorkRequest
            )
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "Background", "Failed to schedule periodic WorkManager: ${e.message}")
        }
    }

    private fun triggerImmediateSync() {
        try {
            AppLogManager.log("SYNC", "Background", "Enqueuing Immediate OneTime CallSyncWorker for AWS S3 Sync.")
            val syncRequest = OneTimeWorkRequestBuilder<CallSyncWorker>().build()
            WorkManager.getInstance(applicationContext).enqueueUniqueWork(
                "CallSyncWorkerOneTime",
                ExistingWorkPolicy.REPLACE,
                syncRequest
            )
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "Background", "Failed to trigger immediate WorkManager: ${e.message}")
        }
    }

    private fun isNotificationListenerEnabled(context: Context): Boolean {
        val flat = android.provider.Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )
        return flat != null && flat.contains(context.packageName)
    }
}
