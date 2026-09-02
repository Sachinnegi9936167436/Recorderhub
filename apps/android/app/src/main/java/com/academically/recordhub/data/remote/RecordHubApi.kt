package com.academically.recordhub.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

data class LoginRequest(val email: String, val pass: String)
data class LoginResponse(val accessToken: String, val user: UserDto)
data class UserDto(val id: String, val email: String, val firstName: String, val lastName: String, val role: String, val organizationId: String? = null, val createdAt: String? = null)

data class BatchSyncRequest(
    val callEvents: List<CallEventDto>,
    val completedRecordingIds: List<String>? = null
)

data class UploadUrlInfo(
    val idempotencyKey: String,
    val recordingId: String,
    val s3Key: String,
    val presignedPutUrl: String,
    val fallbackUploadUrl: String? = null
)

data class CallEventDto(
    val deviceId: String = "ANDROID_DEVICE",
    val idempotencyKey: String,
    val phoneNumber: String,
    val direction: String,
    val status: String,
    val startTime: String,
    val endTime: String,
    val durationSeconds: Int,
    val simSlot: Int,
    val isPrivate: Boolean,
    val disposition: String,
    val channel: String = "CELLULAR",
    val agentName: String? = null,
    val counselorEmail: String? = null,
    val hasRecording: Boolean = false,
    val fileSizeBytes: Long? = null,
    val mimeType: String? = null
)

data class BatchSyncResponse(
    val syncedCount: Int,
    val duplicateCount: Int,
    val syncedIds: List<String>,
    val duplicates: List<String>,
    val uploadUrls: List<UploadUrlInfo>? = null
)

data class DeviceRegisterRequest(
    val deviceId: String,
    val deviceModel: String,
    val androidVersion: String,
    val appVersion: String,
    val batteryOptimizationDisabled: Boolean,
    val safDirectoryAuthorized: Boolean,
    val agentName: String? = null,
    val counselorEmail: String? = null
)

data class UploadInitiateRequest(
    val callId: String,
    val fileSizeBytes: Long,
    val mimeType: String,
    val checksumSha256: String,
    val durationSeconds: Int,
    val deviceId: String? = null,
    val counselorEmail: String? = null
)

data class UploadInitiateResponse(
    val recordingId: String,
    val s3Key: String,
    val presignedPutUrl: String,
    val fallbackUploadUrl: String? = null
)

data class UploadCompleteRequest(
    val callId: String
)

data class ValidateSessionRequest(val email: String)
data class ValidateSessionResponse(val valid: Boolean, val message: String? = null)

interface RecordHubApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/validate")
    suspend fun validateSession(
        @Header("Authorization") token: String,
        @Body request: ValidateSessionRequest
    ): Response<ValidateSessionResponse>

    @POST("devices/register")
    suspend fun registerDevice(
        @Header("Authorization") token: String,
        @Body request: DeviceRegisterRequest
    ): Response<Any>

    @POST("calls/batch-sync")
    suspend fun batchSyncCalls(
        @Header("Authorization") token: String,
        @Body request: BatchSyncRequest
    ): Response<BatchSyncResponse>

    @POST("recordings/upload-initiate")
    suspend fun initiateUpload(
        @Header("Authorization") token: String,
        @Body request: UploadInitiateRequest
    ): Response<UploadInitiateResponse>

    @POST("recordings/{id}/upload-complete")
    suspend fun completeUpload(
        @Header("Authorization") token: String,
        @Path("id") recordingId: String,
        @Body request: UploadCompleteRequest
    ): Response<Any>
}
