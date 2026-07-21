package com.margelo.nitro.hyperextractor.engine

import com.margelo.nitro.hyperextractor.ExtractedTrack
import com.margelo.nitro.hyperextractor.errors.ParsingException
import org.json.JSONException
import org.json.JSONObject
import org.json.JSONArray
import com.margelo.nitro.hyperextractor.utils.Logger
import com.margelo.nitro.hyperextractor.HomeFeed
import com.margelo.nitro.hyperextractor.BrowseShelf
import com.margelo.nitro.hyperextractor.BrowseItem
import com.margelo.nitro.hyperextractor.AlbumDetails
import com.margelo.nitro.hyperextractor.PlaylistDetails
import com.margelo.nitro.hyperextractor.ArtistProfile

/**
 * Foundational JSON parsing suite governing deep object traversal, flex column unboxing, and structural conversion of InnerTube responses into Nitro spec entities.
 */
object Parsers {

    // Converts low-resolution thumbnail URLs into ultra-high-resolution 1200x1200px equivalent strings
    private fun getHighResArtworkUrl(url: String?): String {
        if (url.isNullOrEmpty()) return ""
        return url.replace(Regex("=w\\d+-h\\d+"), "=w1200-h1200")
            .replace(Regex("=s\\d+-"), "=s1200-")
    }

    /**
     * Traverses search suggestion section renderers to extract autocomplete query strings.
     *
     * @param jsonString Raw JSON response string.
     * @return Array of extracted suggestion strings.
     */
    @Throws(ParsingException::class)
    fun parseSearchSuggestions(jsonString: String): Array<String> {
        val suggestions = mutableListOf<String>()
        try {
            // 1. Traverse Root Contents
            val root = JSONObject(jsonString)
            val contents = root.optJSONArray("contents")
                ?.optJSONObject(0)
                ?.optJSONObject("searchSuggestionsSectionRenderer")
                ?.optJSONArray("contents")
            
            if (contents != null) {
                // 2. Locate Suggestion Renderers & Extract Text Runs
                for (i in 0 until contents.length()) {
                    val item = contents.optJSONObject(i) ?: continue
                    
                    var runs: org.json.JSONArray? = null
                    
                    val suggestionRenderer = item.optJSONObject("searchSuggestionRenderer")
                    if (suggestionRenderer != null) {
                        runs = suggestionRenderer.optJSONObject("suggestion")?.optJSONArray("runs")
                    } else {
                        val historyRenderer = item.optJSONObject("historySuggestionRenderer")
                        if (historyRenderer != null) {
                            runs = historyRenderer.optJSONObject("suggestion")?.optJSONArray("runs")
                        }
                    }

                    if (runs != null) {
                        val sb = java.lang.StringBuilder()
                        for (j in 0 until runs.length()) {
                            sb.append(runs.optJSONObject(j)?.optString("text") ?: "")
                        }
                        val text = sb.toString()
                        if (text.isNotEmpty()) {
                            suggestions.add(text)
                        }
                    }
                }
            }
            return suggestions.toTypedArray()
        } catch (e: Exception) {
            Logger.e("Parsers: Failed to parse search suggestions", e)
            throw ParsingException("Failed to parse search suggestions", cause = e)
        }
    }

