package com.academically.recordhub.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.ui.theme.*
import com.academically.recordhub.utils.AppLogManager
import com.academically.recordhub.utils.LogEntry

@Composable
fun AppLogsScreen(onScanLogsTrigger: () -> Unit) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val logList by AppLogManager.logs.collectAsState()
    var selectedFilter by remember { mutableStateOf("ALL") }

    val filteredLogs = remember(logList, selectedFilter) {
        when (selectedFilter) {
            "SYNC" -> logList.filter { it.level == "SYNC" || it.tag.contains("Sync", ignoreCase = true) || it.tag.contains("S3", ignoreCase = true) }
            "WA" -> logList.filter { it.tag.contains("WhatsApp", ignoreCase = true) || it.message.contains("WhatsApp", ignoreCase = true) }
            "ERR" -> logList.filter { it.level == "ERROR" || it.level == "WARN" }
            else -> logList
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "System & Sync Logs",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
                Text(
                    text = "Live App Telemetry & AWS S3 Sync Console",
                    style = MaterialTheme.typography.bodySmall.copy(color = Slate400)
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                IconButton(
                    onClick = {
                        val allLogText = filteredLogs.joinToString("\n") { "[${it.timestamp}] [${it.level}] [${it.tag}] ${it.message}" }
                        clipboardManager.setText(AnnotatedString(allLogText))
                        Toast.makeText(context, "Logs Copied to Clipboard!", Toast.LENGTH_SHORT).show()
                    },
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Navy800)
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = "Copy Logs", tint = MedicalTeal400)
                }

                IconButton(
                    onClick = { AppLogManager.clear() },
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Navy800)
                ) {
                    Icon(Icons.Default.Delete, contentDescription = "Clear Logs", tint = Amber400)
                }
            }
        }

        // Filter Chips Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = selectedFilter == "ALL",
                onClick = { selectedFilter = "ALL" },
                label = { Text("All Logs (${logList.size})", fontSize = 11.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MedicalTeal400,
                    selectedLabelColor = Navy950,
                    containerColor = Navy900,
                    labelColor = Slate300
                )
            )

            FilterChip(
                selected = selectedFilter == "SYNC",
                onClick = { selectedFilter = "SYNC" },
                label = { Text("AWS S3 Sync", fontSize = 11.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Emerald400,
                    selectedLabelColor = Navy950,
                    containerColor = Navy900,
                    labelColor = Slate300
                )
            )

            FilterChip(
                selected = selectedFilter == "WA",
                onClick = { selectedFilter = "WA" },
                label = { Text("WhatsApp Calls", fontSize = 11.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MedicalTeal400,
                    selectedLabelColor = Navy950,
                    containerColor = Navy900,
                    labelColor = Slate300
                )
            )

            FilterChip(
                selected = selectedFilter == "ERR",
                onClick = { selectedFilter = "ERR" },
                label = { Text("Errors & Warnings", fontSize = 11.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Amber400,
                    selectedLabelColor = Navy950,
                    containerColor = Navy900,
                    labelColor = Slate300
                )
            )
        }

        // Log Terminal Output Console
        Card(
            colors = CardDefaults.cardColors(containerColor = Navy900),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            if (filteredLogs.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No logs recorded for filter '$selectedFilter'",
                        color = Slate400,
                        fontSize = 13.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredLogs, key = { it.id }) { log ->
                        val badgeColor = when (log.level) {
                            "ERROR" -> Amber400
                            "WARN" -> Amber400
                            "SYNC" -> Emerald400
                            else -> MedicalTeal400
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Navy950.copy(alpha = 0.6f), shape = RoundedCornerShape(6.dp))
                                .padding(8.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text(
                                text = log.timestamp,
                                fontFamily = FontFamily.Monospace,
                                color = Slate400,
                                fontSize = 10.sp,
                                modifier = Modifier.width(68.dp)
                            )

                            Spacer(modifier = Modifier.width(6.dp))

                            Surface(
                                color = badgeColor.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = log.level,
                                    color = badgeColor,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 9.sp,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = log.tag,
                                    color = Slate200,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp
                                )
                                Text(
                                    text = log.message,
                                    color = Slate300,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
