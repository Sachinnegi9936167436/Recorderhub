package com.academically.recordhub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CallMade
import androidx.compose.material.icons.filled.CallReceived
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.data.local.CallEventEntity
import com.academically.recordhub.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private fun formatCallTime(timestampMs: Long): String {
    val sdf = SimpleDateFormat("hh:mm a • MMM dd", Locale.getDefault())
    return sdf.format(Date(timestampMs))
}

@Composable
fun TrackedCallsScreen(
    callEvents: List<CallEventEntity>,
    onScanCallLogs: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Tracked Work Calls",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
                Text(
                    text = "Academically Global Sales Counselor Timeline",
                    style = MaterialTheme.typography.bodySmall.copy(color = Slate400)
                )
            }
            
            Button(
                onClick = onScanCallLogs,
                colors = ButtonDefaults.buttonColors(containerColor = MedicalTeal600),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(text = "Scan Calls", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (callEvents.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "No call events logged yet.",
                        color = Slate400,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = onScanCallLogs,
                        colors = ButtonDefaults.buttonColors(containerColor = MedicalTeal600),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(text = "Import Phone Call Logs", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(callEvents) { call ->
                    TrackedCallCard(call = call)
                }
            }
        }
    }
}

@Composable
fun TrackedCallCard(call: CallEventEntity) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Navy900),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (call.direction == "OUTGOING") Icons.Default.CallMade else Icons.Default.CallReceived,
                        contentDescription = null,
                        tint = if (call.direction == "OUTGOING") Emerald400 else MedicalTeal400,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = call.phoneNumber,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                val isAnswered = call.status.equals("ANSWERED", ignoreCase = true)
                val durationStr = if (isAnswered && call.durationSeconds > 0) "${call.durationSeconds}s" else "0s"
                Text(
                    text = "${formatCallTime(call.startTime)} • ${call.direction} • $durationStr",
                    color = Slate400,
                    fontSize = 11.sp
                )
                Text(
                    text = if (isAnswered) call.disposition else "Unanswered",
                    color = if (isAnswered) MedicalTeal400 else Slate400,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 11.sp
                )
            }
        }
    }
}
