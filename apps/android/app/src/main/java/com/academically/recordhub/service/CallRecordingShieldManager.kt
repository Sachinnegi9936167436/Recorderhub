package com.academically.recordhub.service

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.DisplayMetrics
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import com.academically.recordhub.utils.AppLogManager

/**
 * CallRecordingShieldManager:
 * Manages a lightweight, untouchable/touch-absorbing floating shield over the native phone dialer's
 * call recording toggle button during active phone calls.
 *
 * Ensures counselors cannot pause, stop, or cancel call recordings mandated by company policy.
 */
object CallRecordingShieldManager {

    private const val TAG = "RecordingShieldManager"
    private var windowManager: WindowManager? = null
    private var shieldView: View? = null
    private var isShowing = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastToastTime: Long = 0

    /**
     * Checks if the app has permission to draw overlays (SYSTEM_ALERT_WINDOW).
     */
    fun hasOverlayPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    /**
     * Returns an intent to prompt the user to grant overlay permission in Android Settings.
     */
    fun getOverlayPermissionIntent(context: Context): Intent {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            )
        } else {
            Intent()
        }
    }

    /**
     * Shows the touch-absorbing shield over the dialer recording button.
     * If exact coordinates are provided, positions over that exact bounding box.
     * Otherwise, places a fallback safe-zone shield over standard in-call dialer button coordinates.
     */
    @Synchronized
    fun showShield(context: Context, targetRect: Rect? = null) {
        if (!hasOverlayPermission(context)) {
            Log.w(TAG, "Cannot show recording shield: SYSTEM_ALERT_WINDOW permission not granted.")
            return
        }

        mainHandler.post {
            try {
                if (isShowing && shieldView != null) {
                    if (targetRect != null) {
                        updatePosition(targetRect)
                    }
                    return@post
                }

                windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
                if (windowManager == null) {
                    Log.e(TAG, "WindowManager is null, cannot attach overlay.")
                    return@post
                }

                val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }

                val metrics = context.resources.displayMetrics
                val screenWidth = metrics.widthPixels
                val screenHeight = metrics.heightPixels

                // Calculate width, height, x, and y
                val (width, height, x, y) = if (targetRect != null && targetRect.width() > 0 && targetRect.height() > 0) {
                    val pad = (8 * metrics.density).toInt()
                    listOf(
                        targetRect.width() + (pad * 2),
                        targetRect.height() + (pad * 2),
                        (targetRect.left - pad).coerceAtLeast(0),
                        (targetRect.top - pad).coerceAtLeast(0)
                    )
                } else {
                    // Default fallback: typical dialer center-right record button location
                    val defaultW = (100 * metrics.density).toInt()
                    val defaultH = (100 * metrics.density).toInt()
                    val defaultX = (screenWidth / 2) - (defaultW / 2)
                    val defaultY = (screenHeight * 0.55).toInt()
                    listOf(defaultW, defaultH, defaultX, defaultY)
                }

                val params = WindowManager.LayoutParams(
                    width,
                    height,
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.START
                    this.x = x
                    this.y = y
                }

                // Create the touch-absorbing view container
                val container = FrameLayout(context).apply {
                    // Subtle translucent indicator or fully transparent depending on enterprise preference
                    background = GradientDrawable().apply {
                        shape = GradientDrawable.RECTANGLE
                        cornerRadius = 24 * metrics.density
                        setColor(Color.argb(1, 0, 0, 0)) // 99% invisible, absorbs touch
                    }

                    // Intercept and consume all touch events so dialer underneath never receives the tap
                    setOnTouchListener { _, event ->
                        if (event.action == MotionEvent.ACTION_UP || event.action == MotionEvent.ACTION_DOWN) {
                            showPolicyToast(context)
                        }
                        true // Consume touch
                    }

                    setOnClickListener {
                        showPolicyToast(context)
                    }
                }

                shieldView = container
                windowManager?.addView(container, params)
                isShowing = true
                AppLogManager.log("INFO", TAG, "Recording Anti-Tamper Shield active at ($x, $y) size [${width}x$height].")
            } catch (e: Exception) {
                Log.e(TAG, "Error displaying recording shield overlay: ${e.message}", e)
            }
        }
    }

    /**
     * Dynamically repositions the shield over the detected record button bounding box.
     */
    @Synchronized
    fun updatePosition(targetRect: Rect) {
        if (!isShowing || shieldView == null || windowManager == null) return

        mainHandler.post {
            try {
                val view = shieldView ?: return@post
                val context = view.context ?: return@post
                val metrics = context.resources.displayMetrics
                val pad = (8 * metrics.density).toInt()

                val newWidth = targetRect.width() + (pad * 2)
                val newHeight = targetRect.height() + (pad * 2)
                val newX = (targetRect.left - pad).coerceAtLeast(0)
                val newY = (targetRect.top - pad).coerceAtLeast(0)

                val params = view.layoutParams as? WindowManager.LayoutParams ?: return@post
                params.width = newWidth
                params.height = newHeight
                params.x = newX
                params.y = newY

                windowManager?.updateViewLayout(view, params)
                Log.d(TAG, "Updated Recording Shield to exact bounds: ($newX, $newY) [${newWidth}x$newHeight]")
            } catch (e: Exception) {
                Log.w(TAG, "Failed updating shield position: ${e.message}")
            }
        }
    }

    /**
     * Dismisses and removes the shield when the call ends.
     */
    @Synchronized
    fun hideShield() {
        mainHandler.post {
            try {
                if (isShowing && shieldView != null && windowManager != null) {
                    windowManager?.removeView(shieldView)
                    shieldView = null
                    isShowing = false
                    AppLogManager.log("INFO", TAG, "Recording Anti-Tamper Shield dismissed.")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error removing shield overlay: ${e.message}")
            } finally {
                shieldView = null
                isShowing = false
            }
        }
    }

    private fun showPolicyToast(context: Context) {
        val now = System.currentTimeMillis()
        if (now - lastToastTime > 3000) {
            lastToastTime = now
            Toast.makeText(
                context.applicationContext,
                "🛡️ Academically Policy: Active call recording is mandatory.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    fun isShieldActive(): Boolean = isShowing
}
