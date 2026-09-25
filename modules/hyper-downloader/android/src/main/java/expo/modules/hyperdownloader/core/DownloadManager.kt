package expo.modules.hyperdownloader.core

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build

import com.margelo.nitro.hyperextractor.engine.YouTubeMusicEngine
import expo.modules.hyperdownloader.DownloadService
import expo.modules.hyperdownloader.models.DownloadState
import expo.modules.hyperdownloader.models.DownloadTask
import kotlinx.coroutines.*
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.TimeUnit

interface DownloadEventListener {
    fun onProgress(id: String, bytesWritten: Long, totalBytes: Long)
    fun onStateChanged(task: DownloadTask)
    fun onAction(action: String)
}

/**
 * Singleton engine managing all asynchronous background downloads using OkHttp and Kotlin Coroutines.
 * Implements strict concurrency throttling and acts as the Single Source of Truth for the JSI Bridge
 * and the Native Notification Service.
 */
object DownloadManager {
    private const val TAG = "DownloadManager"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // True Headless Queue Management
    private val pendingQueue = ConcurrentLinkedQueue<DownloadTask>()
    private val tasks = ConcurrentHashMap<String, DownloadTask>()
    private val activeJobs = ConcurrentHashMap<String, Job>()
    private val activeCalls = ConcurrentHashMap<String, okhttp3.Call>()
    
    @Volatile var isWifiOnlyEnabled: Boolean = false
    
    private const val MAX_CONCURRENT_DOWNLOADS = 2

    private var listener: DownloadEventListener? = null
    private var appContext: Context? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    
    var isBatchPaused = false
        private set

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

    /**
     * Initializes the manager with the Android Application Context and an event listener for JS updates.
     */
    fun initialize(context: Context, eventListener: DownloadEventListener) {
        appContext = context.applicationContext
        listener = eventListener
        setupNetworkListener()
    }
    
    /**
     * Returns a list of track IDs that completed while JS was asleep/backgrounded, 
     * then clears the list so they aren't processed again.
     */
    fun getAndClearCompletedDownloads(): List<String> {
        val prefs = appContext?.getSharedPreferences("HyperDownloaderPrefs", Context.MODE_PRIVATE) ?: return emptyList()
        val completedSet = prefs.getStringSet("completed_ids", emptySet()) ?: emptySet()
        val list = completedSet.toList()
        prefs.edit().remove("completed_ids").apply()
        return list
    }
    
