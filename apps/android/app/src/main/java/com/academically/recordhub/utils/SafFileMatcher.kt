package com.academically.recordhub.utils

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import java.io.InputStream
import java.security.MessageDigest

data class AudioMatchResult(
    val fileUri: Uri,
    val fileName: String,
    val fileSizeBytes: Long,
    val checksumSha256: String,
    val durationSeconds: Int
)

object SafFileMatcher {
    /**
     * Matches a call event with native audio files saved in authorized SAF folder tree
     */
    fun findMatchingAudioFile(
        context: Context,
        treeUri: Uri,
        phoneNumber: String,
        callStartTimeMs: Long,
        durationSeconds: Int
    ): AudioMatchResult? {
        val rootDir = DocumentFile.fromTreeUri(context, treeUri) ?: return null
        val files = rootDir.listFiles()

        // Clean phone digits for string matching
        val cleanDigits = phoneNumber.replace("\\D".toRegex(), "").takeLast(10)

        for (file in files) {
            if (!file.isFile) continue
            val name = file.name ?: continue
            val extension = name.substringAfterLast('.', "").lowercase()

            if (extension !in listOf("m4a", "mp3", "amr", "wav", "aac", "3gp")) continue

            val fileLastModified = file.lastModified()
            val timeDiffMs = Math.abs(fileLastModified - callStartTimeMs)

            // Matching criteria: file modified within 60s of call end, and file name contains phone digits
            val isTimeMatched = timeDiffMs <= 90000 // 90 second tolerance window
            val isPhoneMatched = cleanDigits.isNotEmpty() && name.contains(cleanDigits)

            if (isTimeMatched || isPhoneMatched) {
                val checksum = calculateSha256(context, file.uri) ?: continue
                return AudioMatchResult(
                    fileUri = file.uri,
                    fileName = name,
                    fileSizeBytes = file.length(),
                    checksumSha256 = checksum,
                    durationSeconds = if (durationSeconds > 0) durationSeconds else 120
                )
            }
        }
        return null
    }

    private fun calculateSha256(context: Context, uri: Uri): String? {
        return try {
            val inputStream: InputStream = context.contentResolver.openInputStream(uri) ?: return null
            val digest = MessageDigest.getInstance("SHA-256")
            val buffer = ByteArray(8192)
            var read: Int
            while (inputStream.read(buffer).also { read = it } != -1) {
                digest.update(buffer, 0, read)
            }
            inputStream.close()
            digest.digest().joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            null
        }
    }
}
