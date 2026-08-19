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
        "/Recordings/Standard"
    )

    fun findAudioForCall(
        context: Context,
        phoneNumber: String,
        startTimeMs: Long,
        endTimeMs: Long,
        claimedPaths: Set<String> = emptySet()
    ): File? {
        val cleanPhone = phoneNumber.replace("\\D".toRegex(), "").takeLast(10)
        val prefs = context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
        val treeUriStr = prefs.getString("custom_recording_tree_uri", null)

        fun parseTimestampFromFileName(fileName: String): Long? {
            // Format 1: 14 consecutive digits anywhere (e.g. 20260819113214)
            val regex14 = "(\\d{4})(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})".toRegex()
            val match14 = regex14.find(fileName)
            if (match14 != null) {
                try {
                    val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    return sdf.parse(match14.value)?.time
                } catch (_: Exception) {}
            }

            // Format 2: YYYYMMDD_HHMMSS or YYYYMMDD-HHMMSS (e.g. 20260819_113214)
            val regexUnderscore = "(\\d{8})[_\\-](\\d{6})".toRegex()
            val matchUnder = regexUnderscore.find(fileName)
            if (matchUnder != null) {
                try {
                    val datePart = matchUnder.groupValues[1]
                    val timePart = matchUnder.groupValues[2]
                    val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    return sdf.parse("$datePart$timePart")?.time
                } catch (_: Exception) {}
            }

            // Format 3: YYYY-MM-DD_HH-MM-SS (e.g. 2026-08-19_11-32-14 or 2026-08-19 11.32.14)
            val regexDashed = "(\\d{4})[\\-](\\d{2})[\\-](\\d{2})[_\\-\\s](\\d{2})[\\-\\.:](\\d{2})[\\-\\.:](\\d{2})".toRegex()
            val matchDashed = regexDashed.find(fileName)
            if (matchDashed != null) {
                try {
                    val g = matchDashed.groupValues
                    val formatted = "${g[1]}${g[2]}${g[3]}${g[4]}${g[5]}${g[6]}"
                    val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    return sdf.parse(formatted)?.time
                } catch (_: Exception) {}
            }

            // Format 4: YYMMDD_HHMMSS (e.g. Samsung: 260819_113214)
            val regexSamsung = "(\\d{2})(\\d{2})(\\d{2})[_\\-](\\d{2})(\\d{2})(\\d{2})".toRegex()
            val matchSamsung = regexSamsung.find(fileName)
            if (matchSamsung != null) {
                try {
                    val g = matchSamsung.groupValues
                    val formatted = "20${g[1]}${g[2]}${g[3]}${g[4]}${g[5]}${g[6]}"
                    val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).apply {
                        timeZone = TimeZone.getDefault()
                    }
                    return sdf.parse(formatted)?.time
                } catch (_: Exception) {}
            }

            return null
        }

        fun isConfidentMatch(fileName: String, fileLastModified: Long): Boolean {
            val parsedTs = parseTimestampFromFileName(fileName)
            val effectiveTime = parsedTs ?: fileLastModified

            // Reject files created more than 10 minutes before the call started
            if (effectiveTime < (startTimeMs - 10 * 60 * 1000L)) {
                return false
            }

            val fileNameCleanDigits = fileName.replace("\\D".toRegex(), "")
            val timeDiffEndMs = Math.abs(effectiveTime - endTimeMs)
            val timeDiffStartMs = Math.abs(effectiveTime - startTimeMs)

            // 1. If filename contains the call's phone number digits, accept within a 15-minute window
            if (cleanPhone.length >= 7 && fileNameCleanDigits.contains(cleanPhone)) {
                return timeDiffEndMs <= 15 * 60 * 1000L || timeDiffStartMs <= 15 * 60 * 1000L
            }

            // 2. If filename contains a DIFFERENT 7+ digit phone number, reject
            if (fileNameCleanDigits.length >= 7 && cleanPhone.length >= 7 && !fileNameCleanDigits.contains(cleanPhone)) {
                return false
            }

            // 3. Generic filename (e.g. REC_001.mp3 or timestamp-only) -> require modification within 3 minutes of call
            return timeDiffEndMs <= 180_000L || timeDiffStartMs <= 180_000L
        }

        // 1. Scan Android System MediaStore (Works on all Android versions: 10, 11, 12, 13, 14, 15)
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
                    val dataIdx = c.getColumnIndex(MediaStore.Audio.Media.DATA)

                    var checkedCount = 0
                    while (c.moveToNext() && checkedCount < 100) {
                        checkedCount++
                        val id = if (idIdx >= 0) c.getLong(idIdx) else -1L
                        val name = if (nameIdx >= 0) c.getString(nameIdx) ?: "" else ""
                        val size = if (sizeIdx >= 0) c.getLong(sizeIdx) else 0L
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

                        if (isConfidentMatch(name.ifEmpty { rawPath }, effectiveModMs)) {
                            // If raw file path is accessible directly, return it
                            if (rawPath.isNotBlank()) {
                                val directFile = File(rawPath)
                                if (directFile.exists() && directFile.canRead() && directFile.length() > 0) {
                                    Log.i(TAG, "Matched MediaStore audio file directly: $rawPath for $phoneNumber")
                                    return directFile
                                }
                            }

                            // Otherwise copy MediaStore InputStream to app cache directory
                            try {
                                val cleanName = name.ifEmpty { "call_rec_${id}.mp3" }
                                val cacheFile = File(context.cacheDir, "MS_REC_${System.currentTimeMillis()}_$cleanName")
                                context.contentResolver.openInputStream(fileUri)?.use { input ->
                                    cacheFile.outputStream().use { output ->
                                        input.copyTo(output)
                                    }
                                }
                                if (cacheFile.exists() && cacheFile.length() > 0) {
                                    Log.i(TAG, "Matched MediaStore recording via ContentResolver: $fileUri -> copied to ${cacheFile.absolutePath}")
                                    return cacheFile
                                }
                            } catch (streamErr: Exception) {
                                Log.w(TAG, "Error copying MediaStore stream: ${streamErr.message}")
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error querying MediaStore: ${e.message}")
        }

        // 2. Scan User-Selected SAF Directory Tree URI if selected
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

                            if (isConfidentMatch(fileName, doc.lastModified())) {
                                val localTempFile = File(context.cacheDir, "SAF_REC_${System.currentTimeMillis()}_$fileName")
                                context.contentResolver.openInputStream(doc.uri)?.use { input ->
                                    localTempFile.outputStream().use { output ->
                                        input.copyTo(output)
                                    }
                                }
                                if (localTempFile.exists() && localTempFile.length() > 0) {
                                    Log.i(TAG, "Matched user SAF folder recording: ${doc.uri} -> copied to ${localTempFile.absolutePath}")
                                    return localTempFile
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error scanning user-selected SAF tree URI: ${e.message}")
            }
        }

        // 3. Scan Known File System Directories (Direct file storage fallback)
        val root = Environment.getExternalStorageDirectory()
        val customFolder = prefs.getString("custom_recording_folder", null)?.trim()
        val folderCandidates = mutableListOf<String>()
        if (!customFolder.isNullOrEmpty()) {
            folderCandidates.add(customFolder)
            if (!customFolder.startsWith("/")) {
                folderCandidates.add("/$customFolder")
            }
        }
        folderCandidates.addAll(DEFAULT_RECORDING_FOLDERS)
        val uniqueFolders = folderCandidates.distinct()

        for (relPath in uniqueFolders) {
            try {
                val dir = if (relPath.startsWith("/")) File(root, relPath) else File(relPath)
                if (dir.exists() && dir.isDirectory) {
                    val files = dir.listFiles() ?: continue
                    for (file in files) {
                        if (file.isFile && isAudioFile(file.name) && file.length() > 0) {
                            if (claimedPaths.contains(file.absolutePath) || claimedPaths.contains(file.name)) {
                                continue
                            }

                            if (isConfidentMatch(file.name, file.lastModified())) {
                                Log.i(TAG, "Matched SIM call audio recording: ${file.absolutePath} for phone: $phoneNumber")
                                return file
                            }
                        }
                    }
                }
            } catch (dirErr: Exception) {
                Log.w(TAG, "Error checking directory $relPath: ${dirErr.message}")
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
