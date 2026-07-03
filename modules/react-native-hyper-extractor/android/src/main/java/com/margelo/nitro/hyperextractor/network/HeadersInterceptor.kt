package com.margelo.nitro.hyperextractor.network

import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp interceptor responsible for injecting mandatory InnerTube Web Remix request headers into all outgoing network requests.
 */
class HeadersInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        
        // Attach static browser simulation headers to satisfy InnerTube authorization contracts
        val requestBuilder = original.newBuilder()
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36")
            .header("Accept-Language", "en-US,en;q=0.9")
            .header("Origin", "https://music.youtube.com")
            .header("Referer", "https://music.youtube.com/")
            .header("Content-Type", "application/json")
            
        return chain.proceed(requestBuilder.build())
    }
}
