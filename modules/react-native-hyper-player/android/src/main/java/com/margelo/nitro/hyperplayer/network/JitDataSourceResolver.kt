package com.margelo.nitro.hyperplayer.network

import android.net.Uri
import com.margelo.nitro.hyperplayer.utils.Logger
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.ResolvingDataSource
import com.margelo.nitro.hyperextractor.engine.YouTubeMusicEngine
import kotlinx.coroutines.runBlocking

/**
 * Intercepts ExoPlayer data requests just-in-time (JIT).
 * If the URI uses our custom "hyper://" scheme (e.g., hyper://<videoId>),
 * it pauses ExoPlayer's preparation on the IO thread, extracts the real stream URL
 * using the Kotlin Nitro engine, and substitutes the URI before opening the socket.
 * 
 * This achieves ZERO JS-bridge latency during track transitions.
 */
class JitDataSourceResolver : ResolvingDataSource.Resolver {
    
    companion object {
        const val SCHEME_HYPER = "hyper"
        private val urlCache = java.util.concurrent.ConcurrentHashMap<String, String>()
        @Volatile var currentQuality: String = "high"
    }

    override fun resolveDataSpec(dataSpec: DataSpec): DataSpec {
        val originalUri = dataSpec.uri
        
        if (originalUri.scheme == SCHEME_HYPER) {
            val videoId = originalUri.host ?: return dataSpec
            
            // Extract the track type if it was appended as a query parameter (e.g. ?type=video)
            val trackType = originalUri.getQueryParameter("type") ?: "audio"
            val cacheKey = "$videoId-$trackType"
            
            // Fast-path: Return cached URL instantly for seeks or repeats
            urlCache[cacheKey]?.let { cachedUrl ->
                return dataSpec.buildUpon().setUri(Uri.parse(cachedUrl)).setKey(cacheKey).build()
            }
            
            Logger.i("Intercepted JIT request for videoId: $videoId, type: $trackType")
            
            return try {
                // Media3 prepares sources on a background thread, so blocking it to resolve the URL is perfectly safe.
                val extractedUrl = runBlocking {
                    // Extract stream using our native engine
                    YouTubeMusicEngine.getStreamUrl(videoId, currentQuality, trackType)
                }
                
                Logger.i("Successfully resolved JIT URL for $videoId")
                urlCache[cacheKey] = extractedUrl // Cache it to prevent refetch on seek
                dataSpec.buildUpon().setUri(Uri.parse(extractedUrl)).setKey(cacheKey).build()
                
            } catch (e: Exception) {
                Logger.e("Failed to resolve JIT URL for $videoId", e)
                dataSpec.buildUpon().setKey(cacheKey).build()
            }
        }
        
        return dataSpec
    }
}
