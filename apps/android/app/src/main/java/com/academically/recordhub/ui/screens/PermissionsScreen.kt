package com.academically.recordhub.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

// Visual Colors matching Callyzer Permission Design
private val ScreenBg = Color(0xFFFAFAFA)
private val TextPrimary = Color(0xFF1A1F2C)
private val TextSecondary = Color(0xFF4A5568)
private val AmberButton = Color(0xFFFAB005)
private val AmberDark = Color(0xFFE59E00)
private val PillActive = Color(0xFF1E293B)
private val PillInactive = Color(0xFFCBD5E1)
private val ShieldColor = Color(0xFF1E293B)
private val HandSkinColor = Color(0xFFFBBF94)
private val HandShadowColor = Color(0xFFEA9E6D)
private val ShirtBlue = Color(0xFF93C5FD)

@Composable
fun PermissionsScreen(onPermissionsGranted: () -> Unit) {
    var currentStep by remember { mutableIntStateOf(0) }
    var showPrivacyDialog by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = ScreenBg
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            // Top Step Indicator (3 dashes for Call Log, Contacts, Audio)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp, bottom = 6.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (i in 0..2) {
                    Box(
                        modifier = Modifier
                            .width(28.dp)
                            .height(3.5.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(if (currentStep == i) PillActive else PillInactive)
                            .clickable { currentStep = i }
                    )
                    if (i < 2) Spacer(modifier = Modifier.width(6.dp))
                }
            }

            // Scrollable Content
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp, vertical = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Illustration
                when (currentStep) {
                    0 -> CallLogIllustration()
                    1 -> ContactsAccessIllustration()
                    else -> AudioStorageIllustration()
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Title
                Text(
                    text = when (currentStep) {
                        0 -> "ACCESS TO YOUR DEVICE'S\nCALL LOG"
                        1 -> "Contacts Access"
                        else -> "ACCESS TO RECORDINGS &\nCALL AUDIO"
                    },
                    style = MaterialTheme.typography.headlineSmall.copy(
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary,
                        letterSpacing = if (currentStep == 1) 0.sp else 0.5.sp,
                        lineHeight = 28.sp,
                        textAlign = TextAlign.Center
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Screen Specific Content
                when (currentStep) {
                    0 -> CallLogPermissionContent()
                    1 -> ContactsPermissionContent()
                    else -> AudioStoragePermissionContent()
                }

                Spacer(modifier = Modifier.height(16.dp))
            }

            // Sticky Bottom Section (Button + Security Badge + Privacy Link)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(ScreenBg)
                    .padding(horizontal = 24.dp, vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Button(
                    onClick = {
                        if (currentStep < 2) {
                            currentStep += 1
                            onPermissionsGranted()
                        } else {
                            onPermissionsGranted()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .shadow(elevation = 2.dp, shape = RoundedCornerShape(16.dp)),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AmberButton,
                        contentColor = TextPrimary
                    ),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = when (currentStep) {
                            0 -> "Allow Access"
                            1 -> "Let's do it"
                            else -> "Grant & Launch RecordHub"
                        },
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = TextPrimary
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Trust Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.VerifiedUser,
                        contentDescription = "Secure",
                        tint = ShieldColor,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "It is Secure!",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.5.sp,
                        color = TextPrimary
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Privacy Policy Link
                Text(
                    text = "Privacy Policy",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B),
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier
                        .clickable { showPrivacyDialog = true }
                        .padding(4.dp)
                )
            }
        }
    }

    if (showPrivacyDialog) {
        PrivacyPolicyDialog(onDismiss = { showPrivacyDialog = false })
    }
}

