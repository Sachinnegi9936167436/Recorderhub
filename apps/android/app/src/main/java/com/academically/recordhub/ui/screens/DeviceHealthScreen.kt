package com.academically.recordhub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryFull
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FolderSpecial
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.ui.theme.*

@Composable
fun DeviceHealthScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Device Health Telemetry",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
                Text(
                    text = "Hardware compatibility & sync status",
                    style = MaterialTheme.typography.bodySmall.copy(color = Slate400)
                )
            }

            Surface(
                color = Emerald400.copy(alpha = 0.15f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "HEALTHY",
                    color = Emerald400,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
        }

        HealthStatusCard(
            title = "Hardware Model & OS",
            value = "Samsung Galaxy A54 5G (Android 14)",
            sub = "App Version v1.0.4-prod",
            icon = Icons.Default.Smartphone,
            iconTint = MedicalTeal400
        )

        HealthStatusCard(
            title = "Battery Optimization Status",
            value = "Unrestricted / Whitelisted",
            sub = "OS Doze Mode bypass active",
            icon = Icons.Default.BatteryFull,
            iconTint = Emerald400
        )

        HealthStatusCard(
            title = "Storage Access Framework (SAF)",
            value = "Call Recording Directory Bound",
            sub = "Folder: /Internal Storage/Recordings/Call",
            icon = Icons.Default.FolderSpecial,
            iconTint = MedicalTeal400
        )

        HealthStatusCard(
            title = "Last API Sync",
            value = "2 minutes ago",
            sub = "0 Failed Uploads • 1 Pending Event",
            icon = Icons.Default.CheckCircle,
            iconTint = Emerald400
        )
    }
}

@Composable
fun HealthStatusCard(
    title: String,
    value: String,
    sub: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Navy900),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(text = title, color = Slate400, fontSize = 11.sp)
                Text(text = value, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                Text(text = sub, color = Slate500, fontSize = 10.sp)
            }
        }
    }
}
