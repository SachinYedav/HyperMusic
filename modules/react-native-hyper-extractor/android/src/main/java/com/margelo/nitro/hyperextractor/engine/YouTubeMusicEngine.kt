package com.margelo.nitro.hyperextractor.engine

import com.margelo.nitro.hyperextractor.ExtractedTrack
import com.margelo.nitro.hyperextractor.network.NetworkClient
import com.margelo.nitro.hyperextractor.errors.EngineException
import com.margelo.nitro.hyperextractor.utils.Logger
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.Dispatchers
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

import com.margelo.nitro.hyperextractor.BrowseItem
import org.json.JSONObject
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.localization.Localization

/**
 * Primary standalone execution coordinator orchestrating NewPipe environment initialization, InnerTube payload creation, OkHttp request dispatching, and JSON parser invocation.
 */
object YouTubeMusicEngine {
    private const val BASE_URL = "https://music.youtube.com/youtubei/v1"
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    init {
        // Initialize NewPipe with lightweight Downloader bridge
        NewPipe.init(NewPipeDownloader.instance, Localization.DEFAULT)
    }

    /**
     * Executes a search inquiry against the InnerTube search endpoint and parses the resulting catalog array of browse items.
     *
     * @param query Raw search query string.
     * @return Array of structured BrowseItem objects.
     */
    fun search(query: String): Array<BrowseItem> {
        return try {
            Logger.d("Engine: Searching for '$query'")
            
            // 1. Build Payload
            val payload = PayloadBuilder.buildSearchPayload(query)
            val requestBody = payload.toRequestBody(JSON_MEDIA_TYPE)

            // 2. Build Request
            val request = Request.Builder()
                .url("$BASE_URL/search?alt=json")
                .post(requestBody)
                .build()

            // 3. Execute Network Call
            val response = NetworkClient.executeSync(request)
            val responseBody = response.body?.string() ?: throw EngineException("Empty response body")

            // 4. Parse Response
            Logger.d("Engine: Successfully fetched search response, parsing now...")
            
            // Call the actual parser to extract tracks from the JSON response
            return Parsers.parseSearchResponse(responseBody)
        } catch (e: Exception) {
            Logger.e("Engine: Search failed", e)
            throw EngineException("Failed to execute search for query: $query", e)
        }
    }

    /**
     * Dispatches a search suggestions request to resolve live autocomplete strings for a partial query input.
     *
     * @param query Partial search query string.
     * @return Array of suggestion strings.
     */
    fun getSearchSuggestions(query: String): Array<String> {
        return try {
            Logger.d("Engine: Fetching search suggestions for '$query'")
            
            // 1. Build Payload
            val payload = PayloadBuilder.buildSearchSuggestionsPayload(query)
            val requestBody = payload.toRequestBody(JSON_MEDIA_TYPE)

            // 2. Build Request
            val request = Request.Builder()
                .url("$BASE_URL/music/get_search_suggestions?alt=json")
                .post(requestBody)
                .build()

            // 3. Execute Network Call
            val response = NetworkClient.executeSync(request)
            val responseBody = response.body?.string() ?: throw EngineException("Empty response body")
            
            // 4. Parse Response
            Parsers.parseSearchSuggestions(responseBody)
        } catch (e: Exception) {
            Logger.e("Engine: getSearchSuggestions failed", e)
            throw EngineException("Failed to fetch search suggestions for query: $query", e)
        }
    }

