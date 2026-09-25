package com.margelo.nitro.hyperplayer.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.hyperplayer.HybridHyperPlayer
import com.margelo.nitro.hyperplayer.utils.Logger

class WidgetPinSuccessReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_PIN_SUCCESS = "com.margelo.nitro.hyperplayer.widget.PIN_SUCCESS"
        const val EXTRA_STYLE = "style"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_PIN_SUCCESS) {
            val styleStr = intent.getStringExtra(EXTRA_STYLE) ?: return
            Logger.i("Widget pin successful for style: $styleStr")
            
            HybridHyperPlayer.globalReactContext?.let { ctx ->
                if (ctx.hasActiveReactInstance()) {
                    val data = com.facebook.react.bridge.Arguments.createMap().apply {
                        putString("style", styleStr)
                    }
                    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onWidgetPinSuccess", data)
                }
            }
        }
    }
}

