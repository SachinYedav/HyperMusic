package com.margelo.nitro.hyperplayer.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.LruCache
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlin.math.max

enum class WidgetArtworkCrop {
    CIRCLE,
    ROUNDED_CROP,
    BLURRED_ROUNDED_CROP,
}

data class WidgetArtworkRequest(
    val sourceUri: String,
    val cacheKey: String?,
    val widthPx: Int,
    val heightPx: Int,
    val crop: WidgetArtworkCrop,
) {
    init {
        require(widthPx > 0) { "Widget artwork width must be positive." }
        require(heightPx > 0) { "Widget artwork height must be positive." }
        require(widthPx <= MAX_ARTWORK_DIMENSION_PX && heightPx <= MAX_ARTWORK_DIMENSION_PX) {
            "Widget artwork dimensions exceed the bounded rendering limit."
        }
    }

    private companion object {
        const val MAX_ARTWORK_DIMENSION_PX = 2_048
    }
}

/**
 * Bounded artwork cache for widget rendering. It never runs on the main thread
 * and stores only size-specific transformed images, not source-size bitmaps.
 */
object WidgetArtworkPipeline {
    private const val MEMORY_CACHE_BYTES = 12 * 1024 * 1024
    private const val CONNECT_TIMEOUT_MS = 8_000
    private const val READ_TIMEOUT_MS = 12_000
    private const val CACHE_DIRECTORY = "hyper_player_widget_artwork"

