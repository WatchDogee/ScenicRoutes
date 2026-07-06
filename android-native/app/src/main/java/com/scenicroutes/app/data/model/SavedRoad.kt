package com.scenicroutes.app.data.model

import com.google.gson.*
import com.google.gson.annotations.SerializedName
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter
import java.io.IOException
import com.scenicroutes.app.data.model.User

data class SavedRoad(
    val id: Long,
    val road_name: String,
    val start_location: String,
    val end_location: String,
    val distance: Double? = null,
    val duration: Long? = null,
    val geometry: List<List<Double>>? = null, // Parsed from road_coordinates
    val user_id: Long,
    val user: User? = null, // Creator/user who created the road
    val is_public: Boolean = false,
    val rating: Double? = null,
    @SerializedName("average_rating")
    val average_rating: Double? = null,
    val review_count: Int = 0,
    val created_at: String,
    val updated_at: String,
    val tags: List<Tag>? = null,
    val photos: List<RoadPhoto>? = null,
    val reviews: List<Review>? = null,
    val comments: List<Comment>? = null,
    val description: String? = null, // Road description
    val route_type: String? = null, // Type of saved item: "route" or "road"
    // Additional metadata fields
    val twistiness: Double? = null, // Road twistiness score
    val corner_count: Int? = null, // Number of corners/turns
    val elevation_gain: Double? = null, // Elevation gain in meters
    val elevation_loss: Double? = null, // Elevation loss in meters
    val max_elevation: Double? = null, // Maximum elevation in meters
    val min_elevation: Double? = null, // Minimum elevation in meters
    val country: String? = null, // Country name
    val region: String? = null, // Region/state name
)

/**
 * Custom TypeAdapter for SavedRoad that handles road_coordinates as JSON string
 */
class SavedRoadTypeAdapter : com.google.gson.TypeAdapter<SavedRoad>() {
    private val gson = Gson()

    @Throws(IOException::class)
    override fun write(out: JsonWriter, value: SavedRoad) {
        // Not needed for reading from API
        throw UnsupportedOperationException("Writing SavedRoad not implemented")
    }