@Composable
private fun CallLogPermissionContent() {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Why we need this permission:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Your default dialer only shows your call history. RecordHub helps you understand and synchronize it.",
            fontSize = 13.5.sp,
            color = TextSecondary,
            lineHeight = 19.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "RecordHub requires access to your call history to provide its core features. It uses call log data to generate insights, summaries, and detailed reports about your call activity. This allows you to track interactions, analyse patterns, and organise your calls effectively.",
            fontSize = 13.5.sp,
            color = TextSecondary,
            lineHeight = 19.sp
        )

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "All data is processed securely and synchronized with your enterprise portal.",
            fontWeight = FontWeight.Bold,
            fontSize = 13.5.sp,
            color = TextPrimary,
            lineHeight = 19.sp
        )

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "What we use it for:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        BulletItem(text = "Show incoming, outgoing, missed and rejected calls")
        BulletItem(text = "Generate call reports and analytics")
        BulletItem(text = "Display call duration, time and contact details")

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "How we protect your data:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        BulletItem(text = "Call log is synchronized securely with your portal only")
        BulletItem(text = "We use TLS encryption for all data in transit")
        BulletItem(text = "RecordHub only tracks authorized student counseling calls")
    }
}

@Composable
private fun ContactsPermissionContent() {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Why we need this permission:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Access to contacts allows RecordHub to map phone numbers to saved contact names, photos, and details. This improves the accuracy and readability of call history, reports, and analytics.",
            fontSize = 13.5.sp,
            color = TextSecondary,
            lineHeight = 19.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "All contact data is accessed only for this purpose and remains stored locally on your device.",
            fontSize = 13.5.sp,
            color = TextSecondary,
            lineHeight = 19.sp
        )

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "What we use it for:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        BulletItem(text = "Display contact names instead of raw phone numbers")
        BulletItem(text = "Show profile photos in your contact listing")
        BulletItem(text = "Match call log entries with the right contact")
        BulletItem(text = "Highlight your favourite contacts at the top")

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "How we protect your data:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        BulletItem(text = "Contacts are read from your device only")
        BulletItem(text = "We never upload your contacts to any server or cloud")
        BulletItem(text = "Contact data is never shared with any third party")
        BulletItem(text = "Only name, number, photo and favourite status are accessed")
    }
}

@Composable
private fun AudioStoragePermissionContent() {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Why we need this permission:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Your default audio recorder stores voice calls locally. RecordHub links and backs up recordings securely to the cloud.",
            fontSize = 13.5.sp,
            color = TextSecondary,
            lineHeight = 19.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "RecordHub requires access to device audio storage to attach recordings to customer calls, enable playback, and upload them securely to your organization's cloud storage.",
            fontSize = 13.5.sp,
            color = TextSecondary,
            lineHeight = 19.sp
        )

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "All audio recordings are encrypted in transit and securely stored in enterprise AWS S3 storage.",
            fontWeight = FontWeight.Bold,
            fontSize = 13.5.sp,
            color = TextPrimary,
            lineHeight = 19.sp
        )

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "What we use it for:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        BulletItem(text = "Attach call audio to corresponding counselor call entries")
        BulletItem(text = "Enable instant playback and review directly within the portal")
        BulletItem(text = "Automatic cloud backup to enterprise AWS S3 storage")

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "How we protect your data:",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        BulletItem(text = "Audio recordings are encrypted and strictly confidential")
        BulletItem(text = "Role-based access controls protect student & counselor privacy")
        BulletItem(text = "RecordHub only processes authorized counseling audio files")
    }
}

@Composable
private fun BulletItem(text: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.5.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = "•",
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
            color = TextPrimary,
            modifier = Modifier.padding(end = 8.dp)
        )
        Text(
            text = text,
            fontSize = 13.5.sp,
            color = TextSecondary,
            lineHeight = 18.5.sp
        )
    }
}

/**
 * Faithful Callyzer-style Contacts Illustration:
 * Hands holding smartphone with Contacts list, blue circular backdrop
 */