    /**
     * Obtains the primary direct streaming URL for a target YouTube video utilizing the underlying NewPipe extraction engine.
     *
     * @param videoId Target YouTube video identifier.
     * @param quality Quality profile string (normal, high, data_saver).
     * @return Direct streaming URL string.
     */
    fun getStreamUrl(videoId: String, quality: String): String {
        return try {
            Logger.d("Engine: Getting stream URL for '$videoId' using NewPipeExtractor with quality '$quality'")
            
            // 1. Resolve StreamInfo via NewPipe
            val videoUrl = "https://www.youtube.com/watch?v=$videoId"
            val info = org.schabi.newpipe.extractor.stream.StreamInfo.getInfo(ServiceList.YouTube, videoUrl)

            // 2. Inspect Audio Streams
            val audioStreams = info.audioStreams
            if (audioStreams.isNullOrEmpty()) {
                throw EngineException("No audio streams found for $videoId")
            }

            // 3. Select Target Bitrate by Quality Profile
            var selectedAudio = audioStreams.firstOrNull { it?.format?.name == "M4A" }
            
            when (quality) {
                "data_saver" -> {
                    selectedAudio = audioStreams.minByOrNull { it?.averageBitrate ?: Int.MAX_VALUE }
                }
                "high", "lossless" -> {
                    selectedAudio = audioStreams.maxByOrNull { it?.averageBitrate ?: 0 }
                }
            }

            // 4. Fallback Verification & Return
            val bestAudio = selectedAudio 
                ?: audioStreams.firstOrNull { it?.format?.name == "M4A" } 
                ?: audioStreams.firstOrNull() 
                ?: throw EngineException("No audio streams found for $videoId after fallback")

            val url = bestAudio.content ?: throw EngineException("Stream URL is empty")
            Logger.d("Engine: Successfully extracted URL via NewPipe (Bitrate: ${bestAudio.averageBitrate})")
            url
        } catch (e: Exception) {
            Logger.e("Engine: getStreamUrl failed", e)
            throw EngineException("Failed to get stream URL for video: $videoId", e)
        }
    }

    /**
     * Internal helper method dispatching synchronous OkHttp requests against the InnerTube browse endpoint.
     *
     * @param browseId Target taxonomy browse identifier.
     * @return Raw JSON response string.
     */
    private fun fetchBrowse(browseId: String): String {
        // 1. Build Payload
        val payload = PayloadBuilder.buildBrowsePayload(browseId)
        val requestBody = payload.toRequestBody(JSON_MEDIA_TYPE)

        // 2. Build Request
        val request = Request.Builder()
            .url("$BASE_URL/browse?alt=json")
            .post(requestBody)
            .build()

        // 3. Execute Network Call
        val response = NetworkClient.executeSync(request)
        return response.body?.string() ?: throw EngineException("Empty response body")
    }

    /**
     * Fetches and aggregates the primary home feed, charts, and new releases concurrently via coroutine deferred execution.
     *
     * @return Fully assembled HomeFeed payload.
     */
    fun getHomeFeed(): com.margelo.nitro.hyperextractor.HomeFeed {
        return try {
            Logger.d("Engine: Fetching Home Feed, Charts, and New Releases concurrently")
            
            runBlocking {
                // 1. Dispatch Concurrent Requests
                val homeDeferred = async(Dispatchers.IO) { fetchBrowse("FEmusic_home") }
                val chartsDeferred = async(Dispatchers.IO) { fetchBrowse("FEmusic_charts") }
                val releasesDeferred = async(Dispatchers.IO) { fetchBrowse("FEmusic_new_releases") }

                // 2. Await Async Completion
                val homeBody = homeDeferred.await()
                val chartsBody = chartsDeferred.await()
                val releasesBody = releasesDeferred.await()

                // 3. Aggregate Shelves
                val allShelves = mutableListOf<com.margelo.nitro.hyperextractor.BrowseShelf>()
                allShelves.addAll(Parsers.parseHomeFeed(homeBody).shelves)
                allShelves.addAll(Parsers.parseHomeFeed(chartsBody).shelves)
                allShelves.addAll(Parsers.parseHomeFeed(releasesBody).shelves)

                // 4. Return Final Assembled Feed
                com.margelo.nitro.hyperextractor.HomeFeed(shelves = allShelves.toTypedArray())
            }
        } catch (e: Exception) {
            Logger.e("Engine: getHomeFeed failed", e)
            throw EngineException("Failed to fetch Home Feed", e)
        }
    }

    /**
     * Executes a browse request for a target album identifier and invokes the album details parser.
     *
     * @param browseId Album browse identifier.
     * @return Structured AlbumDetails payload.
     */
    fun getAlbumDetails(browseId: String): com.margelo.nitro.hyperextractor.AlbumDetails {
        return try {
            Logger.d("Engine: Fetching Album Details for $browseId")
            // 1. Execute Browse Request
            val responseBody = fetchBrowse(browseId)
            // 2. Parse Response Payload
            Parsers.parseAlbumDetails(responseBody)
        } catch (e: Exception) {
            Logger.e("Engine: getAlbumDetails failed", e)
            throw EngineException("Failed to fetch Album Details", e)
        }
    }

