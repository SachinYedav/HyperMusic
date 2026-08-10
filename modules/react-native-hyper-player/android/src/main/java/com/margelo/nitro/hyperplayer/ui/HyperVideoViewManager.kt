package com.margelo.nitro.hyperplayer.ui

import com.margelo.nitro.hyperplayer.engine.PlayerControllerSingleton
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.media3.ui.PlayerView
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

/**
 * A React Native UI component manager for rendering video output from ExoPlayer.
 * This bridges the native Android `androidx.media3.ui.PlayerView` directly into the JS React tree.
 * It strictly binds to the `PlayerControllerSingleton` to ensure UI surfaces are attached 
 * to the exact same audio/video pipeline.
 */
class HyperVideoViewManager : SimpleViewManager<FrameLayout>() {

    override fun getName(): String {
        return "HyperVideoView"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
        val container = FrameLayout(reactContext)
        
        // Create the ExoPlayer view natively
        val playerView = PlayerView(reactContext).apply {
            useController = false // We provide our own custom React Native UI for controls
            
            // Connect to our unified singleton ExoPlayer
            player = PlayerControllerSingleton.getPlayer(reactContext)
            
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        
        container.addView(playerView)
        return container
    }
}
