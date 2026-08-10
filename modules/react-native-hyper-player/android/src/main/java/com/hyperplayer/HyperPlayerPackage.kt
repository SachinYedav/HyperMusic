package com.hyperplayer;

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.hyperplayer.ui.HyperVideoViewManager
import com.margelo.nitro.hyperplayer.HyperPlayerOnLoad

/**
 * The standard React Native module package entry point.
 * Used primarily for auto-linking the `HyperVideoViewManager` and capturing the React context early.
 * (Note: Nitro modules are linked separately, but we still need this for standard ViewManagers).
 */
class HyperPlayerPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    // We capture the ReactContext here because standard NativeModules boot up slightly before
    // or differently than Nitro components, ensuring we have a context ready for background services.
    com.hyperplayer.HybridHyperPlayer.globalReactContext = reactContext
    return emptyList()
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return listOf(
        HyperVideoViewManager()
    )
  }

  companion object {
    init {
      HyperPlayerOnLoad.initializeNative()
    }
    
    // Public entrypoint to safely trigger the companion object initialization from app startup
    fun initialize() {
      // Intentionally left blank. Calling this method guarantees the init block above has run.
    }
  }
}