    /**
     * Executes a browse request for a target playlist identifier and invokes the playlist details parser.
     *
     * @param browseId Playlist browse identifier.
     * @return Structured PlaylistDetails payload.
     */
    fun getPlaylistDetails(browseId: String): com.margelo.nitro.hyperextractor.PlaylistDetails {
        return try {
            Logger.d("Engine: Fetching Playlist Details for $browseId")
            // 1. Execute Browse Request
            val responseBody = fetchBrowse(browseId)
            // 2. Parse Response Payload
            Parsers.parsePlaylistDetails(responseBody)
        } catch (e: Exception) {
            Logger.e("Engine: getPlaylistDetails failed", e)
            throw EngineException("Failed to fetch Playlist Details", e)
        }
    }

    /**
     * Executes a browse request for a target artist identifier and invokes the artist profile parser.
     *
     * @param browseId Artist browse identifier.
     * @return Structured ArtistProfile payload.
     */
    fun getArtistProfile(browseId: String): com.margelo.nitro.hyperextractor.ArtistProfile {
        return try {
            Logger.d("Engine: Fetching Artist Profile for $browseId")
            // 1. Execute Browse Request
            val responseBody = fetchBrowse(browseId)
            // 2. Parse Response Payload
            Parsers.parseArtistProfile(responseBody)
        } catch (e: Exception) {
            Logger.e("Engine: getArtistProfile failed", e)
            throw EngineException("Failed to fetch Artist Profile", e)
        }
    }

    /**
     * Executes a browse request for a target explore landing taxonomy and resolves the underlying browse shelves.
     *
     * @param browseId Explore taxonomy browse identifier.
     * @return Array of BrowseShelf objects.
     */
    fun getExplorePage(browseId: String): Array<com.margelo.nitro.hyperextractor.BrowseShelf> {
        return try {
            Logger.d("Engine: Fetching Explore Page for $browseId")
            // 1. Execute Browse Request
            val responseBody = fetchBrowse(browseId)
            // 2. Parse Response Shelves
            val feed = Parsers.parseHomeFeed(responseBody)
            feed.shelves
        } catch (e: Exception) {
            Logger.e("Engine: getExplorePage failed", e)
            throw EngineException("Failed to fetch Explore Page for $browseId", e)
        }
    }

    /**
     * Dispatches a dynamic scraping request to resolve live taxonomy browseIds for a target filter chip name.
     *
     * @param chipName Display title of the filter chip.
     * @return Array of BrowseShelf objects.
     */
    fun getDynamicChipFeed(chipName: String): Array<com.margelo.nitro.hyperextractor.BrowseShelf> {
        return try {
            Logger.d("Engine: Fetching Dynamic Chip Feed for '$chipName'")
            // 1. Scrape Live Chip Parameters
            val resolvedParam = DynamicChipResolver.resolveChipParam(chipName) { targetBrowseId -> fetchBrowse(targetBrowseId) }
            // 2. Execute Browse Request
            val responseBody = fetchBrowse(resolvedParam)
            // 3. Parse Response Shelves
            val feed = Parsers.parseHomeFeed(responseBody)
            feed.shelves
        } catch (e: Exception) {
            Logger.e("Engine: getDynamicChipFeed failed for '$chipName'", e)
            throw EngineException("Failed to fetch Dynamic Chip Feed for $chipName", e)
        }
    }

    /**
     * Executes a request against the InnerTube next endpoint to assemble a continuous automated radio track queue.
     *
     * @param videoId Seed YouTube video identifier.
     * @return Array of ExtractedTrack objects.
     */
    fun getRadioQueue(videoId: String): Array<ExtractedTrack> {
        return try {
            Logger.d("Engine: Fetching Radio Queue for '$videoId'")
            
            // 1. Build Payload
            val payload = PayloadBuilder.buildRadioPayload(videoId)
            val requestBody = payload.toRequestBody(JSON_MEDIA_TYPE)

            // 2. Build Request
            val request = Request.Builder()
                .url("$BASE_URL/next?alt=json")
                .post(requestBody)
                .build()

            // 3. Execute Network Call
            val response = NetworkClient.executeSync(request)
            val responseBody = response.body?.string() ?: throw EngineException("Empty response body")
            
            // 4. Parse Response
            Parsers.parseRadioQueue(responseBody, videoId)
        } catch (e: Exception) {
            Logger.e("Engine: getRadioQueue failed", e)
            throw EngineException("Failed to fetch Radio Queue for video: $videoId", e)
        }
    }
}
