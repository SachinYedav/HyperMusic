package com.margelo.nitro.hyperextractor.engine

import org.json.JSONObject

object PayloadBuilder {

    /**
     * Builds the standard InnerTube context required for all API calls.
     */
    fun buildContext(): JSONObject {
        val context = JSONObject()
        val client = JSONObject()
        client.put("clientName", "WEB_REMIX")
        client.put("clientVersion", "1.20230524.01.00")
        client.put("hl", "en")
        client.put("gl", "IN") // Fetch Indian (IN) specific search results, charts, and home feed

        context.put("client", client)
        return context
    }

    /**
     * Builds the payload for the /search endpoint
     */
    fun buildSearchPayload(query: String): String {
        val payload = JSONObject()
        payload.put("context", buildContext())
        payload.put("query", query)
        return payload.toString()
    }

    /**
     * Builds the payload for the /player endpoint to get stream URLs
     */
    fun buildPlayerPayload(videoId: String): String {
        val payload = JSONObject()
        payload.put("context", buildContext())
        payload.put("videoId", videoId)
        return payload.toString()
    }

    /**
     * Builds the payload for the /music/get_search_suggestions endpoint
     */
    fun buildSearchSuggestionsPayload(query: String): String {
        val payload = JSONObject()
        payload.put("context", buildContext())
        payload.put("input", query)
        return payload.toString()
    }

    /**
     * Builds the payload for the /browse endpoint
     */
    fun buildBrowsePayload(browseId: String): String {
        val payload = JSONObject()
        payload.put("context", buildContext())
        if (browseId.contains("|||")) {
            val parts = browseId.split("|||")
            payload.put("browseId", parts[0])
            if (parts.size > 1 && parts[1].isNotEmpty()) {
                payload.put("params", parts[1])
            }
        } else {
            payload.put("browseId", browseId)
        }
        return payload.toString()
    }

    /**
     * Builds the payload for the /next endpoint to get a Radio queue
     */
    fun buildRadioPayload(videoId: String): String {
        val payload = JSONObject()
        payload.put("context", buildContext())
        payload.put("videoId", videoId)
        payload.put("playlistId", "RDAMVM$videoId")
        return payload.toString()
    }
}
