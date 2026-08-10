package com.margelo.nitro.hyperplayer.network

import android.content.Context
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.datasource.cache.CacheDataSource
import com.margelo.nitro.hyperplayer.cache.HyperCacheManager

/**
 * Factory for creating the core media data source chain.
 * This configures network connectivity, triple-buffer caching, and Just-In-Time (JIT) URI resolution.
 */
object HyperDataSourceFactory {

    /**
     * Constructs a unified CacheDataSource.Factory hooked into the ResolvingDataSource.
     *
     * @param context Application context.
     * @return A fully configured ResolvingDataSource.Factory ready for ExoPlayer.
     */
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    fun create(context: Context): ResolvingDataSource.Factory {
        // 1. Setup Base Network Source
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            
        // 2. Setup Local + Network Source
        val defaultDataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)
        
        // 3. Setup Caching Layer
        val cacheDataSourceFactory = CacheDataSource.Factory()
            .setCache(HyperCacheManager.getCache(context))
            .setUpstreamDataSourceFactory(defaultDataSourceFactory)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)

        // 4. Inject JIT Resolver
        return ResolvingDataSource.Factory(
            cacheDataSourceFactory,
            JitDataSourceResolver()
        )
    }

    /**
     * Constructs a standalone CacheDataSource.Factory (used for preloading without JIT resolution).
     *
     * @param context Application context.
     * @return A CacheDataSource.Factory pointing to the global HyperMediaCache.
     */
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    fun createCacheDataSourceFactory(context: Context): CacheDataSource.Factory {
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
        val defaultDataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)
        
        return CacheDataSource.Factory()
            .setCache(HyperCacheManager.getCache(context))
            .setUpstreamDataSourceFactory(defaultDataSourceFactory)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
    }
}
