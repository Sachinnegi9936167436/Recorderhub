package com.academically.recordhub.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun OnboardingScreen(onProceedToPermissions: () -> Unit) {
    var acceptedConsent by remember { mutableStateOf(true) }
    var counselorEmail by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var isAuthenticating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(scrollState)
            .padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Spacer(modifier = Modifier.height(16.dp))
            
            // Hero Brand Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(PrimaryGradient),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = "Security",
                        tint = Navy950,
                        modifier = Modifier.size(30.dp)
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = "RecordHub",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            fontSize = 24.sp
                        )
                    )
                    Text(
                        text = "Academically Global Healthcare Academy",
                        color = BrandTeal400,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Counselor Sign-In Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Navy800),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "Counselor Sign-In & Device Binding",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 14.5.sp
                    )

                    OutlinedTextField(
                        value = counselorEmail,
                        onValueChange = { 
                            counselorEmail = it
                            errorMessage = null
                        },
                        label = { Text("Counselor Email", fontSize = 12.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = null, tint = BrandTeal400, modifier = Modifier.size(18.dp))
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = BrandTeal400,
                            unfocusedBorderColor = Navy700,
                            focusedLabelColor = BrandTeal400,
                            unfocusedLabelColor = Slate400
                        )
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = { 
                            password = it
                            errorMessage = null
                        },
                        label = { Text("Password", fontSize = 12.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = BrandTeal400, modifier = Modifier.size(18.dp))
                        },
                        trailingIcon = {
                            IconButton(onClick = { showPassword = !showPassword }) {
                                Icon(
                                    imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = "Toggle password",
                                    tint = Slate400,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        },
                        singleLine = true,
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = BrandTeal400,
                            unfocusedBorderColor = Navy700,
                            focusedLabelColor = BrandTeal400,
                            unfocusedLabelColor = Slate400
                        )
                    )

                    if (errorMessage != null) {
                        Surface(
                            color = Red500.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Red400.copy(alpha = 0.4f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = errorMessage!!,
                                color = Red400,
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }
                }
            }

            // Transparent Notice
            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Navy800),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Enterprise Telemetry Policy",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 12.5.sp
                    )
                    Text(
                        text = "RecordHub logs professional SIM & WhatsApp call events and audio recordings for quality coaching and CRM synchronization.",
                        color = Slate400,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 2.dp)
            ) {
                Checkbox(
                    checked = acceptedConsent,
                    onCheckedChange = { acceptedConsent = it },
                    colors = CheckboxDefaults.colors(
                        checkedColor = BrandTeal500,
                        uncheckedColor = Slate500
                    )
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "I acknowledge the call tracking policy and consent to logging.",
                    color = Slate300,
                    fontSize = 11.5.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Sign In CTA Button
        Button(
            onClick = {
                scope.launch(Dispatchers.IO) {
                    isAuthenticating = true
                    var authenticated = false
                    var lastErrorMsg = "Invalid username or password"

                    val targetUrl = com.academically.recordhub.data.remote.ApiConstants.DEFAULT_BASE_URL
                    try {
                        val retrofit = retrofit2.Retrofit.Builder()
                            .baseUrl(targetUrl)
                            .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create())
                            .build()

                        val api = retrofit.create(com.academically.recordhub.data.remote.RecordHubApi::class.java)
                        val response = api.login(com.academically.recordhub.data.remote.LoginRequest(counselorEmail.trim(), password))

                        if (response.isSuccessful && response.body() != null) {
                            authenticated = true
                            val user = response.body()?.user
                            val counselorName = if (user != null && (!user.firstName.isNullOrBlank() || !user.lastName.isNullOrBlank())) {
                                "${user.firstName} ${user.lastName}".trim()
                            } else {
                                counselorEmail.trim().split("@")[0].replace(".", " ").replace("_", " ").split(" ")
                                    .joinToString(" ") { word -> word.replaceFirstChar { if (it.isLowerCase()) it.titlecase(java.util.Locale.US) else it.toString() } }
                            }
                            val prefs = context.getSharedPreferences("recordhub_prefs", android.content.Context.MODE_PRIVATE)
                            val now = System.currentTimeMillis()
                            var accountCreatedAtMs = now
                            if (!user?.createdAt.isNullOrBlank()) {
                                try {
                                    val cleanIso = user?.createdAt!!.replace("Z", "+00:00")
                                    val isoFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                                    val parsed = isoFormat.parse(cleanIso.substring(0, Math.min(19, cleanIso.length)))
                                    if (parsed != null && parsed.time > 0L) {
                                        accountCreatedAtMs = parsed.time
                                    }
                                } catch (_: Exception) {}
                            }

                            val editor = prefs.edit()
                                .putBoolean("is_logged_in", true)
                                .putString("counselor_email", counselorEmail.trim())
                                .putString("counselor_name", counselorName)
                                .putString("access_token", response.body()?.accessToken ?: "")
                                .putLong("account_created_at", accountCreatedAtMs)
                            editor.apply()
                        } else if (response.code() == 401 || response.code() == 400) {
                            lastErrorMsg = "Invalid email or password"
                        } else {
                            lastErrorMsg = "Server response error (${response.code()}). Please try again."
                        }
                    } catch (e: Exception) {
                        lastErrorMsg = "Cannot connect to server: ${e.localizedMessage ?: e.message}"
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
                .height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = BrandTeal600),
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isAuthenticating) {
                CircularProgressIndicator(
                    color = Navy950,
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.5.dp
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Authenticating...",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Navy950
                )
            } else {
                Text(
                    text = "Sign In & Bind Device",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
        }
    }
}
