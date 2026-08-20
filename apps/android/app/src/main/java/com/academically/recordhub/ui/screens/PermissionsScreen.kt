package com.academically.recordhub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.PhoneInTalk
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.ui.theme.*

@Composable
fun PermissionsScreen(onPermissionsGranted: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = "Required Permissions",
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )
            Text(
                text = "Grant permissions so RecordHub can capture work call events",
                style = MaterialTheme.typography.bodySmall.copy(color = Slate400),
                modifier = Modifier.padding(bottom = 20.dp)
            )

            // Item 1: Call Log
            PermissionCheckItem(
                title = "Call Log Access (READ_CALL_LOG)",
                description = "Required to capture incoming/outgoing start time, duration, and phone number.",
                isGranted = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Item 2: Telephony State
            PermissionCheckItem(
                title = "Phone State (READ_PHONE_STATE)",
                description = "Identifies active SIM slot (SIM 1 / SIM 2) and call state transitions.",
                isGranted = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Item 3: SAF Call Folder Authorization
            PermissionCheckItem(
                title = "Storage Access Framework (SAF)",
                description = "Authorizes RecordHub to scan native OEM call recording folder (/Call).",
                isGranted = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Item 4: WhatsApp Call Recording (Accessibility Connector)
            PermissionCheckItem(
                title = "RecordHub App Connector (Accessibility)",
                description = "Enables system audio capture for WhatsApp voice calls.",
                isGranted = true
            )
        }

        Button(
            onClick = onPermissionsGranted,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MedicalTeal600),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = "Grant & Launch App",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
fun PermissionCheckItem(title: String, description: String, isGranted: Boolean) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Navy900),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = if (isGranted) Icons.Default.CheckCircle else Icons.Default.Warning,
                contentDescription = null,
                tint = if (isGranted) Emerald400 else Amber400,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(text = title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                Text(text = description, color = Slate400, fontSize = 11.sp)
            }
        }
    }
}
