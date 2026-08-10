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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun OnboardingScreen(onProceedToPermissions: () -> Unit) {
    var acceptedConsent by remember { mutableStateOf(false) }
    var counselorEmail by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isAuthenticating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Spacer(modifier = Modifier.height(10.dp))
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(MedicalTeal600, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = "Security",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "RecordHub",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                    Text(
                        text = "Academically Global Healthcare Academy",
                        style = MaterialTheme.typography.bodySmall.copy(color = MedicalTeal400)
                    )
                }
            }

            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Counselor Sign-In & Device Binding",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 13.sp
                    )

                    OutlinedTextField(
                        value = counselorEmail,
                        onValueChange = { counselorEmail = it },
                        label = { Text("Counselor Email") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = MedicalTeal400
                        )
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = MedicalTeal400
                        )
                    )

                    if (errorMessage != null) {
                        Text(
                            text = errorMessage!!,
                            color = Amber400,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Transparent Employee Notice",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 13.sp
                    )

                    Text(
                        text = "RecordHub collects work-related SIM call events and authorized audio recordings for QA coaching and lead conversion analysis.",
                        color = Slate400,
                        fontSize = 11.sp,
                        lineHeight = 16.sp
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = acceptedConsent,
                    onCheckedChange = { acceptedConsent = it },
                    colors = CheckboxDefaults.colors(checkedColor = MedicalTeal500)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "I acknowledge call tracking policy and consent to work call logging.",
                    color = Slate200,
                    fontSize = 11.sp
                )
            }
        }

        Button(
            onClick = {
                scope.launch(Dispatchers.IO) {
                    isAuthenticating = true
                    errorMessage = null
                    val urls = listOf("https://recorderhub-gold.vercel.app/api/v1/", "http://192.168.31.86:4000/api/v1/", "http://10.0.2.2:4000/api/v1/")
                    var authenticated = false
                    var lastErrorMsg = "Invalid email or password."

                    for (url in urls) {
                        try {
                            val retrofit = retrofit2.Retrofit.Builder()
                                .baseUrl(url)
                                .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create())
                                .build()

                            val api = retrofit.create(com.academically.recordhub.data.remote.RecordHubApi::class.java)
                            val response = api.login(com.academically.recordhub.data.remote.LoginRequest(counselorEmail.trim(), password))

                            if (response.isSuccessful && response.body() != null) {
                                authenticated = true
                                val prefs = context.getSharedPreferences("recordhub_prefs", android.content.Context.MODE_PRIVATE)
                                prefs.edit()
                                    .putBoolean("is_logged_in", true)
                                    .putString("counselor_email", counselorEmail.trim())
                                    .putString("access_token", response.body()?.accessToken ?: "")
                                    .apply()
                                break
                            } else if (response.code() == 401 || response.code() == 400) {
                                lastErrorMsg = "Invalid email or password! Verify credentials created on Web Dashboard."
                                break
                            }
                        } catch (e: Exception) {
                            lastErrorMsg = "Network error connecting to API: ${e.message}"
                        }
                    }

                    withContext(Dispatchers.Main) {
                        isAuthenticating = false
                        if (authenticated) {
                            onProceedToPermissions()
                        } else {
                            errorMessage = lastErrorMsg
                        }
                    }
                }
            },
            enabled = acceptedConsent && counselorEmail.isNotEmpty() && password.isNotEmpty() && !isAuthenticating,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MedicalTeal600),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = if (isAuthenticating) "Authenticating Credentials..." else "Sign In & Bind Device",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }
    }
}
