package expo.modules.hyperdownloader.core

import android.util.Log

/**
 * Utility object for structured logging throughout the native hyper-downloader module.
 * Provides unified tagging and diagnostic capabilities.
 */
object DownloadLogger {
    private const val TAG = "HyperDownloaderModule"
    private const val PREFIX = "[HyperDownloader]"

    fun d(message: String) {
        Log.d(TAG, "$PREFIX $message")
    }

    fun i(message: String) {
        Log.i(TAG, "$PREFIX $message")
    }

    fun w(message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.w(TAG, "$PREFIX $message", throwable)
        } else {
            Log.w(TAG, "$PREFIX $message")
        }
    }

    fun e(message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.e(TAG, "$PREFIX $message", throwable)
        } else {
            Log.e(TAG, "$PREFIX $message")
        }
    }
    
    fun diagnostic(phase: String, message: String) {
        Log.d(TAG, "$PREFIX [DIAGNOSTIC] [$phase] $message")
    }
}
