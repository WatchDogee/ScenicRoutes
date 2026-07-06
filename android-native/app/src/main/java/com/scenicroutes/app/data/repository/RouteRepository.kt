package com.scenicroutes.app.data.repository

import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.model.*
import com.scenicroutes.app.data.network.NetworkModule

class RouteRepository {
    private val apiService: ApiService = NetworkModule.apiService

    suspend fun calculateRoute(
        request: RouteCalculationRequest,
        token: String? = null,
    ): Result<RouteCalculationResponse> {
        return calculateRouteWithRetry(request, token, maxRetries = 4)
    }
    
    /**
     * Calculate route with rate limit retry handling
     * Retries up to maxRetries times with progressive delays when rate limited (429)
     */
    private suspend fun calculateRouteWithRetry(
        request: RouteCalculationRequest,
        token: String?,
        maxRetries: Int = 4,
        attempt: Int = 0
    ): Result<RouteCalculationResponse> {
        return try {
            // Try GraphHopper endpoint first (more robust, supports all features)
            android.util.Log.d("RouteRepository", "Attempting route calculation via GraphHopper endpoint (attempt ${attempt + 1}/$maxRetries)")
            var response = apiService.calculateRouteGraphHopper(request)
            
            // If GraphHopper fails, fall back to basic calculate endpoint
            if (!response.isSuccessful) {
                android.util.Log.w("RouteRepository", "GraphHopper endpoint failed (${response.code()}), trying basic calculate endpoint")
                response = apiService.calculateRoute(request)
            }
            
            // Handle rate limit (429) or service unavailable (503) with retry
            // 503 often indicates rate limit on GraphHopper Cloud API
            // For extra_curvy, reduce retry delays since it's already slow
            if ((response.code() == 429 || response.code() == 503) && attempt < maxRetries) {
                val isExtraCurvy = request.curvatureLevel == "extra_curvy"
                val waitTime = if (isExtraCurvy) {
                    // Shorter delays for extra_curvy: 1s, 2s, 3s, 4s
                    (attempt + 1)
                } else {
                    // Standard delays: 3s, 6s, 9s, 12s
                    3 * (attempt + 1)
                }
                android.util.Log.w("RouteRepository", "Rate limited (${response.code()}), waiting ${waitTime}s before retry (attempt ${attempt + 1}/$maxRetries)")
                kotlinx.coroutines.delay(waitTime * 1000L)
                return calculateRouteWithRetry(request, token, maxRetries, attempt + 1)
            }
            
            if (response.isSuccessful) {
                // Parse response body - handle both single route and alternative routes formats
                val responseBody = response.body()
                if (responseBody != null) {
                    // Try to parse as alternative routes format first
                    try {
                        // Use peekBody to read without consuming
                        val peekBody = response.raw().peekBody(Long.MAX_VALUE)
                        val jsonString = peekBody.string()
                        val gson = com.google.gson.Gson()
                        val jsonObject = gson.fromJson(jsonString, com.google.gson.JsonObject::class.java)
                        
                        // Check if it's alternative routes format: { routes: [...], alternative_routes: true }
                        if (jsonObject.has("routes") && jsonObject.has("alternative_routes") && jsonObject.get("alternative_routes").asBoolean) {
                            val routesArray = jsonObject.getAsJsonArray("routes")
                            val routes = routesArray.mapNotNull { routeElement ->
                                try {
                                    val routeJson = routeElement.asJsonObject
                                    val routeResponse = gson.fromJson(routeJson, RouteApiResponse::class.java)
                                    routeResponse.toRoute()
                                } catch (e: Exception) {
                                    android.util.Log.e("RouteRepository", "Error parsing alternative route: ${e.message}")
                                    null
                                }
                            }.filter { it.geometry.isNotEmpty() && it.distance > 0 }
                            
                            if (routes.isNotEmpty()) {
                                android.util.Log.d("RouteRepository", "Parsed ${routes.size} alternative routes")
                                return Result.success(RouteCalculationResponse(
                                    route = routes.first(),
                                    alternativeRoutes = if (routes.size > 1) routes.drop(1) else null
                                ))
                            } else {
                                android.util.Log.w("RouteRepository", "Alternative routes format but no valid routes found")
                                return Result.failure(Exception("No valid alternative routes found"))
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.d("RouteRepository", "Not alternative routes format, parsing as single route: ${e.message}")
                    }
                    
                    // Fallback to single route parsing (standard format)
                    val route = responseBody.toRoute()
                    
                    // Validate route before returning
                    if (route.geometry.isEmpty() || route.distance <= 0) {
                        android.util.Log.e("RouteRepository", "Route calculation returned invalid route: geometry=${route.geometry.size}, distance=${route.distance}m")
                        Result.failure(Exception("Invalid route returned: no geometry or zero distance"))
                    } else {
                        Result.success(RouteCalculationResponse(route = route))
                    }
                } else {
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "No error body"
                android.util.Log.e("RouteRepository", "Route calculation failed: ${response.code()} ${response.message()}")
                android.util.Log.e("RouteRepository", "Error body: $errorBody")
                
                // Don't retry authentication errors (401, 403) - these are permanent failures
                val errorCode = response.code()
                if (errorCode == 401 || errorCode == 403) {
                    val errorMessage = try {
                        val errorJson = com.google.gson.Gson().fromJson(errorBody, Map::class.java)
                        (errorJson["error"] as? String) ?: (errorJson["message"] as? String) ?: errorBody
                    } catch (e: Exception) {
                        errorBody
                    }
                    android.util.Log.e("RouteRepository", "Authentication error (code=$errorCode): $errorMessage")
                    return Result.failure(Exception(errorMessage))
                }
                
                // Check for rate limit in error message or status code
                val isRateLimit = errorCode == 429 || errorCode == 503 ||
                    errorBody.contains("rate limit", ignoreCase = true) ||
                    errorBody.contains("limit reached", ignoreCase = true) ||
                    errorBody.contains("temporarily unavailable", ignoreCase = true)
                
                if (isRateLimit && attempt < maxRetries) {
                    val isExtraCurvy = request.curvatureLevel == "extra_curvy"
                    val waitTime = if (isExtraCurvy) {
                        // Shorter delays for extra_curvy: 1s, 2s, 3s, 4s
                        (attempt + 1)
                    } else {
                        // Standard delays: 3s, 6s, 9s, 12s
                        3 * (attempt + 1)
                    }
                    android.util.Log.w("RouteRepository", "Rate limit detected (code=$errorCode), waiting ${waitTime}s before retry")
                    kotlinx.coroutines.delay(waitTime * 1000L)
                    return calculateRouteWithRetry(request, token, maxRetries, attempt + 1)
                }
                
                // Try to parse error message from JSON response
                val errorMessage = try {
                    val errorJson = com.google.gson.Gson().fromJson(errorBody, Map::class.java)
                    (errorJson["error"] as? String) ?: (errorJson["message"] as? String) ?: errorBody
                } catch (e: Exception) {
                    errorBody
                }
                
                Result.failure(Exception("Route calculation failed: $errorMessage"))
            }
        } catch (e: Exception) {
            android.util.Log.e("RouteRepository", "Exception during route calculation: ${e.message}", e)
            
            // Check if it's a network timeout/error that might benefit from retry
            val isRetryable = e.message?.contains("timeout", ignoreCase = true) == true ||
                             e.message?.contains("network", ignoreCase = true) == true ||
                             e.message?.contains("429", ignoreCase = true) == true
            
            if (isRetryable && attempt < maxRetries) {
                val waitTime = 3 * (attempt + 1)
                android.util.Log.w("RouteRepository", "Retryable error detected, waiting ${waitTime}s before retry")
                kotlinx.coroutines.delay(waitTime * 1000L)
                return calculateRouteWithRetry(request, token, maxRetries, attempt + 1)
            }
            
            Result.failure(e)
        }
    }

    suspend fun calculateCurvedRoute(
        request: RouteCalculationRequest,
        token: String? = null,
    ): Result<RouteCalculationResponse> {
        return try {
            val response = apiService.calculateCurvedRoute(request)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                val route = apiResponse.toRoute()
                Result.success(RouteCalculationResponse(route = route))
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun calculateRoundTrip(
        request: RoundTripRequest,
        token: String? = null,
    ): Result<RouteCalculationResponse> {
        return calculateRoundTripWithRetry(request, token, maxRetries = 5)
    }
    
    /**
     * Calculate round trip with rate limit retry handling
     * Retries up to maxRetries times with progressive delays when rate limited (429)
     */
    private suspend fun calculateRoundTripWithRetry(
        request: RoundTripRequest,
        token: String?,
        maxRetries: Int = 5,
        attempt: Int = 0
    ): Result<RouteCalculationResponse> {
        return try {
            if (token == null) {
                return Result.failure(Exception("Authentication required for round trip"))
            }
            
            android.util.Log.d("RouteRepository", "Attempting round trip calculation (attempt ${attempt + 1}/$maxRetries)")
            val response = apiService.calculateRoundTrip("Bearer $token", request)
            
            val errorCode = response.code()
            
            // Don't retry authentication errors (401, 403) - these are permanent failures
            if (errorCode == 401 || errorCode == 403) {
                val errorBody = response.errorBody()?.string() ?: "Authentication failed"
                val errorMessage = try {
                    val errorJson = com.google.gson.Gson().fromJson(errorBody, Map::class.java)
                    (errorJson["error"] as? String) ?: (errorJson["message"] as? String) ?: errorBody
                } catch (e: Exception) {
                    errorBody
                }
                android.util.Log.e("RouteRepository", "Authentication error (code=$errorCode) for round trip: $errorMessage")
                return Result.failure(Exception(errorMessage))
            }
            
            // Handle rate limit (429) or service unavailable (503) with retry
            // 503 often indicates rate limit on GraphHopper Cloud API
            // Optimize delays for extra_curvy round trips
            if ((errorCode == 429 || errorCode == 503) && attempt < maxRetries) {
                val isExtraCurvy = request.curvatureLevel == "extra_curvy"
                val waitTime = if (isExtraCurvy) {
                    // Shorter delays for extra_curvy: 1s, 2s, 3s, 4s, 5s
                    (attempt + 1)
                } else {
                    // Standard delays: 2s, 4s, 6s, 8s, 10s
                    if (attempt == 0) 2 else (attempt * 2)
                }
                android.util.Log.w("RouteRepository", "Rate limited (code=$errorCode) for round trip, waiting ${waitTime}s before retry (attempt ${attempt + 1}/$maxRetries)")
                kotlinx.coroutines.delay(waitTime * 1000L)
                return calculateRoundTripWithRetry(request, token, maxRetries, attempt + 1)
            }
            
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                val route = apiResponse.toRoute()
                
                // Validate route before returning
                if (route.geometry.isEmpty() || route.distance <= 0) {
                    android.util.Log.e("RouteRepository", "Round trip returned invalid route: geometry=${route.geometry.size}, distance=${route.distance}m")
                    Result.failure(Exception("Invalid route returned: no geometry or zero distance"))
                } else {
                    Result.success(RouteCalculationResponse(route = route))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "No error body"
                android.util.Log.e("RouteRepository", "Round trip calculation failed: ${response.code()} ${response.message()}")
                android.util.Log.e("RouteRepository", "Error body: $errorBody")
                
                // Don't retry authentication errors
                val errorCode = response.code()
                if (errorCode == 401 || errorCode == 403) {
                    val errorMessage = try {
                        val errorJson = com.google.gson.Gson().fromJson(errorBody, Map::class.java)
                        (errorJson["error"] as? String) ?: (errorJson["message"] as? String) ?: errorBody
                    } catch (e: Exception) {
                        errorBody
                    }
                    android.util.Log.e("RouteRepository", "Authentication error (code=$errorCode) for round trip: $errorMessage")
                    return Result.failure(Exception(errorMessage))
                }
                
                // Check for rate limit in error message
                val isRateLimit = errorCode == 429 || errorCode == 503 ||
                    errorBody.contains("rate limit", ignoreCase = true) ||
                    errorBody.contains("limit reached", ignoreCase = true)

                if (isRateLimit && attempt < maxRetries) {
                    val isExtraCurvy = request.curvatureLevel == "extra_curvy"
                    val waitTime = if (isExtraCurvy) {
                        // Shorter delays for extra_curvy: 1s, 2s, 3s, 4s, 5s
                        (attempt + 1)
                    } else {
                        // Standard delays: 2s, 4s, 6s, 8s, 10s
                        attempt * 2 + 2
                    }
                    android.util.Log.w("RouteRepository", "Rate limit detected in round trip error (code=$errorCode), waiting ${waitTime}s before retry")
                    kotlinx.coroutines.delay(waitTime * 1000L)
                    return calculateRoundTripWithRetry(request, token, maxRetries, attempt + 1)
                }
                
                // Try to parse error message from JSON response
                val errorMessage = try {
                    val errorJson = com.google.gson.Gson().fromJson(errorBody, Map::class.java)
                    (errorJson["error"] as? String) ?: (errorJson["message"] as? String) ?: errorBody
                } catch (e: Exception) {
                    errorBody
                }
                
                Result.failure(Exception("Route calculation failed: $errorMessage"))
            }
        } catch (e: Exception) {
            android.util.Log.e("RouteRepository", "Exception during round trip calculation: ${e.message}", e)
            
            // Check if it's a network timeout/error that might benefit from retry
            val isRetryable = e.message?.contains("timeout", ignoreCase = true) == true ||
                             e.message?.contains("network", ignoreCase = true) == true ||
                             e.message?.contains("connection", ignoreCase = true) == true ||
                             e.message?.contains("429", ignoreCase = true) == true ||
                             e.message?.contains("503", ignoreCase = true) == true
            
            if (isRetryable && attempt < maxRetries) {
                val waitTime = if (attempt == 0) 2 else (attempt * 2)
                android.util.Log.w("RouteRepository", "Retryable error in round trip, waiting ${waitTime}s before retry")
                kotlinx.coroutines.delay(waitTime * 1000L)
                return calculateRoundTripWithRetry(request, token, maxRetries, attempt + 1)
            }
            
            // If all retries exhausted, return user-friendly error message
            val errorMessage = if (attempt >= maxRetries - 1) {
                "Route calculation temporarily unavailable due to rate limits. Please wait 1-2 minutes and try again."
            } else {
                e.message ?: "Round trip calculation failed"
            }
            
            Result.failure(Exception(errorMessage))
        }
    }

    suspend fun calculateSegmentCurvatureRoute(
        request: SegmentCurvatureRequest,
        token: String? = null,
    ): Result<RouteCalculationResponse> {
        return try {
            val response = apiService.calculateSegmentCurvatureRoute(request)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                val route = apiResponse.toRoute()
                Result.success(RouteCalculationResponse(route = route))
            } else {
                Result.failure(Exception(response.message() ?: "Failed to calculate segment curvature route"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Reroute from current location to destination
     * Used when user goes off-route during navigation
     */
    suspend fun rerouteToDestination(
        currentLatitude: Double,
        currentLongitude: Double,
        destinationLatitude: Double,
        destinationLongitude: Double,
        routingProfile: String = "scenic"
    ): Result<RouteCalculationResponse> {
        val rerouteRequest = RouteCalculationRequest(
            startLat = currentLatitude,
            startLng = currentLongitude,
            endLat = destinationLatitude,
            endLng = destinationLongitude,
            curvatureLevel = if (routingProfile == "scenic") "extra_curvy" else null,
            waypoints = null,
            avoidOptions = null,
            alternativeRoutes = false,
            savedRoadIds = null
        )
        
        return calculateRoute(rerouteRequest)
    }
}
