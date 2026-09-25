package com.margelo.nitro.hyperplayer.widget

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.MoreExecutors
import com.margelo.nitro.hyperplayer.session.HyperMediaSessionService

/**
 * Explicit, internal-only entry point for widget controls. It talks to an
 * existing MediaSession and deliberately never creates or reads an ExoPlayer.
 */
class WidgetControlReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (!WidgetControlIntents.isControlAction(action)) return

        val appContext = context.applicationContext
        if (!HyperMediaSessionService.hasActiveSession()) {
            WidgetControlIntents.launchApp(appContext, intent.getIntExtra(WidgetControlIntents.EXTRA_APP_WIDGET_ID, -1))
            return
        }

        val pendingResult = goAsync()
        try {
            val token = SessionToken(
                appContext,
                ComponentName(appContext, HyperMediaSessionService::class.java),
            )
            val controllerFuture = MediaController.Builder(appContext, token).buildAsync()
            controllerFuture.addListener({
                var controller: MediaController? = null
                try {
                    val connectedController = controllerFuture.get()
                    controller = connectedController
                    when (action) {
                        WidgetControlIntents.ACTION_PLAY -> connectedController.play()
                        WidgetControlIntents.ACTION_PAUSE -> connectedController.pause()
                        WidgetControlIntents.ACTION_NEXT -> connectedController.seekToNextMediaItem()
                        WidgetControlIntents.ACTION_PREVIOUS -> connectedController.seekToPreviousMediaItem()
                    }
                } catch (_: Exception) {
                    // A session can disappear between the active-session check and connection.
                    WidgetControlIntents.launchApp(appContext, intent.getIntExtra(WidgetControlIntents.EXTRA_APP_WIDGET_ID, -1))
                } finally {
                    controller?.release()
                    pendingResult.finish()
                }
            }, androidx.core.content.ContextCompat.getMainExecutor(appContext))
        } catch (_: Exception) {
            WidgetControlIntents.launchApp(appContext, intent.getIntExtra(WidgetControlIntents.EXTRA_APP_WIDGET_ID, -1))
            pendingResult.finish()
        }
    }
}

/** Owns action names and identity-safe PendingIntent creation for every widget instance. */
object WidgetControlIntents {
    const val EXTRA_APP_WIDGET_ID = "com.margelo.nitro.hyperplayer.widget.extra.APP_WIDGET_ID"
    const val ACTION_PLAY = "com.margelo.nitro.hyperplayer.widget.PLAY"
    const val ACTION_PAUSE = "com.margelo.nitro.hyperplayer.widget.PAUSE"
    const val ACTION_NEXT = "com.margelo.nitro.hyperplayer.widget.NEXT"
    const val ACTION_PREVIOUS = "com.margelo.nitro.hyperplayer.widget.PREVIOUS"

    fun controlPendingIntent(context: Context, action: String, appWidgetId: Int): PendingIntent {
        val requestCode = requestCode(appWidgetId, action)
        val intent = Intent(context, WidgetControlReceiver::class.java)
            .setAction(action)
            .setData(identityUri(appWidgetId, action))
            .putExtra(EXTRA_APP_WIDGET_ID, appWidgetId)
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun appLaunchPendingIntent(context: Context, appWidgetId: Int): PendingIntent? {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
        launchIntent.action = Intent.ACTION_VIEW
        launchIntent.data = identityUri(appWidgetId, "open")
        launchIntent.putExtra(EXTRA_APP_WIDGET_ID, appWidgetId)
        return PendingIntent.getActivity(
            context,
            requestCode(appWidgetId, "open"),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun appSearchPendingIntent(context: Context, appWidgetId: Int): PendingIntent? {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        launchIntent.action = Intent.ACTION_VIEW
        launchIntent.data = identityUri(appWidgetId, "search")
        launchIntent.putExtra(EXTRA_APP_WIDGET_ID, appWidgetId)
        return PendingIntent.getActivity(
            context,
            requestCode(appWidgetId, "search"),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun launchApp(context: Context, appWidgetId: Int) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        launchIntent.putExtra(EXTRA_APP_WIDGET_ID, appWidgetId)
        runCatching { context.startActivity(launchIntent) }
    }

    fun isControlAction(action: String): Boolean = action in setOf(
        ACTION_PLAY,
        ACTION_PAUSE,
        ACTION_NEXT,
        ACTION_PREVIOUS,
    )

    private fun identityUri(appWidgetId: Int, action: String): Uri = Uri.Builder()
        .scheme("hypermusic")
        .authority("widget")
        .appendPath(appWidgetId.toString())
        .appendPath(action)
        .build()

    private fun requestCode(appWidgetId: Int, action: String): Int {
        val actionOffset = when (action) {
            ACTION_PLAY -> 1
            ACTION_PAUSE -> 2
            ACTION_NEXT -> 3
            ACTION_PREVIOUS -> 4
            else -> 6
        }
        return (appWidgetId.coerceAtLeast(0) * 8) + actionOffset
    }
}
