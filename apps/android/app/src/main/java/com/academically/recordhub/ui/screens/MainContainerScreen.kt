package com.academically.recordhub.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Call, contentDescription = "Calls") },
                    label = { Text("Tracked") },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = MedicalTeal400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.Lock, contentDescription = "Private") },
                    label = { Text("Private") },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = Amber400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.CloudUpload, contentDescription = "Uploads") },
                    label = { Text("Uploads") },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = MedicalTeal400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.Smartphone, contentDescription = "Health") },
                    label = { Text("Health") },
                    colors = NavigationBarItemDefaults.colors(selectedIconColor = Emerald400, indicatorColor = Navy800)
                )
                NavigationBarItem(
                    selected = selectedTab == 4,
                    onClick = { selectedTab = 4 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") },
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
                2 -> RecordingUploadScreen(onSelectSafFolder = onSelectSafFolder)
                3 -> DeviceHealthScreen()
                4 -> SettingsScreen(onLogout = onLogout)
            }
        }
    }
}
