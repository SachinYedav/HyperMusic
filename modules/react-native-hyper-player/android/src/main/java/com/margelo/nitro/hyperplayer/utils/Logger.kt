package com.margelo.nitro.hyperplayer.utils

import android.util.Log
import com.hyperplayer.BuildConfig

/**
 * Centralized logging utility for the HyperPlayer native module.
 * Provides a unified interface for emitting structured logs to the Android Logcat.
 */
object Logger {
    private const val TAG = "HyperPlayer"

    /**
     * Emits an informational log message.
     *
     * @param message The message string to log.
     */
    fun i(message: String) {
        if (BuildConfig.DEBUG) {
            Log.i(TAG, message)
        }
    }

    /**
     * Emits an error log message along with its associated throwable.
     *
     * @param message The error context description.
     * @param throwable The underlying exception (optional).
     */
    fun e(message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.e(TAG, message, throwable)
        } else {
            Log.e(TAG, message)
        }
    }

    /**
     * Emits a debug log message.
     *
     * @param message The debug message string to log.
     */
    fun d(message: String) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, message)
        }
    }
}
