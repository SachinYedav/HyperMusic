package expo.modules.hyperdownloader

import android.content.Context
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Semaphore
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Represents the lifecycle state of a background download task.
 */
enum class DownloadState {
    QUEUED, DOWNLOADING, PAUSED, COMPLETED, FAILED
}

/**
 * Encapsulates metadata and ongoing execution progress for a single download task.
 */
data class DownloadTask(
    val id: String,
    var url: String,
    val title: String,
    val fileName: String,
    var state: DownloadState = DownloadState.QUEUED,
    var bytesWritten: Long = 0,
    var totalBytes: Long = 0,
    var error: String? = null,
    var finalUri: String? = null
)

/**
 * Expo Module managing asynchronous background downloads using OkHttp and Kotlin Coroutines.
 * Implements strict concurrency throttling and custom HTTP interceptors for robust CDN transfer.
 */
class HyperDownloaderModule : Module() {
    private val tag = "HyperDownloaderModule"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val semaphore = Semaphore(2) // Strictly limits active concurrent downloads to 2

    private val tasks = ConcurrentHashMap<String, DownloadTask>()
    private val activeJobs = ConcurrentHashMap<String, Job>()

    /**
     * OkHttpClient configured with a NetworkInterceptor to preserve essential headers across HTTP 301/302 redirects.
     */
    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addNetworkInterceptor(Interceptor { chain ->
                val originalRequest = chain.request()
                val requestBuilder = originalRequest.newBuilder()
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                    .header("Referer", "https://www.youtube.com/")
                    .header("Origin", "https://www.youtube.com")
                    .header("Connection", "keep-alive")
                    .header("Accept", "*/*")
                chain.proceed(requestBuilder.build())
            })
            .build()
    }

    override fun definition() = ModuleDefinition {
        Name("HyperDownloader")

        Events(
            "onDownloadProgress",
            "onDownloadStateChanged"
        )

        Function("startDownload") { id: String, url: String, title: String, fileName: String ->
            if (tasks.containsKey(id)) {
                val existingTask = tasks[id]!!
                if (existingTask.state == DownloadState.DOWNLOADING || existingTask.state == DownloadState.QUEUED) return@Function
            }

            val task = DownloadTask(id, url, title, fileName)
            tasks[id] = task

            val targetFile = getTargetFile(fileName)
            if (targetFile.exists()) {
                task.bytesWritten = targetFile.length()
            }

            queueTask(task)
        }

        Function("pauseDownload") { id: String ->
            val task = tasks[id] ?: return@Function
            if (task.state == DownloadState.DOWNLOADING || task.state == DownloadState.QUEUED) {
                task.state = DownloadState.PAUSED
                activeJobs[id]?.cancel()
                activeJobs.remove(id)
                emitStateChanged(task)
            }
        }

        Function("resumeDownload") { id: String, newUrl: String? ->
            val task = tasks[id] ?: return@Function
            if (newUrl != null) {
                task.url = newUrl
            }
            if (task.state == DownloadState.PAUSED || task.state == DownloadState.FAILED) {
                task.state = DownloadState.QUEUED
                task.error = null
                queueTask(task)
            }
        }

        Function("cancelDownload") { id: String ->
            val task = tasks[id] ?: return@Function
            task.state = DownloadState.FAILED
            task.error = "Cancelled by user"
            activeJobs[id]?.cancel()
            activeJobs.remove(id)
            tasks.remove(id)

            val targetFile = getTargetFile(task.fileName)
            if (targetFile.exists()) {
                targetFile.delete()
            }
        }
    }

    /**
     * Resolves the target destination file inside the dedicated HyperDownloads application storage directory.
     */
    private fun getTargetFile(fileName: String): File {
        val ctx = appContext.reactContext ?: throw Exception("Context not initialized")
        val downloadDir = File(ctx.filesDir, "HyperDownloads")
        if (!downloadDir.exists()) {
            downloadDir.mkdirs()
        }
        return File(downloadDir, fileName)
    }

    /**
     * Queues a download task within the bounded coroutine scope governed by the concurrency semaphore.
     */
    private fun queueTask(task: DownloadTask) {
        task.state = DownloadState.QUEUED
        emitStateChanged(task)

        val job = scope.launch {
            semaphore.acquire()
            if (task.state != DownloadState.QUEUED) {
                semaphore.release()
                return@launch
            }
            try {
                executeDownload(task)
            } catch (e: CancellationException) {
                // Task cleanly cancelled or paused during execution
            } catch (e: Exception) {
                Log.e(tag, "Download error for ${task.id}", e)
                task.state = DownloadState.FAILED
                task.error = e.message ?: "Unknown error"
                emitStateChanged(task)
            } finally {
                semaphore.release()
            }
        }
        activeJobs[task.id] = job
    }

    /**
     * Performs the underlying network transfer using HTTP Range headers, supporting file appending and resumption.
     */
    private suspend fun executeDownload(task: DownloadTask) = withContext(Dispatchers.IO) {
        task.state = DownloadState.DOWNLOADING
        emitStateChanged(task)

        val targetFile = getTargetFile(task.fileName)
        val downloadedBytes = if (targetFile.exists()) targetFile.length() else 0L
        task.bytesWritten = downloadedBytes

        val requestBuilder = Request.Builder()
            .url(task.url)
            .header("Range", "bytes=${downloadedBytes}-")

        val response = okHttpClient.newCall(requestBuilder.build()).execute()

        if (!response.isSuccessful) {
            if (response.code == 403) {
                throw Exception("HTTP_403") // Explicitly triggers JS auto-recovery loop
            } else if (response.code == 416) {
                targetFile.delete()
                throw Exception("HTTP_416: Invalid range, please resume again to restart.")
            }
            throw Exception("HTTP ${response.code}: ${response.message}")
        }

        val contentType = response.header("Content-Type", "") ?: ""
        if (contentType.contains("text/html") || contentType.contains("text/plain")) {
            // Re-route empty consent/error pages returning HTTP 200 to HTTP_403 recovery flow
            targetFile.delete()
            throw Exception("HTTP_403")
        }

        val body = response.body ?: throw Exception("Empty response body")
        val append = downloadedBytes > 0 && response.code == 206
        if (!append && downloadedBytes > 0) {
            targetFile.delete()
            task.bytesWritten = 0
        }

        val contentLength = body.contentLength()
        if (contentLength > 0) {
            task.totalBytes = if (append) downloadedBytes + contentLength else contentLength
        }

        var lastEmitTime = 0L
        body.byteStream().use { input ->
            FileOutputStream(targetFile, append).use { output ->
                val buffer = ByteArray(8192)
                var bytesRead: Int = 0
                while (isActive && input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                    task.bytesWritten += bytesRead

                    val now = System.currentTimeMillis()
                    if (now - lastEmitTime > 1000) {
                        lastEmitTime = now
                        emitProgress(task.id, task.bytesWritten, task.totalBytes)
                    }
                }
            }
        }

        if (!isActive) {
            throw CancellationException("Download cancelled or paused")
        }

        task.state = DownloadState.COMPLETED
        task.finalUri = targetFile.toURI().toString()
        emitStateChanged(task)
        activeJobs.remove(task.id)
        tasks.remove(task.id)
    }

    /**
     * Emits throttled progress updates to the JavaScript runtime bridge.
     */
    private fun emitProgress(id: String, bytesWritten: Long, totalBytes: Long) {
        this@HyperDownloaderModule.sendEvent("onDownloadProgress", mapOf(
            "id" to id,
            "bytesWritten" to bytesWritten,
            "totalBytes" to totalBytes
        ))
    }

    /**
     * Emits lifecycle state transitions to the JavaScript runtime bridge.
     */
    private fun emitStateChanged(task: DownloadTask) {
        val map = mutableMapOf<String, Any>(
            "id" to task.id,
            "state" to task.state.name
        )
        task.error?.let { map["error"] = it }
        task.finalUri?.let { map["finalUri"] = it }
        this@HyperDownloaderModule.sendEvent("onDownloadStateChanged", map)
    }
}
