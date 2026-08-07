package com.academically.recordhub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
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
fun SettingsScreen(onLogout: () -> Unit) {
    var wifiOnlyUpload by remember { mutableStateOf(true) }
    var trackOfficeHoursOnly by remember { mutableStateOf(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(spaceBy = 16.dp) {
            Text(
                text = "Counselor Agent Settings",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), spaceBy = 12.dp) {
                    Text(
                        text = "Working Hours & Schedule",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 13.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "Office Hours Tracking Only", color = Slate200, fontSize = 12.sp)
                            Text(text = "09:30 AM - 06:30 PM IST (Mon - Sat)", color = Slate400, fontSize = 11.sp)
                        }
                        Switch(
                            checked = trackOfficeHoursOnly,
                            onCheckedChange = { trackOfficeHoursOnly = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = MedicalTeal500)
                        )
                    }
                }
            }

            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), spaceBy = 12.dp) {
                    Text(
                        text = "Network & S3 Upload Preferences",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 13.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "Wi-Fi Only Recording Upload", color = Slate200, fontSize = 12.sp)
                            Text(text = "Save mobile data during large file transfers", color = Slate400, fontSize = 11.sp)
                        }
                        Switch(
                            checked = wifiOnlyUpload,
                            onCheckedChange = { wifiOnlyUpload = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = MedicalTeal500)
                        )
                    }
                }
            }
        }

        Button(
            onClick = onLogout,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Red400),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(text = "Sign Out of RecordHub", fontWeight = FontWeight.Bold, fontSize = 13.sp)
        }
    }
}
