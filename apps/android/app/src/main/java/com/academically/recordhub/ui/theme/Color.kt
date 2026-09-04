package com.academically.recordhub.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Obsidian & Slate Dark Palette
val Navy950 = Color(0xFF090D16)
val Navy900 = Color(0xFF0F172A)
val Navy850 = Color(0xFF162036)
val Navy800 = Color(0xFF1E293B)
val Navy700 = Color(0xFF334155)

// Accent & Brand Medical Teal / Emerald
val BrandTeal700 = Color(0xFF0F766E)
val BrandTeal600 = Color(0xFF0D9488)
val BrandTeal500 = Color(0xFF14B8A6)
val BrandTeal400 = Color(0xFF2DD4BF)
val MedicalTeal600 = BrandTeal600
val MedicalTeal500 = BrandTeal500
val MedicalTeal400 = BrandTeal400

val Emerald500 = Color(0xFF10B981)
val Emerald400 = Color(0xFF34D399)
val Emerald300 = Color(0xFF6EE7B7)

// WhatsApp Brand Color
val WhatsAppGreen = Color(0xFF25D366)
val WhatsAppGreenDark = Color(0xFF128C7E)

// Status Colors
val Amber400 = Color(0xFFFBBF24)
val Amber500 = Color(0xFFF59E0B)
val Red400 = Color(0xFFF87171)
val Red500 = Color(0xFFEF4444)
val Indigo400 = Color(0xFF818CF8)

// Neutral Slates
val Slate50 = Color(0xFFF8FAFC)
val Slate100 = Color(0xFFF1F5F9)
val Slate200 = Color(0xFFE2E8F0)
val Slate300 = Color(0xFFCBD5E1)
val Slate400 = Color(0xFF94A3B8)
val Slate500 = Color(0xFF64748B)
val Slate600 = Color(0xFF475569)

// Gradients
val PrimaryGradient = Brush.horizontalGradient(
    colors = listOf(BrandTeal600, BrandTeal400)
)

val CardGlowGradient = Brush.verticalGradient(
    colors = listOf(Color(0xFF1A263D), Color(0xFF0F172A))
)

val WhatsAppGradient = Brush.horizontalGradient(
    colors = listOf(Color(0xFF128C7E), Color(0xFF25D366))
)
