package com.academically.recordhub.ui.screens

import android.media.MediaPlayer
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.academically.recordhub.data.local.CallEventEntity
import com.academically.recordhub.ui.theme.*
import java.io.File

@Composable
fun RecordingUploadScreen(
    recordings: List<CallEventEntity>,
    onSelectSafFolder: () -> Unit,
    onSyncNow: () -> Unit
) {
    val context = LocalContext.current
    var playingFilePath by remember { mutableStateOf<String?>(null) }
    var mediaPlayer by remember { mutableStateOf<MediaPlayer?>(null) }

    DisposableEffect(Unit) {
        onDispose {
            mediaPlayer?.release()
            mediaPlayer = null
        }
    }

    fun togglePlay(filePath: String) {
        if (playingFilePath == filePath) {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            playingFilePath = null
        } else {
            try {
                mediaPlayer?.stop()
                mediaPlayer?.release()
                mediaPlayer = MediaPlayer().apply {
                    setDataSource(filePath)
                    prepare()
                    start()
                    setOnCompletionListener {
                        playingFilePath = null
                    }
                }
                playingFilePath = filePath
            } catch (e: Exception) {
                Log.e("RecordingScreen", "Error playing audio file: ${e.message}")
                playingFilePath = null
            }
        }
    }

    val recordingsWithFiles = recordings.filter { 
        !it.recordingPath.isNullOrEmpty() && File(it.recordingPath).exists() 
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header Title
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Call Recordings",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
                Text(
                    text = "Manage & Sync Audio Files to AWS S3",
                    style = MaterialTheme.typography.bodySmall.copy(color = Slate400)
                )
            }

            IconButton(
                onClick = onSyncNow,
                colors = IconButtonDefaults.iconButtonColors(containerColor = Navy800)
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Sync Recordings",
                    tint = MedicalTeal400
                )
            }
        }

        // Summary Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Navy900),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Mic,
                            contentDescription = null,
                            tint = MedicalTeal400,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "AWS S3 Recording Storage",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 13.sp
                            )
                            Text(
                                text = "Bucket: academically-recorderhub (ap-south-1)",
                                color = Slate400,
                                fontSize = 11.sp
                            )
                        }
                    }

                    Surface(
                        color = Emerald400.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Text(
                            text = "${recordingsWithFiles.size} Local Audio Files",
                            color = Emerald400,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onSyncNow,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = MedicalTeal400)
                    ) {
                        Icon(Icons.Default.CloudUpload, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Sync All to S3", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = onSelectSafFolder,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate200)
                    ) {
                        Icon(Icons.Default.FolderOpen, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("SAF Folder", fontSize = 12.sp)
                    }
                }
            }
        }

        Text(
            text = "Recorded Audio Files",
            fontWeight = FontWeight.Bold,
            color = Color.White,
            fontSize = 14.sp
        )

        if (recordingsWithFiles.isEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Navy900),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = null,
                        tint = Slate400,
                        modifier = Modifier.size(40.dp)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "No Audio Recordings Discovered Yet",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Recordings will appear here after placing a SIM or WhatsApp call on your device.",
                        color = Slate400,
                        fontSize = 12.sp
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(recordingsWithFiles) { item ->
                    val file = File(item.recordingPath!!)
                    val isPlaying = playingFilePath == item.recordingPath
                    val isSynced = item.syncStatus == "SYNCED"

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Navy900),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(if (isPlaying) MedicalTeal400 else Navy800)
                                        .clickable { togglePlay(item.recordingPath) },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = if (isPlaying) Icons.Default.Stop else Icons.Default.PlayArrow,
                                        contentDescription = "Play Audio",
                                        tint = if (isPlaying) Navy950 else MedicalTeal400,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column {
                                    Text(
                                        text = item.phoneNumber,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 13.sp
                                    )
                                    Text(
                                        text = "${item.disposition} • ${item.durationSeconds}s • ${(file.length() / 1024)} KB",
                                        color = Slate400,
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            Surface(
                                color = if (isSynced) Emerald400.copy(alpha = 0.15f) else Amber400.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isSynced) Icons.Default.CheckCircle else Icons.Default.CloudUpload,
                                        contentDescription = null,
                                        tint = if (isSynced) Emerald400 else Amber400,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (isSynced) "S3 Synced" else "Pending S3",
                                        color = if (isSynced) Emerald400 else Amber400,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
