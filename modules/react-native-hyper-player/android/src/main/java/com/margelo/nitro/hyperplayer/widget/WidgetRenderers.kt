package com.margelo.nitro.hyperplayer.widget

import android.content.Context
import android.graphics.Bitmap
import android.widget.RemoteViews
import com.hyperplayer.R
import com.margelo.nitro.hyperplayer.WidgetStyle

/** Encapsulates the immutable state payload required to render a widget instance. */
data class WidgetRenderState(
    val appWidgetId: Int,
    val snapshot: WidgetPlaybackSnapshot,
    val artwork: Bitmap?,
    val paletteColors: WidgetPaletteColors,
)

/** Deterministic contract for widget renderers: in-memory state in, RemoteViews out. */
interface WidgetRenderer {
    val style: WidgetStyle
    val artworkCrop: WidgetArtworkCrop


    fun artworkRequest(context: Context, snapshot: WidgetPlaybackSnapshot, options: android.os.Bundle?): WidgetArtworkRequest? {
        val sourceUri = snapshot.artworkUri?.takeIf { it.isNotBlank() } ?: return null
        val dimensions = WidgetSizePolicy.artworkSize(style, options, context.resources.displayMetrics.density)
        return WidgetArtworkRequest(
            sourceUri = sourceUri,
            cacheKey = snapshot.artworkCacheKey,
            widthPx = dimensions.widthPx,
            heightPx = dimensions.heightPx,
            crop = artworkCrop,
        )
    }


    fun render(context: Context, state: WidgetRenderState): RemoteViews
}

/** Registry mapping each supported WidgetStyle to its dedicated WidgetRenderer implementation. */
object WidgetRenderers {
    private val renderers: Map<WidgetStyle, WidgetRenderer> = listOf(
        ClassicRenderer(),
        MaterialRenderer(),
        BlurRenderer(),
        SearchRenderer(),
        PillRenderer(),
    ).associateBy { it.style }


    fun forStyle(style: WidgetStyle): WidgetRenderer = requireNotNull(renderers[style])
}

/**
 * Base renderer providing common RemoteViews manipulation, artwork binding, text contrast,
 * and pending intent routing shared across all widget styles.
 */
abstract class BaseRenderer : WidgetRenderer {
    protected fun views(context: Context, layoutId: Int): RemoteViews =
        RemoteViews(context.packageName, layoutId)


    protected fun setArtwork(views: RemoteViews, bitmap: Bitmap?) {
        if (bitmap != null) {
            views.setImageViewIcon(R.id.widget_artwork, android.graphics.drawable.Icon.createWithBitmap(bitmap))
        } else {
            views.setImageViewIcon(R.id.widget_artwork, null)
        }
    }

    protected fun setPlaybackIcon(views: RemoteViews, snapshot: WidgetPlaybackSnapshot) {
        val icon = if (snapshot.playbackState == WidgetPlaybackState.PLAYING) {
            R.drawable.ic_pause_premium
        } else {
            R.drawable.ic_play_premium
        }
        views.setImageViewResource(R.id.btn_play_pause, icon)
    }

    protected fun setTrackText(views: RemoteViews, snapshot: WidgetPlaybackSnapshot, includeArtist: Boolean = true) {
        views.setTextViewText(R.id.widget_title, snapshot.title.ifBlank { WidgetPlaybackSnapshot.NOT_PLAYING_TITLE })
        if (includeArtist) views.setTextViewText(R.id.widget_artist, snapshot.artist)
    }

    /**
     * Tints an ImageView's src drawable with the extracted palette color.
     * This preserves rounded corners since we are tinting a shape drawable
     * instead of replacing the view's background with a solid color.
     */
    protected fun applyDynamicBackground(views: RemoteViews, viewId: Int, palette: WidgetPaletteColors) {
        views.setInt(viewId, "setColorFilter", palette.backgroundArgb)
    }

    /**
     * Sets title and artist text colors to contrast-safe values derived from
     * the artwork's palette swatch. Only call this on widgets whose text sits
     * directly on a palette-tinted background.
     */
    protected fun applyAdaptiveTextColors(
        views: RemoteViews,
        palette: WidgetPaletteColors,
        includeArtist: Boolean = true,
        includeSkipButtons: Boolean = false,
    ) {
        views.setTextColor(R.id.widget_title, palette.titleTextArgb)
        if (includeArtist) views.setTextColor(R.id.widget_artist, palette.bodyTextArgb)
        if (includeSkipButtons) {
            views.setInt(R.id.btn_prev, "setColorFilter", palette.titleTextArgb)
            views.setInt(R.id.btn_next, "setColorFilter", palette.titleTextArgb)
        }
    }

