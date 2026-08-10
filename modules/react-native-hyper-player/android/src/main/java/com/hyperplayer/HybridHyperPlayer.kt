package com.hyperplayer

import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.margelo.nitro.hyperplayer.HybridHyperPlayerSpec
import com.margelo.nitro.hyperplayer.engine.PlayerControllerSingleton
import com.margelo.nitro.hyperplayer.PlayerTrack
import com.margelo.nitro.hyperplayer.utils.Logger

/**
 * JSI Bridge component acting as the primary orchestration layer between the React Native JavaScript runtime
 * and the Native Android Media3 (ExoPlayer) engine.
 * Receives track data from the UI layer and delegates it to the `PlayerControllerSingleton`.
 */
class HybridHyperPlayer : HybridHyperPlayerSpec(), PlayerControllerSingleton.PlayerEventListener {

    companion object {
        /**
         * A global reference to the React Application Context, required for binding the
         * ExoPlayer instance to the foreground MediaSessionService for background playback.
         */
        var globalReactContext: ReactApplicationContext? = null
    }

    private val mainHandler = android.os.Handler(android.os.Looper.getMainLooper())

    init {
        Logger.d("HybridHyperPlayer Engine Initialized")
        PlayerControllerSingleton.setEventListener(this)
    }


    /**
     * Bootstraps the ExoPlayer instance and strictly binds it to the foreground MediaSessionService.
     * Essential for enabling background audio playback and Android System UI controls.
     */
    private fun ensurePlayerCreated() {
        Logger.i("ensurePlayerCreated() check...")
        globalReactContext?.let { ctx ->
            Logger.i("globalReactContext is NOT null, initializing ExoPlayer")
            // Synchronously instantiate ExoPlayer if not already
            PlayerControllerSingleton.getPlayer(ctx)
            // Bind a controller to trigger MediaSessionService lifecycle for background playback
            val sessionToken = androidx.media3.session.SessionToken(ctx, android.content.ComponentName(ctx, com.margelo.nitro.hyperplayer.session.HyperMediaSessionService::class.java))
            androidx.media3.session.MediaController.Builder(ctx, sessionToken).buildAsync()
            Logger.i("MediaController bound asynchronously")
        } ?: Logger.e("ensurePlayerCreated: globalReactContext IS NULL!")
    }

    /**
     * Replaces the entire active queue with a new set of tracks and begins playback.
     *
     * @param tracks Array of `PlayerTrack` objects containing metadata and extraction URLs.
     * @param startIndex The initial index from which playback should commence.
     * @param repeatMode The string representation of the playback repeat mode (e.g., "all", "one", "off").
     * @param isShuffle Boolean flag indicating if the incoming queue should be scrambled.
     * @param queueRevision A distinct epoch timestamp representing the SSOT state revision.
     */
    override fun loadQueue(tracks: Array<PlayerTrack>, startIndex: Double, repeatMode: String, isShuffle: Boolean, queueRevision: Double) {
        mainHandler.post {
            Logger.i("loadQueue invoked with ${tracks.size} tracks, startIndex: $startIndex, queueRevision: $queueRevision")
            ensurePlayerCreated()
            val mediaItems = tracks.map { track ->
                val metadataBuilder = MediaMetadata.Builder()
                    .setTitle(track.title)
                    .setArtist(track.artist)
                if (track.artworkUrl.isNotBlank()) {
                    metadataBuilder.setArtworkUri(android.net.Uri.parse(track.artworkUrl))
                }
                
                var finalUrl = track.url
                if (finalUrl.startsWith("hyper://") && track.trackType?.isNotBlank() == true) {
                    finalUrl = if (finalUrl.contains("?")) "$finalUrl&type=${track.trackType}" else "$finalUrl?type=${track.trackType}"
                }
                
                MediaItem.Builder()
                    .setMediaId(track.queueEntryId) // Use queueEntryId as SSOT unique identity
                    .setUri(finalUrl) // The URI host still contains the video ID for JIT extraction
                    .setMediaMetadata(metadataBuilder.build())
                    .build()
            }

            val repeatModeInt = when (repeatMode) {
                "all" -> androidx.media3.common.Player.REPEAT_MODE_ALL
                "one" -> androidx.media3.common.Player.REPEAT_MODE_ONE
                else -> androidx.media3.common.Player.REPEAT_MODE_OFF
            }

            PlayerControllerSingleton.loadQueue(mediaItems, startIndex.toInt(), repeatModeInt, isShuffle, queueRevision)
        }
    }

    /**
     * Injects additional tracks dynamically into the active ExoPlayer playlist.
     *
     * @param tracks The incoming batch of media tracks to append or insert.
     * @param insertIndex The targeted position in the queue.
     * @param queueRevision The synchronized state identifier.
     */
    override fun addTracks(tracks: Array<PlayerTrack>, insertIndex: Double, queueRevision: Double) {
        mainHandler.post {
            ensurePlayerCreated()
            val mediaItems = tracks.map { track ->
                val metadataBuilder = MediaMetadata.Builder()
                    .setTitle(track.title)
                    .setArtist(track.artist)
                if (track.artworkUrl.isNotBlank()) {
                    metadataBuilder.setArtworkUri(android.net.Uri.parse(track.artworkUrl))
                }
                
                var finalUrl = track.url
                if (finalUrl.startsWith("hyper://") && track.trackType?.isNotBlank() == true) {
                    finalUrl = if (finalUrl.contains("?")) "$finalUrl&type=${track.trackType}" else "$finalUrl?type=${track.trackType}"
                }
                
                MediaItem.Builder()
                    .setMediaId(track.queueEntryId)
                    .setUri(finalUrl)
                    .setMediaMetadata(metadataBuilder.build())
                    .build()
            }
            PlayerControllerSingleton.addTracks(mediaItems, insertIndex.toInt(), queueRevision)
        }
    }

