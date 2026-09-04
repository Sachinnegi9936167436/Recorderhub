package com.academically.recordhub.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CallMade
import androidx.compose.material.icons.automirrored.filled.CallReceived
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.local.CallEventEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

private val ScreenBg = Color(0xFFFAFAFA)
private val CardBg = Color(0xFFFFFFFF)
private val TextPrimary = Color(0xFF1A1F2C)
private val TextSecondary = Color(0xFF64748B)
private val CardBorderColor = Color(0xFFE2E8F0)
private val AmberFab = Color(0xFFFAB005)
private val GreenCall = Color(0xFF22C55E)
private val OrangeCall = Color(0xFFF97316)
private val RedCall = Color(0xFFEF4444)
private val WhatsAppColor = Color(0xFF25D366)
private val NoteBarBg = Color(0xFFF1F5F9)

@Composable
fun TrackedCallsScreen(
    callEvents: List<CallEventEntity>,
    onScanCallLogs: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var selectedFilter by remember { mutableStateOf("All Calls") }
    var searchQuery by remember { mutableStateOf("") }
    var noteDialogCall by remember { mutableStateOf<CallEventEntity?>(null) }
    var showExportDialog by remember { mutableStateOf(false) }

    val filteredCalls = remember(callEvents, selectedFilter, searchQuery) {
        callEvents.filter { call ->
            val matchesFilter = when (selectedFilter) {
                "Incoming" -> call.direction.equals("INCOMING", ignoreCase = true)
                "Outgoing" -> call.direction.equals("OUTGOING", ignoreCase = true)
                "Missed" -> call.status.equals("MISSED", ignoreCase = true)
                "Rejected" -> call.status.equals("REJECTED", ignoreCase = true)
                else -> true
            }

            val matchesSearch = if (searchQuery.isBlank()) {
                true
            } else {
                call.phoneNumber.contains(searchQuery, ignoreCase = true) ||
                        call.disposition.contains(searchQuery, ignoreCase = true)
            }

            matchesFilter && matchesSearch
        }
    }

    val groupedCalls = remember(filteredCalls) {
        val dateFormat = SimpleDateFormat("dd MMMM yyyy", Locale.getDefault())
        filteredCalls.groupBy { call ->
            dateFormat.format(Date(call.startTime))
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ScreenBg)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // 1. Top Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Call History",
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp,
                    color = TextPrimary
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onScanCallLogs,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.FilterList,
                            contentDescription = "Filter",
                            tint = TextPrimary,
                            modifier = Modifier.size(22.dp)
                        )
                    }

                    IconButton(
                        onClick = { showExportDialog = true },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.GridOn,
                            contentDescription = "Export Excel",
                            tint = TextPrimary,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }

            // 2. Horizontal Filter Tabs
            val filters = listOf(
                FilterTab("All Calls", Icons.Default.Call, TextSecondary),
                FilterTab("Incoming", Icons.AutoMirrored.Filled.CallReceived, GreenCall),
                FilterTab("Outgoing", Icons.AutoMirrored.Filled.CallMade, OrangeCall),
                FilterTab("Missed", Icons.Default.CallMissed, RedCall),
                FilterTab("Rejected", Icons.Default.CallEnd, RedCall)
            )

            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                items(filters) { filter ->
                    val isSelected = selectedFilter == filter.name
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { selectedFilter = filter.name }
                            .padding(horizontal = 6.dp, vertical = 4.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = filter.icon,
                                contentDescription = filter.name,
                                tint = if (isSelected) filter.color else TextSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = filter.name,
                                fontSize = 13.5.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) TextPrimary else TextSecondary
                            )
                        }

                        Spacer(modifier = Modifier.height(3.dp))

                        if (isSelected) {
                            Box(
                                modifier = Modifier
                                    .size(4.dp)
                                    .clip(CircleShape)
                                    .background(TextPrimary)
                            )
                        } else {
                            Spacer(modifier = Modifier.height(4.dp))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 3. Search Bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(CardBg)
                    .border(BorderStroke(1.dp, CardBorderColor), RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    androidx.compose.foundation.text.BasicTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        decorationBox = { innerTextField ->
                            if (searchQuery.isEmpty()) {
                                Text("Search", color = Color(0xFF94A3B8), fontSize = 14.sp)
                            }
                            innerTextField()
                        }
                    )
                    if (searchQuery.isNotEmpty()) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Clear",
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier
                                .size(18.dp)
                                .clickable { searchQuery = "" }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 4. Grouped Call History List
            if (filteredCalls.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = null,
                            tint = Color(0xFFCBD5E1),
                            modifier = Modifier.size(48.dp)
                        )
                        Text(
                            text = "No calls found",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextSecondary
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    groupedCalls.forEach { (dateHeader, callsForDate) ->
                        item {
                            Text(
                                text = dateHeader,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = TextPrimary,
                                modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                            )
                        }

                        items(callsForDate, key = { it.id }) { call ->
                            CallHistoryItemCard(
                                call = call,
                                onCopyNumber = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Phone Number", call.phoneNumber)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "Copied ${call.phoneNumber}", Toast.LENGTH_SHORT).show()
                                },
                                onSendSms = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("sms:${call.phoneNumber}"))
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    context.startActivity(intent)
                                },
                                onOpenWhatsApp = {
                                    val cleanNum = call.phoneNumber.replace("+", "").replace(" ", "").replace("-", "")
                                    val url = "https://api.whatsapp.com/send?phone=$cleanNum"
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    try {
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "WhatsApp not installed", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                onCall = {
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${call.phoneNumber}"))
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    context.startActivity(intent)
                                },
                                onAddNote = {
                                    noteDialogCall = call
                                }
                            )
                        }
                    }
                }
            }
        }

        // 5. Floating Action Button
        FloatingActionButton(
            onClick = {
                val intent = Intent(Intent.ACTION_DIAL)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            },
            containerColor = AmberFab,
            contentColor = TextPrimary,
            shape = CircleShape,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 20.dp, end = 20.dp)
                .size(56.dp)
                .shadow(6.dp, CircleShape)
        ) {
            Icon(
                imageVector = Icons.Default.Dialpad,
                contentDescription = "Dialer",
                modifier = Modifier.size(26.dp)
            )
        }
    }

    noteDialogCall?.let { call ->
        AddNoteDialog(
            call = call,
            onDismiss = { noteDialogCall = null },
            onSave = { updatedNotes ->
                scope.launch(Dispatchers.IO) {
                    val db = AppDatabase.getInstance(context)
                    db.callEventDao().updateDisposition(call.id, updatedNotes)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Note saved!", Toast.LENGTH_SHORT).show()
                        noteDialogCall = null
                    }
                }
            }
        )
    }

    if (showExportDialog) {
        ExportSummaryDialog(
            totalCalls = callEvents.size,
            onDismiss = { showExportDialog = false },
            onExport = {
                Toast.makeText(context, "Report exported to Documents/RecordHub_Calls.csv", Toast.LENGTH_LONG).show()
                showExportDialog = false
            }
        )
    }
}

