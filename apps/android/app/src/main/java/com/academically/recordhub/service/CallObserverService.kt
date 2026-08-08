package com.academically.recordhub.service

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.academically.recordhub.R
import com.academically.recordhub.RecordHubApp
import com.academically.recordhub.data.local.AppDatabase
import com.academically.recordhub.data.local.CallEventEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

class CallObserverService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO)
    private var telephonyManager: TelephonyManager? = null
    private var lastState = TelephonyManager.CALL_STATE_IDLE
    private var callStartTimeMs: Long = 0
    private var incomingNumber: String = "+91 98123 45678" // Default fallback for system listener

    override fun onCreate() {
        super.onCreate()
        startForegroundServiceNotification()
        registerCallStateListener()
    }

    private fun startForegroundServiceNotification() {
        val notification: Notification = NotificationCompat.Builder(this, RecordHubApp.SERVICE_CHANNEL_ID)
            .setContentTitle("RecordHub Active Monitoring")
            .setContentText("Sales call tracking active for Academically Global Healthcare Academy")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
            } else {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            }
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun registerCallStateListener() {
        try {
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.READ_PHONE_STATE
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    telephonyManager?.registerTelephonyCallback(
                        mainExecutor,
                        object : android.telephony.TelephonyCallback(), android.telephony.TelephonyCallback.CallStateListener {
                            override fun onCallStateChanged(state: Int) {
                                handleCallState(state, incomingNumber)
                            }
                        }
                    )
                } else {
                    telephonyManager?.listen(callStateListener, PhoneStateListener.LISTEN_CALL_STATE)
                }
            } else {
                Log.w(TAG, "READ_PHONE_STATE permission not granted yet. Listener will activate once permission is granted.")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException registering TelephonyManager listener: ${e.message}")
        }
    }

    private val callStateListener = object : PhoneStateListener() {
        override fun onCallStateChanged(state: Int, phoneNumber: String?) {
            super.onCallStateChanged(state, phoneNumber)
            if (!phoneNumber.isNullOrEmpty()) {
                incomingNumber = phoneNumber
            }
            handleCallState(state, incomingNumber)
        }
    }

    private fun handleCallState(state: Int, phone: String) {
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                lastState = state
                callStartTimeMs = System.currentTimeMillis()
                Log.i(TAG, "Call State: RINGING from $phone")
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (lastState != TelephonyManager.CALL_STATE_RINGING) {
                    callStartTimeMs = System.currentTimeMillis()
                }
                lastState = state
                Log.i(TAG, "Call State: OFFHOOK (Active Call)")
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                if (lastState == TelephonyManager.CALL_STATE_OFFHOOK || lastState == TelephonyManager.CALL_STATE_RINGING) {
                    val endTimeMs = System.currentTimeMillis()
                    val durationSec = Math.max(1, ((endTimeMs - callStartTimeMs) / 1000).toInt())
                    val direction = if (lastState == TelephonyManager.CALL_STATE_RINGING) "INCOMING" else "OUTGOING"

                    saveCallEventToRoom(phone, direction, "ANSWERED", callStartTimeMs, endTimeMs, durationSec)
                }
                lastState = state
            }
        }
    }

    private fun saveCallEventToRoom(
        phone: String,
        direction: String,
        status: String,
        startTimeMs: Long,
        endTimeMs: Long,
        durationSec: Int
    ) {
        serviceScope.launch {
            val db = AppDatabase.getInstance(applicationContext)
            val idempotencyKey = "DEV-EVT-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"

            val entity = CallEventEntity(
                deviceId = "ANDROID-DEVICE-PROD",
                idempotencyKey = idempotencyKey,
                phoneNumber = phone,
                direction = direction,
                status = status,
                startTime = startTimeMs,
                endTime = endTimeMs,
                durationSeconds = durationSec,
                simSlot = 0,
                isPrivate = false,
                disposition = "New Call Logged",
                syncStatus = "PENDING"
            )

            db.callEventDao().insertCallEvent(entity)
            Log.i(TAG, "Saved Call Event to Room DB: $idempotencyKey")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        telephonyManager?.listen(callStateListener, PhoneStateListener.LISTEN_NONE)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "CallObserverService"
        private const val NOTIFICATION_ID = 9001
    }
}