    private val memoryCache = object : LruCache<String, Bitmap>(MEMORY_CACHE_BYTES) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.allocationByteCount
    }


    suspend fun load(context: Context, request: WidgetArtworkRequest): Bitmap? {
        return withContext(Dispatchers.IO) {
            val key = cacheKeyFor(request)
            memoryCache.get(key)?.let { return@withContext it }

            val diskFile = File(cacheDirectory(context), "$key.webp")
            decodeBounded(diskFile, request.widthPx, request.heightPx)?.let { cached ->
                memoryCache.put(key, cached)
                return@withContext cached
            }

            val decoded = decodeSource(context, request.sourceUri, request.widthPx, request.heightPx)
                ?: return@withContext null
            val transformed = transform(context, decoded, request)
            if (transformed !== decoded && !decoded.isRecycled) decoded.recycle()

            writeToDisk(diskFile, transformed)
            memoryCache.put(key, transformed)
            transformed
        }
    }

    private fun cacheDirectory(context: Context): File {
        return File(context.applicationContext.cacheDir, CACHE_DIRECTORY).apply { mkdirs() }
    }

    private fun cacheKeyFor(request: WidgetArtworkRequest): String {
        val stableKey = request.cacheKey ?: request.sourceUri
        return sha256("v1|$stableKey|${request.sourceUri}|${request.crop}|300x300")
    }

    private fun sha256(value: String): String {
        return MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }

    private fun decodeSource(context: Context, source: String, width: Int, height: Int): Bitmap? {
        return when {
            source.startsWith("http://") || source.startsWith("https://") -> decodeHttp(source, width, height)
            source.startsWith("content://") -> decodeContentUri(context, Uri.parse(source), width, height)
            source.startsWith("file://") -> decodeBounded(File(Uri.parse(source).path ?: return null), width, height)
            else -> decodeBounded(File(source), width, height)
        }
    }

    private fun decodeContentUri(context: Context, uri: Uri, width: Int, height: Int): Bitmap? {
        return try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
                ?: return null
            if (!bounds.hasImageBounds()) return null

            val options = decodeOptions(bounds, width, height)
            context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, options)
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun decodeHttp(source: String, width: Int, height: Int): Bitmap? {
        val bytes = try {
            openHttpStream(source)?.use { it.readBytes() }
        } catch (_: Exception) {
            null
        } ?: return null

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (!bounds.hasImageBounds()) return null

        val options = decodeOptions(bounds, width, height)
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
    }

    private fun openHttpStream(source: String): HttpInputStream? {
        var connection: HttpURLConnection? = null
        return try {
            val activeConnection = (URL(source).openConnection() as? HttpURLConnection) ?: return null
            connection = activeConnection
            activeConnection.connectTimeout = CONNECT_TIMEOUT_MS
            activeConnection.readTimeout = READ_TIMEOUT_MS
            activeConnection.instanceFollowRedirects = true
            activeConnection.doInput = true
            activeConnection.setRequestProperty("User-Agent", "Mozilla/5.0")
            activeConnection.connect()
            if (activeConnection.responseCode !in 200..299) {
                activeConnection.disconnect()
                null
            } else {
                HttpInputStream(activeConnection)
            }
        } catch (_: Exception) {
            connection?.disconnect()
            null
        }
    }

    private fun decodeBounded(file: File, width: Int, height: Int): Bitmap? {
        return try {
            if (!file.exists() || !file.isFile) return null
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            FileInputStream(file).use { BitmapFactory.decodeStream(it, null, bounds) }
            if (!bounds.hasImageBounds()) return null
            FileInputStream(file).use { BitmapFactory.decodeStream(it, null, decodeOptions(bounds, width, height)) }
        } catch (_: Exception) {
            null
        }
    }

    private fun BitmapFactory.Options.hasImageBounds(): Boolean = outWidth > 0 && outHeight > 0

    private fun decodeOptions(bounds: BitmapFactory.Options, width: Int, height: Int): BitmapFactory.Options {
        return BitmapFactory.Options().apply {
            inSampleSize = calculateInSampleSize(bounds.outWidth, bounds.outHeight, width, height)
            inPreferredConfig = Bitmap.Config.ARGB_8888
            inDither = false
        }
    }

    private fun calculateInSampleSize(sourceWidth: Int, sourceHeight: Int, width: Int, height: Int): Int {
        var sampleSize = 1
        // Sampling on either oversized axis prevents panorama artwork from
        // bypassing bounds decoding simply because its other axis is small.
        while (sourceWidth / (sampleSize * 2) >= width || sourceHeight / (sampleSize * 2) >= height) {
            sampleSize *= 2
        }
        return sampleSize
    }

    private fun transform(context: Context, source: Bitmap, request: WidgetArtworkRequest): Bitmap {
        val cropped = centerCrop(source, request.widthPx, request.heightPx)
        val result = when (request.crop) {
            WidgetArtworkCrop.CIRCLE -> circleCrop(cropped)
            WidgetArtworkCrop.ROUNDED_CROP -> {
                val cardRadiusPx = 16f * context.resources.displayMetrics.density
                roundedCrop(cropped, cardRadiusPx)
            }
            WidgetArtworkCrop.BLURRED_ROUNDED_CROP -> {
                val blurredImage = blurred(cropped)
                val cardRadiusPx = 16f * context.resources.displayMetrics.density
                val finalImage = roundedCrop(blurredImage, cardRadiusPx)
                if (blurredImage !== finalImage && !blurredImage.isRecycled) blurredImage.recycle()
                finalImage
            }
        }
        if (result !== cropped && !cropped.isRecycled) cropped.recycle()
        return result
    }

    private fun centerCrop(source: Bitmap, width: Int, height: Int): Bitmap {
        val scale = max(width.toFloat() / source.width, height.toFloat() / source.height)
        val scaledWidth = max(width, Math.ceil((source.width * scale).toDouble()).toInt())
        val scaledHeight = max(height, Math.ceil((source.height * scale).toDouble()).toInt())
        val scaled = Bitmap.createScaledBitmap(source, scaledWidth, scaledHeight, true)
        val left = max(0, (scaledWidth - width) / 2)
        val top = max(0, (scaledHeight - height) / 2)
        val result = Bitmap.createBitmap(scaled, left, top, width, height)
        if (scaled !== source && scaled !== result && !scaled.isRecycled) scaled.recycle()
        return result
    }

    private fun circleCrop(source: Bitmap): Bitmap {
        val side = minOf(source.width, source.height)
        val square = Bitmap.createBitmap(source, (source.width - side) / 2, (source.height - side) / 2, side, side)
        val output = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(output)
        val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
        canvas.drawCircle(side / 2f, side / 2f, side / 2f, paint)
        paint.xfermode = android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(square, 0f, 0f, paint)
        if (square !== source && !square.isRecycled) square.recycle()
        return output
    }

    private fun roundedCrop(source: Bitmap, radius: Float): Bitmap {
        val output = Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(output)
        val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
        paint.shader = android.graphics.BitmapShader(source, android.graphics.Shader.TileMode.CLAMP, android.graphics.Shader.TileMode.CLAMP)
        val rect = android.graphics.RectF(0f, 0f, source.width.toFloat(), source.height.toFloat())
        canvas.drawRoundRect(rect, radius, radius, paint)
        return output
    }

    private fun blurred(source: Bitmap): Bitmap {
        val downscaledWidth = max(1, source.width / 12)
        val downscaledHeight = max(1, source.height / 12)
        val downscaled = Bitmap.createScaledBitmap(source, downscaledWidth, downscaledHeight, true)
        val output = Bitmap.createScaledBitmap(downscaled, source.width, source.height, true)
        if (downscaled !== source && !downscaled.isRecycled) downscaled.recycle()
        return output
    }

    private fun writeToDisk(destination: File, bitmap: Bitmap) {
        val temporaryFile = File(destination.parentFile, "${destination.name}.tmp")
        try {
            FileOutputStream(temporaryFile).use { stream ->
                @Suppress("DEPRECATION")
                bitmap.compress(Bitmap.CompressFormat.WEBP, 85, stream)
                stream.fd.sync()
            }
            if (!temporaryFile.renameTo(destination)) {
                temporaryFile.copyTo(destination, overwrite = true)
                temporaryFile.delete()
            }
        } catch (_: Exception) {
            temporaryFile.delete()
        }
    }

    private class HttpInputStream(
        private val connection: HttpURLConnection,
    ) : java.io.BufferedInputStream(connection.inputStream) {
        override fun close() {
            try {
                super.close()
            } finally {
                connection.disconnect()
            }
        }
    }
}
