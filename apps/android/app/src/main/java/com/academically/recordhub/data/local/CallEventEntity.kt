package com.academically.recordhub.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "call_events")
data class CallEventEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val deviceId: String,
    val idempotencyKey: String,
    val phoneNumber: String,
    val direction: String, // INCOMING, OUTGOING
    val status: String, // ANSWERED, MISSED, REJECTED, FAILED
    val startTime: Long,
    val endTime: Long,
    val durationSeconds: Int,
    val simSlot: Int,
    val isPrivate: Boolean = false,
    val recordingPath: String? = null,
    val recordingStatus: String = "NONE", // NONE, PENDING_UPLOAD, SYNCED
    val disposition: String = "New Lead Inquiry",
    val syncStatus: String = "PENDING", // PENDING, SYNCED, FAILED
    val createdAt: Long = System.currentTimeMillis()
)
