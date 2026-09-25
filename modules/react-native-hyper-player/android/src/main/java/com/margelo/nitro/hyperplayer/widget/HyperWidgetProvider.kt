package com.margelo.nitro.hyperplayer.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

/**
 * Base [AppWidgetProvider] managing system widget lifecycle events and broadcast triggers.
 *
 * Intercepts OS updates (additions, options changes, re-enables) and routes them to
 * [WidgetUpdateCoordinator]. Also captures `ACTION_RESET_WIDGETS` broadcasts dispatched
 * during swipe-kill teardown in `HyperMediaSessionService.onTaskRemoved` to guarantee
 * synchronous, deterministic UI reset before process termination.
 */
open class HyperBaseWidgetProvider : AppWidgetProvider() {
    override fun onReceive(context: Context, intent: android.content.Intent) {
        if (intent.action == "com.margelo.nitro.hyperplayer.ACTION_RESET_WIDGETS") {
            WidgetUpdateCoordinator.renderImmediately(context)
        }
        super.onReceive(context, intent)
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        WidgetUpdateCoordinator.requestUpdate(context, WidgetUpdateReason.PROVIDER_UPDATE)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle,
    ) {
        WidgetUpdateCoordinator.requestUpdate(context, WidgetUpdateReason.OPTIONS_CHANGED)
    }

    override fun onEnabled(context: Context) {
        WidgetUpdateCoordinator.requestUpdate(context, WidgetUpdateReason.PROVIDER_ENABLED)
    }
}

class HyperClassicWidgetProvider : HyperBaseWidgetProvider()
class HyperPillWidgetProvider : HyperBaseWidgetProvider()
class HyperMaterialWidgetProvider : HyperBaseWidgetProvider()
class HyperBlurWidgetProvider : HyperBaseWidgetProvider()
class HyperSearchWidgetProvider : HyperBaseWidgetProvider()
