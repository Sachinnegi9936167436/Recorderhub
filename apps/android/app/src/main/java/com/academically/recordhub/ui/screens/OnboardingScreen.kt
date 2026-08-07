package com.academically.recordhub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Shield
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
fun OnboardingScreen(onProceedToPermissions: () -> Unit) {
    var acceptedConsent by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(spaceBy = 16.dp) {
            Spacer(modifier = Modifier.height(20.dp))
            
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(MedicalTeal600, RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = "Security",
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }

            Text(
                text = "Welcome to RecordHub",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )

            Text(
                text = "Academically Global Healthcare Academy",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MedicalTeal400,
                    fontWeight = FontWeight.SemiBold
                )
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), spaceBy = 12.dp) {
                    Text(
                        text = "Transparent Employee Notice",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 14.sp
                    )

                    Text(
                        text = "RecordHub collects work-related SIM call events (incoming/outgoing logs, time, duration) and authorized OEM native audio recordings during official working hours (09:30 - 18:30 IST) for QA coaching and lead conversion analysis.",
                        color = Slate400,
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Emerald400,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "You can flag personal calls as Private anytime.",
                            color = Slate200,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 8.dp)
            ) {
                Checkbox(
                    checked = acceptedConsent,
                    onCheckedChange = { acceptedConsent = it },
                    colors = CheckboxDefaults.colors(checkedColor = MedicalTeal500)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "I acknowledge the call monitoring policy and consent to work call tracking.",
                    color = Slate200,
                    fontSize = 12.sp
                )
            }
        }

        Button(
            onClick = onProceedToPermissions,
            enabled = acceptedConsent,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MedicalTeal600),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = "Accept Policy & Continue",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }
    }
}

private fun ColumnScope.spaceBy(dp: androidx.compose.ui.unit.Dp) {
    // Spacer helper
}
