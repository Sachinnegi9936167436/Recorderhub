package com.academically.recordhub.ui.screens

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.ui.theme.*
import com.academically.recordhub.utils.AppLogManager

@Composable
fun SettingsScreen(onLogout: () -> Unit) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE) }
    
    var customApiUrl by remember { mutableStateOf(prefs.getString("custom_api_url", "http://192.168.31.86:3000") ?: "http://192.168.31.86:3000") }
    var wifiOnlyUpload by remember { mutableStateOf(prefs.getBoolean("wifi_only_upload", true)) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = "Counselor Agent Settings",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )

            // Server Base URL Configuration Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Dns,
                            contentDescription = null,
                            tint = MedicalTeal400,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Server API Base URL / Host IP",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 13.sp
                        )
                    }

                    Text(
                        text = "Current Host Wi-Fi IP: 192.168.31.86:3000",
                        color = Slate400,
                        fontSize = 11.sp
                    )

                    OutlinedTextField(
                        value = customApiUrl,
                        onValueChange = { customApiUrl = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        placeholder = { Text("http://192.168.31.86:3000", color = Slate400, fontSize = 12.sp) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MedicalTeal400,
                            unfocusedBorderColor = Slate400,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Slate200
                        )
                    )

                    Button(
                        onClick = {
                            val cleanUrl = customApiUrl.trim()
                            prefs.edit().putString("custom_api_url", cleanUrl).apply()
                            AppLogManager.log("INFO", "Settings", "Saved Custom Server API URL: $cleanUrl")
                            Toast.makeText(context, "Server API URL Saved!", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MedicalTeal400)
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Save Server IP", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }



            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
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
                            onCheckedChange = { 
                                wifiOnlyUpload = it 
                                prefs.edit().putBoolean("wifi_only_upload", it).apply()
                                AppLogManager.log("INFO", "Settings", "Wi-Fi Only Upload set to: $it")
                            },
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
