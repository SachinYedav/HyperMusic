package com.margelo.nitro.hyperplayer.engine

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.datasource.cache.CacheDataSource
import com.margelo.nitro.hyperplayer.cache.HyperCacheManager
import com.margelo.nitro.hyperplayer.network.HyperDataSourceFactory
import com.margelo.nitro.hyperplayer.session.HyperMediaSessionService
import com.margelo.nitro.hyperplayer.utils.Logger
import kotlinx.coroutines.*
import java.util.concurrent.CopyOnWriteArrayList

/**
 * The core orchestrator of the audio engine. Ensures only one ExoPlayer exists across the entire app lifecycle.
 * Manages the queue, rapid skip debouncing, and emitting state changes back to JS via JSI.
 */
object PlayerControllerSingleton {
    private var exoPlayer: ExoPlayer? = null
    private var mediaSession: MediaSession? = null
    
    // Coroutine scope bound to the Main thread for UI and Bridge events
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var skipDebounceJob: Job? = null
    private var preloadJob: Job? = null
    private var progressJob: Job? = null
    
    // SSOT (Single Source of Truth) state syncing with JS
    private var currentQueueRevision: Double = 0.0
    private var isResolvingJit: Boolean = false
    private var hasObservedInitialSize = false
    private var consecutiveErrorCount = 0
    private const val MAX_CONSECUTIVE_ERRORS = 3
    
    // Caches video availability to prevent redundant bridge emissions
    @Volatile private var cachedHasVideo: Boolean = false
    
    // Callback interface bound to HybridHyperPlayer for emitting events to React Native
    private var eventListener: PlayerEventListener? = null

    /**
     * Starts a coroutine ticker that emits the current playback position to the JS thread every 500ms.
     * Only runs when the player is actively playing to save CPU cycles.
     */
    private fun startProgressLoop() {
        if (progressJob?.isActive == true) return
        progressJob = scope.launch {
            while (isActive) {
                exoPlayer?.let { player ->
                    if (player.isPlaying) {
                        eventListener?.onPositionUpdate(
                            player.currentPosition.toDouble(),
                            player.duration.toDouble(),
                            player.bufferedPosition.toDouble()
                        )
                    }
                }
                delay(500)
            }
        }
    }

    interface PlayerEventListener {
        fun onTrackTransition(trackId: String, queueEntryId: String, index: Int, reason: String, queueRevision: Double)
        fun onPlaybackStateChange(state: String, isPlaying: Boolean, isResolving: Boolean, queueRevision: Double)
        fun onPositionUpdate(positionMs: Double, durationMs: Double, bufferedMs: Double)
        fun onCustomCommand(command: String)
        fun onVideoAvailabilityChanged(hasVideo: Boolean)
    }

    fun setEventListener(listener: PlayerEventListener) {
        this.eventListener = listener
    }

    fun emitCustomCommand(command: String) {
        eventListener?.onCustomCommand(command)
    }

