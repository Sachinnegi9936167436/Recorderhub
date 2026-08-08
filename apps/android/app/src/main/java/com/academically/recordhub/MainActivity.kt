package com.academically.recordhub

import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.local.CallEventEntity
import com.academically.recordhub.service.CallObserverService
import com.academically.recordhub.ui.screens.MainContainerScreen
import com.academically.recordhub.ui.screens.OnboardingScreen
import com.academically.recordhub.ui.screens.PermissionsScreen
import com.academically.recordhub.ui.theme.RecordHubTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        startCallObserverService()

        setContent {
            RecordHubTheme {
                var currentStep by remember { mutableStateOf(0) } // 0: Onboarding, 1: Permissions, 2: MainApp
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
                            android.widget.Toast.makeText(
                                applicationContext,
                                "Authorized Call Recording Folder!",
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                        } catch (e: Exception) {
                            android.util.Log.e("MainActivity", "Error taking persistable URI permission: ${e.message}")
                        }
                    }
                }

                val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                    contract = androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()
                ) { permissions ->
                    scope.launch {
                        com.academically.recordhub.utils.CallLogScanner.scanRecentCallLogs(applicationContext)
                    }
                    startCallObserverService()
                    currentStep = 2
                }

                LaunchedEffect(Unit) {
                    scope.launch {
                        com.academically.recordhub.utils.CallLogScanner.scanRecentCallLogs(applicationContext)
                    }
                }

                when (currentStep) {
                    0 -> OnboardingScreen(onProceedToPermissions = { currentStep = 1 })
                    1 -> PermissionsScreen(onPermissionsGranted = {
                        val perms = mutableListOf(
                            android.Manifest.permission.READ_CALL_LOG,
                            android.Manifest.permission.READ_PHONE_STATE,
                            android.Manifest.permission.RECORD_AUDIO
                        )
                        if (Build.VERSION.SDK_INT >= 33) {
                            perms.add("android.permission.POST_NOTIFICATIONS")
                        }
                        permissionLauncher.launch(perms.toTypedArray())
                    })
                    else -> MainContainerScreen(
                        trackedCalls = trackedCallsFlow.value,
                        privateCalls = privateCallsFlow.value,
                        onTogglePrivate = { callId ->
                            scope.launch {
                                db.callEventDao().setPrivateState(callId, true)
                            }
                        },
                        onSelectSafFolder = {
                            safFolderLauncher.launch(null)
                        },
                        onScanCallLogs = {
                            scope.launch {
                                val count = com.academically.recordhub.utils.CallLogScanner.scanRecentCallLogs(applicationContext)
                                android.widget.Toast.makeText(
                                    applicationContext,
                                    "Imported $count calls from Call Log!",
                                    android.widget.Toast.LENGTH_SHORT
                                ).show()
                            }
                        },
                        onLogout = { currentStep = 0 }
                    )
                }
            }
        }
    }

    private fun startCallObserverService() {
        try {
            val serviceIntent = Intent(this, CallObserverService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error starting CallObserverService: ${e.message}")
        }
    }
}
