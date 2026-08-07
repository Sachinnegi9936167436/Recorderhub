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

@Composable
fun TrackedCallsScreen(callEvents: List<CallEventEntity>, onTogglePrivate: (String) -> Unit) {
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
            Text(
                text = "${callEvents.size} Calls",
                color = MedicalTeal400,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (callEvents.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No call events logged yet. Make a work call to start tracking.",
                    color = Slate400,
                    fontSize = 12.sp
                )
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(callEvents) { call ->
                    TrackedCallCard(call = call, onTogglePrivate = { onTogglePrivate(call.id) })
                }
            }
        }
    }
}

@Composable
fun TrackedCallCard(call: CallEventEntity, onTogglePrivate: () -> Unit) {
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

                IconButton(onClick = onTogglePrivate, modifier = Modifier.size(24.dp)) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Mark Private",
                        tint = Slate500,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${call.direction} • ${call.durationSeconds}s • SIM ${call.simSlot + 1}",
                    color = Slate400,
                    fontSize = 11.sp
                )
                Text(
                    text = call.disposition,
                    color = MedicalTeal400,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 11.sp
                )
            }
        }
    }
}
