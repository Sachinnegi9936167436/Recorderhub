package com.academically.recordhub.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.academically.recordhub.utils.AppLogManager

private val ScreenBg = Color(0xFFFAFAFA)
private val CardBg = Color(0xFFFFFFFF)
private val TextPrimary = Color(0xFF1A1F2C)
private val TextSecondary = Color(0xFF64748B)
private val CardBorderColor = Color(0xFFE2E8F0)
private val AmberGold = Color(0xFFFAB005)
private val GreenActive = Color(0xFF22C55E)
private val BluePrimary = Color(0xFF2563EB)
private val RedDanger = Color(0xFFEF4444)

@Composable
fun SettingsScreen(
    onLogout: () -> Unit,
    onSelectSafFolder: () -> Unit = {},
    onOpenLogs: () -> Unit = {}
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE) }
    
    val counselorEmail = remember { prefs.getString("counselor_email", "counselor@academically.com") ?: "counselor@academically.com" }
    val counselorName = remember { prefs.getString("counselor_name", "Academic Counselor") ?: "Academic Counselor" }
    val initials = remember(counselorName, counselorEmail) {
        if (counselorName.isNotBlank() && counselorName != "Academic Counselor") {
            counselorName.split(" ").mapNotNull { it.firstOrNull()?.toString() }.take(2).joinToString("").uppercase()
        } else {
            counselorEmail.take(2).uppercase()
        }
    }

    LaunchedEffect(Unit) {
        prefs.edit().putBoolean("wifi_only_upload", false).apply()
    }
    var autoSyncEnabled by remember { mutableStateOf(prefs.getBoolean("auto_sync_enabled", true)) }
    val scrollState = rememberScrollState()
    var showLogoutDialog by remember { mutableStateOf(false) }

    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
    val isAccessibilityOn = remember {
        mutableStateOf(com.academically.recordhub.service.RecordHubAccessibilityService.isAccessibilityServiceEnabled(context))
    }

    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                isAccessibilityOn.value = com.academically.recordhub.service.RecordHubAccessibilityService.isAccessibilityServiceEnabled(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    var activeFolderPath by remember {
        mutableStateOf(
            prefs.getString("custom_recording_folder", null)
                ?: prefs.getString("custom_recording_tree_uri", null)
                ?: "/Recordings/Call"
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ScreenBg)
            .statusBarsPadding()
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Settings & Profile",
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
                color = TextPrimary
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Counselor Profile Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, CardBorderColor),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(AmberGold),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = initials,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = counselorName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = TextPrimary
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFFECFDF5)
                            ) {
                                Text(
                                    text = "● Online",
                                    color = GreenActive,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = counselorEmail,
                            fontSize = 13.sp,
                            color = TextSecondary
                        )
                    }
                }
            }

            // 2. Recording & S3 Cloud Sync Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, CardBorderColor),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "Recording & Cloud Storage",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = TextPrimary
                    )

                    // SAF Folder Selector
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Active Recording Folder", fontSize = 12.5.sp, color = TextSecondary)
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFF8FAFC),
                            border = BorderStroke(1.dp, CardBorderColor),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectSafFolder() }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(imageVector = Icons.Default.FolderOpen, contentDescription = null, tint = AmberGold, modifier = Modifier.size(20.dp))
                                    Text(text = activeFolderPath, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                                }
                                Text("Change", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                            }
                        }
                    }

                    // Preset Chips
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        PresetChip(title = "Cube ACR", isSelected = activeFolderPath.contains("CubeCallRecorder", ignoreCase = true)) {
                            val path = "/Android/data/com.catalinagroup.callrecorder/files"
                            prefs.edit().putString("custom_recording_folder", path).apply()
                            activeFolderPath = path
                        }
                        PresetChip(title = "CallBox", isSelected = activeFolderPath.contains("CallBox", ignoreCase = true)) {
                            val path = "/CallBox/Audio"
                            prefs.edit().putString("custom_recording_folder", path).apply()
                            activeFolderPath = path
                        }
                        PresetChip(title = "Truecaller", isSelected = activeFolderPath.contains("Truecaller", ignoreCase = true)) {
                            val path = "/Truecaller/Voice"
                            prefs.edit().putString("custom_recording_folder", path).apply()
                            activeFolderPath = path
                        }
                    }

                    Divider(color = CardBorderColor)

                    // Auto Upload Toggle
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Automatic S3 Upload", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextPrimary)
                            Text("Upload call audio instantly after call completes", fontSize = 11.5.sp, color = TextSecondary)
                        }
                        Switch(
                            checked = autoSyncEnabled,
                            onCheckedChange = {
                                autoSyncEnabled = it
                                prefs.edit().putBoolean("auto_sync_enabled", it).apply()
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = AmberGold)
                        )
                    }

                    // Upload Network Policy
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Upload Network Policy", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextPrimary)
                            Text("Syncs recordings over both Mobile Data & Wi-Fi", fontSize = 11.5.sp, color = TextSecondary)
                        }
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFECFDF5)
                        ) {
                            Text(
                                text = "Any Network",
                                color = GreenActive,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            // 3. Telemetry & Hardware Health Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, CardBorderColor),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "System Diagnostics & Services",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = TextPrimary
                    )

                    SettingStatusRow(
                        title = "WhatsApp Audio Connector",
                        subtitle = if (isAccessibilityOn.value) "Active & capturing" else "Tap to enable Accessibility",
                        isActive = isAccessibilityOn.value,
                        onClick = {
                            try {
                                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(intent)
                            } catch (e: Exception) {
                                Toast.makeText(context, "Cannot open accessibility settings", Toast.LENGTH_SHORT).show()
                            }
                        }
                    )

                    SettingStatusRow(
                        title = "Battery Optimization Bypass",
                        subtitle = "Ensures background call tracking survives OS sleep",
                        isActive = true,
                        onClick = {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                try {
                                    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Battery settings unavailable", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    )
                }
            }

            // 4. Developer Tools & Logs Action
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, CardBorderColor),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenLogs() }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFF1F5F9)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(imageVector = Icons.Default.Terminal, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(20.dp))
                        }
                        Column {
                            Text("System Logs & Console", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                            Text("View live background sync events & telemetry", fontSize = 11.5.sp, color = TextSecondary)
                        }
                    }
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, tint = TextSecondary)
                }
            }

            // 5. Sign Out Button
            Button(
                onClick = { showLogoutDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFFEE2E2),
                    contentColor = RedDanger
                ),
                shape = RoundedCornerShape(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = RedDanger, modifier = Modifier.size(18.dp))
                    Text("Sign Out of RecordHub", fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = RedDanger)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sign Out", fontWeight = FontWeight.Bold, color = TextPrimary) },
            text = { Text("Are you sure you want to sign out? Call sync will pause until you log back in.", color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RedDanger)
                ) {
                    Text("Sign Out", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            },
            containerColor = CardBg,
            shape = RoundedCornerShape(16.dp)
        )
    }
}

@Composable
private fun PresetChip(title: String, isSelected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) AmberGold.copy(alpha = 0.2f) else Color(0xFFF1F5F9),
        border = BorderStroke(1.dp, if (isSelected) AmberGold else CardBorderColor),
        modifier = Modifier.clickable { onClick() }
    ) {
        Text(
            text = title,
            fontSize = 11.5.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) Color(0xFFB45309) else TextSecondary,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}

@Composable
private fun SettingStatusRow(title: String, subtitle: String, isActive: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = TextPrimary)
            Text(subtitle, fontSize = 11.5.sp, color = TextSecondary)
        }
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = if (isActive) Color(0xFFECFDF5) else Color(0xFFFEF3C7)
        ) {
            Text(
                text = if (isActive) "Enabled" else "Setup",
                color = if (isActive) GreenActive else Color(0xFFD97706),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}