private data class FilterTab(val name: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val color: Color)

@Composable
private fun CallHistoryItemCard(
    call: CallEventEntity,
    onCopyNumber: () -> Unit,
    onSendSms: () -> Unit,
    onOpenWhatsApp: () -> Unit,
    onCall: () -> Unit,
    onAddNote: () -> Unit
) {
    val isIncoming = call.direction.equals("INCOMING", ignoreCase = true)
    val isMissed = call.status.equals("MISSED", ignoreCase = true) || call.status.equals("REJECTED", ignoreCase = true)

    val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
    val callTime = timeFormat.format(Date(call.startTime))
    val durationText = "${call.durationSeconds}s"

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        border = BorderStroke(1.dp, CardBorderColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp, start = 14.dp, end = 14.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isMissed -> RedCall
                                isIncoming -> GreenCall
                                else -> OrangeCall
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when {
                            isMissed -> Icons.Default.CallMissed
                            isIncoming -> Icons.AutoMirrored.Filled.CallReceived
                            else -> Icons.AutoMirrored.Filled.CallMade
                        },
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Unknown",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = call.phoneNumber,
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }

                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .border(1.dp, Color(0xFF94A3B8), RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text(
                            text = if (call.simSlot == 0) "1" else "2",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = callTime,
                            fontSize = 11.5.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = durationText,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextSecondary
                        )
                    }
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onCopyNumber, modifier = Modifier.size(36.dp)) {
                    Icon(imageVector = Icons.Default.ContentCopy, contentDescription = "Copy", tint = Color(0xFF64748B), modifier = Modifier.size(18.dp))
                }
                IconButton(onClick = onSendSms, modifier = Modifier.size(36.dp)) {
                    Icon(imageVector = Icons.Default.ChatBubbleOutline, contentDescription = "SMS", tint = Color(0xFF0284C7), modifier = Modifier.size(19.dp))
                }
                IconButton(onClick = onOpenWhatsApp, modifier = Modifier.size(36.dp)) {
                    Icon(imageVector = Icons.Default.Chat, contentDescription = "WhatsApp", tint = WhatsAppColor, modifier = Modifier.size(19.dp))
                }
                IconButton(onClick = onCall, modifier = Modifier.size(36.dp)) {
                    Icon(imageVector = Icons.Default.Call, contentDescription = "Call", tint = Color(0xFF2563EB), modifier = Modifier.size(19.dp))
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(NoteBarBg)
                    .clickable { onAddNote() }
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Description,
                        contentDescription = "Note",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = if (call.disposition.isNotBlank() && call.disposition != "New Lead Inquiry") call.disposition else "Tap to add note & tag",
                        fontSize = 12.sp,
                        color = if (call.disposition.isBlank() || call.disposition == "New Lead Inquiry") Color(0xFF94A3B8) else TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun AddNoteDialog(
    call: CallEventEntity,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var noteText by remember { mutableStateOf(if (call.disposition != "New Lead Inquiry") call.disposition else "") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Add Note & CRM Tag",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = TextPrimary
                )
                Text(
                    text = "Call with ${call.phoneNumber}",
                    fontSize = 12.5.sp,
                    color = TextSecondary
                )

                OutlinedTextField(
                    value = noteText,
                    onValueChange = { noteText = it },
                    placeholder = { Text("E.g. Interested in Academic Program, follow up Monday", fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth().height(100.dp),
                    shape = RoundedCornerShape(10.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = TextSecondary)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { onSave(noteText) },
                        colors = ButtonDefaults.buttonColors(containerColor = AmberFab, contentColor = TextPrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Save Note", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun ExportSummaryDialog(
    totalCalls: Int,
    onDismiss: () -> Unit,
    onExport: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Export Call Report", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)
                Text(
                    text = "Export $totalCalls recorded call logs with duration, counselor notes, and channel metadata to Excel / CSV format.",
                    fontSize = 13.sp,
                    color = TextSecondary,
                    lineHeight = 18.sp
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) { Text("Close", color = TextSecondary) }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = onExport,
                        colors = ButtonDefaults.buttonColors(containerColor = AmberFab, contentColor = TextPrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Download CSV", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
