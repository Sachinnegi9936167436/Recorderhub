package com.academically.recordhub.utils

object PhoneUtils {

    /**
     * Formats any domestic or international phone number, preserving the true country code:
     * - Pakistan (+92): "+92 313 2323522"
     * - India (+91): "+91 98765 43210"
     * - USA/Canada (+1): "+1 212 555 1234"
     * - UK (+44): "+44 7911 123456"
     * - UAE (+971): "+971 50 1234567"
     * - Saudi (+966): "+966 50 1234567"
     * - Australia (+61): "+61 412 345678"
     */
    fun formatInternationalNumber(rawInput: String, fallbackName: String = ""): String {
        val trimmed = rawInput.trim()
        if (trimmed.isBlank()) {
            return fallbackName.ifBlank { "Unknown Contact" }
        }

        // If input has letters and is clearly a contact name, return it
        val lettersCount = trimmed.count { it.isLetter() }
        if (lettersCount >= 3 && !trimmed.startsWith("+")) {
            return trimmed
        }

        // 1. If it explicitly starts with '+', preserve exact international prefix
        if (trimmed.startsWith("+")) {
            val digits = trimmed.replace("\\D".toRegex(), "")
            return when {
                digits.startsWith("92") && digits.length == 12 -> {
                    "+92 ${digits.substring(2, 5)} ${digits.substring(5)}"
                }
                digits.startsWith("91") && digits.length == 12 -> {
                    "+91 ${digits.substring(2, 7)} ${digits.substring(7)}"
                }
                digits.startsWith("1") && digits.length == 11 -> {
                    "+1 ${digits.substring(1, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}"
                }
                digits.startsWith("44") && digits.length >= 12 -> {
                    "+44 ${digits.substring(2, 6)} ${digits.substring(6)}"
                }
                digits.startsWith("971") && digits.length >= 11 -> {
                    "+971 ${digits.substring(3, 5)} ${digits.substring(5)}"
                }
                digits.startsWith("966") && digits.length >= 11 -> {
                    "+966 ${digits.substring(3, 5)} ${digits.substring(5)}"
                }
                digits.startsWith("61") && digits.length >= 11 -> {
                    "+61 ${digits.substring(2, 5)} ${digits.substring(5)}"
                }
                else -> "+$digits"
            }
        }

        val digitsOnly = trimmed.replace("\\D".toRegex(), "")

        // 2. Unprefixed numbers with recognized international prefixes
        return when {
            digitsOnly.startsWith("92") && digitsOnly.length == 12 -> {
                "+92 ${digitsOnly.substring(2, 5)} ${digitsOnly.substring(5)}"
            }
            digitsOnly.startsWith("91") && digitsOnly.length == 12 -> {
                "+91 ${digitsOnly.substring(2, 7)} ${digitsOnly.substring(7)}"
            }
            digitsOnly.startsWith("1") && digitsOnly.length == 11 -> {
                "+1 ${digitsOnly.substring(1, 4)} ${digitsOnly.substring(4, 7)} ${digitsOnly.substring(7)}"
            }
            digitsOnly.startsWith("0") && digitsOnly.length == 11 -> {
                // Domestic trunk prefix (e.g. 09876543210 -> +91 98765 43210)
                val c10 = digitsOnly.substring(1)
                "+91 ${c10.substring(0, 5)} ${c10.substring(5)}"
            }
            digitsOnly.length == 10 -> {
                // Standard 10-digit Indian domestic number
                "+91 ${digitsOnly.substring(0, 5)} ${digitsOnly.substring(5)}"
            }
            digitsOnly.length > 10 -> {
                "+$digitsOnly"
            }
            else -> fallbackName.ifBlank { trimmed }
        }
    }
}
