package expo.modules.hyperdownloader.models

/**
 * Represents the lifecycle state of a background download task.
 */
enum class DownloadState {
    QUEUED,
    DOWNLOADING,
    PAUSED,
    COMPLETED,
    FAILED
}

/**
 * Encapsulates metadata and ongoing execution progress for a single download task.
 * 
 * @property id Unique identifier for the download task (e.g., trackId).
 * @property url The remote HTTP URL to download from (can be null if JIT extraction is needed).
 * @property title The human-readable title of the media (used in notifications).
 * @property fileName The target filename on the local device storage.
 * @property trackType The type of track (e.g., 'song', 'video', 'podcast') for extraction logic.
 * @property state The current lifecycle state of the download.
 * @property bytesWritten Number of bytes successfully downloaded and saved.
 * @property totalBytes Total size of the file in bytes (if known).
 * @property error Error message if the download failed.
 * @property finalUri The absolute local `file://` URI after successful completion.
 * @property artworkUrl Optional remote URL for the artwork (used for downloading the art).
 * @property artworkUri Optional local `file://` URI of the downloaded/cached artwork.
 * @property quality The audio quality requested (e.g., 'data_saver', 'normal', 'high', 'lossless').
 */
data class DownloadTask(
    val id: String,
    var url: String?,
    val title: String,
    val fileName: String,
    val trackType: String? = "song",
    var state: DownloadState = DownloadState.QUEUED,
    var bytesWritten: Long = 0,
    var totalBytes: Long = 0,
    var error: String? = null,
    var finalUri: String? = null,
    val artworkUrl: String? = null,
    var artworkUri: String? = null,
    val quality: String = "high"
)
