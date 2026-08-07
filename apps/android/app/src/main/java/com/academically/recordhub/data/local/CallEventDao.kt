package com.academically.recordhub.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface CallEventDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertCallEvent(event: CallEventEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertBatch(events: List<CallEventEntity>)

    @Query("SELECT * FROM call_events WHERE isPrivate = 0 ORDER BY startTime DESC")
    fun getTrackedCallsFlow(): Flow<List<CallEventEntity>>

    @Query("SELECT * FROM call_events WHERE isPrivate = 1 ORDER BY startTime DESC")
    fun getPrivateCallsFlow(): Flow<List<CallEventEntity>>

    @Query("SELECT * FROM call_events WHERE syncStatus = 'PENDING'")
    suspend fun getPendingSyncEvents(): List<CallEventEntity>

    @Query("UPDATE call_events SET syncStatus = 'SYNCED' WHERE idempotencyKey IN (:idempotencyKeys)")
    suspend fun markEventsSynced(idempotencyKeys: List<String>)

    @Query("UPDATE call_events SET isPrivate = :isPrivate WHERE id = :callId")
    suspend fun setPrivateState(callId: String, isPrivate: Boolean)

    @Query("UPDATE call_events SET disposition = :disposition WHERE id = :callId")
    suspend fun updateDisposition(callId: String, disposition: String)
}
