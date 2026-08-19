package com.academically.recordhub.utils

import android.content.Context
import android.os.Environment
import android.util.Log
import java.io.File

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
        "/PhoneRecordings"
    )

    fun findAudioForCall(
        context: Context, 
        phoneNumber: String, 
        startTimeMs: Long, 
        endTimeMs: Long,
        claimedPaths: Set<String> = emptySet()
    ): File? {
        val root = Environment.getExternalStorageDirectory()
        val cleanPhone = phoneNumber.replace("\\D".toRegex(), "").takeLast(10)

        val prefs = context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
        val treeUriStr = prefs.getString("custom_recording_tree_uri", null)

        fun isConfidentMatch(fileName: String, fileLastModified: Long): Boolean {
            val fileNameCleanDigits = fileName.replace("\\D".toRegex(), "")
            val timeDiffEndMs = Math.abs(fileLastModified - endTimeMs)
            val timeDiffStartMs = Math.abs(fileLastModified - startTimeMs)
            val isNearCallTime = timeDiffEndMs <= 30 * 60 * 1000L || timeDiffStartMs <= 30 * 60 * 1000L

            // 1. If filename contains the call's 10-digit phone number, accept if modified near call time
            if (cleanPhone.length >= 7 && fileNameCleanDigits.contains(cleanPhone)) {
                return isNearCallTime
            }

            // 2. If filename contains a DIFFERENT phone number (10+ digits that don't contain cleanPhone) -> DO NOT MATCH OR UPLOAD!
            if (fileNameCleanDigits.length >= 10 && cleanPhone.length >= 7 && !fileNameCleanDigits.contains(cleanPhone)) {
                return false
            }

            // 3. Generic filename with no phone digits (e.g. REC_001.mp3) -> require modification strictly within 45 seconds of call end
            return timeDiffEndMs <= 45_000L || timeDiffStartMs <= 45_000L
        }

        // 1. Scan User-Selected SAF Directory Tree URI if selected via folder picker
        if (!treeUriStr.isNullOrEmpty()) {
            try {
                val treeUri = android.net.Uri.parse(treeUriStr)
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
                                val localTempFile = File(context.cacheDir, "SIM_REC_${System.currentTimeMillis()}_$fileName")
                                context.contentResolver.openInputStream(doc.uri)?.use { input ->
                                    localTempFile.outputStream().use { output ->
                                        input.copyTo(output)
                                    }
                                }
                                Log.i(TAG, "Matched user SAF folder recording: ${doc.uri} -> copied to ${localTempFile.absolutePath}")
                                return localTempFile
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error scanning user-selected SAF tree URI: ${e.message}")
            }
        }

        // 2. Fallback scan by relative path candidates
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
        }

        return null
    }

    private fun isAudioFile(name: String): Boolean {
        val lower = name.lowercase()
        return lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".aac") ||
                lower.endsWith(".amr") || lower.endsWith(".wav") || lower.endsWith(".3gp") || lower.endsWith(".ogg")
    }
}
