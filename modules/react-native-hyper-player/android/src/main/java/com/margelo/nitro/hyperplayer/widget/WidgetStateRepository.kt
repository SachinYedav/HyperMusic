package com.margelo.nitro.hyperplayer.widget

import kotlinx.coroutines.flow.MutableStateFlow

enum class WidgetPlaybackState {
    IDLE,
    PLAYING,
    PAUSED;
}

/**
 * Lightweight state used to render widgets.
 * This is held entirely in-memory and will naturally reset to defaults
 * when the app process is killed, preventing stale widget states.
 */
data class WidgetPlaybackSnapshot(
    val mediaId: String? = null,
    val title: String = NOT_PLAYING_TITLE,
    val artist: String = "",
    val playbackState: WidgetPlaybackState = WidgetPlaybackState.IDLE,
    val artworkUri: String? = null,
    val artworkCacheKey: String? = null,
) {
    companion object {
        const val NOT_PLAYING_TITLE = "Not Playing"
    }
}

/**
 * In-memory state holder for widget rendering state.
 */
object WidgetStateRepository {
    private val _snapshotFlow = MutableStateFlow(WidgetPlaybackSnapshot())

    fun read(): WidgetPlaybackSnapshot {
        return _snapshotFlow.value
    }

    fun save(snapshot: WidgetPlaybackSnapshot) {
        _snapshotFlow.value = snapshot
    }

    fun clear() {
        _snapshotFlow.value = WidgetPlaybackSnapshot()
    }
}