    private fun setupNetworkListener() {
        val cm = appContext?.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
        if (networkCallback != null) return
        
        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                // Auto-resume if not explicitly paused and constraints are met
                if (!isBatchPaused) {
                    val caps = cm.getNetworkCapabilities(network)
                    val isWifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
                    if (isWifiOnlyEnabled && !isWifi) {
                        return // Still waiting for Wi-Fi
                    }
                    DownloadLogger.d("Network Available. Auto-Resuming downloads...")
                    resumeBatch()
                }
            }
            override fun onLost(network: Network) {
                DownloadLogger.d("Network Lost. Pausing active downloads gracefully...")
                val activeNetwork = cm.activeNetwork
                val caps = cm.getNetworkCapabilities(activeNetwork)
                val isWifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
                
                if (isWifiOnlyEnabled && !isWifi) {
                    // Dropped to cellular and user wants Wi-Fi only
                    pauseBatch()
                } else if (activeNetwork == null) {
                    // Completely offline
                    pauseBatch()
                }
            }
        }
        val request = NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build()
        cm.registerNetworkCallback(request, networkCallback!!)
    }
    
    /**
     * Retrieves a task by its ID if it exists in the active state map.
     */
    fun getTask(id: String): DownloadTask? = tasks[id]

    /**
     * Queues a batch of downloads directly into Native Kotlin.
     */
    fun queueBatch(newTasks: List<DownloadTask>) {
        DownloadLogger.diagnostic("BATCH", "Queueing batch of ${newTasks.size} tracks. Current active: ${activeJobs.size}, Current pending: ${pendingQueue.size}")
        for (task in newTasks) {
            if (!tasks.containsKey(task.id) && !activeJobs.containsKey(task.id)) {
                task.state = DownloadState.QUEUED
                tasks[task.id] = task
                val targetFile = getTargetFile(task.fileName)
                val tempFile = File(targetFile.absolutePath + ".tmp")
                if (targetFile.exists()) {
                    task.bytesWritten = targetFile.length()
                } else if (tempFile.exists()) {
                    task.bytesWritten = tempFile.length()
                }
                pendingQueue.add(task)
                listener?.onStateChanged(task)
                DownloadLogger.d("Queued task: ${task.id} (${task.trackType})")
            } else {
                DownloadLogger.w("Skipped queueing ${task.id} because it already exists")
            }
        }
        updateNativeNotification()
        processNextInQueue()
    }

    /**
     * Pauses a specific active or queued download task gracefully without deleting temp files.
     */
    fun pauseDownload(id: String) {
        val task = tasks[id] ?: return
        if (task.state == DownloadState.DOWNLOADING || task.state == DownloadState.QUEUED) {
            task.state = DownloadState.PAUSED
            activeCalls[id]?.cancel()
            activeJobs[id]?.cancel()
            activeCalls.remove(id)
            activeJobs.remove(id)
            listener?.onStateChanged(task)
        }
    }

    /**
     * Resumes a paused or failed task. Optionally accepts a new URL to handle URL expiries (HTTP 403).
     */
    fun resumeDownload(id: String, newUrl: String?) {
        val task = tasks[id] ?: return
        if (newUrl != null) {
            task.url = newUrl
        }
        if (task.state == DownloadState.PAUSED || task.state == DownloadState.FAILED) {
            task.state = DownloadState.QUEUED
            task.error = null
            pendingQueue.add(task)
            listener?.onStateChanged(task)
            processNextInQueue()
        }
    }

    /**
     * Cancels a specific task completely and purges any associated temporary files.
     */
    fun cancelDownload(id: String) {
        val task = tasks[id] ?: return
        task.state = DownloadState.FAILED
        task.error = "Cancelled by user"
        pendingQueue.remove(task)
        activeCalls[id]?.cancel()
        activeJobs[id]?.cancel()
        activeCalls.remove(id)
        activeJobs.remove(id)
        tasks.remove(id)

        val targetFile = getTargetFile(task.fileName)
        val tempFile = File(targetFile.absolutePath + ".tmp")
        if (targetFile.exists()) {
            targetFile.delete()
        }
        if (tempFile.exists()) {
            val deleted = tempFile.delete()
            DownloadLogger.d("Deleted temp file for ${task.id} (success: $deleted)")
        }
        listener?.onStateChanged(task)
        DownloadLogger.diagnostic("CANCEL", "Cancelled download for ${task.id}")
        
        processNextInQueue()
        checkAndStopServiceIfEmpty()
    }
    
    /**
     * Pauses all active and queued jobs. Called from the Notification Tray 'Pause Batch' button.
     */
    fun pauseBatch() {
        isBatchPaused = true
        for ((id, task) in tasks) {
            if (task.state == DownloadState.DOWNLOADING || task.state == DownloadState.QUEUED) {
                task.state = DownloadState.PAUSED
                activeCalls[id]?.cancel()
                activeJobs[id]?.cancel()
                activeCalls.remove(id)
                activeJobs.remove(id)
            }
        }
        listener?.onAction("pauseBatch")
    }
    
    /**
     * Resumes all paused jobs. Called from the Notification Tray 'Resume Batch' button.
     */
    fun resumeBatch() {
        isBatchPaused = false
        // Re-queue paused tasks that are not running
        for ((_, task) in tasks) {
            if (task.state == DownloadState.PAUSED && !pendingQueue.contains(task) && !activeJobs.containsKey(task.id)) {
                task.state = DownloadState.QUEUED
                pendingQueue.add(task)
            }
        }
        listener?.onAction("resumeBatch")
        processNextInQueue()
    }
    
    /**
     * Cancels all jobs. Called from the Notification Tray 'Cancel Batch' button.
     */
    fun cancelBatch() {
        DownloadLogger.diagnostic("BATCH", "Canceling batch. Pending before clear: ${pendingQueue.size}")
        pendingQueue.clear()
        val activeIds = tasks.keys.toList()
        for (id in activeIds) {
            val task = tasks[id] ?: continue
            task.state = DownloadState.FAILED
            task.error = "Cancelled by user"
            activeCalls[id]?.cancel()
            activeJobs[id]?.cancel()
            activeCalls.remove(id)
            activeJobs.remove(id)
            
            val targetFile = getTargetFile(task.fileName)
            val tempFile = File(targetFile.absolutePath + ".tmp")
            if (targetFile.exists()) targetFile.delete()
            if (tempFile.exists()) tempFile.delete()
        }
        tasks.clear()
        listener?.onAction("cancelBatch")
        checkAndStopServiceIfEmpty()
    }

    /**
     * Helper to retrieve the target storage file instance for a given file name.
     */
    private fun getTargetFile(fileName: String): File {
        val ctx = appContext ?: throw Exception("DownloadManager not initialized with Context")
        val downloadDir = File(ctx.filesDir, "HyperDownloads")
        if (!downloadDir.exists()) {
            downloadDir.mkdirs()
        }
        return File(downloadDir, fileName)
    }

    /**
     * Internal Conductor: Starts tasks from the pending queue up to the concurrency limit.
     */
    private fun processNextInQueue() {
        if (isBatchPaused) return

        synchronized(this) {
            while (activeJobs.size < MAX_CONCURRENT_DOWNLOADS) {
                val task = pendingQueue.poll() ?: break
                
                val job = scope.launch {
                    try {
                        executeDownload(task)
                    } catch (e: CancellationException) {
                        // Task cleanly cancelled via Coroutine Job
                    } catch (e: java.io.IOException) {
                        if (task.state == DownloadState.DOWNLOADING) {
                            DownloadLogger.w("Network drop or connection reset for ${task.id}, auto-pausing. (${e.message})")
                            task.state = DownloadState.PAUSED
                            listener?.onStateChanged(task)
                        }
                    } catch (e: Exception) {
                        if (task.state == DownloadState.DOWNLOADING) {
                            DownloadLogger.e("Download error for ${task.id}", e)
                            task.state = DownloadState.FAILED
                            task.error = e.message ?: "Unknown error"
                            listener?.onStateChanged(task)
                        }
                    } finally {
                        activeJobs.remove(task.id)
                        activeCalls.remove(task.id)
                        if (task.state == DownloadState.FAILED) {
                            tasks.remove(task.id)
                        }
                        DownloadLogger.d("Finished coroutine for ${task.id}, state is ${task.state}")
                        processNextInQueue() // Pull next upon completion/failure/pause
                    }
                }
                activeJobs[task.id] = job
            }
        }
        
        checkAndStopServiceIfEmpty()
    }

    /**
     * Executes the actual download process in the IO dispatcher.
     * Extracts the streaming URL if missing, establishes HTTP connection,
     * writes to a temporary file, and renames it upon successful completion.
     */
    private suspend fun executeDownload(task: DownloadTask) = withContext(Dispatchers.IO) {
        task.state = DownloadState.DOWNLOADING
        listener?.onStateChanged(task)

        val targetFile = getTargetFile(task.fileName)
        val tempFile = File(targetFile.absolutePath + ".tmp")
        
        DownloadLogger.diagnostic("EXECUTE", "Starting execution for ${task.id}. TrackType: ${task.trackType}, Target: ${targetFile.name}")

        // Native JIT Extraction if URL is missing
        if (task.url.isNullOrEmpty()) {
            try {
                DownloadLogger.diagnostic("EXTRACT", "No URL provided for ${task.id}, extracting via YouTubeMusicEngine natively. Quality: ${task.quality}")
                val downloadUrl = YouTubeMusicEngine.getStreamUrl(task.id, task.quality, task.trackType ?: "audio")
                task.url = downloadUrl
                DownloadLogger.d("Native extraction successful for ${task.id}")
            } catch (e: Exception) {
                DownloadLogger.e("Native extraction failed for ${task.id}", e)
                throw Exception("Extraction Failed: ${e.message}")
            }
        }

        if (task.url.isNullOrEmpty()) throw Exception("URL is empty after extraction")
        
        // If final file already exists and no tmp file, we might already be 100% complete
        if (targetFile.exists() && !tempFile.exists()) {
            task.bytesWritten = targetFile.length()
            task.totalBytes = targetFile.length()
            // Assume completed
            markTaskCompleted(task, targetFile)
            return@withContext
        }

        val downloadedBytes = if (tempFile.exists()) tempFile.length() else 0L
        task.bytesWritten = downloadedBytes

        val requestBuilder = Request.Builder()
            .url(task.url!!)
            .header("Range", "bytes=${downloadedBytes}-")

        val call = okHttpClient.newCall(requestBuilder.build())
        activeCalls[task.id] = call
        val response = call.execute()

        if (!response.isSuccessful) {
            if (response.code == 403) {
                throw Exception("HTTP_403") // Explicitly triggers JS auto-recovery loop
            } else if (response.code == 416) {
                // 416 means Range Not Satisfiable. If we have a temp file with bytes, 
                // it likely means it's 100% downloaded and we asked for bytes past the end.
                if (tempFile.exists() && tempFile.length() > 0) {
                    val success = tempFile.renameTo(targetFile)
                    if (success) {
                        DownloadLogger.diagnostic("FILE", "Successfully renamed temp file to target file for ${task.id}. Size: ${targetFile.length()} bytes")
                        markTaskCompleted(task, targetFile)
                    } else {
                        DownloadLogger.e("Failed to rename temp file for ${task.id}")
                        throw Exception("Failed to rename temporary file")
                    }
                    return@withContext
                } else if (targetFile.exists()) {
                    task.bytesWritten = targetFile.length()
                    task.totalBytes = targetFile.length()
                    markTaskCompleted(task, targetFile)
                    return@withContext
                }
                
                tempFile.delete()
                throw Exception("HTTP_416: Invalid range, could not recover.")
            }
            throw Exception("HTTP ${response.code}: ${response.message}")
        }

        val contentType = response.header("Content-Type", "") ?: ""
        if (contentType.contains("text/html") || contentType.contains("text/plain")) {
            tempFile.delete()
            throw Exception("HTTP_403")
        }

        val body = response.body ?: throw Exception("Empty response body")
        val append = downloadedBytes > 0 && response.code == 206
        if (!append && downloadedBytes > 0) {
            tempFile.delete()
            task.bytesWritten = 0
        }

        val contentLength = body.contentLength()
        if (contentLength > 0) {
            task.totalBytes = if (append) downloadedBytes + contentLength else contentLength
        }

        var lastEmitTime = 0L
        body.byteStream().use { input ->
            FileOutputStream(tempFile, append).use { output ->
                val buffer = ByteArray(8192)
                var bytesRead: Int = 0
                while (isActive && input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                    task.bytesWritten += bytesRead

                    val now = System.currentTimeMillis()
                    if (now - lastEmitTime > 1000) {
                        lastEmitTime = now
                        listener?.onProgress(task.id, task.bytesWritten, task.totalBytes)
                        updateNativeNotification()
                    }
                }
            }
        }

        if (!isActive) {
            throw CancellationException("Download cancelled or paused")
        }
        
        // Fully downloaded, atomically rename tmp to final file
        if (tempFile.exists()) {
            if (targetFile.exists()) {
                targetFile.delete()
            }
            val success = tempFile.renameTo(targetFile)
            if (!success) {
                tempFile.copyTo(targetFile, overwrite = true)
                tempFile.delete()
            }
        }

        // Parallel Artwork Download using native client if not provided locally
        if (!task.artworkUrl.isNullOrEmpty() && task.artworkUri.isNullOrEmpty()) {
            try {
                val artFile = getTargetFile(task.fileName.substringBeforeLast(".") + "_art.jpg")
                if (!artFile.exists()) {
                    val artRequest = Request.Builder().url(task.artworkUrl).build()
                    val artResponse = okHttpClient.newCall(artRequest).execute()
                    if (artResponse.isSuccessful) {
                        artResponse.body?.byteStream()?.use { input ->
                            FileOutputStream(artFile).use { output ->
                                input.copyTo(output)
                            }
                        }
                        task.artworkUri = artFile.toURI().toString()
                    }
                } else {
                    task.artworkUri = artFile.toURI().toString()
                }
            } catch (e: Exception) {
                DownloadLogger.e("Failed to download artwork for ${task.id}", e)
            }
        }

        markTaskCompleted(task, targetFile)
    }
    
    private fun markTaskCompleted(task: DownloadTask, targetFile: File) {
        task.state = DownloadState.COMPLETED
        task.finalUri = targetFile.toURI().toString()
        
        // Persist to SharedPreferences so JS can reconcile if it was asleep
        appContext?.let { ctx ->
            val prefs = ctx.getSharedPreferences("HyperDownloaderPrefs", Context.MODE_PRIVATE)
            val completedSet = prefs.getStringSet("completed_ids", emptySet())?.toMutableSet() ?: mutableSetOf()
            completedSet.add(task.id)
            prefs.edit().putStringSet("completed_ids", completedSet).apply()
        }
        
        listener?.onStateChanged(task)
    }
    
    private fun checkAndStopServiceIfEmpty() {
        val hasPending = pendingQueue.isNotEmpty() || activeJobs.isNotEmpty()
        if (!hasPending) {
            appContext?.let { ctx ->
                val stopIntent = Intent(ctx, DownloadService::class.java).apply {
                    action = DownloadService.ACTION_STOP
                }
                ctx.startService(stopIntent)
            }
        } else {
            updateNativeNotification()
        }
    }

    /**
     * Automatically updates the native notification to reflect true headless progress.
     */
    private fun updateNativeNotification() {
        if (appContext == null) return
        
        val activeTasks = tasks.values.filter { it.state == DownloadState.DOWNLOADING }
        val firstActive = activeTasks.firstOrNull() ?: pendingQueue.peek()
        val totalCount = pendingQueue.size + activeJobs.size
        
        if (firstActive != null) {
            var percent = 0
            if (firstActive.totalBytes > 0) {
                percent = ((firstActive.bytesWritten.toDouble() / firstActive.totalBytes.toDouble()) * 100).toInt()
            }
            
            val title = firstActive.title
            val progressText = "${percent}%"
            val subtext = if (totalCount > 1) "Downloading $totalCount remaining tracks..." else null
            
            val intent = Intent(appContext, DownloadService::class.java).apply {
                action = DownloadService.ACTION_UPDATE
                putExtra(DownloadService.EXTRA_TITLE, title)
                putExtra(DownloadService.EXTRA_PROGRESS, progressText)
                if (subtext != null) putExtra(DownloadService.EXTRA_SUBTEXT, subtext)
                putExtra(DownloadService.EXTRA_ARTWORK, firstActive.artworkUri ?: firstActive.artworkUrl)
                putExtra(DownloadService.EXTRA_MAX_INT, 100)
                putExtra(DownloadService.EXTRA_PROGRESS_INT, percent)
                putExtra(DownloadService.EXTRA_IS_PAUSED, isBatchPaused)
            }
            appContext?.startService(intent)
        }
    }
}
