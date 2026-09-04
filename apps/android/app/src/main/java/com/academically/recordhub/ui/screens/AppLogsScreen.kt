package com.academically.recordhub.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.ui.theme.*
import com.academically.recordhub.utils.AppLogManager

@Composable
fun AppLogsScreen(
    onScanLogsTrigger: () -> Unit,
    onClose: () -> Unit = {}
) {
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
            .statusBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                IconButton(onClick = onClose, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.White
                    )
                }
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Navy800),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Terminal,
                        contentDescription = null,
                        tint = Emerald400,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column {
                    Text(
                        text = "System Telemetry Logs",
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Live background diagnostics console",
                        color = Slate400,
                        fontSize = 11.sp
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                IconButton(
                    onClick = {
                        val allLogText = filteredLogs.joinToString("\n") { "[${it.timestamp}] [${it.level}] [${it.tag}] ${it.message}" }
                        clipboardManager.setText(AnnotatedString(allLogText))
                        Toast.makeText(context, "Copied ${filteredLogs.size} logs to Clipboard!", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(Navy800)
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = "Copy Logs", tint = BrandTeal400, modifier = Modifier.size(16.dp))
                }

                IconButton(
                    onClick = { AppLogManager.clear() },
                    modifier = Modifier
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(Navy800)
                ) {
                    Icon(Icons.Default.Delete, contentDescription = "Clear Logs", tint = Red400, modifier = Modifier.size(16.dp))
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
                label = { Text("All (${logList.size})", fontSize = 11.5.sp, fontWeight = FontWeight.Bold) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = BrandTeal500,
                    selectedLabelColor = Navy950,
                    containerColor = Navy900,
                    labelColor = Slate300
                ),
                shape = RoundedCornerShape(8.dp),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = selectedFilter == "ALL",
                    borderColor = Navy800,
                    selectedBorderColor = BrandTeal400
                )
            )

            FilterChip(
                selected = selectedFilter == "SYNC",
                onClick = { selectedFilter = "SYNC" },
                label = { Text("AWS S3 Sync", fontSize = 11.5.sp, fontWeight = FontWeight.Bold) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Emerald500,
                    selectedLabelColor = Navy950,
                    containerColor = Navy900,
                    labelColor = Slate300
                ),
                shape = RoundedCornerShape(8.dp),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = selectedFilter == "SYNC",
                    borderColor = Navy800,
                    selectedBorderColor = Emerald400
                )
            )

            FilterChip(
                selected = selectedFilter == "WA",
                onClick = { selectedFilter = "WA" },
                label = { Text("WhatsApp", fontSize = 11.5.sp, fontWeight = FontWeight.Bold) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = WhatsAppGreen,
                    selectedLabelColor = Navy950,
                    containerColor = Navy900,
                    labelColor = Slate300
                ),
                shape = RoundedCornerShape(8.dp),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = selectedFilter == "WA",
                    borderColor = Navy800,
                    selectedBorderColor = WhatsAppGreen
                )
            )

            FilterChip(
                selected = selectedFilter == "ERR",
                onClick = { selectedFilter = "ERR" },
                label = { Text("Warnings / Errors", fontSize = 11.5.sp, fontWeight = FontWeight.Bold) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Amber500,
                    selectedLabelColor = Navy950,
                    containerColor = Navy900,
                    labelColor = Slate300
                ),
                shape = RoundedCornerShape(8.dp),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = selectedFilter == "ERR",
                    borderColor = Navy800,
                    selectedBorderColor = Amber400
                )
            )
        }

        // Log Terminal Output Console
        Card(
            colors = CardDefaults.cardColors(containerColor = Navy900),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Navy800),
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
                        text = "No log records found for category '$selectedFilter'",
                        color = Slate400,
                        fontSize = 13.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(filteredLogs, key = { it.id }) { log ->
                        val badgeColor = when (log.level) {
                            "ERROR" -> Red400
                            "WARN" -> Amber400
                            "SYNC" -> Emerald400
                            else -> BrandTeal400
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Navy950.copy(alpha = 0.7f), shape = RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text(
                                text = log.timestamp,
                                fontFamily = FontFamily.Monospace,
                                color = Slate500,
                                fontSize = 9.5.sp,
                                modifier = Modifier.width(62.dp)
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
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 8.5.sp,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = log.tag,
                                    color = Slate200,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.5.sp
                                )
                                Text(
                                    text = log.message,
                                    color = Slate300,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 10.5.sp,
                                    lineHeight = 14.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
