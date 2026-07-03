package com.margelo.nitro.hyperextractor.errors

/**
 * Root sealed hierarchy representing all internal execution, parsing, and network failures originating within the native extractor engine.
 */
sealed class ExtractorException(message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Exception thrown when OkHttp encounters connection timeouts, invalid responses, or non-2xx HTTP status codes.
 */
class NetworkException(
    message: String, 
    val statusCode: Int? = null,
    cause: Throwable? = null
) : ExtractorException(message, cause)

/**
 * Exception thrown when JSON object traversal fails or structural contracts are violated during payload parsing.
 */
class ParsingException(
    message: String,
    val jsonPath: String? = null,
    cause: Throwable? = null
) : ExtractorException(message, cause)

/**
 * Exception thrown during core engine orchestration, NewPipe stream resolution, or bridge payload conversion failures.
 */
class EngineException(
    message: String,
    cause: Throwable? = null
) : ExtractorException(message, cause)
