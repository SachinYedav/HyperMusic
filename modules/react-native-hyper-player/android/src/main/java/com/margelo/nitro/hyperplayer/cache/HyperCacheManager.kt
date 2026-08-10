package com.margelo.nitro.hyperplayer.cache

import android.content.Context
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File

/**
 * Manages the global media cache for the ExoPlayer engine.
 * Implements a 100MB LRU (Least Recently Used) cache backed by a SQLite database.
 */
object HyperCacheManager {
    private var simpleCache: SimpleCache? = null

    /**
     * Initializes or returns the singleton SimpleCache instance.
     *
     * @param context Application context used for accessing the cache directory.
     * @return The configured SimpleCache instance.
     */
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    fun getCache(context: Context): SimpleCache {
        if (simpleCache == null) {
            val cacheDir = File(context.cacheDir, "hyper_media_cache")
            val evictor = LeastRecentlyUsedCacheEvictor(100 * 1024 * 1024)
            simpleCache = SimpleCache(
                cacheDir, 
                evictor, 
                StandaloneDatabaseProvider(context)
            )
        }
        return simpleCache!!
    }
}
