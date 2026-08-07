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
        super.onCreate()

        startCallObserverService()

        setContent {
            RecordHubTheme {
                var currentStep by remember { mutableStateOf(0) } // 0: Onboarding, 1: Permissions, 2: MainApp
                val scope = rememberCoroutineScope()

                val db = remember { AppDatabase.getInstance(applicationContext) }
                val trackedCallsFlow = db.callEventDao().getTrackedCallsFlow().collectAsState(initial = emptyList())
                val privateCallsFlow = db.callEventDao().getPrivateCallsFlow().collectAsState(initial = emptyList())

                when (currentStep) {
                    0 -> OnboardingScreen(onProceedToPermissions = { currentStep = 1 })
                    1 -> PermissionsScreen(onPermissionsGranted = { currentStep = 2 })
                    else -> MainContainerScreen(
                        trackedCalls = trackedCallsFlow.value,
                        privateCalls = privateCallsFlow.value,
                        onTogglePrivate = { callId ->
                            scope.launch {
                                db.callEventDao().setPrivateState(callId, true)
                            }
                        },
                        onLogout = { currentStep = 0 }
                    )
                }
            }
        }
    }

    private fun startCallObserverService() {
        val serviceIntent = Intent(this, CallObserverService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }
}
