package com.scenicroutes.app.data.model

import com.google.gson.annotations.SerializedName
import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonWriter
import com.google.gson.stream.JsonToken
import java.io.EOFException
import java.io.IOException

data class Route(
    val distance: Double,
    val time: Long,
    val geometry: List<List<Double>>, // [[lat, lng], ...]
    val instructions: List<RouteInstruction>? = null,
    val curvature: Double? = null,
    val curvatureLevel: String? = null, // "straightest", "mellow", "curved", "extra_curvy"
    val waypoints: List<Waypoint>? = null,
)

data class RouteInstruction(
    val text: String,
    val distance: Double,
    val time: Long,
    val geometry: List<List<Double>>? = null,
    @SerializedName("speed_limit") val speedLimit: Int? = null, // km/h - from GraphHopper maxspeed
)

data class Waypoint(
    val lat: Double,
    @SerializedName("lon") val lng: Double, // Backend expects "lon" not "lng"
    val name: String? = null,
)

data class RouteCalculationRequest(
    @SerializedName("start_lat") val startLat: Double,
    @SerializedName("start_lon") val startLng: Double, // Backend expects "start_lon" not "start_lng"
    @SerializedName("end_lat") val endLat: Double,
    @SerializedName("end_lon") val endLng: Double, // Backend expects "end_lon" not "end_lng"
    val waypoints: List<Waypoint>? = null,
    @SerializedName("curvature_level") val curvatureLevel: String? = null, // "straightest", "balanced", "curvy", "extra_curvy"
    @SerializedName("avoid_options") val avoidOptions: AvoidOptions? = null,
    @SerializedName("alternative_routes") val alternativeRoutes: Boolean = false, // Backend expects "alternative_routes"
    @SerializedName("saved_road_ids") val savedRoadIds: List<Long>? = null, // IDs of saved roads to include in route
    @SerializedName("points_encoded") val pointsEncoded: Boolean = true, // false = higher density polyline for navigation
    @SerializedName("elevation") val elevation: Boolean = false, // Request elevation data
    @SerializedName("details") val details: List<String>? = null, // Request additional route details
)

data class AvoidOptions(
    val highways: Boolean = false,
    val unpaved: Boolean = false,
    val tolls: Boolean = false,
    val ferries: Boolean = false,
)

// Raw API response structure
data class RouteApiResponse(
    @SerializedName("coordinates") val coordinates: List<List<Double>>,
    @SerializedName("distance") val distance: Double,
    @SerializedName("duration") val duration: Double,
    @SerializedName("distance_km") val distanceKm: Double? = null,
    @SerializedName("duration_min") val durationMinutes: Double? = null,
    @SerializedName("type") val type: String? = null,
    @SerializedName("curvature") val curvature: Double? = null,
    @SerializedName("corner_count") val cornerCount: Int? = null,
    @SerializedName("elevation_gain") val elevationGain: Double? = null,
    @SerializedName("elevation_loss") val elevationLoss: Double? = null,
    @SerializedName("max_elevation") val maxElevation: Double? = null,
    @SerializedName("min_elevation") val minElevation: Double? = null,
    @SerializedName("instructions") val instructions: List<RouteInstruction>? = null, // Turn-by-turn instructions for navigation
) {
    // Convert to Route model with coordinate validation
    fun toRoute(): Route {
        android.util.Log.d("RouteApiResponse", "Converting API response to Route: coordinates=${coordinates.size}, distance=$distance, duration=$duration")
        
        // Filter out invalid coordinates (e.g., numbers instead of arrays, arrays with wrong size)
        val validCoordinates = coordinates.filterIndexed { index, coord ->
            val isValid = coord.size >= 2 && coord.all { it.isFinite() }
            if (!isValid) {
                android.util.Log.w("RouteApiResponse", "Invalid coordinate at index $index: $coord (size=${coord.size})")
            }
            isValid
        }
        
        if (validCoordinates.size < coordinates.size) {
            android.util.Log.w("RouteApiResponse", "Filtered out ${coordinates.size - validCoordinates.size} invalid coordinates. Valid: ${validCoordinates.size}/${coordinates.size}")
        }
        
        // Prefer explicit km/min fields when present to avoid unit drift from backend
        val distanceMeters = distanceKm?.let { it * 1000 } ?: distance
        val durationMillis = durationMinutes?.let { (it * 60 * 1000).toLong() } ?: (duration * 1000).toLong()

        return Route(
            distance = distanceMeters,
            time = durationMillis, // Duration in milliseconds
            geometry = validCoordinates,
            instructions = instructions, // Pass through instructions from API for voice guidance
            curvature = curvature,
            curvatureLevel = type,
            waypoints = null,
        )
    }
}

