package com.margelo.nitro.hyperplayer.widget

import android.content.ComponentName
import android.content.Context
import com.margelo.nitro.hyperplayer.WidgetStyle

/**
 * Keeps Android provider classes behind the typed Nitro widget-style boundary.
 */
object WidgetStyleRegistry {
    val styles: List<WidgetStyle> = WidgetStyle.entries

    fun providerComponent(context: Context, style: WidgetStyle): ComponentName {
        val providerClass = when (style) {
            WidgetStyle.CLASSIC -> HyperClassicWidgetProvider::class.java
            WidgetStyle.MATERIAL -> HyperMaterialWidgetProvider::class.java
            WidgetStyle.BLUR -> HyperBlurWidgetProvider::class.java
            WidgetStyle.SEARCH -> HyperSearchWidgetProvider::class.java
            WidgetStyle.PILL -> HyperPillWidgetProvider::class.java
        }

        return ComponentName(context, providerClass)
    }
}
