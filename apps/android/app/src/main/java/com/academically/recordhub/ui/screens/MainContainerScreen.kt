package com.academically.recordhub.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp
import com.academically.recordhub.data.local.CallEventEntity
import com.academically.recordhub.ui.theme.*

@Composable
fun MainContainerScreen(
    trackedCalls: List<CallEventEntity>,
    privateCalls: List<CallEventEntity>,
    onTogglePrivate: (String) -> Unit,
    onSelectSafFolder: () -> Unit,
    onScanCallLogs: () -> Unit,
    onLogout: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Navy900,
                contentColor = Slate200
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { 
                        selectedTab = 0 
                        com.academically.recordhub.utils.AppLogManager.log("INFO", "UI_Nav", "Switched to Tab 0: Tracked Calls")
                    },
                    icon = { Icon(Icons.Default.Call, contentDescription = "Calls") },
                    label = { Text("Tracked", maxLines = 1, fontSize = 9.5.sp, softWrap = false) },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = MedicalTeal400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { 
                        selectedTab = 1 
                        com.academically.recordhub.utils.AppLogManager.log("INFO", "UI_Nav", "Switched to Tab 1: Private Calls")
                    },
                    icon = { Icon(Icons.Default.Lock, contentDescription = "Private") },
                    label = { Text("Private", maxLines = 1, fontSize = 9.5.sp, softWrap = false) },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = Amber400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { 
                        selectedTab = 2 
                        com.academically.recordhub.utils.AppLogManager.log("INFO", "UI_Nav", "Switched to Tab 2: Uploads & Recordings")
                    },
                    icon = { Icon(Icons.Default.CloudUpload, contentDescription = "Uploads") },
                    label = { Text("Uploads", maxLines = 1, fontSize = 9.5.sp, softWrap = false) },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = MedicalTeal400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { 
                        selectedTab = 3 
                        com.academically.recordhub.utils.AppLogManager.log("INFO", "UI_Nav", "Switched to Tab 3: System & Sync Logs")
                    },
                    icon = { Icon(Icons.Default.ListAlt, contentDescription = "Logs") },
                    label = { Text("Logs", maxLines = 1, fontSize = 9.5.sp, softWrap = false) },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = Emerald400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 4,
                    onClick = { 
                        selectedTab = 4 
                        com.academically.recordhub.utils.AppLogManager.log("INFO", "UI_Nav", "Switched to Tab 4: Device Health")
                    },
                    icon = { Icon(Icons.Default.Smartphone, contentDescription = "Health") },
                    label = { Text("Health", maxLines = 1, fontSize = 9.5.sp, softWrap = false) },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = MedicalTeal400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 5,
                    onClick = { 
                        selectedTab = 5 
                        com.academically.recordhub.utils.AppLogManager.log("INFO", "UI_Nav", "Switched to Tab 5: Settings")
                    },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings", maxLines = 1, fontSize = 9.5.sp, softWrap = false) },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = MedicalTeal400, indicatorColor = Navy800)
                )
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier.padding(innerPadding),
            color = Navy950
        ) {
            when (selectedTab) {
                0 -> TrackedCallsScreen(
                    callEvents = trackedCalls,
                    onTogglePrivate = onTogglePrivate,
                    onScanCallLogs = onScanCallLogs
                )
                1 -> PrivateCallsScreen(privateCalls = privateCalls)
                2 -> RecordingUploadScreen(
                    recordings = trackedCalls,
                    onSelectSafFolder = onSelectSafFolder,
                    onSyncNow = onScanCallLogs
                )
                3 -> AppLogsScreen(onScanLogsTrigger = onScanCallLogs)
                4 -> DeviceHealthScreen()
                5 -> SettingsScreen(onLogout = onLogout, onSelectSafFolder = onSelectSafFolder)
            }
        }
    }
}
