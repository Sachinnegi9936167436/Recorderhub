package com.academically.recordhub.utils

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast

object AutoStartHelper {

    fun getDeviceBrandName(): String {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        return when {
            manufacturer.contains("xiaomi") || brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco") -> "Xiaomi / Redmi / POCO"
            manufacturer.contains("vivo") || brand.contains("vivo") || brand.contains("iqoo") -> "Vivo / iQOO"
            manufacturer.contains("oppo") || brand.contains("oppo") || brand.contains("realme") -> "Oppo / Realme"
            manufacturer.contains("oneplus") || brand.contains("oneplus") -> "OnePlus"
            manufacturer.contains("samsung") || brand.contains("samsung") -> "Samsung"
            manufacturer.contains("huawei") || brand.contains("huawei") || brand.contains("honor") -> "Huawei / Honor"
            else -> "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} Device"
        }
    }

    fun getBrandSpecificGuidance(): String {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        return when {
            manufacturer.contains("xiaomi") || brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco") ->
                "1. Enable 'Autostart' for RecordHub.\n2. Set Battery Saver to 'No restrictions'.\n3. Lock RecordHub in the Recent Apps tray."
            manufacturer.contains("vivo") || brand.contains("vivo") || brand.contains("iqoo") ->
                "1. Enable 'Autostart' for RecordHub.\n2. In Battery settings, enable 'High background power consumption'.\n3. Lock RecordHub in Recent Apps."
            manufacturer.contains("oppo") || brand.contains("oppo") || brand.contains("realme") ->
                "1. Enable 'Allow background activity' and 'Auto launch'.\n2. Turn off 'Freeze background apps' for RecordHub.\n3. Lock RecordHub in Recent Apps."
            manufacturer.contains("oneplus") || brand.contains("oneplus") ->
                "1. In App Battery usage, select 'Don't optimize'.\n2. Enable 'Auto-launch' and 'Allow background activity'."
            manufacturer.contains("samsung") || brand.contains("samsung") ->
                "1. Set Battery to 'Unrestricted'.\n2. Ensure RecordHub is added to 'Never sleeping apps'."
            else ->
                "1. Disable Battery Optimization (set to Unrestricted).\n2. Allow unrestricted background data and execution."
        }
    }

    fun openAutoStartSettings(context: Context): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()

        val intents = mutableListOf<Intent>()

        // Xiaomi / Redmi / POCO
        if (manufacturer.contains("xiaomi") || brand.contains("xiaomi") || brand.contains("redmi") || brand.contains("poco")) {
            intents.add(Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")))
            intents.add(Intent("miui.intent.action.OP_AUTO_START").addCategory(Intent.CATEGORY_DEFAULT))
            intents.add(Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.powercenter.PowerSettings")))
        }

        // Vivo / iQOO
        if (manufacturer.contains("vivo") || brand.contains("vivo") || brand.contains("iqoo")) {
            intents.add(Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")))
            intents.add(Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")))
            intents.add(Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.PurviewTabActivity")))
            intents.add(Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.MainGuideActivity")))
        }

        // Oppo / Realme
        if (manufacturer.contains("oppo") || brand.contains("oppo") || brand.contains("realme")) {
            intents.add(Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")))
            intents.add(Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")))
            intents.add(Intent().setComponent(ComponentName("com.oplus.battery", "com.oplus.battery.AppBatteryUseStateActivity")))
            intents.add(Intent().setComponent(ComponentName("com.coloros.oppoguardelf", "com.coloros.powermanager.fuelga设置.PowerConsumptionActivity")))
        }

        // OnePlus
        if (manufacturer.contains("oneplus") || brand.contains("oneplus")) {
            intents.add(Intent().setComponent(ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity")))
        }

        // Samsung
        if (manufacturer.contains("samsung") || brand.contains("samsung")) {
            intents.add(Intent().setComponent(ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")))
            intents.add(Intent().setComponent(ComponentName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity")))
        }

        // Huawei / Honor
        if (manufacturer.contains("huawei") || brand.contains("huawei") || brand.contains("honor")) {
            intents.add(Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")))
            intents.add(Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")))
        }

        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                return true
            } catch (_: Exception) {
                // Try next
            }
        }

        // Fallback 1: Battery optimization settings
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                return true
            }
        } catch (_: Exception) {}

        // Fallback 2: App Details Settings
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            return true
        } catch (_: Exception) {}

        return false
    }
}
