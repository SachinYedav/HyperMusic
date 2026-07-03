package com.margelo.nitro.hyperextractor.engine

import com.margelo.nitro.hyperextractor.utils.Logger
import org.json.JSONObject
import org.json.JSONArray

/**
 * Resolves real-time taxonomy identifiers and browse parameters by scraping explore landing pages and home feed chip clouds.
 * Replaces static fallback mappings with live dynamic lookup to maintain API contract alignment.
 */
object DynamicChipResolver {

    private var cachedMoodsResponse: String? = null
    private var cachedMoodsTimestamp: Long = 0

    private var cachedHomeResponse: String? = null
    private var cachedHomeTimestamp: Long = 0

    private const val CACHE_DURATION_MS = 1000 * 60 * 30 // Cache responses for 30 minutes

    /**
     * Dynamically resolves the active browse identifier and parameter tuple for a given taxonomy chip name.
     * Operates via a two-phase fallback routine scraping explore landing pages and home feed chip clouds.
     *
     * @param chipName Display title of the target category chip.
     * @param fetchBrowse Callback routine to execute synchronous browse requests.
     * @return Resolved browseId and parameter tuple string.
     */
    fun resolveChipParam(chipName: String, fetchBrowse: (String) -> String): String {
        val categoryName = chipName.trim()
        Logger.d("DynamicChipResolver: Resolving live chip params for '$categoryName'...")

        val now = System.currentTimeMillis()

        // --- PHASE 1: Scrape FEmusic_moods_and_genres (Explore Grid Items) ---
        try {
            // 1. Validate cache freshness or request updated browse payload
            val moodsJsonString = if (cachedMoodsResponse != null && (now - cachedMoodsTimestamp) < CACHE_DURATION_MS) {
                Logger.d("DynamicChipResolver: Using cached FEmusic_moods_and_genres response")
                cachedMoodsResponse!!
            } else {
                Logger.d("DynamicChipResolver: Fetching fresh FEmusic_moods_and_genres response to discover live grid items...")
                val fresh = fetchBrowse("FEmusic_moods_and_genres")
                cachedMoodsResponse = fresh
                cachedMoodsTimestamp = now
                fresh
            }

            // 2. Locate top-level browse results renderer
            val json = JSONObject(moodsJsonString)
            val contents = json.optJSONObject("contents")
            val browseResults = contents?.optJSONObject("singleColumnBrowseResultsRenderer") 
                ?: contents?.optJSONObject("twoColumnBrowseResultsRenderer")

            // 3. Extract active tab section list contents
            val tabs = browseResults?.optJSONArray("tabs")
            val tabRenderer = tabs?.optJSONObject(0)?.optJSONObject("tabRenderer")
            val sectionList = tabRenderer?.optJSONObject("content")?.optJSONObject("sectionListRenderer")
            val sections = sectionList?.optJSONArray("contents")

            // 4. Traverse underlying grids to match target category name
            if (sections != null) {
                for (i in 0 until sections.length()) {
                    val grid = sections.optJSONObject(i)?.optJSONObject("gridRenderer")
                    val items = grid?.optJSONArray("items")
                    if (items != null) {
                        for (j in 0 until items.length()) {
                            val itemObj = items.optJSONObject(j)
                            val navBtn = itemObj?.optJSONObject("musicNavigationButtonRenderer")
                            val gridItem = itemObj?.optJSONObject("gridCategoryItemRenderer")

                            val targetRenderer = navBtn ?: gridItem
                            if (targetRenderer != null) {
                                // 5. Parse display title runs
                                val textRuns = targetRenderer.optJSONObject("buttonText")?.optJSONArray("runs")
                                    ?: targetRenderer.optJSONObject("title")?.optJSONArray("runs")
                                val itemText = textRuns?.optJSONObject(0)?.optString("text")

                                if (itemText != null && itemText.equals(categoryName, ignoreCase = true)) {
                                    // 6. Extract browseId and optional parameter tuples
                                    val endpoint = targetRenderer.optJSONObject("clickCommand")
                                        ?: targetRenderer.optJSONObject("navigationEndpoint")
                                    val browseEndpoint = endpoint?.optJSONObject("browseEndpoint")
                                    
                                    val targetBrowseId = browseEndpoint?.optString("browseId")
                                    val targetParams = browseEndpoint?.optString("params")

                                    if (!targetBrowseId.isNullOrEmpty()) {
                                        if (!targetParams.isNullOrEmpty()) {
                                            Logger.d("DynamicChipResolver: Found matching grid item for '$categoryName': $targetBrowseId|||$targetParams")
                                            return "$targetBrowseId|||$targetParams"
                                        } else {
                                            Logger.d("DynamicChipResolver: Found matching standalone grid item for '$categoryName': $targetBrowseId")
                                            return targetBrowseId
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Logger.d("DynamicChipResolver: '$categoryName' not found in Moods grid, falling back to Home Chip Cloud...")
        } catch (e: Exception) {
            Logger.e("DynamicChipResolver: Failed during Phase 1 scraping for '$categoryName'", e)
        }

        // --- PHASE 2: Scrape FEmusic_home Chip Cloud (Home Filter Chips) ---
        try {
            // 1. Validate cache freshness or request updated home feed payload
            val homeJsonString = if (cachedHomeResponse != null && (now - cachedHomeTimestamp) < CACHE_DURATION_MS) {
                Logger.d("DynamicChipResolver: Using cached FEmusic_home response")
                cachedHomeResponse!!
            } else {
                Logger.d("DynamicChipResolver: Fetching fresh FEmusic_home response to discover live chip params...")
                val fresh = fetchBrowse("FEmusic_home")
                cachedHomeResponse = fresh
                cachedHomeTimestamp = now
                fresh
            }

            // 2. Locate top-level browse results renderer
            val json = JSONObject(homeJsonString)
            val contents = json.optJSONObject("contents")
            val browseResults = contents?.optJSONObject("singleColumnBrowseResultsRenderer") 
                ?: contents?.optJSONObject("twoColumnBrowseResultsRenderer")

            // 3. Locate header chip cloud renderer
            val tabs = browseResults?.optJSONArray("tabs")
            val tabRenderer = tabs?.optJSONObject(0)?.optJSONObject("tabRenderer")
            val sectionList = tabRenderer?.optJSONObject("content")?.optJSONObject("sectionListRenderer")
            val chipCloud = sectionList?.optJSONObject("header")?.optJSONObject("chipCloudRenderer")
            val chips = chipCloud?.optJSONArray("chips")

            // 4. Inspect chip cloud elements for matching titles
            if (chips != null) {
                for (i in 0 until chips.length()) {
                    val chipObj = chips.optJSONObject(i)?.optJSONObject("chipCloudChipRenderer")
                    if (chipObj != null) {
                        val textRuns = chipObj.optJSONObject("text")?.optJSONArray("runs")
                        val chipText = textRuns?.optJSONObject(0)?.optString("text")
                        if (chipText != null && chipText.equals(categoryName, ignoreCase = true)) {
                            // 5. Extract target parameters for home navigation
                            val params = chipObj.optJSONObject("navigationEndpoint")
                                ?.optJSONObject("browseEndpoint")
                                ?.optString("params")

                            if (!params.isNullOrEmpty()) {
                                Logger.d("DynamicChipResolver: Successfully extracted live home chip params for '$categoryName': $params")
                                return "FEmusic_home|||$params"
                            }
                        }
                    }
                }
            }
            Logger.w("DynamicChipResolver: Chip '$categoryName' not found in live Home response.")
        } catch (e: Exception) {
            Logger.e("DynamicChipResolver: Failed during Phase 2 scraping for '$categoryName'", e)
        }

        // Ultimate Fallback: Return default new releases feed if dynamic matching fails
        Logger.w("DynamicChipResolver: No dynamic mapping found for '$categoryName', returning default FEmusic_new_releases")
        return "FEmusic_new_releases"
    }
}
