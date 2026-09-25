package com.margelo.nitro.hyperplayer.engine

import kotlinx.coroutines.*
import com.margelo.nitro.hyperplayer.utils.Logger

/**
 * Native-side playback history tracker.
 * Measures 30 seconds of cumulative active playback on a background thread
 * and fires an event to JavaScript to handle the actual database write.
 */
object NativeHistoryTracker {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var checkJob: Job? = null

    // State tracking
    private var currentTrackId: String? = null
    private var currentTrackTitle: String = ""
    private var currentTrackArtist: String = ""
    private var currentTrackArtworkUrl: String = ""
    private var currentTrackType: String = "song"

    private var playStartTime: Long = 0
    private var cumulativeTimeMs: Long = 0
    private var historyRecordedForTrackId: String? = null

    private var historyCallback: ((trackId: String, title: String, artist: String, artworkUrl: String, trackType: String) -> Unit)? = null

    private const val THRESHOLD_MS = 30_000L
    private const val CHECK_INTERVAL_MS = 5_000L

    fun setHistoryCallback(callback: (trackId: String, title: String, artist: String, artworkUrl: String, trackType: String) -> Unit) {
        historyCallback = callback
    }

    /**
     * Called from ExoPlayer's onMediaItemTransition().
     * Resets all counters for the new track.
     */
    fun onTrackChanged(
        trackId: String,
        title: String,
        artist: String,
        artworkUrl: String,
        trackType: String?,
        @Suppress("UNUSED_PARAMETER") duration: Long, // unused
        isPlaying: Boolean
    ) {
        stopTimer()

        currentTrackId = trackId
        currentTrackTitle = title
        currentTrackArtist = artist
        currentTrackArtworkUrl = artworkUrl
        currentTrackType = trackType ?: "song"
        cumulativeTimeMs = 0
        historyRecordedForTrackId = null

        if (isPlaying) {
            startTimer()
        }
    }

    /**
     * Called from ExoPlayer's onPlayWhenReadyChanged() / onPlaybackStateChanged().
     */
    fun onPlaybackStateChanged(isPlaying: Boolean) {
        if (isPlaying) {
            startTimer()
        } else {
            pauseTimer()
        }
    }


    private fun startTimer() {
        if (checkJob != null) return // Already running
        playStartTime = System.currentTimeMillis()
        scheduleCheck()
    }

    private fun pauseTimer() {
        if (playStartTime > 0) {
            cumulativeTimeMs += (System.currentTimeMillis() - playStartTime)
            playStartTime = 0
        }
        stopTimer()
    }

    private fun stopTimer() {
        checkJob?.cancel()
        checkJob = null
    }

    private fun scheduleCheck() {
        stopTimer()
        checkJob = scope.launch {
            delay(CHECK_INTERVAL_MS)
            if (isActive) {
                checkAndRecord()
                // Re-schedule if still needed
                if (historyRecordedForTrackId != currentTrackId) {
                    scheduleCheck()
                }
            }
        }
    }

    private fun checkAndRecord() {
        val trackId = currentTrackId ?: return
        if (historyRecordedForTrackId == trackId) return
        if (currentTrackType.startsWith("local_device")) return

        val elapsed = if (playStartTime > 0) {
            cumulativeTimeMs + (System.currentTimeMillis() - playStartTime)
        } else {
            cumulativeTimeMs
        }

        if (elapsed >= THRESHOLD_MS) {
            historyRecordedForTrackId = trackId
            emitHistoryEvent(trackId)
        }
    }

    private fun emitHistoryEvent(trackId: String) {
        try {
            // Notify JS to perform the actual DB write
            historyCallback?.invoke(trackId, currentTrackTitle, currentTrackArtist, currentTrackArtworkUrl, currentTrackType)
            Logger.d("Triggered JS history write for track: $currentTrackTitle")
        } catch (e: Exception) {
            Logger.e("Failed to trigger history callback", e)
        }
    }

    fun release() {
        stopTimer()
        historyCallback = null
    }
}
