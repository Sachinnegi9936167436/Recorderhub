package com.academically.recordhub.utils

import android.content.Context
import android.telephony.SubscriptionManager
import android.util.Log

data class SimSlotInfo(
    val slotIndex: Int, // 0 for SIM 1, 1 for SIM 2
    val subscriptionId: Int,
    val carrierName: String,
    val number: String?
)

object DualSimHelper {
    private const val TAG = "DualSimHelper"

    fun getActiveSimSlots(context: Context): List<SimSlotInfo> {
        val result = mutableListOf<SimSlotInfo>()
        try {
            val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            if (subscriptionManager != null) {
                val activeList = subscriptionManager.activeSubscriptionInfoList
                if (activeList != null) {
                    for (info in activeList) {
                        result.add(
                            SimSlotInfo(
                                slotIndex = info.simSlotIndex,
                                subscriptionId = info.subscriptionId,
                                carrierName = info.carrierName?.toString() ?: "Unknown Carrier",
                                number = info.number
                            )
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to inspect dual SIM subscriptions", e)
        }
        return result
    }
}