    protected fun attachControls(
        context: Context,
        views: RemoteViews,
        state: WidgetRenderState,
        supportsSkip: Boolean,
    ) {
        WidgetControlIntents.appLaunchPendingIntent(context, state.appWidgetId)?.let {
            views.setOnClickPendingIntent(R.id.widget_container, it)
        }
        val playbackAction = if (state.snapshot.playbackState == WidgetPlaybackState.PLAYING) {
            WidgetControlIntents.ACTION_PAUSE
        } else {
            WidgetControlIntents.ACTION_PLAY
        }
        views.setOnClickPendingIntent(
            R.id.btn_play_pause,
            WidgetControlIntents.controlPendingIntent(context, playbackAction, state.appWidgetId),
        )
        if (supportsSkip) {
            views.setOnClickPendingIntent(
                R.id.btn_prev,
                WidgetControlIntents.controlPendingIntent(context, WidgetControlIntents.ACTION_PREVIOUS, state.appWidgetId),
            )
            views.setOnClickPendingIntent(
                R.id.btn_next,
                WidgetControlIntents.controlPendingIntent(context, WidgetControlIntents.ACTION_NEXT, state.appWidgetId),
            )
        }
    }
}


class ClassicRenderer : BaseRenderer() {
    override val style = WidgetStyle.CLASSIC
    override val artworkCrop = WidgetArtworkCrop.ROUNDED_CROP

    override fun render(context: Context, state: WidgetRenderState): RemoteViews {
        val views = views(context, R.layout.widget_classic)
        setTrackText(views, state.snapshot)
        setArtwork(views, state.artwork)
        setPlaybackIcon(views, state.snapshot)
        applyDynamicBackground(views, R.id.widget_background, state.paletteColors)
        applyAdaptiveTextColors(views, state.paletteColors, includeSkipButtons = true)
        attachControls(context, views, state, supportsSkip = true)
        return views
    }
}


class MaterialRenderer : BaseRenderer() {
    override val style = WidgetStyle.MATERIAL
    override val artworkCrop = WidgetArtworkCrop.ROUNDED_CROP

    override fun render(context: Context, state: WidgetRenderState): RemoteViews {
        val views = views(context, R.layout.widget_style_material)
        setTrackText(views, state.snapshot)
        setArtwork(views, state.artwork)
        setPlaybackIcon(views, state.snapshot)
        attachControls(context, views, state, supportsSkip = true)
        return views
    }
}


class BlurRenderer : BaseRenderer() {
    override val style = WidgetStyle.BLUR
    override val artworkCrop = WidgetArtworkCrop.BLURRED_ROUNDED_CROP

    override fun render(context: Context, state: WidgetRenderState): RemoteViews {
        val views = views(context, R.layout.widget_style_blur)
        setTrackText(views, state.snapshot)
        setArtwork(views, state.artwork)
        setPlaybackIcon(views, state.snapshot)
        attachControls(context, views, state, supportsSkip = true)
        return views
    }
}


class SearchRenderer : BaseRenderer() {
    override val style = WidgetStyle.SEARCH
    override val artworkCrop = WidgetArtworkCrop.ROUNDED_CROP

    override fun render(context: Context, state: WidgetRenderState): RemoteViews {
        val views = views(context, R.layout.widget_style_search)
        setTrackText(views, state.snapshot)
        setArtwork(views, state.artwork)
        setPlaybackIcon(views, state.snapshot)
        applyDynamicBackground(views, R.id.widget_background, state.paletteColors)
        applyAdaptiveTextColors(views, state.paletteColors)
        WidgetControlIntents.appSearchPendingIntent(context, state.appWidgetId)?.let {
            views.setOnClickPendingIntent(R.id.search_container, it)
        }
        attachControls(context, views, state, supportsSkip = false)
        return views
    }
}


class PillRenderer : BaseRenderer() {
    override val style = WidgetStyle.PILL
    override val artworkCrop = WidgetArtworkCrop.CIRCLE

    override fun render(context: Context, state: WidgetRenderState): RemoteViews {
        val views = views(context, R.layout.widget_pill)
        setTrackText(views, state.snapshot, includeArtist = false)
        setArtwork(views, state.artwork)
        setPlaybackIcon(views, state.snapshot)
        applyDynamicBackground(views, R.id.widget_background, state.paletteColors)
        applyAdaptiveTextColors(views, state.paletteColors, includeArtist = false)
        attachControls(context, views, state, supportsSkip = false)
        return views
    }
}

