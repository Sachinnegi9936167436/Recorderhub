package com.academically.recordhub.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.remote.BatchSyncRequest
import com.academically.recordhub.data.remote.CallEventDto
import com.academically.recordhub.data.remote.RecordHubApi
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class CallSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val db = AppDatabase.getInstance(applicationContext)
        val pendingEvents = db.callEventDao().getPendingSyncEvents()

        if (pendingEvents.isEmpty()) {
            return Result.success()
        }

        return try {
            val retrofit = Retrofit.Builder()
                .baseUrl("https://recorderhub-gold.vercel.app/api/v1/")
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            val api = retrofit.create(RecordHubApi::class.java)

            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }

            val dtoList = pendingEvents.map { evt ->
                CallEventDto(
                    deviceId = evt.deviceId,
                    idempotencyKey = evt.idempotencyKey,
                    phoneNumber = evt.phoneNumber,
                    direction = evt.direction,
                    status = evt.status,
                    startTime = sdf.format(Date(evt.startTime)),
                    endTime = sdf.format(Date(evt.endTime)),
                    durationSeconds = evt.durationSeconds,
                    simSlot = evt.simSlot,
                    isPrivate = evt.isPrivate,
                    disposition = evt.disposition
                )
            }

            val response = api.batchSyncCalls("Bearer mock_jwt_token", BatchSyncRequest(dtoList))

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val syncedKeys = body.syncedIds + body.duplicates
                if (syncedKeys.isNotEmpty()) {
                    db.callEventDao().markEventsSynced(syncedKeys)
                    Log.i("CallSyncWorker", "Successfully synced ${syncedKeys.size} call events to API")
                }
                Result.success()
            } else {
                Log.w("CallSyncWorker", "API Batch sync failed with status ${response.code()}")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e("CallSyncWorker", "Offline sync worker exception", e)
            Result.retry()
        }
    }
}
