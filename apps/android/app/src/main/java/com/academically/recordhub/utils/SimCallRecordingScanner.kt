package com.academically.recordhub.utils

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object SimCallRecordingScanner {

    private const val TAG = "SimCallRecordingScanner"

    private val DEFAULT_RECORDING_FOLDERS = listOf(
        "/Recordings/Call",
        "/Recordings",
        "/CallRecordings",
        "/Call",
        "/Music/Recordings/Call",
        "/SoundRecorder",
        "/MIUI/sound_recorder/call_rec",
        "/MIUI/sound_recorder",
        "/Record/Call",
        "/Sounds/CallRecordings",
        "/VoiceRecorder",
        "/PhoneRecordings",
        "/Recordings/Standard",
        "/Android/data/com.catalinagroup.callrecorder/files",
        "/CallBox/Audio",
        "/Truecaller/Voice"
    )

    data class CandidateMatch(
        val file: File? = null,
        val uri: Uri? = null,
        val fileName: String,
        val score: Long,
        val source: String
    )

    fun findAudioForCall(
        context: Context,
        phoneNumber: String,
        startTimeMs: Long,
        endTimeMs: Long,
        claimedPaths: Set<String> = emptySet(),
        expectedDurationSec: Int = 0
    ): File? {
        val cleanPhone = phoneNumber.replace("\\D".toRegex(), "").takeLast(10)
        val prefs = context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
        val treeUriStr = prefs.getString("custom_recording_tree_uri", null)
        val accountCreatedAtMs = prefs.getLong("account_created_at", 0L)

        val candidates = mutableListOf<CandidateMatch>()

        // Helper to extract audio duration in seconds
        fun getAudioDuration(file: File): Int {
            return try {
                val retriever = android.media.MediaMetadataRetriever()
                retriever.setDataSource(file.absolutePath)
                val time = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)
                retriever.release()
                val timeMs = time?.toLongOrNull() ?: 0L
                (timeMs / 1000L).toInt()
            } catch (_: Exception) {
                0
            }
        }

        // 1. Helper to extract timestamp & raw date string from filename
        fun extractTimestamp(fileName: String): Pair<Long?, String?> {
            val baseName = fileName.substringBeforeLast(".")

            // Pattern A: 13-digit epoch timestamp (e.g. 1725426000000)
            val regexEpoch = "(\\b1[67]\\d{11}\\b)".toRegex()
            val matchEpoch = regexEpoch.find(baseName)
            if (matchEpoch != null) {
                val ts = matchEpoch.value.toLongOrNull()
                if (ts != null && ts > 1000000000000L) {
                    return Pair(ts, matchEpoch.value)
                }
            }

            // Pattern B: YYYYMMDD_HHMMSS or YYYYMMDD-HHMMSS (e.g. 20260904_123626)
            val regexUnder = "(\\d{8})[_\\-\\s](\\d{6})".toRegex()
            val matchUnder = regexUnder.find(baseName)
            if (matchUnder != null) {
                try {
                    val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    val ts = sdf.parse("${matchUnder.groupValues[1]}${matchUnder.groupValues[2]}")?.time
                    return Pair(ts, matchUnder.value)
                } catch (_: Exception) {}
            }

            // Pattern C: YYYY-MM-DD_HH-MM-SS or YYYY.MM.DD.HH.MM.SS (e.g. 2026-09-04_12-36-26)
            val regexDashed = "(\\d{4})[\\-\\.](\\d{2})[\\-\\.](\\d{2})[_\\-\\s](\\d{2})[\\-\\.:](\\d{2})[\\-\\.:](\\d{2})".toRegex()
            val matchDashed = regexDashed.find(baseName)
            if (matchDashed != null) {
                try {
                    val g = matchDashed.groupValues
                    val formatted = "${g[1]}${g[2]}${g[3]}${g[4]}${g[5]}${g[6]}"
                    val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    val ts = sdf.parse(formatted)?.time
                    return Pair(ts, matchDashed.value)
                } catch (_: Exception) {}
            }

            // Pattern D: 14 consecutive digits (e.g. 20260904123626)
            val regex14 = "(\\b20\\d{12}\\b)".toRegex()
            val match14 = regex14.find(baseName)
            if (match14 != null) {
                try {
                    val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    val ts = sdf.parse(match14.value)?.time
                    return Pair(ts, match14.value)
                } catch (_: Exception) {}
            }

            // Pattern E: YYMMDD_HHMMSS (Samsung style: 260904_123626)
            val regexSamsung = "(\\b\\d{6})[_\\-](\\d{6}\\b)".toRegex()
            val matchSamsung = regexSamsung.find(baseName)
            if (matchSamsung != null) {
                try {
                    val formatted = "20${matchSamsung.groupValues[1]}${matchSamsung.groupValues[2]}"
                    val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    val ts = sdf.parse(formatted)?.time
                    return Pair(ts, matchSamsung.value)
                } catch (_: Exception) {}
            }

            return Pair(null, null)
        }

        // 2. Score evaluation for any candidate file
        fun evaluateScore(fileName: String, fileLastModified: Long, fileDurationSec: Int = 0): Long {
            val (parsedTs, dateStr) = extractTimestamp(fileName)
            val effectiveTime = parsedTs ?: fileLastModified

            // Reject files created before account registration
            if (accountCreatedAtMs > 0L && effectiveTime < (accountCreatedAtMs - 60000L)) {
                return -1L
            }

            // Reject files created more than 15 minutes before the call began
            if (effectiveTime < (startTimeMs - 15 * 60 * 1000L)) {
                return -1L
            }

            // Strip the date/timestamp portion before checking phone number digits
            val nameWithoutDate = if (!dateStr.isNullOrEmpty()) {
                fileName.replace(dateStr, "")
            } else {
                fileName
            }

            val remainingDigits = nameWithoutDate.replace("\\D".toRegex(), "")
            val timeDiffEndSec = Math.abs(effectiveTime - endTimeMs) / 1000L
            val timeDiffStartSec = Math.abs(effectiveTime - startTimeMs) / 1000L
            val minDeltaSec = Math.min(timeDiffEndSec, timeDiffStartSec)

            var score = 0L

            // Phone number matching logic
            val hasPhoneMatch = cleanPhone.length >= 7 && remainingDigits.contains(cleanPhone)
            val hasMismatchPhone = remainingDigits.length >= 7 && cleanPhone.length >= 7 && !remainingDigits.contains(cleanPhone)

            if (hasMismatchPhone) {
                return -1L // Explicitly recorded for a different customer
            }

            // Reject generic files created before this specific call started
            if (!hasPhoneMatch && effectiveTime < (startTimeMs - 10000L)) {
                return -1L // Finished before call even began
            }

            if (hasPhoneMatch) {
                score += 3000L
            } else {
                // Generic / Timestamp only filename
                if (minDeltaSec > 120) {
                    return -1L // Too far in time (> 2 minutes)
                }
                score += (1800L - (minDeltaSec * 10))
            }

            // Proximity bonus to call start/end time
            if (minDeltaSec <= 15) {
                score += 1500L
            } else if (minDeltaSec <= 60) {
                score += 800L
            } else if (minDeltaSec <= 120) {
                score += 300L
            }

            // Duration alignment bonus / penalty
            if (expectedDurationSec > 0 && fileDurationSec > 0) {
                val durDelta = Math.abs(fileDurationSec - expectedDurationSec)
                if (durDelta <= 2) {
                    score += 2500L // Exact duration match!
                } else if (durDelta <= 4) {
                    score += 1200L
                } else if (durDelta <= 7 && hasPhoneMatch) {
                    score += 400L
                } else if (!hasPhoneMatch && durDelta > 4) {
                    return -1L // Reject mismatched generic file (e.g. 18s audio for 9s call)
                } else {
                    // Massive penalty for mismatched audio length
                    score -= (durDelta * 150L)
                }
            }

            return score
        }

        // --- Source 1: MediaStore Audio ---
        try {
            val mediaUris = mutableListOf(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try {
                    mediaUris.add(MediaStore.Audio.Media.getContentUri("external"))
                } catch (_: Exception) {}
            }

            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.DATE_ADDED,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.DATA
            )

            for (collectionUri in mediaUris) {
                val cursor = context.contentResolver.query(
                    collectionUri,
                    projection,
                    "${MediaStore.Audio.Media.SIZE} > 0",
                    null,
                    "${MediaStore.Audio.Media.DATE_MODIFIED} DESC"
                )

                cursor?.use { c ->
                    val idIdx = c.getColumnIndex(MediaStore.Audio.Media._ID)
                    val nameIdx = c.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME)
                    val modIdx = c.getColumnIndex(MediaStore.Audio.Media.DATE_MODIFIED)
                    val addIdx = c.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED)
                    val sizeIdx = c.getColumnIndex(MediaStore.Audio.Media.SIZE)
                    val durIdx = c.getColumnIndex(MediaStore.Audio.Media.DURATION)
                    val dataIdx = c.getColumnIndex(MediaStore.Audio.Media.DATA)

                    var count = 0
                    while (c.moveToNext() && count < 200) {
                        count++
                        val id = if (idIdx >= 0) c.getLong(idIdx) else -1L
                        val name = if (nameIdx >= 0) c.getString(nameIdx) ?: "" else ""
                        val size = if (sizeIdx >= 0) c.getLong(sizeIdx) else 0L
                        val durMs = if (durIdx >= 0) c.getLong(durIdx) else 0L
                        val durSec = (durMs / 1000L).toInt()
                        val rawPath = if (dataIdx >= 0) c.getString(dataIdx) ?: "" else ""
                        val modSec = if (modIdx >= 0) c.getLong(modIdx) else 0L
                        val addSec = if (addIdx >= 0) c.getLong(addIdx) else 0L
                        val effectiveModMs = if (modSec > 0) modSec * 1000L else if (addSec > 0) addSec * 1000L else System.currentTimeMillis()

                        if (!isAudioFile(name) && !isAudioFile(rawPath)) continue
                        if (size <= 0L) continue

                        val fileUri = ContentUris.withAppendedId(collectionUri, id)
                        val uriStr = fileUri.toString()
                        if (claimedPaths.contains(uriStr) || claimedPaths.contains(name) || (rawPath.isNotBlank() && claimedPaths.contains(rawPath))) {
                            continue
                        }

                        val score = evaluateScore(name.ifEmpty { rawPath }, effectiveModMs, durSec)
                        if (score > 0) {
                            if (rawPath.isNotBlank()) {
                                val directFile = File(rawPath)
                                if (directFile.exists() && directFile.canRead() && directFile.length() > 0) {
                                    val finalDur = if (durSec > 0) durSec else getAudioDuration(directFile)
                                    val refinedScore = evaluateScore(name.ifEmpty { directFile.name }, effectiveModMs, finalDur)
                                    if (refinedScore > 0) {
                                        candidates.add(CandidateMatch(file = directFile, fileName = directFile.name, score = refinedScore, source = "MediaStore_Direct"))
                                        continue
                                    }
                                }
                            }

                            val cleanName = name.ifEmpty { "call_rec_${id}.mp3" }
                            candidates.add(CandidateMatch(uri = fileUri, fileName = cleanName, score = score, source = "MediaStore_Stream"))
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error in MediaStore scan: ${e.message}")
        }

        // --- Source 2: SAF Directory Tree URI ---
        if (!treeUriStr.isNullOrEmpty()) {
            try {
                val treeUri = Uri.parse(treeUriStr)
                val documentFile = androidx.documentfile.provider.DocumentFile.fromTreeUri(context, treeUri)
                if (documentFile != null && documentFile.isDirectory) {
                    val docFiles = documentFile.listFiles()
                    for (doc in docFiles) {
                        val fileName = doc.name ?: continue
                        if (doc.isFile && isAudioFile(fileName) && doc.length() > 0) {
                            val docUriStr = doc.uri.toString()
                            if (claimedPaths.contains(docUriStr) || claimedPaths.contains(fileName)) {
                                continue
                            }

                            val score = evaluateScore(fileName, doc.lastModified(), expectedDurationSec)
                            if (score > 0) {
                                candidates.add(CandidateMatch(uri = doc.uri, fileName = fileName, score = score, source = "SAF_Folder"))
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error scanning SAF tree: ${e.message}")
            }
        }

        // --- Source 3: Known Directory File System ---
        val root = Environment.getExternalStorageDirectory()
        val customFolder = prefs.getString("custom_recording_folder", null)?.trim()
        val folderCandidates = mutableListOf<String>()
        if (!customFolder.isNullOrEmpty()) {
            folderCandidates.add(customFolder)
            if (!customFolder.startsWith("/")) folderCandidates.add("/$customFolder")
        }
        folderCandidates.addAll(DEFAULT_RECORDING_FOLDERS)

        for (relPath in folderCandidates.distinct()) {
            try {
                val dir = if (relPath.startsWith("/")) File(root, relPath) else File(relPath)
                if (dir.exists() && dir.isDirectory) {
                    val files = dir.listFiles() ?: continue
                    for (file in files) {
                        if (file.isFile && isAudioFile(file.name) && file.length() > 0) {
                            if (claimedPaths.contains(file.absolutePath) || claimedPaths.contains(file.name)) {
                                continue
                            }

                            val fileDur = getAudioDuration(file)
                            val score = evaluateScore(file.name, file.lastModified(), fileDur)
                            if (score > 0) {
                                candidates.add(CandidateMatch(file = file, fileName = file.name, score = score, source = "FileSystem_$relPath"))
                            }
                        }
                    }
                }
            } catch (_: Exception) {}
        }

        // --- Source 4: App WhatsApp Voip Recording Directory ---
        try {
            val waDir = File(context.filesDir, "whatsapp_recordings")
            if (waDir.exists() && waDir.isDirectory) {
                val waFiles = waDir.listFiles() ?: emptyArray()
                for (file in waFiles) {
                    if (file.isFile && isAudioFile(file.name) && file.length() > 0) {
                        if (!claimedPaths.contains(file.absolutePath) && !claimedPaths.contains(file.name)) {
                            val fileDur = getAudioDuration(file)
                            val score = evaluateScore(file.name, file.lastModified(), fileDur)
                            if (score > 0) {
                                candidates.add(CandidateMatch(file = file, fileName = file.name, score = score, source = "WhatsApp_Internal"))
                            }
                        }
                    }
                }
            }
        } catch (_: Exception) {}

        // Sort candidates by highest score and pick the best match
        val bestCandidate = candidates.maxByOrNull { it.score }
        if (bestCandidate != null) {
            Log.i(TAG, "Selected best candidate audio file for $phoneNumber (Score: ${bestCandidate.score}, Source: ${bestCandidate.source}): ${bestCandidate.fileName}")
            if (bestCandidate.file != null && bestCandidate.file.exists()) {
                return bestCandidate.file
            }
            if (bestCandidate.uri != null) {
                try {
                    val cleanName = bestCandidate.fileName.ifEmpty { "call_rec_${System.currentTimeMillis()}.mp3" }
                    val cacheFile = File(context.cacheDir, "REC_${System.currentTimeMillis()}_$cleanName")
                    context.contentResolver.openInputStream(bestCandidate.uri)?.use { input ->
                        cacheFile.outputStream().use { output -> input.copyTo(output) }
                    }
                    if (cacheFile.exists() && cacheFile.length() > 0) {
                        return cacheFile
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error copying best candidate URI to cache: ${e.message}")
                }
            }
        }

        return null
    }

    private fun isAudioFile(name: String): Boolean {
        val lower = name.lowercase()
        return lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".aac") ||
                lower.endsWith(".amr") || lower.endsWith(".wav") || lower.endsWith(".3gp") || lower.endsWith(".ogg")
    }
}
