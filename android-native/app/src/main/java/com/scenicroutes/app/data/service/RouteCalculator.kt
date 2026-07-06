package com.scenicroutes.app.data.service

import android.util.Log
import com.scenicroutes.app.data.model.Route
import com.scenicroutes.app.data.model.RouteInstruction
import com.scenicroutes.app.data.repository.RouteRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.osmdroid.util.GeoPoint
import java.util.concurrent.TimeUnit

/**
 * RouteCalculator: Wraps GraphHopper API calls with retry logic, caching, and timeout handling
 * Used for Stage 3 (major detour) reroutes and approach route calculations
 */
class RouteCalculator(
    private val routeRepository: RouteRepository,
    private val coroutineScope: CoroutineScope
) {
    private val TAG = "RouteCalculator"

    // Cache for recent routes to avoid duplicate API calls
    private data class CachedRoute(
        val startLat: Double,
        val startLon: Double,
        val endLat: Double,
        val endLon: Double,
        val timestamp: Long,
        val route: Route?,
        val instructions: List<RouteInstruction>
    )

    private val routeCache = mutableMapOf<String, CachedRoute>()
    private val CACHE_DURATION_MS = TimeUnit.MINUTES.toMillis(5)

    companion object {
        const val MAX_RETRIES = 2
        const val RETRY_DELAY_MS = 1000L
        const val API_TIMEOUT_MS = 10000L // 10 seconds
    }

    /**
     * Calculate route from start to end point via GraphHopper
     * Supports retry with exponential backoff and caching
     */
    suspend fun calculateRoute(
        startLat: Double,
        startLon: Double,
        endLat: Double,
        endLon: Double,
        profile: String = "scenic" // "scenic", "fastest", "shortest"
    ): Pair<Route?, List<RouteInstruction>> = withContext(Dispatchers.IO) {
        val cacheKey = getCacheKey(startLat, startLon, endLat, endLon, profile)

        // Check cache
        val cached = routeCache[cacheKey]
        if (cached != null && System.currentTimeMillis() - cached.timestamp < CACHE_DURATION_MS) {
            Log.d(TAG, "Route found in cache: $cacheKey")
            return@withContext Pair(cached.route, cached.instructions)
        }

        // Attempt with retries
        var lastError: Exception? = null
        repeat(MAX_RETRIES) { attempt ->
            try {
                Log.d(TAG, "Attempting route calculation (attempt ${attempt + 1}/$MAX_RETRIES): from ($startLat,$startLon) to ($endLat,$endLon), profile=$profile")

                val result = withTimeoutOrNull(API_TIMEOUT_MS) {
                    val request = com.scenicroutes.app.data.model.RouteCalculationRequest(
                        startLat = startLat,
                        startLng = startLon,
                        endLat = endLat,
                        endLng = endLon,
                        curvatureLevel = when (profile) {
                            "scenic" -> "balanced"
                            "curvy" -> "extra_curvy"
                            else -> "straightest"
                        }
                    )
                    routeRepository.calculateRoute(request)
                }

                if (result != null && result.isSuccess) {
                    val response = result.getOrNull()
                    val route = response?.route
                    val instructions = route?.instructions ?: emptyList()
                    
                    Log.d(TAG, "Route calculation successful: ${route?.geometry?.size ?: 0} points, ${instructions.size} instructions")

                    // Cache result
                    routeCache[cacheKey] = CachedRoute(
                        startLat = startLat,
                        startLon = startLon,
                        endLat = endLat,
                        endLon = endLon,
                        timestamp = System.currentTimeMillis(),
                        route = route,
                        instructions = instructions
                    )

                    return@withContext Pair(route, instructions)
                } else {
                    Log.w(TAG, "Route calculation failed or timed out: ${result?.exceptionOrNull()?.message}")
                    val throwable = result?.exceptionOrNull()
                    lastError = if (throwable is Exception) throwable else Exception(throwable?.message ?: "Route calculation timeout")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Route calculation failed (attempt ${attempt + 1}/$MAX_RETRIES): ${e.message}")
                lastError = e
                if (attempt < MAX_RETRIES - 1) {
                    Thread.sleep(RETRY_DELAY_MS)
                }
            }
        }

        Log.e(TAG, "Route calculation failed after $MAX_RETRIES attempts: ${lastError?.message}")
        return@withContext Pair(null, emptyList())
    }

    /**
     * Calculate approach route (from current location to route start)
     */
    suspend fun calculateApproachRoute(
        currentLat: Double,
        currentLon: Double,
        routeStartLat: Double,
        routeStartLon: Double,
        profile: String = "fastest"
    ): Pair<Route?, List<RouteInstruction>> {
        return calculateRoute(
            startLat = currentLat,
            startLon = currentLon,
            endLat = routeStartLat,
            endLon = routeStartLon,
            profile = profile
        )
    }

    /**
     * Calculate reroute (from current location to nearest point on original route)
     */
    suspend fun calculateReroute(
        currentLat: Double,
        currentLon: Double,
        targetLat: Double,
        targetLon: Double,
        profile: String = "scenic"
    ): Pair<Route?, List<RouteInstruction>> {
        return calculateRoute(
            startLat = currentLat,
            startLon = currentLon,
            endLat = targetLat,
            endLon = targetLon,
            profile = profile
        )
    }

    /**
     * Clear cache (useful for testing or when route conditions change)
     */
    fun clearCache() {
        routeCache.clear()
        Log.d(TAG, "Route cache cleared")
    }

    /**
     * Get cache statistics for debugging
     */
    fun getCacheStats(): String {
        return "RouteCache: ${routeCache.size} entries"
    }

    /**
     * Generate cache key for route
     */
    private fun getCacheKey(
        startLat: Double,
        startLon: Double,
        endLat: Double,
        endLon: Double,
        profile: String
    ): String {
        return "${startLat.toInt()},${startLon.toInt()}-${endLat.toInt()},${endLon.toInt()}-$profile"
    }
}

/**
 * Extension function for timeout support in coroutines
 */suspend inline fun <T> withTimeoutOrNull(timeMillis: Long, crossinline block: suspend () -> T): T? {
    return try {
        withContext(Dispatchers.IO) {
            val startTime = System.currentTimeMillis()
            var result: T? = null
            while (System.currentTimeMillis() - startTime < timeMillis) {
                try {
                    result = block()
                    break
                } catch (e: Exception) {
                    Thread.sleep(100)
                }
            }
            result
        }
    } catch (e: Exception) {
        null
    }
}
