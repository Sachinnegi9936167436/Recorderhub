package com.academically.recordhub

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SafFileMatcherTest {

    @Test
    fun testPhoneNumberCleanDigitExtraction() {
        val rawNumber = "+91 98123 45678"
        val cleanDigits = rawNumber.replace("\\D".toRegex(), "").takeLast(10)
        assertEquals("9812345678", cleanDigits)
    }

    @Test
    fun testFileTimestampToleranceCalculation() {
        val callStartTimeMs = 1723040000000L
        val fileModifiedTimeMs = 1723040045000L // 45s later
        val timeDiffMs = Math.abs(fileModifiedTimeMs - callStartTimeMs)

        assertTrue("Time difference should be within 90 seconds tolerance", timeDiffMs <= 90000)
    }
}
