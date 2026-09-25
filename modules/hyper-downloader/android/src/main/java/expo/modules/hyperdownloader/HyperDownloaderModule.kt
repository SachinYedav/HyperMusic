package expo.modules.hyperdownloader

import android.content.Context
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.hyperdownloader.core.DownloadManager
import expo.modules.hyperdownloader.core.DownloadEventListener
import expo.modules.hyperdownloader.models.DownloadTask
import expo.modules.hyperdownloader.models.DownloadState
import android.content.Intent

/**
 * Expo Module managing asynchronous background downloads using a Native-First Architecture.
 * This class acts strictly as a high-speed JSI Bridge. All heavy downloading, networking, 
 * and state management is delegated to [DownloadManager].
 */
class HyperDownloaderModule : Module(), DownloadEventListener {
    private val tag = "HyperDownloaderModule"

    override fun definition() = ModuleDefinition {
        Name("HyperDownloader")

        Events(
            "onDownloadProgress",
            "onDownloadStateChanged",
            "onDownloadAction"
        )
        
        OnCreate {
            appContext.reactContext?.let { ctx ->
                DownloadManager.initialize(ctx, this@HyperDownloaderModule)
            }
        }

        // Accept an array of track dictionaries to orchestrate the entire batch natively
        AsyncFunction("queueBatch") { tracks: List<Map<String, Any?>> ->
            val tasks = tracks.map { track ->
                DownloadTask(
                    id = track["id"] as String,
                    url = track["url"] as? String,
                    title = track["title"] as? String ?: "Unknown Track",
                    fileName = track["fileName"] as String,
                    trackType = track["trackType"] as? String ?: "audio",
                    artworkUrl = track["artworkUrl"] as? String,
                    artworkUri = track["localArtworkUri"] as? String,
                    quality = track["quality"] as? String ?: "high"
                )
            }
            DownloadManager.queueBatch(tasks)
        }



        Function("pauseDownload") { id: String ->
            DownloadManager.pauseDownload(id)
        }

        Function("resumeDownload") { id: String, newUrl: String? ->
            DownloadManager.resumeDownload(id, newUrl)
        }

        Function("cancelDownload") { id: String ->
            DownloadManager.cancelDownload(id)
        }
        
        AsyncFunction("pauseBatch") {
            DownloadManager.pauseBatch()
        }
        
        AsyncFunction("resumeBatch") {
            DownloadManager.resumeBatch()
        }
        
        AsyncFunction("cancelBatch") {
            DownloadManager.cancelBatch()
        }
        
        Function("getAndClearCompletedDownloads") {
            return@Function DownloadManager.getAndClearCompletedDownloads()
        }

        Function("setWifiOnly") { enabled: Boolean ->
            DownloadManager.isWifiOnlyEnabled = enabled
        }
    }

    override fun onProgress(id: String, bytesWritten: Long, totalBytes: Long) {
        this@HyperDownloaderModule.sendEvent("onDownloadProgress", mapOf(
            "id" to id,
            "bytesWritten" to bytesWritten,
            "totalBytes" to totalBytes
        ))
    }

    override fun onStateChanged(task: DownloadTask) {
        val map = mutableMapOf<String, Any>(
            "id" to task.id,
            "state" to task.state.name
        )
        task.error?.let { map["error"] = it }
        task.finalUri?.let { map["finalUri"] = it }
        task.artworkUri?.let { map["artworkUri"] = it }
        this@HyperDownloaderModule.sendEvent("onDownloadStateChanged", map)
    }

    override fun onAction(action: String) {
        this@HyperDownloaderModule.sendEvent("onDownloadAction", mapOf("action" to action))
    }
}