@Composable
private fun ContactsAccessIllustration() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp),
        contentAlignment = Alignment.Center
    ) {
        // Large Circular Backdrop Disk
        Box(
            modifier = Modifier
                .size(190.dp)
                .clip(CircleShape)
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xFFE2EDFE), Color(0xFFD0E1FD))
                    )
                )
        )

        // Left Hand & Cuff holding the phone
        Box(
            modifier = Modifier
                .offset(x = (-60).dp, y = 20.dp)
                .width(55.dp)
                .height(130.dp)
        ) {
            // Sleeve
            Box(
                modifier = Modifier
                    .width(48.dp)
                    .height(65.dp)
                    .align(Alignment.BottomStart)
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 8.dp))
                    .background(ShirtBlue)
            ) {
                // Sleeve Cuff Button
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .align(Alignment.Center)
                        .background(Color(0xFF1E3A8A), CircleShape)
                )
            }
            // Left Thumb clasping phone
            Box(
                modifier = Modifier
                    .width(36.dp)
                    .height(75.dp)
                    .align(Alignment.TopEnd)
                    .clip(RoundedCornerShape(18.dp))
                    .background(HandSkinColor)
            )
        }

        // Center Smartphone with Contacts List
        Card(
            modifier = Modifier
                .width(128.dp)
                .height(180.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = BorderStroke(2.dp, Color(0xFF1E3A8A)),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 6.dp, vertical = 6.dp)
            ) {
                // Header: "Contacts"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Contacts",
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp,
                        color = TextPrimary
                    )
                    Icon(
                        imageVector = Icons.Default.MoreVert,
                        contentDescription = null,
                        tint = Color(0xFF64748B),
                        modifier = Modifier.size(10.dp)
                    )
                }

                Spacer(modifier = Modifier.height(3.dp))

                // Search Bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(14.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0xFFF1F5F9))
                        .padding(horizontal = 4.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(8.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("Search", fontSize = 7.sp, color = Color(0xFF94A3B8))
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Contact Items Mockup
                ContactMiniRow(name = "Samved Bhai", letter = "S", color = Color(0xFFD97706))
                ContactMiniRow(name = "Chetan Chetan", letter = "C", color = Color(0xFF2563EB))
                ContactMiniRow(name = "Dev Dave", letter = "D", color = Color(0xFF059669))
                ContactMiniRow(name = "Mrugal Pathar", letter = "M", color = Color(0xFFDC2626))
                ContactMiniRow(name = "Yuvraj Zala", letter = "Y", color = Color(0xFF7C3AED))

                Spacer(modifier = Modifier.weight(1f))

                // Bottom Phone Navigation Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Icon(imageVector = Icons.Default.Call, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(9.dp))
                    Icon(imageVector = Icons.Default.Person, contentDescription = null, tint = Color(0xFF2563EB), modifier = Modifier.size(9.dp))
                    Icon(imageVector = Icons.Default.BarChart, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(9.dp))
                }
            }
        }

        // Right Hand & Pointing Finger
        Box(
            modifier = Modifier
                .offset(x = 55.dp, y = 30.dp)
                .width(65.dp)
                .height(120.dp)
        ) {
            // Palm
            Box(
                modifier = Modifier
                    .width(50.dp)
                    .height(80.dp)
                    .align(Alignment.BottomEnd)
                    .clip(RoundedCornerShape(20.dp))
                    .background(HandSkinColor)
            )
            // Pointing Index Finger towards screen
            Box(
                modifier = Modifier
                    .width(42.dp)
                    .height(26.dp)
                    .align(Alignment.TopStart)
                    .clip(RoundedCornerShape(13.dp))
                    .background(HandSkinColor)
                    .border(1.dp, HandShadowColor, RoundedCornerShape(13.dp))
            )
        }
    }
}

@Composable
private fun ContactMiniRow(name: String, letter: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(14.dp)
                    .clip(CircleShape)
                    .background(color),
                contentAlignment = Alignment.Center
            ) {
                Text(text = letter, color = Color.White, fontSize = 7.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = name,
                fontSize = 7.5.sp,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
                maxLines = 1
            )
        }
        Text(text = "Total Calls", fontSize = 6.sp, color = Color(0xFF94A3B8))
    }
}

