package com.margelo.nitro.hyperplayer.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import com.margelo.nitro.hyperplayer.WidgetStyle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class WidgetUpdateReason {
    PROVIDER_UPDATE,
    PROVIDER_ENABLED,
    OPTIONS_CHANGED,
    PLAYER_STATE_CHANGED,
}

private data class WidgetUpdateRequest(
    val applicationContext: Context,
    val reason: WidgetUpdateReason,
)

/**
 * Application-scoped, conflated widget rendering queue.
 *
 * Utilizes a [Channel.CONFLATED] queue with a 150ms coalescing window to merge rapid
 * back-to-back state changes (e.g. metadata updates followed immediately by playback state
 * transitions) into a single atomic render pass. A slow artwork fetch cannot create
 * parallel render jobs or retain a short-lived broadcast receiver context.
 */
object WidgetUpdateCoordinator {
    private const val COALESCE_WINDOW_MS = 150L
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val requests = Channel<WidgetUpdateRequest>(Channel.CONFLATED)

    init {
        scope.launch {
            for (firstRequest in requests) {
                delay(COALESCE_WINDOW_MS)
                var latestRequest = firstRequest
                while (true) {
                    val nextRequest = requests.tryReceive().getOrNull() ?: break
                    latestRequest = nextRequest
                }
                renderAll(latestRequest.applicationContext)
            }
        }
    }

    /**
     * Enqueues an asynchronous widget render request into the conflated channel.
     *
     * @param context Host Android context (automatically converted to application context).
     * @param reason The triggering event category.
     */
    fun requestUpdate(context: Context, reason: WidgetUpdateReason) {
        requests.trySend(WidgetUpdateRequest(context.applicationContext, reason))
    }

    /**
     * Executes an end-to-end render pass across all installed widget styles using the
     * latest in-memory [WidgetPlaybackSnapshot].
     */
    private suspend fun renderAll(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val snapshot = WidgetStateRepository.read()

        WidgetStyleRegistry.styles.forEach { style ->
            renderStyle(context, appWidgetManager, style, snapshot)
        }
    }

    /**
     * Renders all widgets synchronously (blocking the caller thread).
     * Used exclusively inside BroadcastReceiver.onReceive() during swipe-kill
     * teardown, where the OS guarantees execution time and we must complete
     * before the process is reaped.
     */
    fun renderImmediately(context: Context) {
        kotlinx.coroutines.runBlocking {
            renderAll(context)
        }
    }


    /**
     * Renders all active widget instances for a given [style].
     *
     * Performance optimizations applied:
     * - Zero-overhead default state: when [snapshot] has no artwork URI, the pipeline is completely
     *   bypassed and `artwork = null` is passed, avoiding unnecessary I/O and decoder allocations.
     * - Shared palette extraction: palette generation is hoisted across all widget instances of the
     *   same style, executing at most once per cycle instead of per widget ID.
     */
    private suspend fun renderStyle(
        context: Context,
        appWidgetManager: AppWidgetManager,
        style: WidgetStyle,
        snapshot: WidgetPlaybackSnapshot,
    ) {
        val widgetIds = appWidgetManager.getAppWidgetIds(WidgetStyleRegistry.providerComponent(context, style))
        if (widgetIds.isEmpty()) return

        val renderer = WidgetRenderers.forStyle(style)
        var sharedPalette: WidgetPaletteColors? = null
        
        widgetIds.forEach { appWidgetId ->
            runCatching {
                val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
                val isDefault = snapshot.artworkUri.isNullOrBlank()
                val artworkRequest = renderer.artworkRequest(context, snapshot, options)
                
                val artwork = if (!isDefault && artworkRequest != null) {
                    WidgetArtworkPipeline.load(context, artworkRequest)
                } else {
                    null
                }
                
                val paletteColors = if (!isDefault && artwork != null) {
                    sharedPalette ?: WidgetPaletteExtractor.extract(artwork).also { sharedPalette = it }
                } else {
                    WidgetPaletteColors.DEFAULT
                }
                
                val views = renderer.render(context, WidgetRenderState(appWidgetId, snapshot, artwork, paletteColors))
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
    }
}
