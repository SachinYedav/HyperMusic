package com.margelo.nitro.hyperextractor.engine

import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Custom OkHttp-backed downloader implementation satisfying the NewPipe Extractor networking contract.
 */
class NewPipeDownloader : Downloader() {
    private val client: OkHttpClient = OkHttpClient.Builder()
        .readTimeout(30, TimeUnit.SECONDS)
        .connectTimeout(30, TimeUnit.SECONDS)
        .build()

    companion object {
        val instance by lazy { NewPipeDownloader() }
    }

    /**
     * Translates and executes NewPipe extraction requests via OkHttp, mapping response payloads and headers back to NewPipe specifications.
     *
     * @param request The incoming NewPipe request specification.
     * @return Fully mapped NewPipe Response payload.
     */
    override fun execute(request: Request): Response {
        val method = request.httpMethod()
        val url = request.url()
        val headers = request.headers()
        val dataToSend = request.dataToSend()

        // Build OkHttp request from NewPipe specification parameters
        val builder = okhttp3.Request.Builder()
            .method(method, dataToSend?.toRequestBody())
            .url(url)

        headers?.forEach { (key, values) ->
            values?.forEach { value ->
                builder.addHeader(key, value)
            }
        }

        val okHttpRequest = builder.build()
        val okHttpResponse = client.newCall(okHttpRequest).execute()

        // Map OkHttp response headers into expected mutable map structure
        val responseHeaders = mutableMapOf<String, List<String>>()
        okHttpResponse.headers.names().forEach { name ->
            responseHeaders[name] = okHttpResponse.headers.values(name)
        }

        return Response(
            okHttpResponse.code,
            okHttpResponse.message,
            responseHeaders,
            okHttpResponse.body?.string() ?: "",
            okHttpResponse.request.url.toString()
        )
    }
}
