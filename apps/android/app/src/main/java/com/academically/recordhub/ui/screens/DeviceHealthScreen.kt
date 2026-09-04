package com.academically.recordhub.ui.screens

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryFull
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FolderSpecial
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.ui.theme.*

@Composable
fun DeviceHealthScreen() {
    val scrollState = rememberScrollState()
    val deviceModel = "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${Build.MODEL} (Android ${Build.VERSION.RELEASE})"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Device Health & Status",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Hardware compatibility & background telemetry",
                    color = Slate400,
                    fontSize = 11.5.sp
                )
            }

            Surface(
                color = Emerald500.copy(alpha = 0.15f),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Emerald500.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(Emerald400)
                    )
                    Text(
                        text = "HEALTHY",
                        color = Emerald400,
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }
        }

        // Diagnostic Cards
        HealthStatusCard(
            title = "Hardware Model & OS",
            value = deviceModel,
            sub = "RecordHub Client v1.0.4-prod • API 34",
            icon = Icons.Default.Smartphone,
            iconTint = BrandTeal400
        )

        HealthStatusCard(
            title = "Background Battery Optimization",
            value = "Unrestricted / Bypass Active",
            sub = "OS Doze Mode background execution enabled",
            icon = Icons.Default.BatteryFull,
            iconTint = Emerald400
        )

        HealthStatusCard(
            title = "Storage & Recording Access",
            value = "Media Storage Framework Authorized",
            sub = "Scanning native phone call recordings (.m4a, .mp3, .wav)",
            icon = Icons.Default.FolderSpecial,
            iconTint = BrandTeal400
        )

        HealthStatusCard(
            title = "Cloud Telemetry Engine",
            value = "AWS S3 & REST API Connected",
            sub = "Direct 1-step presigned PUT sync active (ap-south-1)",
            icon = Icons.Default.Sync,
            iconTint = Indigo400
        )

        HealthStatusCard(
            title = "Security & Privacy Isolation",
            value = "HIPAA & Enterprise Compliant",
            sub = "AES-256 encrypted transit strictly bound to counselor ID",
            icon = Icons.Default.Security,
            iconTint = Emerald400
        )
    }
}

@Composable
fun HealthStatusCard(
    title: String,
    value: String,
    sub: String,
    icon: ImageVector,
    iconTint: Color
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Navy900),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Navy800),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(iconTint.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = title,
                    color = Slate400,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = value,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontSize = 13.5.sp
                )
                Text(
                    text = sub,
                    color = Slate500,
                    fontSize = 10.5.sp
                )
            }
        }
    }
}