    /**
     * Traverses diverse search result layouts to extract categorized browse items.
     *
     * @param jsonString Raw search JSON response string.
     * @return Array of structured BrowseItem objects.
     */
    @Throws(ParsingException::class)
    fun parseSearchResponse(jsonString: String): Array<BrowseItem> {
        val items = mutableListOf<BrowseItem>()
        try {
            val root = JSONObject(jsonString)
            
            // 1. Locate Primary Contents across Layouts (Tabbed, TwoColumn, SectionList)
            var contents = root.optJSONObject("contents")
                ?.optJSONObject("tabbedSearchResultsRenderer")
                ?.optJSONArray("tabs")
                ?.optJSONObject(0)
                ?.optJSONObject("tabRenderer")
                ?.optJSONObject("content")
                ?.optJSONObject("sectionListRenderer")
                ?.optJSONArray("contents")

            if (contents == null) {
                contents = root.optJSONObject("contents")
                    ?.optJSONObject("twoColumnSearchResultsRenderer")
                    ?.optJSONObject("primaryContents")
                    ?.optJSONObject("sectionListRenderer")
                    ?.optJSONArray("contents")
            }

            if (contents == null) {
                contents = root.optJSONObject("contents")
                    ?.optJSONObject("sectionListRenderer")
                    ?.optJSONArray("contents")
            }

            if (contents != null) {
                // 2. Inspect Section Renderers (MusicShelf, ItemSection, CardShelf)
                for (i in 0 until contents.length()) {
                    val section = contents.optJSONObject(i) ?: continue

                    // 1. Check musicShelfRenderer
                    val musicShelf = section.optJSONObject("musicShelfRenderer")
                    if (musicShelf != null) {
                        val shelfContents = musicShelf.optJSONArray("contents")
                        if (shelfContents != null) {
                            extractSearchItemsFromShelf(shelfContents, items)
                        }
                    }

                    // 2. Check itemSectionRenderer (sometimes wraps musicResponsiveListItemRenderer directly)
                    val itemSection = section.optJSONObject("itemSectionRenderer")
                    if (itemSection != null) {
                        val sectionContents = itemSection.optJSONArray("contents")
                        if (sectionContents != null) {
                            extractSearchItemsFromShelf(sectionContents, items)
                        }
                    }

                    // 3. Check musicCardShelfRenderer (often the "Top Result" / Spotlight)
                    val cardShelf = section.optJSONObject("musicCardShelfRenderer")
                    if (cardShelf != null) {
                        val titleObj = cardShelf.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)
                        val title = titleObj?.optString("text") ?: "Unknown"
                        
                        val subtitleObj = cardShelf.optJSONObject("subtitle")?.optJSONArray("runs")
                        val subtitleBuilder = java.lang.StringBuilder()
                        if (subtitleObj != null) {
                            for (k in 0 until subtitleObj.length()) {
                                subtitleBuilder.append(subtitleObj.optJSONObject(k)?.optString("text") ?: "")
                            }
                        }
                        val subtitle = subtitleBuilder.toString()

                        val thumbnails = cardShelf.optJSONObject("thumbnail")
                            ?.optJSONObject("musicThumbnailRenderer")
                            ?.optJSONObject("thumbnail")
                            ?.optJSONArray("thumbnails")
                        var artworkUrl = ""
                        if (thumbnails != null && thumbnails.length() > 0) {
                            artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                        }

                        // Try to get navigation endpoint
                        val endpoint = titleObj?.optJSONObject("navigationEndpoint") ?: cardShelf.optJSONObject("onTap")
                        var id = endpoint?.optJSONObject("browseEndpoint")?.optString("browseId") ?: ""
                        var type = "album"

                        if (id.isEmpty()) {
                            id = endpoint?.optJSONObject("watchEndpoint")?.optString("videoId") ?: ""
                            type = "song"
                        } else if (id.startsWith("VL")) {
                            type = "playlist"
                        } else if (id.startsWith("UC") || id.startsWith("HC")) {
                            type = "artist"
                        } else if (id.startsWith("MPREb")) {
                            type = "album"
                        }
                        
                        // Fallback id for playlists/albums often found in buttons
                        if (id.isEmpty()) {
                             val buttons = cardShelf.optJSONArray("buttons")
                             if (buttons != null && buttons.length() > 0) {
                                 val btnEndpoint = buttons.optJSONObject(0)?.optJSONObject("buttonRenderer")?.optJSONObject("command")
                                 id = btnEndpoint?.optJSONObject("watchPlaylistEndpoint")?.optString("playlistId") ?: ""
                                 if (id.isNotEmpty()) type = "playlist"
                             }
                        }

                        if (id.isNotEmpty()) {
                            items.add(BrowseItem(id = id, type = type, title = title, subtitle = subtitle, artworkUrl = artworkUrl, artistId = null, albumId = null))
                        }
                    }
                }
            }
            
            Logger.i("Parsers: Successfully extracted ${items.size} search items.")
            return items.toTypedArray()
            
        } catch (e: Exception) {
            throw ParsingException("Failed to parse search response JSON", cause = e)
        }
    }

    /**
     * Unboxes individual music responsive list items from a search shelf container.
     *
     * @param contents JSONArray of shelf items.
     * @param items Mutable accumulation list of BrowseItem objects.
     */
    private fun extractSearchItemsFromShelf(contents: org.json.JSONArray, items: MutableList<BrowseItem>) {
        for (i in 0 until contents.length()) {
            try {
                val item = contents.optJSONObject(i) ?: continue
                val renderer = item.optJSONObject("musicResponsiveListItemRenderer") ?: continue

                // 1. Extract Flex Column Renderers
                val flexColumns = renderer.optJSONArray("flexColumns") ?: continue
                if (flexColumns.length() < 1) continue

                // 2. Parse Title & Subtitle Runs
                val titleCol = flexColumns.optJSONObject(0)
                    ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                    ?.optJSONObject("text")
                    ?.optJSONArray("runs")
                    ?.optJSONObject(0)
                val title = titleCol?.optString("text") ?: "Unknown Title"

                // Subtitle
                val subtitleRuns = flexColumns.optJSONObject(1)
                    ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                    ?.optJSONObject("text")
                    ?.optJSONArray("runs")
                
                val subtitleBuilder = java.lang.StringBuilder()
                if (subtitleRuns != null) {
                    for (j in 0 until subtitleRuns.length()) {
                        subtitleBuilder.append(subtitleRuns.optJSONObject(j)?.optString("text") ?: "")
                    }
                }
                var subtitle = subtitleBuilder.toString()
                if (subtitle.startsWith("Song • ")) subtitle = subtitle.substring(7)
                if (subtitle.startsWith("Video • ")) subtitle = subtitle.substring(8)

                // Navigation Endpoint (ID and Type)
                val endpoint = renderer.optJSONObject("navigationEndpoint")
                var id = endpoint?.optJSONObject("browseEndpoint")?.optString("browseId") ?: ""
                var type = "album"

                if (id.isEmpty()) {
                    id = endpoint?.optJSONObject("watchEndpoint")?.optString("videoId") ?: ""
                    type = "song"
                }
                
                // Fallback for song videoId from playNavigationEndpoint if normal navigationEndpoint is missing
                if (id.isEmpty()) {
                    id = renderer.optJSONObject("overlay")
                        ?.optJSONObject("musicItemThumbnailOverlayRenderer")
                        ?.optJSONObject("content")
                        ?.optJSONObject("musicPlayButtonRenderer")
                        ?.optJSONObject("playNavigationEndpoint")
                        ?.optJSONObject("watchEndpoint")
                        ?.optString("videoId") ?: ""
                    if (id.isNotEmpty()) type = "song"
                }

                if (id.startsWith("VL")) {
                    type = "playlist"
                } else if (id.startsWith("UC") || id.startsWith("HC")) {
                    type = "artist"
                } else if (id.startsWith("MPREb")) {
                    type = "album"
                }

                if (id.isEmpty()) continue

                // Artwork
                var artworkUrl = ""
                val thumbnails = renderer.optJSONObject("thumbnail")
                    ?.optJSONObject("musicThumbnailRenderer")
                    ?.optJSONObject("thumbnail")
                    ?.optJSONArray("thumbnails")
                if (thumbnails != null && thumbnails.length() > 0) {
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                }

                val browseItem = BrowseItem(
                    id = id,
                    type = type,
                    title = title,
                    subtitle = subtitle,
                    artworkUrl = artworkUrl,
                    artistId = null,
                    albumId = null
                )
                items.add(browseItem)
            } catch (e: Exception) {
                Logger.w("Parsers: Failed to parse a single search item, skipping it.", e)
            }
        }
    }

    /**
     * Parses individual track objects from a music shelf or playlist shelf container.
     *
     * @param contents JSONArray of shelf items.
     * @param tracks Mutable accumulation list of ExtractedTrack objects.
     * @param parentArtist Inherited artist name from parent container.
     * @param parentArtistId Inherited artist browseId from parent container.
     * @param parentArtworkUrl Inherited high-res artwork URL from parent container.
     */
    private fun extractTracksFromShelf(
        contents: org.json.JSONArray, 
        tracks: MutableList<ExtractedTrack>,
        parentArtist: String? = null,
        parentArtistId: String? = null,
        parentArtworkUrl: String? = null
    ) {
        for (i in 0 until contents.length()) {
            try {
                val item = contents.optJSONObject(i) ?: continue
                val renderer = item.optJSONObject("musicResponsiveListItemRenderer") ?: continue

                // 1. Extract Video ID & Overlay Fallbacks
                var videoId: String? = renderer.optJSONObject("playlistItemData")?.optString("videoId")
                if (videoId.isNullOrEmpty()) {
                    // Try alternative location
                    videoId = renderer.optJSONObject("overlay")
                        ?.optJSONObject("musicItemThumbnailOverlayRenderer")
                        ?.optJSONObject("content")
                        ?.optJSONObject("musicPlayButtonRenderer")
                        ?.optJSONObject("playNavigationEndpoint")
                        ?.optJSONObject("watchEndpoint")
                        ?.optString("videoId")
                }
                
                // If we still don't have a videoId, skip this item (can't play it)
                if (videoId.isNullOrEmpty()) continue

                val flexColumns = renderer.optJSONArray("flexColumns") ?: continue
                if (flexColumns.length() < 2) continue

                // 2. Extract Title
                val titleCol = flexColumns.optJSONObject(0)
                    ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                    ?.optJSONObject("text")
                    ?.optJSONArray("runs")
                    ?.optJSONObject(0)
                val title = titleCol?.optString("text") ?: "Unknown Title"

                // 3. Extract Duration from fixedColumns
                var durationStr = ""
                val fixedColumns = renderer.optJSONArray("fixedColumns")
                if (fixedColumns != null && fixedColumns.length() > 0) {
                    val runs = fixedColumns.optJSONObject(0)
                        ?.optJSONObject("musicResponsiveListItemFixedColumnRenderer")
                        ?.optJSONObject("text")
                        ?.optJSONArray("runs")
                    if (runs != null && runs.length() > 0) {
                        val runText = runs.optJSONObject(0)?.optString("text") ?: ""
                        if (runText.matches(Regex("^\\d+:\\d{2}$"))) {
                            durationStr = runText
                        }
                    }
                }

                // 4. Extract Artist and Fallback Duration
                val artistColRuns = flexColumns.optJSONObject(1)
                    ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                    ?.optJSONObject("text")
                    ?.optJSONArray("runs")
                
                var artistBuilder = StringBuilder()
                var artistId: String? = null
                var albumId: String? = null

                if (artistColRuns != null) {
                    for (j in 0 until artistColRuns.length()) {
                        val runObj = artistColRuns.optJSONObject(j) ?: continue
                        val runText = runObj.optString("text")
                        
                        // Extract artist ID if available and not yet set
                        val browseId = runObj.optJSONObject("navigationEndpoint")
                            ?.optJSONObject("browseEndpoint")
                            ?.optString("browseId")
                        if (!browseId.isNullOrEmpty()) {
                            if (artistId == null && browseId.startsWith("UC")) {
                                artistId = browseId
                            } else if (albumId == null && browseId.startsWith("MPREb")) {
                                albumId = browseId
                            }
                        }

                        // A common pattern: "Artist • Album • 3:45" or "Song • Artist • 3:45"
                        if (runText == " • " || runText == " & ") {
                            artistBuilder.append(runText)
                        } else if (runText.matches(Regex("^\\d+:\\d{2}$"))) {
                            durationStr = runText
                        } else if (runText != "Song" && runText != "Video") {
                            artistBuilder.append(runText)
                        }
                    }
                }
                
                // Clean up the artist string (e.g. remove trailing separators)
                var artist = artistBuilder.toString().replace(Regex("^( • )|( • )$"), "").trim()
                if (artist.isEmpty() || artist == "Unknown Artist") {
                    artist = parentArtist ?: "Unknown Artist"
                }
                if (artist.startsWith("• ")) artist = artist.substring(2).trim()
                
                if (artistId == null) {
                    artistId = parentArtistId
                }

                // Parse duration "3:45" -> 225.0
                var duration = 0.0
                if (durationStr.isNotEmpty()) {
                    val parts = durationStr.split(":")
                    if (parts.size == 2) {
                        duration = (parts[0].toDoubleOrNull() ?: 0.0) * 60 + (parts[1].toDoubleOrNull() ?: 0.0)
                    }
                }

                // 5. Extract Artwork
                var artworkUrl = parentArtworkUrl ?: ""
                val thumbnails = renderer.optJSONObject("thumbnail")
                    ?.optJSONObject("musicThumbnailRenderer")
                    ?.optJSONObject("thumbnail")
                    ?.optJSONArray("thumbnails")
                
                if (thumbnails != null && thumbnails.length() > 0) {
                    // Get the highest resolution thumbnail (usually the last one)
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: artworkUrl
                }

                // Create the Track object
                val track = ExtractedTrack(
                    id = videoId,
                    title = title,
                    artist = artist,
                    artistId = artistId,
                    albumId = albumId,
                    duration = duration,
                    artworkUrl = artworkUrl
                )
                tracks.add(track)

            } catch (e: Exception) {
                Logger.w("Parsers: Failed to parse a single track, skipping it.", e)
            }
        }
    }

    /**
     * Traverses watch next tabbed results to assemble a continuous automated radio track queue.
     *
     * @param jsonString Raw watch next JSON response string.
     * @param parentVideoId Seed video identifier to filter out duplicates.
     * @return Array of extracted ExtractedTrack objects.
     */
    @Throws(ParsingException::class)
    fun parseRadioQueue(jsonString: String, parentVideoId: String): Array<ExtractedTrack> {
        val tracks = mutableListOf<ExtractedTrack>()
        try {
            val root = JSONObject(jsonString)
            
            // 1. Traverse Watch Next Tabs
            val tabs = root.optJSONObject("contents")
                ?.optJSONObject("singleColumnMusicWatchNextResultsRenderer")
                ?.optJSONObject("tabbedRenderer")
                ?.optJSONObject("watchNextTabbedResultsRenderer")
                ?.optJSONArray("tabs")
                
            if (tabs != null) {
                for (i in 0 until tabs.length()) {
                    val tab = tabs.optJSONObject(i)?.optJSONObject("tabRenderer") ?: continue
                    if (tab.optString("title").equals("Up next", ignoreCase = true) || tab.optString("title").equals("Up Next", ignoreCase = true)) {
                        // 2. Locate Playlist Panel Renderers
                        val contents = tab.optJSONObject("content")
                            ?.optJSONObject("musicQueueRenderer")
                            ?.optJSONObject("content")
                            ?.optJSONObject("playlistPanelRenderer")
                            ?.optJSONArray("contents")
                            
                        if (contents != null) {
                            for (j in 0 until contents.length()) {
                                try {
                                    val item = contents.optJSONObject(j) ?: continue
                                    val renderer = item.optJSONObject("playlistPanelVideoRenderer") ?: continue
                                    
                                    // 3. Extract Video ID & Title Runs
                                    val videoId = renderer.optString("videoId")
                                    if (videoId.isNullOrEmpty() || videoId == parentVideoId) continue
                                    
                                    val title = renderer.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: "Unknown Title"
                                    
                                    val longBylineTextRuns = renderer.optJSONObject("longBylineText")?.optJSONArray("runs")
                                    var artistBuilder = StringBuilder()
                                    var artistId: String? = null
                                    var albumId: String? = null
                                    
                                    if (longBylineTextRuns != null) {
                                        for (k in 0 until longBylineTextRuns.length()) {
                                            val runObj = longBylineTextRuns.optJSONObject(k) ?: continue
                                            val runText = runObj.optString("text")
                                            
                                            val browseId = runObj.optJSONObject("navigationEndpoint")
                                                ?.optJSONObject("browseEndpoint")
                                                ?.optString("browseId")
                                            
                                            if (!browseId.isNullOrEmpty()) {
                                                if (browseId.startsWith("UC")) {
                                                    if (artistId == null) artistId = browseId
                                                    artistBuilder.append(runText)
                                                } else if (browseId.startsWith("MPREb")) {
                                                    if (albumId == null) albumId = browseId
                                                    break // Stop accumulating artist name when we hit the album
                                                } else {
                                                    break
                                                }
                                            } else if (runText == " • " || runText == " & ") {
                                                artistBuilder.append(runText)
                                            }
                                        }
                                    }
                                    
                                    var artist = artistBuilder.toString().replace(Regex("^( • )|( • )$"), "").trim()
                                    if (artist.isEmpty()) artist = "Unknown Artist"
                                    
                                    // Parse duration
                                    val durationStr = renderer.optJSONObject("lengthText")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: ""
                                    var duration = 0.0
                                    if (durationStr.isNotEmpty()) {
                                        val parts = durationStr.split(":")
                                        if (parts.size == 2) {
                                            duration = (parts[0].toDoubleOrNull() ?: 0.0) * 60 + (parts[1].toDoubleOrNull() ?: 0.0)
                                        } else if (parts.size == 3) {
                                            duration = (parts[0].toDoubleOrNull() ?: 0.0) * 3600 + (parts[1].toDoubleOrNull() ?: 0.0) * 60 + (parts[2].toDoubleOrNull() ?: 0.0)
                                        }
                                    }
                                    
                                    var artworkUrl = ""
                                    val thumbnails = renderer.optJSONObject("thumbnail")?.optJSONArray("thumbnails")
                                    if (thumbnails != null && thumbnails.length() > 0) {
                                        artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                                    }
                                    
                                    tracks.add(ExtractedTrack(
                                        id = videoId,
                                        title = title,
                                        artist = artist,
                                        artistId = artistId,
                                        albumId = albumId,
                                        duration = duration,
                                        artworkUrl = artworkUrl
                                    ))
                                } catch (e: Exception) {
                                    Logger.w("Parsers: Failed to parse radio track", e)
                                }
                            }
                        }
                        break
                    }
                }
            }
            
            Logger.i("Parsers: Successfully extracted ${tracks.size} radio tracks.")
            return tracks.toTypedArray()
        } catch (e: Exception) {
            Logger.e("Parsers: Failed to parse Radio Queue", e)
            throw ParsingException("Failed to parse Radio Queue", cause = e)
        }
    }

    /**
     * Traverses multi-tab browse results and unboxes section list contents to assemble structured home feed shelves.
     *
     * @param jsonString Raw browse JSON response string.
     * @return Assembled HomeFeed entity containing extracted shelves.
     */
    @Throws(ParsingException::class)
    fun parseHomeFeed(jsonString: String): HomeFeed {
        val shelvesList = mutableListOf<BrowseShelf>()

        try {
            val root = JSONObject(jsonString)
            
            // 1. Inspect Single or Two Column Renderers
            var sectionListRenderer = root.optJSONObject("contents")
                ?.optJSONObject("singleColumnBrowseResultsRenderer")
                ?.optJSONArray("tabs")
                ?.optJSONObject(0)
                ?.optJSONObject("tabRenderer")
                ?.optJSONObject("content")
                ?.optJSONObject("sectionListRenderer")

            if (sectionListRenderer == null) {
                sectionListRenderer = root.optJSONObject("contents")
                    ?.optJSONObject("twoColumnBrowseResultsRenderer")
                    ?.optJSONArray("tabs")
                    ?.optJSONObject(0)
                    ?.optJSONObject("tabRenderer")
                    ?.optJSONObject("content")
                    ?.optJSONObject("sectionListRenderer")
            }

            if (sectionListRenderer != null) {
                // 2. Extract Section List Contents & Unbox Shelves
                val contents = sectionListRenderer.optJSONArray("contents")
                if (contents != null) {
                    extractShelvesFromContents(contents, shelvesList)
                }
            } else {
                Logger.e("Parsers: Could not find sectionListRenderer in Home Feed response. Keys: ${root.keys().asSequence().joinToString()}")
            }

            return HomeFeed(shelves = shelvesList.toTypedArray())
        } catch (e: Exception) {
            Logger.e("Parsers: Failed to parse Home Feed", e)
            throw ParsingException("Failed to parse Home Feed", cause = e)
        }
    }

    /**
     * Iterates over section list contents to unbox carousels, grids, and shelves into BrowseShelf objects.
     *
     * @param contents JSONArray of section list containers.
     * @param shelvesList Mutable accumulation list of BrowseShelf objects.
     */
    private fun extractShelvesFromContents(contents: org.json.JSONArray, shelvesList: MutableList<BrowseShelf>) {
        for (i in 0 until contents.length()) {
            val section = contents.optJSONObject(i) ?: continue
            
            // 1. Determine Shelf Layout (Carousel, Grid, List)
            var carousel = section.optJSONObject("musicCarouselShelfRenderer")
                    var isImmersive = false
                    
                    if (carousel == null) {
                        carousel = section.optJSONObject("musicImmersiveCarouselShelfRenderer")
                        if (carousel != null) isImmersive = true
                    }
                    
                    val grid = section.optJSONObject("gridRenderer")
                    
                    var title = "Shelf"
                    var shelfType = "carousel"
                    var carouselContents: org.json.JSONArray? = null

                    if (grid != null) {
                        shelfType = "grid"
                        val gridTitleObj = grid.optJSONObject("header")
                            ?.optJSONObject("gridHeaderRenderer")
                            ?.optJSONObject("title")
                            ?.optJSONArray("runs")
                            ?.optJSONObject(0)
                        title = gridTitleObj?.optString("text") ?: "Explore"
                        carouselContents = grid.optJSONArray("items")
                    } else if (carousel != null) {
                        val headerRenderer = carousel.optJSONObject("header")?.optJSONObject("musicCarouselShelfBasicHeaderRenderer")
                            ?: carousel.optJSONObject("header")?.optJSONObject("musicImmersiveCarouselShelfBasicHeaderRenderer")
                        val titleObj = headerRenderer?.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)
                        val straplineObj = headerRenderer?.optJSONObject("straplinee")?.optJSONArray("runs")?.optJSONObject(0)
                        val mainTitle = titleObj?.optString("text") ?: "Shelf"
                        val straplineText = straplineObj?.optString("text") ?: ""
                        title = if (straplineText.isNotEmpty()) "$straplineText • $mainTitle" else mainTitle
                        carouselContents = carousel.optJSONArray("contents")
                    } else {
                        // Support for musicShelfRenderer (Standard list of items in Home Feed / Charts)
                        val musicShelf = section.optJSONObject("musicShelfRenderer")
                        if (musicShelf != null) {
                            shelfType = "list"
                            title = musicShelf.optJSONObject("title")
                                ?.optJSONArray("runs")
                                ?.optJSONObject(0)
                                ?.optString("text") ?: "Top Songs"
                            carouselContents = musicShelf.optJSONArray("contents")
                        } else {
                            // Support for itemSectionRenderer wrapping shelves
                            val itemSection = section.optJSONObject("itemSectionRenderer")
                            if (itemSection != null) {
                                val innerContents = itemSection.optJSONArray("contents")
                                if (innerContents != null && innerContents.length() > 0) {
                                    val innerShelf = innerContents.optJSONObject(0)?.optJSONObject("musicCarouselShelfRenderer")
                                    if (innerShelf != null) {
                                        shelfType = "carousel"
                                        val headerRenderer = innerShelf.optJSONObject("header")?.optJSONObject("musicCarouselShelfBasicHeaderRenderer")
                                        val titleObj = headerRenderer?.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)
                                        val straplineObj = headerRenderer?.optJSONObject("straplinee")?.optJSONArray("runs")?.optJSONObject(0)
                                        val mainTitle = titleObj?.optString("text") ?: "Shelf"
                                        val straplineText = straplineObj?.optString("text") ?: ""
                                        title = if (straplineText.isNotEmpty()) "$straplineText • $mainTitle" else mainTitle
                                        carouselContents = innerShelf.optJSONArray("contents")
                                    }
                                }
                            }
                        }
                    }

                    if (carouselContents == null) continue

                    val itemsList = mutableListOf<BrowseItem>()

                    for (j in 0 until carouselContents.length()) {
                        try {
                            val itemContainer = carouselContents.optJSONObject(j) ?: continue
                            
                            // Check for Navigation Button (Moods & Genres tiles)
                            val navButton = itemContainer.optJSONObject("musicNavigationButtonRenderer")
                            if (navButton != null) {
                                val buttonText = navButton.optJSONObject("buttonText")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: "Explore"
                                val endpoint = navButton.optJSONObject("clickCommand")?.optJSONObject("browseEndpoint")
                                val browseId = endpoint?.optString("browseId") ?: ""
                                val params = endpoint?.optString("params") ?: ""
                                val combinedId = if (params.isNotEmpty()) "$browseId|||$params" else browseId
                                if (combinedId.isNotEmpty()) {
                                    itemsList.add(BrowseItem(id = combinedId, type = "genre", title = buttonText, subtitle = "Explore", artworkUrl = "", artistId = null, albumId = null))
                                }
                                continue
                            }

                            // Check for MultiRow List Item (Podcasts and Episodes)
                            val multiRow = itemContainer.optJSONObject("musicMultiRowListItemRenderer")
                            if (multiRow != null) {
                                val titleObj = multiRow.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: "Unknown Title"
                                var sub = multiRow.optJSONObject("secondTitle")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: ""
                                if (sub.isEmpty()) {
                                    val subtitleRuns = multiRow.optJSONObject("subtitle")?.optJSONArray("runs")
                                    val subtitleBuilder = java.lang.StringBuilder()
                                    if (subtitleRuns != null) {
                                        for (k in 0 until subtitleRuns.length()) {
                                            subtitleBuilder.append(subtitleRuns.optJSONObject(k)?.optString("text") ?: "")
                                        }
                                    }
                                    sub = subtitleBuilder.toString()
                                }
                                if (sub.startsWith("Podcast • ")) sub = sub.substring(10)
                                if (sub.startsWith("Episode • ")) sub = sub.substring(10)
                                
                                val targetEndpoint = multiRow.optJSONObject("onTap") ?: multiRow.optJSONObject("navigationEndpoint")
                                var id = targetEndpoint?.optJSONObject("watchEndpoint")?.optString("videoId") ?: ""
                                if (id.isEmpty()) {
                                    id = targetEndpoint?.optJSONObject("browseEndpoint")?.optString("browseId") ?: ""
                                }
                                
                                val thumbnails = multiRow.optJSONObject("thumbnail")?.optJSONObject("musicThumbnailRenderer")?.optJSONObject("thumbnail")?.optJSONArray("thumbnails")
                                var artworkUrl = ""
                                if (thumbnails != null && thumbnails.length() > 0) {
                                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                                }
                                
                                if (id.isNotEmpty()) {
                                    itemsList.add(BrowseItem(id = id, type = "podcast", title = titleObj, subtitle = sub, artworkUrl = artworkUrl, artistId = null, albumId = null))
                                }
                                continue
                            }

                            var item = itemContainer.optJSONObject("musicTwoRowItemRenderer")
                            var isResponsive = false
                            if (item == null) {
                                item = itemContainer.optJSONObject("musicResponsiveListItemRenderer")
                                if (item != null) isResponsive = true
                            }
                            if (item == null) continue

                            var id = ""
                            var type = "album"
                            var itemTitle = ""
                            var subtitle = ""
                            var artworkUrl = ""
                            var extractedArtistId: String? = null
                            var extractedAlbumId: String? = null

                            if (isResponsive) {
                                val flexColumns = item.optJSONArray("flexColumns") ?: continue
                                if (flexColumns.length() < 1) continue

                                itemTitle = flexColumns.optJSONObject(0)
                                    ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                                    ?.optJSONObject("text")
                                    ?.optJSONArray("runs")
                                    ?.optJSONObject(0)
                                    ?.optString("text") ?: "Unknown Title"

                                val subtitleRuns = flexColumns.optJSONObject(1)
                                    ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                                    ?.optJSONObject("text")
                                    ?.optJSONArray("runs")
                                val subtitleBuilder = java.lang.StringBuilder()
                                if (subtitleRuns != null) {
                                    for (k in 0 until subtitleRuns.length()) {
                                        val runObj = subtitleRuns.optJSONObject(k)
                                        subtitleBuilder.append(runObj?.optString("text") ?: "")
                                        val browseId = runObj?.optJSONObject("navigationEndpoint")?.optJSONObject("browseEndpoint")?.optString("browseId")
                                        if (!browseId.isNullOrEmpty()) {
                                            if (extractedArtistId == null && browseId.startsWith("UC")) {
                                                extractedArtistId = browseId
                                            } else if (extractedAlbumId == null && browseId.startsWith("MPREb")) {
                                                extractedAlbumId = browseId
                                            }
                                        }
                                    }
                                }
                                subtitle = subtitleBuilder.toString()
                                if (subtitle.startsWith("Song • ")) subtitle = subtitle.substring(7)
                                var hasVideoSubtitle = false
                                if (subtitle.startsWith("Video • ")) {
                                    subtitle = subtitle.substring(8)
                                    hasVideoSubtitle = true
                                }

                                val endpoint = item.optJSONObject("navigationEndpoint")
                                id = endpoint?.optJSONObject("browseEndpoint")?.optString("browseId") ?: ""
                                
                                if (id.isEmpty()) {
                                    val watchEndpointObj = endpoint?.optJSONObject("watchEndpoint")
                                    id = watchEndpointObj?.optString("videoId") ?: ""
                                    val musicVideoType = watchEndpointObj?.optJSONObject("watchEndpointMusicSupportedConfigs")
                                        ?.optJSONObject("watchEndpointMusicConfig")
                                        ?.optString("musicVideoType") ?: ""
                                    if (hasVideoSubtitle || musicVideoType.contains("OMV") || musicVideoType.contains("UGC") || musicVideoType.contains("OFFICIAL_SOURCE_MUSIC")) {
                                        type = "video"
                                    } else {
                                        type = "song"
                                    }
                                }
                                
                                // Fallback for videoId
                                if (id.isEmpty()) {
                                    val watchEndpointObj = item.optJSONObject("overlay")
                                        ?.optJSONObject("musicItemThumbnailOverlayRenderer")
                                        ?.optJSONObject("content")
                                        ?.optJSONObject("musicPlayButtonRenderer")
                                        ?.optJSONObject("playNavigationEndpoint")
                                        ?.optJSONObject("watchEndpoint")
                                    id = watchEndpointObj?.optString("videoId") ?: ""
                                    if (id.isNotEmpty()) {
                                        val musicVideoType = watchEndpointObj?.optJSONObject("watchEndpointMusicSupportedConfigs")
                                            ?.optJSONObject("watchEndpointMusicConfig")
                                            ?.optString("musicVideoType") ?: ""
                                        if (hasVideoSubtitle || musicVideoType.contains("OMV") || musicVideoType.contains("UGC") || musicVideoType.contains("OFFICIAL_SOURCE_MUSIC")) {
                                            type = "video"
                                        } else {
                                            type = "song"
                                        }
                                    }
                                }
                                
                                if (id.startsWith("VL")) {
                                    type = "playlist"
                                } else if (id.startsWith("MPSP") || id.startsWith("MPP")) {
                                    type = "podcast_show"
                                } else if (id.startsWith("UC") || id.startsWith("HC")) {
                                    type = "artist"
                                } else if (id.startsWith("MPREb")) {
                                    type = "album"
                                }

                                val thumbnails = item.optJSONObject("thumbnail")
                                    ?.optJSONObject("musicThumbnailRenderer")
                                    ?.optJSONObject("thumbnail")
                                    ?.optJSONArray("thumbnails")
                                if (thumbnails != null && thumbnails.length() > 0) {
                                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                                }
                            } else {
                                // Two Row Item Renderer
                                val endpoint = item.optJSONObject("navigationEndpoint")
                                id = endpoint?.optJSONObject("browseEndpoint")?.optString("browseId") ?: ""
                                
                                if (id.isEmpty()) {
                                    val watchEndpointObj = endpoint?.optJSONObject("watchEndpoint")
                                    id = watchEndpointObj?.optString("videoId") ?: ""
                                    val musicVideoType = watchEndpointObj?.optJSONObject("watchEndpointMusicSupportedConfigs")
                                        ?.optJSONObject("watchEndpointMusicConfig")
                                        ?.optString("musicVideoType") ?: ""
                                    val aspectRatio = item.optString("aspectRatio")
                                    if (aspectRatio.contains("16_BY_9") || musicVideoType.contains("OMV") || musicVideoType.contains("UGC") || musicVideoType.contains("OFFICIAL_SOURCE_MUSIC")) {
                                        type = "video"
                                    } else {
                                        type = "song"
                                    }
                                } else if (id.startsWith("VL")) {
                                    type = "playlist"
                                } else if (id.startsWith("MPSP") || id.startsWith("MPP")) {
                                    type = "podcast_show"
                                } else if (id.startsWith("UC") || id.startsWith("HC")) {
                                    type = "artist"
                                }

                                itemTitle = item.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: ""

                                val subtitleRuns = item.optJSONObject("subtitle")?.optJSONArray("runs")
                                val subtitleBuilder = java.lang.StringBuilder()
                                if (subtitleRuns != null) {
                                    for (k in 0 until subtitleRuns.length()) {
                                        val runObj = subtitleRuns.optJSONObject(k)
                                        subtitleBuilder.append(runObj?.optString("text") ?: "")
                                        val browseId = runObj?.optJSONObject("navigationEndpoint")?.optJSONObject("browseEndpoint")?.optString("browseId")
                                        if (!browseId.isNullOrEmpty()) {
                                            if (extractedArtistId == null && browseId.startsWith("UC")) {
                                                extractedArtistId = browseId
                                            } else if (extractedAlbumId == null && browseId.startsWith("MPREb")) {
                                                extractedAlbumId = browseId
                                            }
                                        }
                                    }
                                }
                                subtitle = subtitleBuilder.toString()

                                val thumbnails = item.optJSONObject("thumbnailRenderer")
                                    ?.optJSONObject("musicThumbnailRenderer")
                                    ?.optJSONObject("thumbnail")
                                    ?.optJSONArray("thumbnails")
                                if (thumbnails != null && thumbnails.length() > 0) {
                                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                                }
                            }

                            if (id.isNotEmpty()) {
                                itemsList.add(BrowseItem(id = id, type = type, title = itemTitle, subtitle = subtitle, artworkUrl = artworkUrl, artistId = extractedArtistId, albumId = extractedAlbumId))
                            }
                        } catch (e: Exception) {
                            Logger.w("Parsers: Failed to parse an item in Home Feed shelf, skipping it.", e)
                        }
                    }

                    if (itemsList.isNotEmpty()) {
                        shelvesList.add(BrowseShelf(title = title, type = shelfType, items = itemsList.toTypedArray()))
                    }
                }
    }

    /**
     * Traverses microformats, detail headers, and secondary contents to assemble an AlbumDetails payload.
     *
     * @param jsonString Raw browse JSON response string.
     * @return Assembled AlbumDetails entity.
     */
    @Throws(ParsingException::class)
    fun parseAlbumDetails(jsonString: String): AlbumDetails {
        val tracks = mutableListOf<ExtractedTrack>()
        var albumTitle = "Unknown Album"
        var albumArtist = "Unknown Artist"
        var artistId: String? = null
        var year = ""
        var artworkUrl = ""

        try {
            val root = JSONObject(jsonString)

            // 1. Parse Microformat Fallback
            val microformat = root.optJSONObject("microformat")?.optJSONObject("microformatDataRenderer")
            if (microformat != null) {
                albumTitle = microformat.optString("title", albumTitle)
                val thumbnails = microformat.optJSONObject("thumbnail")?.optJSONArray("thumbnails")
                if (thumbnails != null && thumbnails.length() > 0) {
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                }
            }

            // 2. Extract Detail Header Renderers (Title, Artist, Year)
            val header = root.optJSONObject("header")?.optJSONObject("musicDetailHeaderRenderer")
                ?: root.optJSONObject("header")?.optJSONObject("musicResponsiveHeaderRenderer")

            if (header != null) {
                val headerTitle = header.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text")
                if (headerTitle != null) albumTitle = headerTitle

                val subtitleRuns = header.optJSONObject("subtitle")?.optJSONArray("runs")
                if (subtitleRuns != null && subtitleRuns.length() > 0) {
                    for (i in 0 until subtitleRuns.length()) {
                        val run = subtitleRuns.optJSONObject(i) ?: continue
                        val browseId = run.optJSONObject("navigationEndpoint")
                            ?.optJSONObject("browseEndpoint")
                            ?.optString("browseId")
                        if (!browseId.isNullOrEmpty() && browseId.startsWith("UC")) {
                            artistId = browseId
                            albumArtist = run.optString("text") ?: albumArtist
                            break
                        }
                    }

                    if (subtitleRuns.length() >= 3) {
                        year = subtitleRuns.optJSONObject(subtitleRuns.length() - 1)?.optString("text") ?: ""
                    }
                }

                val thumbnails = header.optJSONObject("thumbnail")
                    ?.optJSONObject("croppedSquareThumbnailRenderer")
                    ?.optJSONObject("thumbnail")
                    ?.optJSONArray("thumbnails")
                if (thumbnails != null && thumbnails.length() > 0) {
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: artworkUrl
                }
            }

            // Fallback scan for tracks in sectionListRenderer
            var contents = root.optJSONObject("contents")
                ?.optJSONObject("singleColumnBrowseResultsRenderer")
                ?.optJSONArray("tabs")
                ?.optJSONObject(0)
                ?.optJSONObject("tabRenderer")
                ?.optJSONObject("content")
                ?.optJSONObject("sectionListRenderer")
                ?.optJSONArray("contents")

            if (contents == null) {
                contents = root.optJSONObject("contents")
                    ?.optJSONObject("twoColumnBrowseResultsRenderer")
                    ?.optJSONObject("secondaryContents")
                    ?.optJSONObject("sectionListRenderer")
                    ?.optJSONArray("contents")
            }

            if (contents != null) {
                for (i in 0 until contents.length()) {
                    val section = contents.optJSONObject(i) ?: continue
                    
                    var shelfContents = section.optJSONObject("musicShelfRenderer")?.optJSONArray("contents")
                    if (shelfContents == null) {
                        shelfContents = section.optJSONObject("musicPlaylistShelfRenderer")?.optJSONArray("contents")
                    }

                    if (shelfContents != null) {
                        extractTracksFromShelf(shelfContents, tracks, albumArtist, artistId, artworkUrl)
                    }
                }
            }

            if (albumArtist == "Unknown Artist" || albumArtist == "Album") {
                if (tracks.isNotEmpty()) {
                    albumArtist = tracks[0].artist ?: "Unknown Artist"
                }
            }

            return AlbumDetails(
                title = albumTitle, 
                artist = albumArtist, 
                artistId = artistId,
                year = year, 
                artworkUrl = artworkUrl, 
                tracks = tracks.toTypedArray()
            )
        } catch (e: Exception) {
            Logger.e("Parsers: Failed to parse Album Details", e)
            throw ParsingException("Failed to parse Album Details", cause = e)
        }
    }

    /**
     * Traverses microformats, responsive headers, and tabbed section lists to assemble a PlaylistDetails payload.
     *
     * @param jsonString Raw browse JSON response string.
     * @return Assembled PlaylistDetails entity.
     */
    @Throws(ParsingException::class)
    fun parsePlaylistDetails(jsonString: String): PlaylistDetails {
        val tracks = mutableListOf<ExtractedTrack>()
        var playlistTitle = "Unknown Playlist"
        var creator = "Unknown Creator"
        var creatorId: String? = null
        var trackCount = ""
        var artworkUrl = ""

        try {
            val root = JSONObject(jsonString)

            // 1. Parse Microformat Fallback
            val microformat = root.optJSONObject("microformat")?.optJSONObject("microformatDataRenderer")
            if (microformat != null) {
                playlistTitle = microformat.optString("title", playlistTitle)
                val thumbnails = microformat.optJSONObject("thumbnail")?.optJSONArray("thumbnails")
                if (thumbnails != null && thumbnails.length() > 0) {
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                }
            }

            // 2. Locate Header or Unbox Content Layouts
            var header = root.optJSONObject("header")?.optJSONObject("musicDetailHeaderRenderer")
                ?: root.optJSONObject("header")?.optJSONObject("musicResponsiveHeaderRenderer")

            // NEW LOGIC: If header is null, search inside contents (modern YouTube Music JSON)
            if (header == null) {
                // Look in twoColumnBrowseResultsRenderer
                val tabs = root.optJSONObject("contents")
                    ?.optJSONObject("twoColumnBrowseResultsRenderer")
                    ?.optJSONArray("tabs")
                
                if (tabs != null && tabs.length() > 0) {
                    val sectionContents = tabs.optJSONObject(0)
                        ?.optJSONObject("tabRenderer")
                        ?.optJSONObject("content")
                        ?.optJSONObject("sectionListRenderer")
                        ?.optJSONArray("contents")
                    
                    if (sectionContents != null) {
                        for (i in 0 until sectionContents.length()) {
                            val item = sectionContents.optJSONObject(i) ?: continue
                            val responsiveHeader = item.optJSONObject("musicResponsiveHeaderRenderer")
                            if (responsiveHeader != null) {
                                header = responsiveHeader
                                break
                            }
                        }
                    }
                }
                
                // Also check singleColumnBrowseResultsRenderer just in case
                if (header == null) {
                    val singleTabs = root.optJSONObject("contents")
                        ?.optJSONObject("singleColumnBrowseResultsRenderer")
                        ?.optJSONArray("tabs")
                    
                    if (singleTabs != null && singleTabs.length() > 0) {
                        val sectionContents = singleTabs.optJSONObject(0)
                            ?.optJSONObject("tabRenderer")
                            ?.optJSONObject("content")
                            ?.optJSONObject("sectionListRenderer")
                            ?.optJSONArray("contents")
                        
                        if (sectionContents != null) {
                            for (i in 0 until sectionContents.length()) {
                                val item = sectionContents.optJSONObject(i) ?: continue
                                val responsiveHeader = item.optJSONObject("musicResponsiveHeaderRenderer")
                                if (responsiveHeader != null) {
                                    header = responsiveHeader
                                    break
                                }
                            }
                        }
                    }
                }
            }

            if (header != null) {
                val headerTitle = header.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text")
                if (headerTitle != null) playlistTitle = headerTitle

                // 1. Check straplineTextOne (User/Artist playlists)
                val straplineRuns = header.optJSONObject("straplineTextOne")?.optJSONArray("runs")
                if (straplineRuns != null && straplineRuns.length() > 0) {
                    val firstRun = straplineRuns.optJSONObject(0)
                    creator = firstRun?.optString("text") ?: creator
                    
                    val browseId = firstRun?.optJSONObject("navigationEndpoint")
                        ?.optJSONObject("browseEndpoint")
                        ?.optString("browseId")
                    if (!browseId.isNullOrEmpty()) {
                        creatorId = browseId
                    }
                } else {
                    // 2. Check subtitle (Old format or mixed)
                    val subtitleRuns = header.optJSONObject("subtitle")?.optJSONArray("runs")
                    if (subtitleRuns != null && subtitleRuns.length() > 0) {
                        for (i in 0 until subtitleRuns.length()) {
                            val run = subtitleRuns.optJSONObject(i) ?: continue
                            val browseId = run.optJSONObject("navigationEndpoint")
                                ?.optJSONObject("browseEndpoint")
                                ?.optString("browseId")
                            if (!browseId.isNullOrEmpty()) {
                                creator = run.optString("text")
                                creatorId = browseId
                                break
                            }
                        }
                        
                        // If no creator found with browseId, take first run if it's not generic
                        if (creator == "Unknown Creator" || creatorId.isNullOrEmpty()) {
                             val firstText = subtitleRuns.optJSONObject(0)?.optString("text") ?: ""
                             if (firstText.isNotEmpty() && firstText != "Playlist" && firstText != "Album") {
                                 creator = firstText
                             }
                        }
                    }
                }

                // 3. If still no creator, check facepile (Official YouTube Music playlists)
                if (creator == "Unknown Creator" || creator == "Playlist" || creator == "") {
                    val facepileText = header.optJSONObject("facepile")
                        ?.optJSONObject("avatarStackViewModel")
                        ?.optJSONObject("text")
                        ?.optString("content")
                    
                    if (!facepileText.isNullOrEmpty()) {
                        creator = facepileText
                    }
                }

                // Extract track count from secondSubtitle
                val secondSubtitleRuns = header.optJSONObject("secondSubtitle")?.optJSONArray("runs")
                if (secondSubtitleRuns != null && secondSubtitleRuns.length() > 0) {
                    var countText = ""
                    for (i in 0 until secondSubtitleRuns.length()) {
                        countText += secondSubtitleRuns.optJSONObject(i)?.optString("text") ?: ""
                    }
                    if (countText.isNotEmpty()) {
                        trackCount = countText
                    }
                } else {
                    // Fallback to subtitle if secondSubtitle is missing
                    val subtitleRuns = header.optJSONObject("subtitle")?.optJSONArray("runs")
                    if (subtitleRuns != null && subtitleRuns.length() > 0) {
                        var countText = ""
                        for (i in 0 until subtitleRuns.length()) {
                            countText += subtitleRuns.optJSONObject(i)?.optString("text") ?: ""
                        }
                        if (countText.contains("song") || countText.contains("track")) {
                            trackCount = countText
                        }
                    }
                }

                // Extract thumbnail
                val thumbnails = header.optJSONObject("thumbnail")
                    ?.optJSONObject("musicThumbnailRenderer")
                    ?.optJSONObject("thumbnail")
                    ?.optJSONArray("thumbnails")
                    ?: header.optJSONObject("thumbnail")
                        ?.optJSONObject("croppedSquareThumbnailRenderer")
                        ?.optJSONObject("thumbnail")
                        ?.optJSONArray("thumbnails")
                
                if (thumbnails != null && thumbnails.length() > 0) {
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: artworkUrl
                }
            }

            // Extract tracks
            val contents = root.optJSONObject("contents")
                ?.optJSONObject("singleColumnBrowseResultsRenderer")
                ?.optJSONArray("tabs")
                ?.optJSONObject(0)
                ?.optJSONObject("tabRenderer")
                ?.optJSONObject("content")
                ?.optJSONObject("sectionListRenderer")
                ?.optJSONArray("contents")

            if (contents != null) {
                for (i in 0 until contents.length()) {
                    val section = contents.optJSONObject(i) ?: continue
                    val playlistShelf = section.optJSONObject("musicPlaylistShelfRenderer")
                    if (playlistShelf != null) {
                        val shelfContents = playlistShelf.optJSONArray("contents")
                        if (shelfContents != null) {
                            extractTracksFromShelf(shelfContents, tracks, creator, creatorId, artworkUrl)
                        }
                    }
                    val musicShelf = section.optJSONObject("musicShelfRenderer")
                    if (musicShelf != null) {
                        val shelfContents = musicShelf.optJSONArray("contents")
                        if (shelfContents != null) {
                            extractTracksFromShelf(shelfContents, tracks, creator, creatorId, artworkUrl)
                        }
                    }
                }
            } else {
                // Sometimes playlist is twoColumnBrowseResultsRenderer
                val secondaryContents = root.optJSONObject("contents")
                    ?.optJSONObject("twoColumnBrowseResultsRenderer")
                    ?.optJSONObject("secondaryContents")
                    ?.optJSONObject("sectionListRenderer")
                    ?.optJSONArray("contents")

                if (secondaryContents != null) {
                    for (i in 0 until secondaryContents.length()) {
                        val section = secondaryContents.optJSONObject(i) ?: continue
                        val playlistShelf = section.optJSONObject("musicPlaylistShelfRenderer")
                        if (playlistShelf != null) {
                            val shelfContents = playlistShelf.optJSONArray("contents")
                            if (shelfContents != null) {
                                extractTracksFromShelf(shelfContents, tracks, creator, creatorId, artworkUrl)
                            }
                        }
                        val musicShelf = section.optJSONObject("musicShelfRenderer")
                        if (musicShelf != null) {
                            val shelfContents = musicShelf.optJSONArray("contents")
                            if (shelfContents != null) {
                                extractTracksFromShelf(shelfContents, tracks, creator, creatorId, artworkUrl)
                            }
                        }
                    }
                }
            }

            // Smart Contextual Fallback for creatorId
            if (!creator.isNullOrEmpty() && creator != "Unknown Creator" && creator != "YouTube Music" && creatorId.isNullOrEmpty()) {
                if (tracks.isNotEmpty()) {
                    val limit = if (tracks.size > 5) 5 else tracks.size
                    for (i in 0 until limit) {
                        val track = tracks[i]
                        if (track.artist == creator && !track.artistId.isNullOrEmpty()) {
                            creatorId = track.artistId
                            break
                        }
                    }
                }
            }

            if (creator == "Unknown Creator" && playlistTitle != "Unknown Playlist") {
                creator = "YouTube Music"
            }

            if (trackCount.isEmpty() && tracks.isNotEmpty()) {
                trackCount = "${tracks.size} tracks"
            }

            return PlaylistDetails(
                title = playlistTitle, 
                creator = creator, 
                creatorId = creatorId,
                trackCount = trackCount, 
                artworkUrl = artworkUrl, 
                tracks = tracks.toTypedArray()
            )
        } catch (e: Exception) {
            Logger.e("Parsers: Failed to parse Playlist Details", e)
            throw ParsingException("Failed to parse Playlist Details", cause = e)
        }
    }

    /**
     * Traverses immersive headers and tabbed section lists to assemble an ArtistProfile payload.
     *
     * @param jsonString Raw browse JSON response string.
     * @return Assembled ArtistProfile entity.
     */
    @Throws(ParsingException::class)
    fun parseArtistProfile(jsonString: String): ArtistProfile {
        var name = "Unknown Artist"
        var subtitle = ""
        var artworkUrl = ""
        val shelvesList = mutableListOf<BrowseShelf>()

        try {
            val root = JSONObject(jsonString)
            // 1. Locate Immersive or Visual Headers
            val header = root.optJSONObject("header")?.optJSONObject("musicImmersiveHeaderRenderer") ?: root.optJSONObject("header")?.optJSONObject("musicVisualHeaderRenderer")
            
            if (header != null) {
                // 2. Extract Artist Name & High-Res Thumbnails
                name = header.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text") ?: name
                
                var thumbnailObj = header.optJSONObject("thumbnail")
                if (thumbnailObj == null) {
                    thumbnailObj = header.optJSONObject("foregroundThumbnail")
                }

                val thumbnails = thumbnailObj
                    ?.optJSONObject("musicThumbnailRenderer")
                    ?.optJSONObject("thumbnail")
                    ?.optJSONArray("thumbnails")
                if (thumbnails != null && thumbnails.length() > 0) {
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: ""
                }
            }

            val contents = root.optJSONObject("contents")
                ?.optJSONObject("singleColumnBrowseResultsRenderer")
                ?.optJSONArray("tabs")
                ?.optJSONObject(0)
                ?.optJSONObject("tabRenderer")
                ?.optJSONObject("content")
                ?.optJSONObject("sectionListRenderer")
                ?.optJSONArray("contents")

            if (contents != null) {
                extractShelvesFromContents(contents, shelvesList)
            }

            return ArtistProfile(name = name, subtitle = subtitle, artworkUrl = artworkUrl, shelves = shelvesList.toTypedArray())
        } catch (e: Exception) {
            Logger.e("Parsers: Failed to parse Artist Profile", e)
            throw ParsingException("Failed to parse Artist Profile", cause = e)
        }
    }

    /**
     * Extracts podcast episodes from a musicShelfRenderer containing musicMultiRowListItemRenderer items.
     */
    private fun extractPodcastEpisodesFromShelf(
        contents: org.json.JSONArray, 
        tracks: MutableList<ExtractedTrack>,
        parentArtist: String? = null,
        parentArtistId: String? = null,
        parentArtworkUrl: String? = null
    ) {
        for (i in 0 until contents.length()) {
            try {
                val item = contents.optJSONObject(i) ?: continue
                val renderer = item.optJSONObject("musicMultiRowListItemRenderer") ?: continue

                // 1. Extract Video ID
                val videoId: String? = renderer.optJSONObject("onTap")
                    ?.optJSONObject("watchEndpoint")
                    ?.optString("videoId")
                
                if (videoId.isNullOrEmpty()) continue

                // 2. Extract Title
                val title = renderer.optJSONObject("title")
                    ?.optJSONArray("runs")
                    ?.optJSONObject(0)
                    ?.optString("text") ?: "Unknown Episode"

                // 3. Extract Duration / Playback Progress
                var durationStr = ""
                val durationRuns = renderer.optJSONObject("playbackProgress")
                    ?.optJSONObject("musicPlaybackProgressRenderer")
                    ?.optJSONObject("durationText")
                    ?.optJSONArray("runs")
                
                if (durationRuns != null && durationRuns.length() > 0) {
                    val lastRun = durationRuns.optJSONObject(durationRuns.length() - 1)?.optString("text") ?: ""
                    durationStr = lastRun.replace(" • ", "").trim()
                }

                // 4. Fallback artist
                val artist = parentArtist ?: "Unknown Creator"
                val artistId = parentArtistId

                // 5. Extract Artwork
                var artworkUrl = parentArtworkUrl ?: ""
                val thumbnails = renderer.optJSONObject("thumbnail")
                    ?.optJSONObject("musicThumbnailRenderer")
                    ?.optJSONObject("thumbnail")
                    ?.optJSONArray("thumbnails")
                if (thumbnails != null && thumbnails.length() > 0) {
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: artworkUrl
                }

                var durationSeconds = 0.0
                if (durationStr.isNotEmpty()) {
                    val parts = durationStr.split(":")
                    if (parts.size == 2) {
                        durationSeconds = (parts[0].toDoubleOrNull() ?: 0.0) * 60 + (parts[1].toDoubleOrNull() ?: 0.0)
                    } else if (parts.size == 3) {
                        durationSeconds = (parts[0].toDoubleOrNull() ?: 0.0) * 3600 + (parts[1].toDoubleOrNull() ?: 0.0) * 60 + (parts[2].toDoubleOrNull() ?: 0.0)
                    }
                }

                tracks.add(
                    ExtractedTrack(
                        id = videoId,
                        title = title,
                        artist = artist,
                        artistId = artistId,
                        albumId = null,
                        duration = durationSeconds,
                        artworkUrl = artworkUrl
                    )
                )
            } catch (e: Exception) {
                Logger.e("Parsers: Failed to parse a podcast episode, skipping...", e)
            }
        }
    }

    /**
     * Traverses browse structures to assemble a PodcastShowDetails payload.
     *
     * @param jsonString Raw browse JSON response string.
     * @return Assembled PodcastShowDetails entity.
     */
    @Throws(ParsingException::class)
    fun parsePodcastDetails(jsonString: String): com.margelo.nitro.hyperextractor.PodcastShowDetails {
        val tracks = mutableListOf<ExtractedTrack>()
        var podcastTitle = "Unknown Podcast"
        var creator = "Unknown Creator"
        var creatorId: String? = null
        var artworkUrl = ""

        try {
            val root = org.json.JSONObject(jsonString)

            var header = root.optJSONObject("header")?.optJSONObject("musicDetailHeaderRenderer")
                ?: root.optJSONObject("header")?.optJSONObject("musicPodcastHeaderRenderer")
                ?: root.optJSONObject("header")?.optJSONObject("musicResponsiveHeaderRenderer")

            // Fallback for podcast playlists where header is inside tabs
            if (header == null) {
                header = root.optJSONObject("contents")
                    ?.optJSONObject("twoColumnBrowseResultsRenderer")
                    ?.optJSONArray("tabs")
                    ?.optJSONObject(0)
                    ?.optJSONObject("tabRenderer")
                    ?.optJSONObject("content")
                    ?.optJSONObject("sectionListRenderer")
                    ?.optJSONArray("contents")
                    ?.optJSONObject(0)
                    ?.optJSONObject("musicResponsiveHeaderRenderer")
            }

            if (header != null) {
                val headerTitle = header.optJSONObject("title")?.optJSONArray("runs")?.optJSONObject(0)?.optString("text")
                if (headerTitle != null) podcastTitle = headerTitle

                // Check author/creator
                val authorRuns = header.optJSONObject("author")?.optJSONArray("runs") 
                               ?: header.optJSONObject("subtitle")?.optJSONArray("runs")
                               ?: header.optJSONObject("straplineTextOne")?.optJSONArray("runs")
                               
                if (authorRuns != null && authorRuns.length() > 0) {
                    for (i in 0 until authorRuns.length()) {
                        val run = authorRuns.optJSONObject(i) ?: continue
                        val text = run.optString("text")
                        if (text.isNotEmpty() && text != "Podcast") {
                            creator = text
                            val browseId = run.optJSONObject("navigationEndpoint")
                                ?.optJSONObject("browseEndpoint")
                                ?.optString("browseId")
                            if (!browseId.isNullOrEmpty()) {
                                creatorId = browseId
                            }
                            break
                        }
                    }
                }

                // Extract thumbnail
                val thumbnails = header.optJSONObject("thumbnail")
                    ?.optJSONObject("musicThumbnailRenderer")
                    ?.optJSONObject("thumbnail")
                    ?.optJSONArray("thumbnails")
                    ?: header.optJSONObject("thumbnail")
                        ?.optJSONObject("croppedSquareThumbnailRenderer")
                        ?.optJSONObject("thumbnail")
                        ?.optJSONArray("thumbnails")
                
                if (thumbnails != null && thumbnails.length() > 0) {
                    artworkUrl = getHighResArtworkUrl(thumbnails.optJSONObject(thumbnails.length() - 1)?.optString("url")) ?: artworkUrl
                }
            }

            // Extract episodes
            val secondaryContents = root.optJSONObject("contents")
                ?.optJSONObject("twoColumnBrowseResultsRenderer")
                ?.optJSONObject("secondaryContents")
                ?.optJSONObject("sectionListRenderer")
                ?.optJSONArray("contents")

            if (secondaryContents != null) {
                for (i in 0 until secondaryContents.length()) {
                    val section = secondaryContents.optJSONObject(i) ?: continue
                    val musicShelf = section.optJSONObject("musicShelfRenderer")
                    if (musicShelf != null) {
                        val shelfContents = musicShelf.optJSONArray("contents")
                        if (shelfContents != null) {
                            extractPodcastEpisodesFromShelf(shelfContents, tracks, creator, creatorId, artworkUrl)
                        }
                    }
                }
            }

            return com.margelo.nitro.hyperextractor.PodcastShowDetails(
                title = podcastTitle, 
                creator = creator, 
                creatorId = creatorId,
                artworkUrl = artworkUrl, 
                episodes = tracks.toTypedArray()
            )
        } catch (e: Exception) {
            Logger.e("Parsers: Failed to parse Podcast Details", e)
            throw ParsingException("Failed to parse Podcast Details", cause = e)
        }
    }
}