/**
 * Custom TypeAdapter for RouteApiResponse that handles malformed coordinates
 * (e.g., numbers instead of arrays in the coordinates array)
 */
class RouteApiResponseTypeAdapter : TypeAdapter<RouteApiResponse>() {
    @Throws(IOException::class)
    override fun write(out: JsonWriter, value: RouteApiResponse) {
        throw UnsupportedOperationException("Writing RouteApiResponse not implemented")
    }

    @Throws(IOException::class)
    override fun read(`in`: JsonReader): RouteApiResponse {
        // Be permissive: backend sometimes appends diagnostic fields (_strategic_waypoint_count, etc.)
        // and can truncate bodies; we parse what we can and return a partial object instead of failing.
        `in`.isLenient = true

        var coordinates: List<List<Double>> = emptyList()
        var distance: Double = 0.0
        var duration: Double = 0.0
        var type: String? = null
        var curvature: Double? = null
        var cornerCount: Int? = null
        var elevationGain: Double? = null
        var elevationLoss: Double? = null
        var maxElevation: Double? = null
        var minElevation: Double? = null

        try {
            `in`.beginObject()
            while (true) {
                // Check if there are more fields; handle EOF gracefully
                val hasNext = try {
                    `in`.hasNext()
                } catch (e: EOFException) {
                    android.util.Log.w("RouteApiResponseTypeAdapter", "EOF while checking hasNext: ${e.message}")
                    false  // No more fields available
                }
                if (!hasNext) break

                // Read the field name; handle EOF at this boundary
                val nameOrNull = try {
                    `in`.nextName()
                } catch (e: EOFException) {
                    android.util.Log.w("RouteApiResponseTypeAdapter", "EOF before reading field name: ${e.message}")
                    null  // Field name could not be read due to EOF
                }
                if (nameOrNull == null) break  // Exit if we couldn't read field name
                val name = nameOrNull

                try {
                    when (name) {
                        "coordinates" -> coordinates = parseCoordinates(`in`)
                        "distance" -> distance = `in`.nextDouble()
                        "duration" -> duration = `in`.nextDouble()
                        "type" -> type = if (`in`.peek() == JsonToken.NULL) {
                            `in`.nextNull()
                            null
                        } else {
                            `in`.nextString()
                        }
                        "curvature" -> curvature = if (`in`.peek() == JsonToken.NULL) {
                            `in`.nextNull()
                            null
                        } else {
                            `in`.nextDouble()
                        }
                        "corner_count" -> cornerCount = if (`in`.peek() == JsonToken.NULL) {
                            `in`.nextNull()
                            null
                        } else {
                            `in`.nextInt()
                        }
                        "elevation_gain" -> elevationGain = if (`in`.peek() == JsonToken.NULL) {
                            `in`.nextNull()
                            null
                        } else {
                            `in`.nextDouble()
                        }
                        "elevation_loss" -> elevationLoss = if (`in`.peek() == JsonToken.NULL) {
                            `in`.nextNull()
                            null
                        } else {
                            `in`.nextDouble()
                        }
                        "max_elevation" -> maxElevation = if (`in`.peek() == JsonToken.NULL) {
                            `in`.nextNull()
                            null
                        } else {
                            `in`.nextDouble()
                        }
                        "min_elevation" -> minElevation = if (`in`.peek() == JsonToken.NULL) {
                            `in`.nextNull()
                            null
                        } else {
                            `in`.nextDouble()
                        }
                        // Fields we intentionally ignore but must consume
                        "distance_km", "duration_min", "instructions", "waypoints",
                        "_api_stats", "_free_plan_limitation", "_curvature_simulation", "_strategic_waypoint_count" -> safeSkip(`in`)
                        else -> safeSkip(`in`)
                    }
                } catch (e: EOFException) {
                    android.util.Log.w("RouteApiResponseTypeAdapter", "EOF while parsing field '$name': ${e.message}")
                    break
                } catch (e: Exception) {
                    android.util.Log.w("RouteApiResponseTypeAdapter", "Error parsing field '$name', skipping: ${e.message}")
                    safeSkip(`in`)
                }
            }
            try {
                `in`.endObject()
            } catch (ignored: Exception) {
                // Body may already be consumed or truncated; safe to ignore
            }
        } catch (e: Exception) {
            android.util.Log.e("RouteApiResponseTypeAdapter", "Error parsing JSON response: ${e.message}", e)
        }

        return RouteApiResponse(
            coordinates = coordinates,
            distance = distance,
            duration = duration,
            type = type,
            curvature = curvature,
            cornerCount = cornerCount,
            elevationGain = elevationGain,
            elevationLoss = elevationLoss,
            maxElevation = maxElevation,
            minElevation = minElevation,
        )
    }

