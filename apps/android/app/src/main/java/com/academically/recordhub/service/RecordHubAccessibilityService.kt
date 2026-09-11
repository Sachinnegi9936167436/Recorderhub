package com.academically.recordhub.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.graphics.Rect
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.academically.recordhub.utils.AppLogManager

class RecordHubAccessibilityService : AccessibilityService() {

    private val dialerPackages = setOf(
        "com.google.android.dialer",
        "com.android.incallui",
        "com.samsung.android.incallui",
        "com.samsung.android.dialer",
        "com.vivo.incallui",
        "com.oppo.incallui",
        "com.coloros.incallui",
        "com.oneplus.dialer",
        "com.oneplus.incallui",
        "com.android.phone",
        "com.motorola.incallui",
        "com.sh.smart.caller",
        "com.transsion.incallui",
        "com.nothing.dialer"
    )

    private val whatsAppPackages = setOf(
        "com.whatsapp",
        "com.whatsapp.w4b",
        "com.gbwhatsapp",
        "com.whatsapp.clone",
        "com.whatsapp.dual"
    )

    private var lastScannedNodeBounds: Rect? = null
    private var lastShieldUpdateTime: Long = 0

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        AppLogManager.log("INFO", TAG, "RecordHub Accessibility Service CONNECTED & ACTIVE.")

        try {
            val info = serviceInfo ?: AccessibilityServiceInfo()
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_CLICKED
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            info.flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                    AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            info.notificationTimeout = 50
            serviceInfo = info
        } catch (e: Exception) {
            Log.e(TAG, "Error configuring AccessibilityServiceInfo: ${e.message}")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        val packageName = event.packageName?.toString() ?: ""

        // 1. Check for WhatsApp VoIP calls
        if (isWhatsAppPackage(packageName)) {
            handleWhatsAppAccessibilityEvent(event)
            return
        }

        // 2. Check for In-Call Phone Dialer windows (or any active call screen)
        if (isDialerPackage(packageName) || isPossibleInCallScreen(event)) {
            handleDialerAccessibilityEvent(event, packageName)
            return
        }
    }

    private fun isDialerPackage(pkg: String): Boolean {
        if (pkg.isBlank()) return false
        val lower = pkg.lowercase()
        return dialerPackages.contains(pkg) || 
               lower.contains("incallui") || 
               lower.contains("dialer") || 
               lower.contains("telecom") || 
               lower.contains("phone")
    }

    private fun isPossibleInCallScreen(event: AccessibilityEvent): Boolean {
        val className = event.className?.toString()?.lowercase() ?: ""
        return className.contains("incall") || className.contains("callcard") || className.contains("dialer")
    }

    private fun isWhatsAppPackage(pkg: String): Boolean {
        return whatsAppPackages.contains(pkg) || pkg.startsWith("com.whatsapp")
    }

