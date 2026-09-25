package com.margelo.nitro.hyperplayer.widget

import android.graphics.Bitmap
import android.graphics.Color
import androidx.palette.graphics.Palette

/**
 * Extracted color palette from artwork, used to dynamically tint widget
 * backgrounds and adapt text colors for readability.
 *
 * Every color field includes an alpha channel. Text colors are pre-computed
 * by [Palette.Swatch] to guarantee WCAG AA contrast (≥ 4.5:1) against the
 * corresponding background swatch.
 */
data class WidgetPaletteColors(
    /** Background tint for widgets that need a solid color fill. */
    val backgroundArgb: Int,
    /** High-contrast title text color against [backgroundArgb]. */
    val titleTextArgb: Int,
    /** Slightly softer body/artist text color against [backgroundArgb]. */
    val bodyTextArgb: Int,
) {
    companion object {
        /** Fallback when no artwork is available or palette extraction fails. */
        val DEFAULT = WidgetPaletteColors(
            backgroundArgb = 0xFF2C3E50.toInt(),
            titleTextArgb = Color.WHITE,
            bodyTextArgb = 0xB3FFFFFF.toInt(),

        )
    }
}

/**
 * Thin wrapper around AndroidX Palette that picks the most suitable swatch
 * for dark-themed widget backgrounds. The selection priority is:
 *
 * 1. **darkMuted** — subdued, dark tone that won't overpower text
 * 2. **muted** — fallback with reduced saturation
 * 3. **darkVibrant** — punchy but still dark
 * 4. **dominant** — last resort, always populated
 */
object WidgetPaletteExtractor {

    fun extract(bitmap: Bitmap): WidgetPaletteColors {
        val palette = try {
            Palette.from(bitmap).generate()
        } catch (_: Exception) {
            return WidgetPaletteColors.DEFAULT
        }

        // Pick the best swatch for a dark background tint.
        val swatch = palette.darkMutedSwatch
            ?: palette.mutedSwatch
            ?: palette.darkVibrantSwatch
            ?: palette.dominantSwatch
            ?: return WidgetPaletteColors.DEFAULT

        return WidgetPaletteColors(
            backgroundArgb = swatch.rgb,
            titleTextArgb = swatch.titleTextColor,
            bodyTextArgb = swatch.bodyTextColor,
        )
    }
}