    @Throws(IOException::class)
    override fun read(`in`: JsonReader): SavedRoad {
        return try {
            // Enable lenient mode to handle some malformed JSON
            `in`.isLenient = true
            val jsonObject = try {
                JsonParser.parseReader(`in`).asJsonObject
            } catch (e: Exception) {
                android.util.Log.e("SavedRoad", "Error parsing JSON structure: ${e.message} (likely truncated response), returning default SavedRoad", e)
                // Return a minimal default SavedRoad for truncated responses
                return SavedRoad(
                    id = -1L, // Use -1 to indicate error state
                    road_name = "Unable to load road details",
                    start_location = "",
                    end_location = "",
                    distance = null,
                    duration = null,
                    geometry = null,
                    user_id = 0L,
                    user = null,
                    is_public = false,
                    rating = null,
                    average_rating = null,
                    review_count = 0,
                    created_at = "",
                    updated_at = "",
                    tags = null,
                    photos = null,
                    reviews = null,
                    comments = null,
                    description = "This road's details could not be loaded due to a server connection issue. Please try again later.",
                    route_type = null,
                    twistiness = null,
                    corner_count = null,
                    elevation_gain = null,
                    elevation_loss = null,
                    max_elevation = null,
                    min_elevation = null,
                    country = null,
                    region = null,
                )
            }
            
            // Parse road_coordinates field (can be string or array)
            val geometry = parseRoadCoordinates(jsonObject.get("road_coordinates"))
            
            // Helper function to safely parse optional lists
            fun <T> parseOptionalList(
                jsonElement: JsonElement?,
                parser: (JsonElement) -> T,
                fieldName: String
            ): List<T>? {
                if (jsonElement == null || jsonElement.isJsonNull) return null
                if (!jsonElement.isJsonArray) {
                    android.util.Log.w("SavedRoad", "Field '$fieldName' is not an array, skipping")
                    return null
                }
                return try {
                    jsonElement.asJsonArray.mapNotNull { item ->
                        try {
                            parser(item)
                        } catch (e: Exception) {
                            android.util.Log.w("SavedRoad", "Error parsing item in '$fieldName': ${e.message}", e)
                            null
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("SavedRoad", "Error parsing '$fieldName' list: ${e.message}", e)
                    null
                }
            }
            
            // Map backend 'length' field (meters) to 'distance' field in METERS
            // Android DistanceFormatter expects meters; keep units consistent
            val distanceValue = jsonObject.get("distance")?.takeIf { !it.isJsonNull }?.asDouble
                ?: jsonObject.get("length")?.takeIf { !it.isJsonNull }?.asDouble

            SavedRoad(
                id = jsonObject.get("id")?.takeIf { !it.isJsonNull }?.asLong ?: 0L,
                road_name = jsonObject.get("road_name")?.takeIf { !it.isJsonNull }?.asString ?: "",
                start_location = jsonObject.get("start_location")?.takeIf { !it.isJsonNull }?.asString ?: "",
                end_location = jsonObject.get("end_location")?.takeIf { !it.isJsonNull }?.asString ?: "",
                distance = distanceValue,
                duration = jsonObject.get("duration")?.takeIf { !it.isJsonNull }?.asLong,
                geometry = geometry,
                user_id = jsonObject.get("user_id")?.takeIf { !it.isJsonNull }?.asLong ?: 0L,
                user = try {
                    jsonObject.get("user")?.takeIf { !it.isJsonNull }?.let { gson.fromJson(it, User::class.java) }
                } catch (e: Exception) {
                    android.util.Log.w("SavedRoad", "Error parsing user: ${e.message}", e)
                    null
                },
                is_public = jsonObject.get("is_public")?.takeIf { !it.isJsonNull }?.asBoolean ?: false,
                rating = jsonObject.get("rating")?.takeIf { !it.isJsonNull }?.asDouble,
                average_rating = jsonObject.get("average_rating")?.takeIf { !it.isJsonNull }?.asDouble,
                review_count = jsonObject.get("review_count")?.takeIf { !it.isJsonNull }?.asInt ?: 0,
                created_at = jsonObject.get("created_at")?.takeIf { !it.isJsonNull }?.asString ?: "",
                updated_at = jsonObject.get("updated_at")?.takeIf { !it.isJsonNull }?.asString ?: "",
                tags = parseOptionalList(jsonObject.get("tags"), { gson.fromJson(it, Tag::class.java) }, "tags"),
                photos = parseOptionalList(jsonObject.get("photos"), { gson.fromJson(it, RoadPhoto::class.java) }, "photos"),
                reviews = parseOptionalList(jsonObject.get("reviews"), { gson.fromJson(it, Review::class.java) }, "reviews"),
                comments = parseOptionalList(jsonObject.get("comments"), { gson.fromJson(it, Comment::class.java) }, "comments"),
                description = jsonObject.get("description")?.takeIf { !it.isJsonNull }?.asString,
                route_type = jsonObject.get("route_type")?.takeIf { !it.isJsonNull }?.asString,
                // Parse additional metadata fields
                twistiness = jsonObject.get("twistiness")?.takeIf { !it.isJsonNull }?.asDouble,
                corner_count = jsonObject.get("corner_count")?.takeIf { !it.isJsonNull }?.asInt,
                elevation_gain = jsonObject.get("elevation_gain")?.takeIf { !it.isJsonNull }?.asDouble,
                elevation_loss = jsonObject.get("elevation_loss")?.takeIf { !it.isJsonNull }?.asDouble,
                max_elevation = jsonObject.get("max_elevation")?.takeIf { !it.isJsonNull }?.asDouble,
                min_elevation = jsonObject.get("min_elevation")?.takeIf { !it.isJsonNull }?.asDouble,
                country = jsonObject.get("country")?.takeIf { !it.isJsonNull }?.asString,
                region = jsonObject.get("region")?.takeIf { !it.isJsonNull }?.asString,
            )
        } catch (e: Exception) {
            android.util.Log.e("SavedRoad", "Error parsing SavedRoad JSON: ${e.message}, returning default SavedRoad", e)
            // Return a default SavedRoad to prevent crashes
            SavedRoad(
                id = 0L,
                road_name = "Error loading road",
                start_location = "",
                end_location = "",
                distance = null,
                duration = null,
                geometry = null,
                user_id = 0L,
                user = null,
                is_public = false,
                rating = null,
                average_rating = null,
                review_count = 0,
                created_at = "",
                updated_at = "",
                tags = null,
                photos = null,
                reviews = null,
                comments = null,
                description = null,
                route_type = null,
                twistiness = null,
                corner_count = null,
                elevation_gain = null,
                elevation_loss = null,
                max_elevation = null,
                min_elevation = null,
                country = null,
                region = null,
            )
        }
    }
    
    private fun parseRoadCoordinates(jsonElement: JsonElement?): List<List<Double>>? {
        if (jsonElement == null || jsonElement.isJsonNull) {
            android.util.Log.d("SavedRoad", "road_coordinates is null or JsonNull")
            return null
        }
        
        return try {
            // If it's a string, parse it as JSON first
            val parsedElement = if (jsonElement.isJsonPrimitive && jsonElement.asJsonPrimitive.isString) {
                val jsonString = jsonElement.asString
                android.util.Log.d("SavedRoad", "road_coordinates is a string, parsing JSON. Length: ${jsonString.length}")
                if (jsonString.isBlank()) {
                    android.util.Log.w("SavedRoad", "road_coordinates string is blank; returning null geometry")
                    return null
                }
                try {
                    // Use lenient parsing to handle malformed/truncated JSON
                    val jsonReader = com.google.gson.stream.JsonReader(java.io.StringReader(jsonString))
                    jsonReader.setLenient(true)
                    com.google.gson.JsonParser.parseReader(jsonReader)
                } catch (e: com.google.gson.JsonSyntaxException) {
                    android.util.Log.e("SavedRoad", "Invalid road_coordinates JSON: ${e.message}")
                    return null
                } catch (e: Exception) {
                    android.util.Log.e("SavedRoad", "Error parsing road_coordinates with lenient mode: ${e.message}")
                    return null
                }
            } else {
                android.util.Log.d("SavedRoad", "road_coordinates is not a string, using as-is")
                jsonElement
            }
            
            // Now parse as array of arrays
            if (parsedElement.isJsonArray) {
                val result = parsedElement.asJsonArray.map { coordArray ->
                    coordArray.asJsonArray.map { it.asDouble }
                }
                android.util.Log.d("SavedRoad", "Successfully parsed road_coordinates: ${result.size} points")
                result
            } else {
                android.util.Log.w("SavedRoad", "Parsed element is not a JSON array")
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("SavedRoad", "Error parsing road_coordinates: ${e.message}", e)
            e.printStackTrace()
            null
        }
    }
}

data class Tag(
    val id: Long,
    val name: String,
    val slug: String? = null,
)

data class RoadPhoto(
    val id: Long,
    val url: String,
    val thumbnail_url: String? = null,
)

data class SavedRoadRequest(
    val road_name: String,
    val start_location: String,
    val end_location: String,
    val geometry: List<List<Double>>,
    val distance: Double? = null,
    val duration: Long? = null,
    val is_public: Boolean = false,
    val tags: List<Long>? = null,
    // Enhanced statistics
    val avg_speed: Double? = null, // km/h
    val max_speed: Double? = null, // km/h
    val elevation_gain: Double? = null, // meters
    val elevation_loss: Double? = null, // meters
    val max_elevation: Double? = null, // meters
    val min_elevation: Double? = null, // meters
    val corner_count: Int? = null,
    val route_id: String? = null, // Link to planned route if recording was started from a route
    val route_type: String = "road", // 'road', 'route', or 'ride'
)

// Response wrapper for public roads API
data class PublicRoadsResponse(
    val roads: List<SavedRoad>,
    val countries: List<String>? = null,
    val regions: List<String>? = null,
    val total_count: Int = 0,
)
