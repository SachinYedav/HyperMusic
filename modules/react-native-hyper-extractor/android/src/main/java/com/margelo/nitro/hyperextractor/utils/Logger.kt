package com.margelo.nitro.hyperextractor.utils

import android.util.Log
import com.hyperextractor.BuildConfig

/**
 * Centralized logging utility governing Android Logcat output for the HyperExtractor native engine.
 * All logging is automatically silenced in release/preview APK builds via BuildConfig.DEBUG guard.
 */
object Logger {
    private const val TAG = "HyperExtractorNative"
    private val IS_DEBUG = BuildConfig.DEBUG

    // Dispatches standard debug-level diagnostic messages
    fun d(message: String) {
        if (IS_DEBUG) Log.d(TAG, message)
    }

    // Dispatches standard informational lifecycle messages
    fun i(message: String) {
        if (IS_DEBUG) Log.i(TAG, message)
    }

    // Dispatches non-fatal warning messages with optional stacktrace inspection
    fun w(message: String, throwable: Throwable? = null) {
        if (IS_DEBUG) Log.w(TAG, message, throwable)
    }

    // Dispatches fatal execution errors and bridge exceptions
    fun e(message: String, throwable: Throwable? = null) {
        if (IS_DEBUG) Log.e(TAG, message, throwable)
    }
}
