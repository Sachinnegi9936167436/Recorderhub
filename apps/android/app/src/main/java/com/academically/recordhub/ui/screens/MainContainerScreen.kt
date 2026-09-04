package com.academically.recordhub.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.data.local.CallEventEntity

private val ScreenBg = Color(0xFFFAFAFA)
private val BottomNavBg = Color(0xFFFFFFFF)
private val TextPrimary = Color(0xFF1A1F2C)
private val TextSecondary = Color(0xFF64748B)
private val AmberActive = Color(0xFFFAB005)

@Composable
fun MainContainerScreen(
    trackedCalls: List<CallEventEntity>,
    onSelectSafFolder: () -> Unit,
    onScanCallLogs: () -> Unit,
    onLogout: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showLogsModal by remember { mutableStateOf(false) }

    val pendingUploadsCount = remember(trackedCalls) {
        trackedCalls.count { it.recordingStatus == "PENDING_UPLOAD" }
    }

    Scaffold(
        containerColor = ScreenBg,
        bottomBar = {
            NavigationBar(
                containerColor = BottomNavBg,
                contentColor = TextSecondary,
                tonalElevation = 8.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(68.dp)
            ) {
                // Tab 0: Call History
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Call,
                            contentDescription = "Call History",
                            tint = if (selectedTab == 0) AmberActive else TextSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                    },
                    label = {
                        Text(
                            text = "Call History",
                            fontSize = 10.5.sp,
                            fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Medium,
                            color = if (selectedTab == 0) TextPrimary else TextSecondary
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = AmberActive.copy(alpha = 0.15f)
                    )
                )

                // Tab 1: Analytics
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.BarChart,
                            contentDescription = "Analytics",
                            tint = if (selectedTab == 1) AmberActive else TextSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                    },
                    label = {
                        Text(
                            text = "Analytics",
                            fontSize = 10.5.sp,
                            fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Medium,
                            color = if (selectedTab == 1) TextPrimary else TextSecondary
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = AmberActive.copy(alpha = 0.15f)
                    )
                )

                // Tab 2: Cloud / Recordings
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = {
                        BadgedBox(
                            badge = {
                                if (pendingUploadsCount > 0) {
                                    Badge(containerColor = Color(0xFFEF4444)) {
                                        Text(
                                            text = "$pendingUploadsCount",
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.CloudUpload,
                                contentDescription = "Cloud Sync",
                                tint = if (selectedTab == 2) AmberActive else TextSecondary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    },
                    label = {
                        Text(
                            text = "Cloud Sync",
                            fontSize = 10.5.sp,
                            fontWeight = if (selectedTab == 2) FontWeight.Bold else FontWeight.Medium,
                            color = if (selectedTab == 2) TextPrimary else TextSecondary
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = AmberActive.copy(alpha = 0.15f)
                    )
                )

                // Tab 3: Contacts
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Contacts",
                            tint = if (selectedTab == 3) AmberActive else TextSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                    },
                    label = {
                        Text(
                            text = "Contacts",
                            fontSize = 10.5.sp,
                            fontWeight = if (selectedTab == 3) FontWeight.Bold else FontWeight.Medium,
                            color = if (selectedTab == 3) TextPrimary else TextSecondary
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = AmberActive.copy(alpha = 0.15f)
                    )
                )

                // Tab 4: More / Settings
                NavigationBarItem(
                    selected = selectedTab == 4,
                    onClick = { selectedTab = 4 },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "More",
                            tint = if (selectedTab == 4) AmberActive else TextSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                    },
                    label = {
                        Text(
                            text = "More",
                            fontSize = 10.5.sp,
                            fontWeight = if (selectedTab == 4) FontWeight.Bold else FontWeight.Medium,
                            color = if (selectedTab == 4) TextPrimary else TextSecondary
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = AmberActive.copy(alpha = 0.15f)
                    )
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (showLogsModal) {
                AppLogsScreen(
                    onScanLogsTrigger = onScanCallLogs,
                    onClose = { showLogsModal = false }
                )
            } else {
                when (selectedTab) {
                    0 -> TrackedCallsScreen(
                        callEvents = trackedCalls,
                        onScanCallLogs = onScanCallLogs
                    )
                    1 -> AnalyticsScreen(
                        callEvents = trackedCalls
                    )
                    2 -> RecordingUploadScreen(
                        recordings = trackedCalls,
                        onSelectSafFolder = onSelectSafFolder,
                        onSyncNow = onScanCallLogs
                    )
                    3 -> ContactsScreen(
                        callEvents = trackedCalls
                    )
                    4 -> SettingsScreen(
                        onLogout = onLogout,
                        onSelectSafFolder = onSelectSafFolder,
                        onOpenLogs = { showLogsModal = true }
                    )
                }
            }
        }
    }
}