    /**
     * Rearranges the internal ExoPlayer playlist index structure.
     */
    override fun moveTrack(fromIndex: Double, toIndex: Double, queueRevision: Double) {
        mainHandler.post { PlayerControllerSingleton.moveTrack(fromIndex.toInt(), toIndex.toInt(), queueRevision) }
    }

    /**
     * Resumes playback on the main thread via the Controller Engine.
     */
    override fun play() {
        mainHandler.post {
            Logger.i("play invoked")
            ensurePlayerCreated()
            PlayerControllerSingleton.play()
        }
    }

    /**
     * Halts media output gracefully on the main thread.
     */
    override fun pause() {
        mainHandler.post {
            Logger.i("pause invoked")
            ensurePlayerCreated()
            PlayerControllerSingleton.pause()
        }
    }

    /**
     * Skips to the next track in the playlist.
     */
    override fun skipToNext() {
        mainHandler.post { PlayerControllerSingleton.skipToNext() }
    }

    /**
     * Skips to the previous track or restarts the current track based on threshold.
     */
    override fun skipToPrevious() {
        mainHandler.post { PlayerControllerSingleton.skipToPrevious() }
    }



    override fun seekTo(positionMs: Double) {
        mainHandler.post { PlayerControllerSingleton.seekTo(positionMs.toLong()) }
    }

    override fun setRepeatMode(mode: String) {
        mainHandler.post {
            val repeatModeInt = when (mode) {
                "all" -> androidx.media3.common.Player.REPEAT_MODE_ALL
                "one" -> androidx.media3.common.Player.REPEAT_MODE_ONE
                else -> androidx.media3.common.Player.REPEAT_MODE_OFF
            }
            PlayerControllerSingleton.setRepeatMode(repeatModeInt)
        }
    }

    override fun setShuffle(shuffle: Boolean) {
        mainHandler.post { PlayerControllerSingleton.setShuffle(shuffle) }
    }

    override fun updateNotificationUI(repeatMode: String, isShuffle: Boolean) {
        val repeatModeInt = when (repeatMode) {
            "all" -> androidx.media3.common.Player.REPEAT_MODE_ALL
            "one" -> androidx.media3.common.Player.REPEAT_MODE_ONE
            else -> androidx.media3.common.Player.REPEAT_MODE_OFF
        }
        mainHandler.post {
            PlayerControllerSingleton.updateNotificationUI(repeatModeInt, isShuffle)
        }
    }

    override fun switchToVideo() {
        mainHandler.post { PlayerControllerSingleton.switchToVideo() }
    }

    override fun switchToAudio() {
        mainHandler.post { PlayerControllerSingleton.switchToAudio() }
    }

    override fun hasVideo(): Boolean {
        return PlayerControllerSingleton.hasVideo()
    }

    override fun destroy() {
        mainHandler.post { PlayerControllerSingleton.destroy() }
    }

    // --- PlayerEventListener Implementation ---
    private fun emitEvent(eventName: String, data: com.facebook.react.bridge.WritableMap) {
        globalReactContext?.let { ctx ->
            if (ctx.hasActiveReactInstance()) {
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                   .emit(eventName, data)
            }
        }
    }

    override fun onTrackTransition(trackId: String, queueEntryId: String, index: Int, reason: String, queueRevision: Double) {
        val data = com.facebook.react.bridge.Arguments.createMap().apply {
            putString("trackId", trackId)
            putString("queueEntryId", queueEntryId)
            putInt("index", index)
            putString("reason", reason)
            putDouble("queueRevision", queueRevision)
        }
        emitEvent("onTrackTransition", data)
    }

    override fun onPlaybackStateChange(state: String, isPlaying: Boolean, isResolving: Boolean, queueRevision: Double) {
        val data = com.facebook.react.bridge.Arguments.createMap().apply {
            putString("state", state)
            putBoolean("isPlaying", isPlaying)
            putBoolean("isResolving", isResolving)
            putDouble("queueRevision", queueRevision)
        }
        emitEvent("onPlaybackStateChange", data)
    }

    override fun onPositionUpdate(positionMs: Double, durationMs: Double, bufferedMs: Double) {
        val data = com.facebook.react.bridge.Arguments.createMap().apply {
            putDouble("positionMs", positionMs)
            putDouble("durationMs", durationMs)
            putDouble("bufferedMs", bufferedMs)
        }
        emitEvent("onPositionUpdate", data)
    }

    override fun onCustomCommand(command: String) {
        val data = com.facebook.react.bridge.Arguments.createMap().apply {
            putString("command", command)
        }
        emitEvent("onCustomCommand", data)
    }

    override fun onVideoAvailabilityChanged(hasVideo: Boolean) {
        val data = com.facebook.react.bridge.Arguments.createMap().apply {
            putBoolean("hasVideo", hasVideo)
        }
        emitEvent("onVideoAvailabilityChanged", data)
    }

    override fun setGlobalStreamingQuality(quality: String) {
        com.margelo.nitro.hyperplayer.network.JitDataSourceResolver.currentQuality = quality
        Logger.i("Global streaming quality updated to: $quality")
    }
}
