package com.margelo.nitro.hyperextractor.network

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import com.margelo.nitro.hyperextractor.errors.NetworkException
import java.util.concurrent.TimeUnit
import java.io.IOException

/**
 * Centralized OkHttpClient singleton manager configured with required connection timeouts and mandatory header interceptors.
 */
object NetworkClient {
    // Lazily initialized OkHttpClient instance shared across all network execution calls
    val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(HeadersInterceptor())
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Executes an OkHttp request synchronously, validating the response status code and mapping IO failures to domain NetworkExceptions.
     *
     * @param request The fully configured OkHttp Request instance to dispatch.
     * @return Validated OkHttp Response instance upon successful 2xx execution.
     */
    @Throws(NetworkException::class)
    fun executeSync(request: Request): Response {
        try {
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                throw NetworkException(
                    message = "HTTP Error: ${response.code} - ${response.message}",
                    statusCode = response.code
                )
            }
            return response
        } catch (e: IOException) {
            throw NetworkException("Failed to execute request to ${request.url}", cause = e)
        }
    }
}
