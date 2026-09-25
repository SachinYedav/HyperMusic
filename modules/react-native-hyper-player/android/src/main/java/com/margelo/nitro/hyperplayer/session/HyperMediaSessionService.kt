package com.margelo.nitro.hyperplayer.session

import com.margelo.nitro.hyperplayer.engine.PlayerControllerSingleton
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

import android.os.Bundle
import androidx.media3.session.CommandButton
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.Futures
import androidx.media3.common.ForwardingPlayer
import com.hyperplayer.R
import com.margelo.nitro.hyperplayer.widget.WidgetStateRepository
import com.margelo.nitro.hyperplayer.widget.WidgetUpdateCoordinator
import com.margelo.nitro.hyperplayer.widget.WidgetUpdateReason

/**
 * Foreground service bound to the OS for managing playback, lock-screen controls, 
 * and audio focus across Android 13/14+.
 */
class HyperMediaSessionService : MediaSessionService() {

    companion object {
        @Volatile
        private var instance: HyperMediaSessionService? = null

        /** True only while this process has an initialized playback session. */
        fun hasActiveSession(): Boolean = instance?.mediaSession != null
        
        /**
         * Dynamically updates the notification tray icons for Shuffle and Repeat.
         * In Android 13+, this rebuilds the CustomLayout using SessionCommands.
         */
        fun updateCustomLayout(repeatModeInt: Int, isShuffle: Boolean) {
            instance?.mediaSession?.let { session ->
                
                val shuffleIcon = if (isShuffle) R.drawable.ic_shuffle else R.drawable.ic_shuffle_off
                val repeatIcon = if (repeatModeInt == androidx.media3.common.Player.REPEAT_MODE_ONE) R.drawable.ic_repeat_one
                                 else if (repeatModeInt == androidx.media3.common.Player.REPEAT_MODE_ALL) R.drawable.ic_repeat
                                 else R.drawable.ic_repeat_off
                               
                val shuffleButton = CommandButton.Builder()
                    .setDisplayName("Shuffle")
                    .setSessionCommand(SessionCommand("ACTION_SHUFFLE", Bundle.EMPTY))
                    .setIconResId(shuffleIcon)
                    .build()
                    
                val repeatButton = CommandButton.Builder()
                    .setDisplayName("Repeat")
                    .setSessionCommand(SessionCommand("ACTION_REPEAT", Bundle.EMPTY))
                    .setIconResId(repeatIcon)
                    .build()
                    
                session.setCustomLayout(listOf(shuffleButton, repeatButton))
            }
        }
    }

    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        
        val player = PlayerControllerSingleton.getPlayer(this)
        
        // We use a ForwardingPlayer to intercept standard hardware/Bluetooth commands
        // (like shuffle/repeat toggle) and redirect them to JS instead of letting ExoPlayer 
        // handle them directly. JS remains the Single Source of Truth.
        val forwardingPlayer = object : ForwardingPlayer(player) {
            override fun setShuffleModeEnabled(shuffleModeEnabled: Boolean) {
                PlayerControllerSingleton.emitCustomCommand("toggle_shuffle")
            }
            override fun setRepeatMode(repeatMode: Int) {
                PlayerControllerSingleton.emitCustomCommand("toggle_repeat")
            }
        }
        
        val shuffleButton = CommandButton.Builder()
            .setDisplayName("Shuffle")
            .setSessionCommand(SessionCommand("ACTION_SHUFFLE", Bundle.EMPTY))
            .setIconResId(R.drawable.ic_shuffle_off)
            .build()
            
        val repeatButton = CommandButton.Builder()
            .setDisplayName("Repeat")
            .setSessionCommand(SessionCommand("ACTION_REPEAT", Bundle.EMPTY))
            .setIconResId(R.drawable.ic_repeat_off)
            .build()

        val callback = object : MediaSession.Callback {
            /**
             * Authorizes controllers (like Android Auto, System UI, Watches) to connect 
             * and binds our custom SessionCommands to them so the buttons appear.
             */
            override fun onConnect(
                session: MediaSession,
                controller: MediaSession.ControllerInfo
            ): MediaSession.ConnectionResult {
                val connectionResult = super.onConnect(session, controller)
                val sessionCommands = connectionResult.availableSessionCommands.buildUpon()
                    .add(SessionCommand("ACTION_SHUFFLE", Bundle.EMPTY))
                    .add(SessionCommand("ACTION_REPEAT", Bundle.EMPTY))
                    .build()
                return MediaSession.ConnectionResult.accept(
                    sessionCommands,
                    connectionResult.availablePlayerCommands
                )
            }

            /**
             * Receives interactions from the custom buttons in the System UI Notification 
             * and routes them to our JS bridge via PlayerControllerSingleton.
             */
            override fun onCustomCommand(
                session: MediaSession,
                controller: MediaSession.ControllerInfo,
                customCommand: SessionCommand,
                args: Bundle
            ): ListenableFuture<SessionResult> {
                when (customCommand.customAction) {
                    "ACTION_SHUFFLE" -> PlayerControllerSingleton.emitCustomCommand("toggle_shuffle")
                    "ACTION_REPEAT" -> PlayerControllerSingleton.emitCustomCommand("toggle_repeat")
                }
                return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
            }
        }
        
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = android.app.PendingIntent.getActivity(
            this,
            0,
            intent,
            android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        mediaSession = MediaSession.Builder(this, forwardingPlayer)
            .setSessionActivity(pendingIntent)
            .setCallback(callback)
            .setCustomLayout(listOf(shuffleButton, repeatButton))
            .build()
        
        PlayerControllerSingleton.attachSession(mediaSession)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    /**
     * Triggered when the user swipes the app away in the recent apps screen.
     * We halt playback and gracefully teardown the foreground service to avoid ghost audio.
     */
    override fun onTaskRemoved(rootIntent: android.content.Intent?) {
        super.onTaskRemoved(rootIntent)
        mediaSession?.run {
            player.pause()
        }
        
        WidgetStateRepository.clear()
        
        val resetIntent = android.content.Intent("com.margelo.nitro.hyperplayer.ACTION_RESET_WIDGETS").apply {
            setPackage(applicationContext.packageName)
        }
        sendBroadcast(resetIntent)
        
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        instance = null
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        
        PlayerControllerSingleton.detachSession()
        super.onDestroy()
    }
}
