package com.academically.recordhub.utils

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.academically.recordhub.BuildConfig
import com.academically.recordhub.data.remote.ApiConstants
import com.academically.recordhub.data.remote.AppUpdateCheckResponse
import com.academically.recordhub.data.remote.RecordHubApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

object AppUpdateManager {

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val api: RecordHubApi by lazy {
        Retrofit.Builder()
            .baseUrl(ApiConstants.DEFAULT_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(RecordHubApi::class.java)
    }

    suspend fun checkForUpdate(context: Context): AppUpdateCheckResponse? {
        return withContext(Dispatchers.IO) {
            try {
                val prefs = context.getSharedPreferences("recordhub_prefs", Context.MODE_PRIVATE)
                val androidId = try {
                    android.provider.Settings.Secure.getString(context.contentResolver, android.provider.Settings.Secure.ANDROID_ID)
                } catch (e: Exception) {
                    "device"
                } ?: "device"
                val deviceId = "ANDROID-${Build.MODEL.replace(" ", "_")}-$androidId"
                val email = prefs.getString("counselor_email", null)
                val agentName = prefs.getString("counselor_name", null)
                val deviceModel = "${Build.MANUFACTURER.replaceFirstChar { if (it.isLowerCase()) it.titlecase(java.util.Locale.US) else it.toString() }} ${Build.MODEL}".trim()
                val androidVersion = "Android ${Build.VERSION.RELEASE}"

                val response = api.checkAppUpdate(
                    versionCode = BuildConfig.VERSION_CODE,
                    appVersion = BuildConfig.VERSION_NAME,
                    deviceId = deviceId,
                    email = email,
                    deviceModel = deviceModel,
                    androidVersion = androidVersion,
                    agentName = agentName
                )

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.updateAvailable) {
                        AppLogManager.log(
                            "INFO",
                            "OTA_Update",
                            "New update available: v${body.latestVersionName} (Build ${body.latestVersionCode}), Forced=${body.isForced}"
                        )
                        return@withContext body
                    }
                }
                null
            } catch (e: Exception) {
                AppLogManager.log("WARN", "OTA_Update", "Failed to check update: ${e.message}")
                null
            }
        }
    }

    suspend fun downloadAndInstallApk(
        context: Context,
        downloadUrl: String,
        onProgress: (Int) -> Unit
    ): Result<File> {
        return withContext(Dispatchers.IO) {
            try {
                val fullUrl = if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
                    downloadUrl
                } else {
                    val base = ApiConstants.DEFAULT_BASE_URL.removeSuffix("/")
                    if (downloadUrl.startsWith("/")) {
                        val hostOnly = base.substringBefore("/api")
                        "$hostOnly$downloadUrl"
                    } else {
                        "$base/$downloadUrl"
                    }
                }

                AppLogManager.log("INFO", "OTA_Update", "Downloading APK from: $fullUrl")
                
                // Target file in app-specific external files directory
                val downloadDir = context.getExternalFilesDir(null) ?: context.filesDir
                val apkFile = File(downloadDir, "RecordHub_Update.apk")
                if (apkFile.exists()) {
                    apkFile.delete()
                }

                val request = Request.Builder().url(fullUrl).build()
                val response = okHttpClient.newCall(request).execute()

                if (!response.isSuccessful || response.body == null) {
                    throw IllegalStateException("Failed to download APK: HTTP ${response.code}")
                }

                val body = response.body!!
                val contentLength = body.contentLength()
                val inputStream = body.byteStream()
                val outputStream = FileOutputStream(apkFile)

                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalBytesRead = 0L

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead
                    if (contentLength > 0) {
                        val progress = ((totalBytesRead * 100) / contentLength).toInt()
                        withContext(Dispatchers.Main) {
                            onProgress(progress)
                        }
                    }
                }

                outputStream.flush()
                outputStream.close()
                inputStream.close()

                AppLogManager.log("INFO", "OTA_Update", "APK downloaded successfully (${apkFile.length()} bytes)")
                
                // Launch package installer
                withContext(Dispatchers.Main) {
                    launchPackageInstaller(context, apkFile)
                }

                Result.success(apkFile)
            } catch (e: Exception) {
                AppLogManager.log("ERROR", "OTA_Update", "Download error: ${e.message}")
                Result.failure(e)
            }
        }
    }

    fun launchPackageInstaller(context: Context, apkFile: File) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.packageManager.canRequestPackageInstalls()) {
                    AppLogManager.log("WARN", "OTA_Update", "Requesting Install Unknown Apps permission...")
                    val manageIntent = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${context.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(manageIntent)
                }
            }

            val apkUri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

            context.startActivity(intent)
            AppLogManager.log("INFO", "OTA_Update", "System Package Installer intent launched for: $apkUri")
        } catch (e: Exception) {
            AppLogManager.log("ERROR", "OTA_Update", "Failed to launch package installer: ${e.message}")
        }
    }
}
