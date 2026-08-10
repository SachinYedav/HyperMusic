package expo.modules.hyperdownloader

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import android.net.Uri
import expo.modules.hyperdownloader.core.DownloadManager
import expo.modules.hyperdownloader.core.DownloadLogger

/**
 * Foreground service responsible for managing the lifecycle of download batches.
 * It maintains a persistent notification to keep the process alive in the background
 * and handles UI actions like pause, resume, and cancel directly from the notification.
 */
class DownloadService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null
    private var lastUpdateTime = 0L
    
    companion object {
        const val CHANNEL_ID = "HyperDownloadChannel"
        const val NOTIFICATION_ID = 1001
        
        const val ACTION_START = "ACTION_START"
        const val ACTION_UPDATE = "ACTION_UPDATE"
        const val ACTION_STOP = "ACTION_STOP"
        
        const val ACTION_BTN_CANCEL = "expo.modules.hyperdownloader.CANCEL_BATCH"
        const val ACTION_BTN_PAUSE = "expo.modules.hyperdownloader.PAUSE_BATCH"
        const val ACTION_BTN_RESUME = "expo.modules.hyperdownloader.RESUME_BATCH"
        
        const val EXTRA_TITLE = "EXTRA_TITLE"
        const val EXTRA_PROGRESS = "EXTRA_PROGRESS"
        const val EXTRA_ARTWORK = "EXTRA_ARTWORK"
        const val EXTRA_SUBTEXT = "EXTRA_SUBTEXT"
        const val EXTRA_MAX_INT = "EXTRA_MAX_INT"
        const val EXTRA_PROGRESS_INT = "EXTRA_PROGRESS_INT"
        const val EXTRA_IS_PAUSED = "EXTRA_IS_PAUSED"
    }

    /**
     * Initializes the service, creates the notification channel for Android O+,
     * and acquires a wake lock to ensure background execution isn't prematurely killed.
     */
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireWakeLock()
    }

    /**
     * Handles incoming intents for starting, updating, pausing, resuming, or stopping the download service.
     */
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_NOT_STICKY

        when (intent.action) {
            ACTION_START -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Downloading..."
                val artwork = intent.getStringExtra(EXTRA_ARTWORK)
                DownloadLogger.diagnostic("SERVICE", "Starting foreground service for $title")
                updateNotification(title, "Starting download...", null, artwork, 0, 0, false, force = true)
            }
            ACTION_BTN_CANCEL -> {
                DownloadLogger.diagnostic("SERVICE", "ACTION_BTN_CANCEL received")
                DownloadManager.cancelBatch()
                // Force update UI to show cancelled state
                updateNotification("Downloads Cancelled", "Clearing queue...", null, null, 0, 0, true, force = true)
            }
            ACTION_BTN_PAUSE -> {
                DownloadManager.pauseBatch()
                // Force update UI immediately so user feels instant response
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Downloading..."
                val progress = intent.getStringExtra(EXTRA_PROGRESS) ?: ""
                val maxInt = intent.getIntExtra(EXTRA_MAX_INT, 0)
                val progressInt = intent.getIntExtra(EXTRA_PROGRESS_INT, 0)
                updateNotification(title, progress, "Paused", null, maxInt, progressInt, isPaused = true, force = true)
            }
            ACTION_BTN_RESUME -> {
                DownloadManager.resumeBatch()
                // Force update UI immediately
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Downloading..."
                val progress = intent.getStringExtra(EXTRA_PROGRESS) ?: ""
                val maxInt = intent.getIntExtra(EXTRA_MAX_INT, 0)
                val progressInt = intent.getIntExtra(EXTRA_PROGRESS_INT, 0)
                updateNotification(title, progress, "Resuming...", null, maxInt, progressInt, isPaused = false, force = true)
            }
            ACTION_UPDATE -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Downloading..."
                val progress = intent.getStringExtra(EXTRA_PROGRESS) ?: ""
                val artwork = intent.getStringExtra(EXTRA_ARTWORK)
                val subtext = intent.getStringExtra(EXTRA_SUBTEXT)
                val maxInt = intent.getIntExtra(EXTRA_MAX_INT, 0)
                val progressInt = intent.getIntExtra(EXTRA_PROGRESS_INT, 0)
                val isPaused = intent.getBooleanExtra(EXTRA_IS_PAUSED, false)
                
                // Force update on key states to avoid dropping them
                val forceUpdate = isPaused || progressInt == 100 || progressInt == 0
                
                updateNotification(title, progress, subtext, artwork, maxInt, progressInt, isPaused, forceUpdate)
            }
            ACTION_STOP -> {
                DownloadLogger.diagnostic("SERVICE", "Stopping foreground service and cancelling notification")
                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.cancel(NOTIFICATION_ID)
                stopForeground(true)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    /**
     * Throttles and safely updates the foreground notification with current progress,
     * subtext, and cached local artwork (if available).
     */
    private fun updateNotification(title: String, content: String, subtext: String?, artworkUri: String?, maxInt: Int, progressInt: Int, isPaused: Boolean, force: Boolean = false) {
        val now = System.currentTimeMillis()
        if (!force && now - lastUpdateTime < 1000) {
            return // Throttle to 1 second
        }
        lastUpdateTime = now

        var bitmap: Bitmap? = null
        if (!artworkUri.isNullOrEmpty() && artworkUri.startsWith("file://")) {
            try {
                // Quickly load local cached image. No blocking HTTP calls.
                val stream = contentResolver.openInputStream(Uri.parse(artworkUri))
                bitmap = BitmapFactory.decodeStream(stream)
            } catch (e: Exception) {
                Log.e("DownloadService", "Failed to load local artwork", e)
            }
        }

        showNotification(title, content, subtext, maxInt, progressInt, isPaused, bitmap)
    }

    /**
     * Builds and displays the ongoing notification using NotificationCompat.
     * Attaches PendingIntents to notification action buttons for Pause/Resume/Cancel.
     */
    private fun showNotification(title: String, content: String, subtext: String?, maxInt: Int, progressInt: Int, isPaused: Boolean, bitmap: Bitmap?) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Pass current state into Intents so they can instantly update the UI optimistically
        val baseIntent = Intent(this, DownloadService::class.java).apply {
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_PROGRESS, content)
            putExtra(EXTRA_MAX_INT, maxInt)
            putExtra(EXTRA_PROGRESS_INT, progressInt)
        }

        val cancelIntent = Intent(baseIntent).setAction(ACTION_BTN_CANCEL)
        val cancelPendingIntent = PendingIntent.getService(this, 0, cancelIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val pauseIntent = Intent(baseIntent).setAction(ACTION_BTN_PAUSE)
        val pausePendingIntent = PendingIntent.getService(this, 1, pauseIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val resumeIntent = Intent(baseIntent).setAction(ACTION_BTN_RESUME)
        val resumePendingIntent = PendingIntent.getService(this, 2, resumeIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        
        builder
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setOngoing(true)
            
        if (!subtext.isNullOrEmpty()) {
            builder.setSubText(subtext)
        }
            
        if (maxInt > 0) {
            builder.setProgress(maxInt, progressInt, false)
        } else {
            builder.setProgress(0, 0, true)
        }

        if (isPaused) {
            builder.addAction(android.R.drawable.ic_media_play, "Resume", resumePendingIntent)
        } else {
            builder.addAction(android.R.drawable.ic_media_pause, "Pause", pausePendingIntent)
        }
        builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Cancel", cancelPendingIntent)

        bitmap?.let {
            builder.setLargeIcon(it)
        }

        val notification = builder.build()
        if (title == "Downloading..." && content == "Starting download...") {
            startForeground(NOTIFICATION_ID, notification)
        } else {
            manager.notify(NOTIFICATION_ID, notification)
        }
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "HyperMusic::DownloadWakeLock")
        wakeLock?.acquire(10 * 60 * 1000L)
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
            }
        }
        wakeLock = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Downloads",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        releaseWakeLock()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