@Composable
private fun CallLogIllustration() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(190.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(170.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Color(0xFFE0F2FE).copy(alpha = 0.6f),
                            Color(0xFFFEF3C7).copy(alpha = 0.4f),
                            Color.Transparent
                        )
                    ),
                    shape = CircleShape
                )
        )

        Row(
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .align(Alignment.Center),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .background(Color(0xFFFEF3C7), shape = CircleShape)
                        .border(1.dp, Color(0xFFFDE68A), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = AmberDark,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Box(
                    modifier = Modifier
                        .width(36.dp)
                        .height(18.dp)
                        .background(Color(0xFF1E293B), shape = RoundedCornerShape(4.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.BusinessCenter,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(11.dp)
                    )
                }
            }

            Card(
                modifier = Modifier
                    .width(130.dp)
                    .height(175.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(2.dp, Color(0xFF334155)),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 8.dp, vertical = 10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .background(Color(0xFF10B981), shape = CircleShape)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "RecordHub",
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            color = Color(0xFF1E293B)
                        )
                    }

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(54.dp)
                                .border(1.5.dp, Color(0xFF334155), shape = RoundedCornerShape(14.dp))
                                .padding(4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PhoneInTalk,
                                contentDescription = null,
                                tint = AmberDark,
                                modifier = Modifier.size(26.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "call-history",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF64748B)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .width(32.dp)
                            .height(3.dp)
                            .background(Color(0xFF94A3B8), shape = RoundedCornerShape(2.dp))
                    )
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .background(Color(0xFFE0F2FE), shape = CircleShape)
                        .border(1.dp, Color(0xFFBAE6FD), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Leaderboard,
                        contentDescription = null,
                        tint = Color(0xFF0284C7),
                        modifier = Modifier.size(22.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Box(
                    modifier = Modifier
                        .width(36.dp)
                        .height(18.dp)
                        .background(Color(0xFF0284C7), shape = RoundedCornerShape(4.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Laptop,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(11.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun AudioStorageIllustration() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(190.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(170.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Color(0xFFD1FAE5).copy(alpha = 0.6f),
                            Color(0xFFE0F2FE).copy(alpha = 0.5f),
                            Color.Transparent
                        )
                    ),
                    shape = CircleShape
                )
        )

        Card(
            modifier = Modifier
                .width(130.dp)
                .height(175.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = BorderStroke(2.dp, Color(0xFF059669)),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 8.dp, vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(Color(0xFF10B981), shape = CircleShape)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "RecordHub Cloud",
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp,
                        color = Color(0xFF1E293B)
                    )
                }

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .background(Color(0xFFECFDF5), shape = RoundedCornerShape(14.dp))
                            .border(1.5.dp, Color(0xFF10B981), shape = RoundedCornerShape(14.dp))
                            .padding(4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudUpload,
                            contentDescription = null,
                            tint = Color(0xFF059669),
                            modifier = Modifier.size(26.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "AWS S3 Sync",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF059669)
                    )
                }

                Box(
                    modifier = Modifier
                        .width(32.dp)
                        .height(3.dp)
                        .background(Color(0xFF94A3B8), shape = RoundedCornerShape(2.dp))
                )
            }
        }
    }
}

@Composable
private fun PrivacyPolicyDialog(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Privacy & Data Policy",
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = TextPrimary
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color(0xFF64748B)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "RecordHub is designed exclusively for authorized student counseling and academic admissions communication.",
                    fontSize = 13.sp,
                    color = TextSecondary,
                    lineHeight = 18.sp
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Key Commitments:",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.5.sp,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
                BulletItem(text = "All call events and audio recordings are transmitted via TLS 1.3 encryption.")
                BulletItem(text = "Contacts are read locally only to match caller names with CRM profiles.")
                BulletItem(text = "Data is securely stored in dedicated AWS S3 storage with role-based access.")
                BulletItem(text = "Personal/private calls marked as private are excluded from synchronization.")

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AmberButton, contentColor = TextPrimary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("I Understand", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
