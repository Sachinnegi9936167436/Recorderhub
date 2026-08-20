package com.academically.recordhub.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.academically.recordhub.utils.AppLogManager

class RecordHubAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        AppLogManager.log("INFO", TAG, "RecordHub Accessibility Service CONNECTED successfully.")
        
        try {
            val info = serviceInfo ?: AccessibilityServiceInfo()
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            info.flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                    AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            info.notificationTimeout = 100
            serviceInfo = info
        } catch (e: Exception) {
            Log.e(TAG, "Error configuring AccessibilityServiceInfo: ${e.message}")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        val packageName = event.packageName?.toString() ?: return

        val isWhatsApp = packageName.startsWith("com.whatsapp") ||
                packageName == "com.gbwhatsapp" ||
                packageName == "com.whatsapp.clone" ||
                packageName == "com.whatsapp.dual"

        if (!isWhatsApp) return

        try {
            val rootNode = rootInActiveWindow ?: return
            inspectWhatsAppWindow(rootNode)
        } catch (e: Exception) {
            Log.w(TAG, "Error inspecting WhatsApp accessibility node: ${e.message}")
        }
    }

    private fun inspectWhatsAppWindow(node: AccessibilityNodeInfo) {
        val text = node.text?.toString() ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""
        val viewId = node.viewIdResourceName ?: ""

        val combined = "$text $contentDesc $viewId".lowercase()
        if (combined.contains("calling") || combined.contains("ringing") || combined.contains("ongoing call") || combined.contains("whatsapp call")) {
            Log.d(TAG, "WhatsApp in-call UI detected via Accessibility node: text='$text', desc='$contentDesc'")
        }

        // Recurse children safely
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                inspectWhatsAppWindow(child)
            }
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
            // 1. Direct active instance check
            if (instance != null) return true

            // 2. Official AccessibilityManager query
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

            // 3. System Secure Settings string inspection
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