    /**
     * In-Call Dialer Event Handler:
     * 1. Inspects in-call UI to find the exact bounding box of the "Record / Stop" button.
     * 2. Automatically positions the untouchable Anti-Tamper Shield over it.
     * 3. Detects if user attempted to click stop/pause and auto-re-engages recording in <50ms.
     */
    private fun handleDialerAccessibilityEvent(event: AccessibilityEvent, packageName: String) {
        try {
            // 1. Check for Stop Recording click attempts (Instant Auto-Re-Record Fail-Safe)
            if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
                val clickedText = event.text.joinToString(" ")
                val clickedDesc = event.contentDescription?.toString() ?: ""
                val combined = "$clickedText $clickedDesc".lowercase()

                if (combined.contains("stop recording") || 
                    combined.contains("pause recording") || 
                    combined.contains("stop record") ||
                    combined.contains("pause record")) {
                    Log.w(TAG, "Counselor attempted to stop recording! Triggering instant auto-re-record fail-safe...")
                    AppLogManager.log("WARN", TAG, "Detected click on '$combined'. Triggering auto-re-record in <50ms...")
                    
                    // Immediate re-trigger to resume recording
                    event.source?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    AppLogManager.log("SECURITY", TAG, "🛡️ Blocked attempt to stop call recording. Auto-re-record executed.")
                }
            }

            // 2. Throttle in-call tree scanning to once every 250ms
            val now = System.currentTimeMillis()
            if (now - lastShieldUpdateTime < 250) return
            lastShieldUpdateTime = now

            val rootNode = rootInActiveWindow ?: return
            val recordButtonNode = findRecordButtonNode(rootNode, depth = 0)

            if (recordButtonNode != null) {
                val rect = Rect()
                recordButtonNode.getBoundsInScreen(rect)

                if (rect.width() > 10 && rect.height() > 10) {
                    if (lastScannedNodeBounds == null || lastScannedNodeBounds != rect) {
                        lastScannedNodeBounds = rect
                        AppLogManager.log("INFO", TAG, "Found in-call record button at (${rect.left}, ${rect.top}) size [${rect.width()}x${rect.height()}] on $packageName")
                        try {
                            CallRecordingShieldManager.showShield(applicationContext, rect)
                        } catch (e: Exception) {
                            Log.w(TAG, "Cannot show shield overlay: ${e.message}")
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error handling dialer accessibility event: ${e.message}")
        }
    }

    /**
     * Recursively traverses in-call UI tree to find the record toggle button.
     */
    private fun findRecordButtonNode(node: AccessibilityNodeInfo, depth: Int = 0): AccessibilityNodeInfo? {
        if (depth > 8) return null

        val text = node.text?.toString() ?: ""
        val desc = node.contentDescription?.toString() ?: ""
        val viewId = node.viewIdResourceName ?: ""
        val combined = "$text $desc $viewId".lowercase()

        // Match typical record keywords in Google Dialer, Samsung InCallUI, Mi InCallUI, Vivo, Oppo, etc.
        if (combined.contains("record") || 
            combined.contains("recording") || 
            combined.contains("call_record") || 
            combined.contains("btn_record") ||
            combined.contains("voice_record") ||
            combined.contains("incall_record")) {
            if (node.isClickable || node.parent?.isClickable == true) {
                return if (node.isClickable) node else node.parent
            }
        }

        val childCount = Math.min(node.childCount, 16)
        for (i in 0 until childCount) {
            try {
                val child = node.getChild(i)
                if (child != null) {
                    val match = findRecordButtonNode(child, depth + 1)
                    if (match != null) return match
                }
            } catch (_: Exception) {}
        }
        return null
    }

    private fun handleWhatsAppAccessibilityEvent(event: AccessibilityEvent) {
        try {
            val rootNode = rootInActiveWindow ?: return
            inspectWhatsAppWindow(rootNode, depth = 0)
        } catch (e: Exception) {
            Log.w(TAG, "Error inspecting WhatsApp accessibility node: ${e.message}")
        }
    }

    private fun inspectWhatsAppWindow(node: AccessibilityNodeInfo, depth: Int = 0) {
        if (depth > 4) return

        val text = node.text?.toString() ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""
        val viewId = node.viewIdResourceName ?: ""

        val combined = "$text $contentDesc $viewId".lowercase()
        if (combined.contains("calling") || combined.contains("ringing") || combined.contains("ongoing call") || combined.contains("whatsapp call")) {
            Log.d(TAG, "WhatsApp in-call UI detected via Accessibility node: text='$text', desc='$contentDesc'")
        }

        val childCount = Math.min(node.childCount, 8)
        for (i in 0 until childCount) {
            try {
                val child = node.getChild(i)
                if (child != null) {
                    inspectWhatsAppWindow(child, depth + 1)
                }
            } catch (_: Exception) {}
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "RecordHub Accessibility Service interrupted.")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        AppLogManager.log("INFO", TAG, "RecordHub Accessibility Service Destroyed.")
    }

    companion object {
        private const val TAG = "RecordHubAccessibility"
        var instance: RecordHubAccessibilityService? = null
            private set

        fun isAccessibilityServiceEnabled(context: Context): Boolean {
            if (instance != null) return true

            try {
                val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? android.view.accessibility.AccessibilityManager
                if (am != null) {
                    val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
                    val expectedPackage = context.packageName
                    for (service in enabledServices) {
                        val serviceInfo = service.resolveInfo?.serviceInfo
                        if (serviceInfo != null) {
                            if (serviceInfo.packageName == expectedPackage && serviceInfo.name.contains("RecordHubAccessibilityService")) {
                                return true
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "AccessibilityManager check error: ${e.message}")
            }

            try {
                val accessibilityEnabled = Settings.Secure.getInt(
                    context.contentResolver,
                    Settings.Secure.ACCESSIBILITY_ENABLED,
                    0
                )
                if (accessibilityEnabled == 1) {
                    val enabledServicesSetting = Settings.Secure.getString(
                        context.contentResolver,
                        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                    )
                    if (!enabledServicesSetting.isNullOrBlank()) {
                        val colonSplitter = TextUtils.SimpleStringSplitter(':')
                        colonSplitter.setString(enabledServicesSetting)

                        val expectedClass = RecordHubAccessibilityService::class.java.name
                        val expectedShort = ComponentName(context, RecordHubAccessibilityService::class.java).flattenToShortString()

                        while (colonSplitter.hasNext()) {
                            val componentNameString = colonSplitter.next()
                            if (componentNameString.equals(expectedShort, ignoreCase = true) ||
                                componentNameString.contains(expectedClass, ignoreCase = true) ||
                                componentNameString.contains("RecordHubAccessibilityService", ignoreCase = true)) {
                                return true
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Secure Settings check error: ${e.message}")
            }

            return false
        }
    }
}