    /**
     * Initializes and returns the ExoPlayer singleton instance.
     * Configures the data source factory chain (Network -> Cache -> JIT Resolver) and sets up
     * audio focus handling and load controls for zero-latency playback.
     */
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    fun getPlayer(context: Context): ExoPlayer {
        if (exoPlayer == null) {
            val resolvingDataSourceFactory = HyperDataSourceFactory.create(context)

            val mediaSourceFactory = androidx.media3.exoplayer.source.DefaultMediaSourceFactory(context)
                .setDataSourceFactory(resolvingDataSourceFactory)

            val loadControl = androidx.media3.exoplayer.DefaultLoadControl.Builder()
                .setBufferDurationsMs(2500, 15000, 250, 500)
                .setPrioritizeTimeOverSizeThresholds(true)
                .build()

            val audioAttributes = androidx.media3.common.AudioAttributes.Builder()
                .setUsage(androidx.media3.common.C.USAGE_MEDIA)
                .setContentType(androidx.media3.common.C.AUDIO_CONTENT_TYPE_MUSIC)
                .build()

            exoPlayer = ExoPlayer.Builder(context.applicationContext)
                .setMediaSourceFactory(mediaSourceFactory)
                .setLoadControl(loadControl)
                .setAudioAttributes(audioAttributes, true)           // Handles Audio Focus gain/loss gracefully
                .setHandleAudioBecomingNoisy(true)                   // Auto-pauses on headset disconnect
                .setWakeMode(androidx.media3.common.C.WAKE_MODE_NETWORK) // Keeps Wi-Fi/Cellular radio alive when screen is off
                .setLooper(android.os.Looper.getMainLooper())
                .build().apply {
                
                addListener(object : Player.Listener {
                    override fun onTracksChanged(tracks: androidx.media3.common.Tracks) {
                        super.onTracksChanged(tracks)
                        val hasVideo = tracks.containsType(androidx.media3.common.C.TRACK_TYPE_VIDEO)
                        if (cachedHasVideo != hasVideo) {
                            cachedHasVideo = hasVideo
                            eventListener?.onVideoAvailabilityChanged(hasVideo)
                        }
                    }

                    override fun onVideoSizeChanged(videoSize: androidx.media3.common.VideoSize) {
                        super.onVideoSizeChanged(videoSize)
                        // fallback check just in case tracks don't update size properly
                        val hasVideo = videoSize.width > 0 && videoSize.height > 0
                        if (cachedHasVideo != hasVideo) {
                            cachedHasVideo = hasVideo
                            eventListener?.onVideoAvailabilityChanged(hasVideo)
                        }
                    }

                    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                        cachedHasVideo = false
                        val queueEntryId = mediaItem?.mediaId ?: ""
                        // The track.id is embedded as the host in the hyper:// URI
                        val trackId = mediaItem?.localConfiguration?.uri?.host ?: ""
                        
                        val index = currentMediaItemIndex
                        val reasonStr = when(reason) {
                            Player.MEDIA_ITEM_TRANSITION_REASON_AUTO -> "auto"
                            Player.MEDIA_ITEM_TRANSITION_REASON_SEEK -> "user"
                            Player.MEDIA_ITEM_TRANSITION_REASON_PLAYLIST_CHANGED -> "auto"
                            else -> "auto"
                        }
                        
                        var remainingItems = 0
                        val nextIdx = nextMediaItemIndex
                        if (nextIdx != androidx.media3.common.C.INDEX_UNSET) {
                            remainingItems++
                            val timeline = currentTimeline
                            if (!timeline.isEmpty) {
                                // Lookahead algorithm: calculates remaining items (up to 3) to notify JS 
                                // so it can trigger infinite-scroll pagination fetching in the background.
                                val nextNextIdx = timeline.getNextWindowIndex(nextIdx, repeatMode, shuffleModeEnabled)
                                if (nextNextIdx != androidx.media3.common.C.INDEX_UNSET) {
                                    remainingItems++
                                    val thirdIdx = timeline.getNextWindowIndex(nextNextIdx, repeatMode, shuffleModeEnabled)
                                    if (thirdIdx != androidx.media3.common.C.INDEX_UNSET) {
                                        remainingItems++
                                    }
                                }
                            }
                        }
                        
                        val payload = "$reasonStr:$remainingItems"
                        eventListener?.onTrackTransition(trackId, queueEntryId, index, payload, currentQueueRevision)
                        
                        if (hasNextMediaItem()) {
                            val nextIndex = nextMediaItemIndex
                            if (nextIndex != androidx.media3.common.C.INDEX_UNSET) {
                                preloadNextTrack(getMediaItemAt(nextIndex), context)
                            }
                        }
                    }

                    override fun onPlaybackStateChanged(playbackState: Int) {
                        emitPlaybackState()
                        if (playbackState == Player.STATE_READY) {
                            consecutiveErrorCount = 0
                        }
                        if (playbackState == Player.STATE_READY && playWhenReady) {
                            startProgressLoop()
                        }
                    }

                    override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
                        emitPlaybackState()
                        if (playbackState == Player.STATE_READY && playWhenReady) {
                            startProgressLoop()
                        }
                    }

                    override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                        Logger.e("ExoPlayer Error", error)
                        eventListener?.onPlaybackStateChange("error", false, isResolvingJit, currentQueueRevision)
                        
                        consecutiveErrorCount++

                        // Auto-Recovery Logic
                        exoPlayer?.let { player ->
                            if (player.hasNextMediaItem() && consecutiveErrorCount <= MAX_CONSECUTIVE_ERRORS) {
                                player.seekToNextMediaItem()
                                player.prepare()
                                player.play()
                            }
                        }
                    }
                })
            }
        }
        return exoPlayer!!
    }

    private fun emitPlaybackState() {
        exoPlayer?.let { player ->
            val stateStr = when(player.playbackState) {
                Player.STATE_IDLE -> "idle"
                Player.STATE_BUFFERING -> "buffering"
                Player.STATE_READY -> "ready"
                Player.STATE_ENDED -> "ended"
                else -> "error"
            }
            eventListener?.onPlaybackStateChange(stateStr, player.playWhenReady, isResolvingJit, currentQueueRevision)
        }
    }

    private val prefetchingSet = java.util.concurrent.ConcurrentHashMap<String, Boolean>()

    /**
     * Highly optimized JIT preloader. Analyzes the next track in the queue, performs a blocking
     * network request to extract the actual playback URL (if it's a hyper:// URI), replaces the item
     * in the ExoPlayer playlist to prevent future blocks, and finally fills 2MB into the CacheLayer.
     */
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    private fun preloadNextTrack(mediaItem: MediaItem, context: Context) {
        val mediaId = mediaItem.mediaId
        if (prefetchingSet.containsKey(mediaId)) return
        prefetchingSet[mediaId] = true
        
        preloadJob?.cancel()
        preloadJob = scope.launch(Dispatchers.IO) {
            try {
                var uri = mediaItem.localConfiguration?.uri ?: return@launch
                var cacheKey = mediaId // Default cache key is mediaId, but will be overwritten if hyper scheme
                
                // JIT Resolve if necessary
                if (uri.scheme == "hyper") {
                    val videoId = uri.host ?: return@launch
                    val trackType = uri.getQueryParameter("type") ?: "audio"
                    cacheKey = "$videoId-$trackType"

                    val extractedUrl = com.margelo.nitro.hyperextractor.engine.YouTubeMusicEngine.getStreamUrl(videoId, "high", trackType)
                    uri = android.net.Uri.parse(extractedUrl)
                    
                    // Proactively update ExoPlayer's playlist on the main thread so it NEVER resolves again
                    withContext(Dispatchers.Main) {
                        exoPlayer?.let { player ->
                            for (i in 0 until player.mediaItemCount) {
                                val item = player.getMediaItemAt(i)
                                if (item.mediaId == mediaItem.mediaId && item.localConfiguration?.uri?.scheme == "hyper") {
                                    val newItem = item.buildUpon().setUri(uri).build()
                                    player.replaceMediaItem(i, newItem)
                                    break
                                }
                            }
                        }
                    }
                }

                // Fetch up to 2MB of the next track into the SimpleCache silently in the background
                val dataSpec = androidx.media3.datasource.DataSpec.Builder()
                    .setUri(uri)
                    .setPosition(0)
                    .setLength(2 * 1024 * 1024) // 2MB Triple Buffer
                    .setKey(cacheKey)
                    .build()
                
                val cacheWriter = androidx.media3.datasource.cache.CacheWriter(
                    HyperDataSourceFactory.createCacheDataSourceFactory(context).createDataSource(), 
                    dataSpec, 
                    null, 
                    null
                )
                cacheWriter.cache()
                Logger.i("Successfully preloaded 2MB of next track: $cacheKey")
            } catch (e: Exception) {
                if (e !is CancellationException) {
                    Logger.e("Failed to preload next track", e)
                }
                prefetchingSet.remove(mediaId)
            }
        }
    }

    fun attachSession(session: MediaSession?) {
        this.mediaSession = session
    }

    fun detachSession() {
        this.mediaSession = null
    }

    // --- Media Controls ---

    fun loadQueue(items: List<MediaItem>, startIndex: Int, repeatMode: Int, shuffle: Boolean, queueRevision: Double) {
        currentQueueRevision = queueRevision
        exoPlayer?.run {
            setMediaItems(items, startIndex, 0L)
            this.repeatMode = repeatMode
            this.shuffleModeEnabled = shuffle
            prepare()
            play() // Actually start playback
        }
        emitPlaybackState()
    }

    fun addTracks(items: List<MediaItem>, insertIndex: Int, queueRevision: Double) {
        currentQueueRevision = queueRevision
        exoPlayer?.addMediaItems(insertIndex, items)
        emitPlaybackState()
    }

    fun moveTrack(fromIndex: Int, toIndex: Int, queueRevision: Double) {
        currentQueueRevision = queueRevision
        exoPlayer?.moveMediaItem(fromIndex, toIndex)
        emitPlaybackState()
    }

    fun play() {
        exoPlayer?.let { player ->
            if (player.playerError != null || player.playbackState == androidx.media3.common.Player.STATE_IDLE) {
                player.prepare()
            } else if (player.playbackState == androidx.media3.common.Player.STATE_ENDED) {
                player.seekTo(0)
            }
            player.play()
        }
    }

    fun pause() {
        exoPlayer?.pause()
    }

    fun skipToNext() {
        exoPlayer?.let { player ->
            if (player.hasNextMediaItem()) {
                player.seekToNextMediaItem()
                if (player.playerError != null || player.playbackState == androidx.media3.common.Player.STATE_IDLE) {
                    player.prepare()
                    player.play()
                }
            }
        }
    }

    fun skipToPrevious() {
        exoPlayer?.let { player ->
            if (player.hasPreviousMediaItem()) {
                player.seekToPreviousMediaItem()
                if (player.playerError != null || player.playbackState == androidx.media3.common.Player.STATE_IDLE) {
                    player.prepare()
                    player.play()
                }
            }
        }
    }

    fun seekTo(positionMs: Long) {
        exoPlayer?.seekTo(positionMs)
    }
    
    fun setRepeatMode(mode: Int) {
        exoPlayer?.repeatMode = mode
    }
    
    fun setShuffle(shuffle: Boolean) {
        exoPlayer?.shuffleModeEnabled = shuffle
    }
    
    fun updateNotificationUI(repeatModeInt: Int, isShuffle: Boolean) {
        HyperMediaSessionService.updateCustomLayout(repeatModeInt, isShuffle)
    }

    fun destroy() {
        exoPlayer?.release()
        exoPlayer = null
        scope.cancel()
    }
    
    /**
     * Hot-Swaps the current playing audio stream with its video counterpart.
     * Retains the exact playback position by parsing the URI, changing the `type=audio` query
     * parameter to `type=video`, updating the playlist item in-place, and seeking to the exact ms.
     */
    fun switchToVideo() {
        scope.launch {
            exoPlayer?.let { player ->
                val currentIndex = player.currentMediaItemIndex
                if (currentIndex == androidx.media3.common.C.INDEX_UNSET) return@launch
                
                val currentItem = player.getMediaItemAt(currentIndex)
                val currentPos = player.currentPosition
                
                var url = currentItem.localConfiguration?.uri?.toString() ?: return@launch
                if (!url.startsWith("hyper://")) return@launch // Not a dynamic JIT URL
                
                // Remove existing type param
                url = url.substringBefore("?type=").substringBefore("&type=")
                val newUrl = if (url.contains("?")) "$url&type=video" else "$url?type=video"
                
                val newItem = currentItem.buildUpon().setUri(android.net.Uri.parse(newUrl)).build()
                
                // Replace the media item in the queue and seek to exact ms
                player.replaceMediaItem(currentIndex, newItem)
                player.seekTo(currentIndex, currentPos)
                player.prepare()
                player.play()
            }
        }
    }
    
    fun switchToAudio() {
        exoPlayer?.clearVideoSurface()
    }
    
    fun hasVideo(): Boolean {
        return cachedHasVideo
    }
    
    fun switchToAudioLegacy() {
        scope.launch {
            exoPlayer?.let { player ->
                val currentIndex = player.currentMediaItemIndex
                if (currentIndex == androidx.media3.common.C.INDEX_UNSET) return@launch
                
                val currentItem = player.getMediaItemAt(currentIndex)
                val currentPos = player.currentPosition
                
                var url = currentItem.localConfiguration?.uri?.toString() ?: return@launch
                if (!url.startsWith("hyper://")) return@launch // Not a dynamic JIT URL
                
                // Remove existing type param
                url = url.substringBefore("?type=").substringBefore("&type=")
                val newUrl = if (url.contains("?")) "$url&type=audio" else "$url?type=audio"
                
                val newItem = currentItem.buildUpon().setUri(android.net.Uri.parse(newUrl)).build()
                
                // Replace the media item in the queue and seek to exact ms
                player.replaceMediaItem(currentIndex, newItem)
                player.seekTo(currentIndex, currentPos)
                player.prepare()
                player.play()
            }
        }
    }
}
