package com.academically.recordhub.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = MedicalTeal500,
    onPrimary = Navy950,
    secondary = MedicalTeal400,
    background = Navy950,
    surface = Navy900,
    onBackground = Slate200,
    onSurface = Slate200
)

@Composable
fun RecordHubTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
