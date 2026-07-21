package com.margelo.nitro.hyperextractor

import com.margelo.nitro.core.Promise
import com.margelo.nitro.hyperextractor.engine.YouTubeMusicEngine
import com.margelo.nitro.hyperextractor.utils.Logger
import com.margelo.nitro.hyperextractor.ExtractedTrack
import com.margelo.nitro.hyperextractor.BrowseItem
import com.margelo.nitro.hyperextractor.HybridHyperExtractorSpec
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Native Android hybrid object implementation for the HyperExtractor Nitro Module specification.
 * Acts as an ultra-fast C++ to Kotlin bridge delegating asynchronous extraction routines to the underlying engine.
 */
class HybridHyperExtractor : HybridHyperExtractorSpec() {

    // Dedicated background IO coroutine scope governing native execution lifecycles
    private val scope = CoroutineScope(Dispatchers.IO)

    override val memorySize: Long
        get() = 2048L

    init {
        Logger.i("HybridHyperExtractor Engine Initialized!")
    }

    /**
     * Resolves the primary direct audio streaming URL for a specified video identifier and quality profile.
     *
     * @param videoId Target YouTube video identifier.
     * @param quality Quality profile string (normal, high, data_saver).
     * @return Promise resolving to the exact streaming URL string.
     */
    override fun getStreamUrl(videoId: String, quality: String): Promise<String> {
        val promise = Promise<String>()
        scope.launch {
            try {
                val url = YouTubeMusicEngine.getStreamUrl(videoId, quality)
                promise.resolve(url)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getStreamUrl failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Dispatches a freeform text query to resolve a matching catalog array of browse items.
     *
     * @param query Search query string.
     * @return Promise resolving to an array of parsed BrowseItem objects.
     */
    override fun search(query: String): Promise<Array<BrowseItem>> {
        val promise = Promise<Array<BrowseItem>>()
        scope.launch {
            try {
                val results = YouTubeMusicEngine.search(query)
                promise.resolve(results)
            } catch (e: Exception) {
                Logger.e("Bridge Error: search failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Concurrently aggregates and resolves the primary home feed, charts, and new release browse shelves.
     *
     * @return Promise resolving to the fully assembled HomeFeed payload.
     */
    override fun getHomeFeed(): Promise<HomeFeed> {
        val promise = Promise<HomeFeed>()
        scope.launch {
            try {
                val feed = YouTubeMusicEngine.getHomeFeed()
                promise.resolve(feed)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getHomeFeed failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Resolves comprehensive album metadata and associated track listings for a given browse identifier.
     *
     * @param browseId Album browse identifier.
     * @return Promise resolving to an AlbumDetails payload.
     */
    override fun getAlbumDetails(browseId: String): Promise<AlbumDetails> {
        val promise = Promise<AlbumDetails>()
        scope.launch {
            try {
                val album = YouTubeMusicEngine.getAlbumDetails(browseId)
                promise.resolve(album)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getAlbumDetails failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Resolves comprehensive playlist metadata and associated track listings for a given browse identifier.
     *
     * @param browseId Playlist browse identifier.
     * @return Promise resolving to a PlaylistDetails payload.
     */
    override fun getPlaylistDetails(browseId: String): Promise<PlaylistDetails> {
        val promise = Promise<PlaylistDetails>()
        scope.launch {
            try {
                val playlist = YouTubeMusicEngine.getPlaylistDetails(browseId)
                promise.resolve(playlist)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getPlaylistDetails failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Resolves comprehensive podcast show metadata and associated episode listings for a given browse identifier.
     *
     * @param browseId Podcast browse identifier.
     * @return Promise resolving to a PodcastShowDetails payload.
     */
    override fun getPodcastDetails(browseId: String): Promise<PodcastShowDetails> {
        val promise = Promise<PodcastShowDetails>()
        scope.launch {
            try {
                val podcast = YouTubeMusicEngine.getPodcastDetails(browseId)
                promise.resolve(podcast)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getPodcastDetails failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Resolves comprehensive artist biography, discography shelves, and top tracks for a given browse identifier.
     *
     * @param browseId Artist browse identifier.
     * @return Promise resolving to an ArtistProfile payload.
     */
    override fun getArtistProfile(browseId: String): Promise<ArtistProfile> {
        val promise = Promise<ArtistProfile>()
        scope.launch {
            try {
                val artist = YouTubeMusicEngine.getArtistProfile(browseId)
                promise.resolve(artist)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getArtistProfile failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Resolves landing page shelves for a specified explore taxonomy identifier.
     *
     * @param browseId Explore taxonomy browse identifier.
     * @return Promise resolving to an array of BrowseShelf objects.
     */
    override fun getExplorePage(browseId: String): Promise<Array<BrowseShelf>> {
        val promise = Promise<Array<BrowseShelf>>()
        scope.launch {
            try {
                val shelves = YouTubeMusicEngine.getExplorePage(browseId)
                promise.resolve(shelves)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getExplorePage failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Resolves dynamic personalized feed shelves for a specified filter chip name.
     *
     * @param chipName Display title of the filter chip.
     * @return Promise resolving to an array of BrowseShelf objects.
     */
    override fun getDynamicChipFeed(chipName: String): Promise<Array<BrowseShelf>> {
        val promise = Promise<Array<BrowseShelf>>()
        scope.launch {
            try {
                val shelves = YouTubeMusicEngine.getDynamicChipFeed(chipName)
                promise.resolve(shelves)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getDynamicChipFeed failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Resolves real-time autocomplete search suggestion strings for a partial query input.
     *
     * @param query Partial search query string.
     * @return Promise resolving to an array of suggestion strings.
     */
    override fun getSearchSuggestions(query: String): Promise<Array<String>> {
        val promise = Promise<Array<String>>()
        scope.launch {
            try {
                val suggestions = YouTubeMusicEngine.getSearchSuggestions(query)
                promise.resolve(suggestions)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getSearchSuggestions failed", e)
                promise.reject(e)
            }
        }
        return promise
    }

    /**
     * Resolves an automated continuous radio track queue generated from a seed video identifier.
     *
     * @param videoId Seed YouTube video identifier.
     * @return Promise resolving to an array of ExtractedTrack objects.
     */
    override fun getRadioQueue(videoId: String): Promise<Array<ExtractedTrack>> {
        val promise = Promise<Array<ExtractedTrack>>()
        scope.launch {
            try {
                val tracks = YouTubeMusicEngine.getRadioQueue(videoId)
                promise.resolve(tracks)
            } catch (e: Exception) {
                Logger.e("Bridge Error: getRadioQueue failed", e)
                promise.reject(e)
            }
        }
        return promise
    }
}