    private fun safeSkip(`in`: JsonReader) {
        try {
            `in`.skipValue()
        } catch (e: Exception) {
            android.util.Log.w("RouteApiResponseTypeAdapter", "Failed to skip value: ${e.message}")
        }
    }

    private fun parseCoordinates(`in`: JsonReader): List<List<Double>> {
        val coordinates = mutableListOf<List<Double>>()
        var invalidCount = 0

        `in`.beginArray()
        while (`in`.hasNext()) {
            when (`in`.peek()) {
                JsonToken.BEGIN_ARRAY -> {
                    // Valid coordinate array [lat, lon]
                    `in`.beginArray()
                    val coord = mutableListOf<Double>()
                    while (`in`.hasNext()) {
                        coord.add(`in`.nextDouble())
                    }
                    `in`.endArray()
                    
                    // Validate coordinate (must have at least 2 values, all must be finite)
                    if (coord.size >= 2 && coord.all { it.isFinite() }) {
                        coordinates.add(coord)
                    } else {
                        invalidCount++
                        android.util.Log.w("RouteApiResponseTypeAdapter", "Invalid coordinate format: $coord (size=${coord.size})")
                    }
                }
                JsonToken.NUMBER -> {
                    // Malformed: number instead of array - skip it
                    invalidCount++
                    val value = `in`.nextDouble()
                    android.util.Log.w("RouteApiResponseTypeAdapter", "Found number instead of array in coordinates: $value (skipping)")
                }
                JsonToken.NULL -> {
                    `in`.nextNull()
                    invalidCount++
                    android.util.Log.w("RouteApiResponseTypeAdapter", "Found null in coordinates (skipping)")
                }
                else -> {
                    `in`.skipValue()
                    invalidCount++
                    android.util.Log.w("RouteApiResponseTypeAdapter", "Unexpected token in coordinates (skipping)")
                }
            }
        }
        `in`.endArray()

        if (invalidCount > 0) {
            android.util.Log.w("RouteApiResponseTypeAdapter", "Filtered out $invalidCount invalid coordinate entries. Valid: ${coordinates.size}")
        }

        return coordinates
    }
}

data class RouteCalculationResponse(
    val route: Route? = null,
    val alternativeRoutes: List<Route>? = null,
    val message: String? = null,
)

data class RoundTripRequest(
    @SerializedName("start_lat")
    val startLat: Double,
    @SerializedName("start_lon")
    val startLon: Double,
    @SerializedName("distance_km")
    val distanceKm: Double, // in km
    @SerializedName("curvature_level")
    val curvatureLevel: String? = null, // "straightest", "balanced", "curvy", "extra_curvy"
    val waypoints: List<Waypoint>? = null, // Optional waypoints for round trip
    @SerializedName("saved_road_ids")
    val savedRoadIds: List<Long>? = null, // IDs of saved roads to include in round trip
)

data class SegmentCurvatureRequest(
    val startLat: Double,
    val startLng: Double,
    val endLat: Double,
    val endLng: Double,
    val waypoints: List<Waypoint>? = null,
    val segmentCurvature: List<String>, // List of curvature levels for each segment
    val avoidOptions: AvoidOptions? = null,
)
