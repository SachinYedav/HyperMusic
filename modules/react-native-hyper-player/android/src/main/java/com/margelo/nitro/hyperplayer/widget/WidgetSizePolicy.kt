package com.margelo.nitro.hyperplayer.widget

import android.appwidget.AppWidgetManager
import android.os.Bundle
import com.margelo.nitro.hyperplayer.WidgetStyle
import kotlin.math.roundToInt


data class WidgetArtworkSize(
    val widthPx: Int,
    val heightPx: Int,
)

object WidgetSizePolicy {
    fun artworkSize(style: WidgetStyle, options: Bundle?, density: Float): WidgetArtworkSize {
        val minWidth = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) ?: 0
        val maxWidth = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, minWidth) ?: 0
        val targetWidthDp = maxWidth.coerceAtLeast(250)

        val dimensionsDp = when (style) {
            WidgetStyle.PILL -> 48 to 48
            WidgetStyle.CLASSIC -> 120 to 120
            WidgetStyle.SEARCH -> 72 to 72
            WidgetStyle.MATERIAL, WidgetStyle.BLUR -> targetWidthDp to 160
        }

        return WidgetArtworkSize(
            widthPx = (dimensionsDp.first * density).roundToInt().coerceAtLeast(1),
            heightPx = (dimensionsDp.second * density).roundToInt().coerceAtLeast(1),
        )
    }
}
