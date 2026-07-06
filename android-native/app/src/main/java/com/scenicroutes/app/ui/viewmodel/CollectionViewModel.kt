package com.scenicroutes.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.data.network.NetworkModule
import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class CollectionViewModel(application: Application) : AndroidViewModel(application) {
    private val apiService = NetworkModule.apiService
    private val tokenManager = TokenManager(application)

    private val _collections = MutableStateFlow<List<Collection>>(emptyList())
    val collections: StateFlow<List<Collection>> = _collections.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun loadCollections() {
        android.util.Log.d("CollectionViewModel", "loadCollections() called START")
        viewModelScope.launch {
            _isLoading.value = true
            val token = tokenManager.token.first()

            if (token != null) {
                _errorMessage.value = null
                try {
                    val response = apiService.getCollections("Bearer $token")
                    if (response.isSuccessful && response.body() != null) {
                        val rawJson = response.body()!!.string()
                        android.util.Log.d("CollectionViewModel", "Response body length: ${rawJson.length}, first 200 chars: ${rawJson.take(200)}")
                        
                        if (rawJson.isBlank()) {
                            android.util.Log.w("CollectionViewModel", "Response body is blank")
                            _collections.value = emptyList()
                            _errorMessage.value = null
                        } else {
                            val parsedCollections = parseCollectionsJsonString(rawJson)
                            android.util.Log.d("CollectionViewModel", "Parsed ${parsedCollections.size} collections")
                            _collections.value = parsedCollections
                            _errorMessage.value = null
                            
                            if (parsedCollections.isEmpty() && rawJson.isNotBlank() && !rawJson.trim().equals("[]", ignoreCase = true) && !rawJson.trim().equals("{}", ignoreCase = true)) {
                                android.util.Log.w("CollectionViewModel", "Unable to parse collections - raw JSON: ${rawJson.take(500)}")
                                android.util.Log.w("CollectionViewModel", "JSON structure: startsWith '{'=${rawJson.trim().startsWith("{")}, startsWith '['=${rawJson.trim().startsWith("[")}")
                                // Try to provide more helpful error message
                                val errorMsg = try {
                                    val errorObj = org.json.JSONObject(rawJson.trim())
                                    errorObj.optString("error") ?: errorObj.optString("message") ?: "Unable to parse collections (unexpected format)"
                                } catch (e: Exception) {
                                    "Unable to parse collections (unexpected format)"
                                }
                                _errorMessage.value = errorMsg
                            } else if (parsedCollections.isEmpty() && (rawJson.isBlank() || rawJson.trim().equals("[]", ignoreCase = true) || rawJson.trim().equals("{}", ignoreCase = true))) {
                                // Empty response is valid - user has no collections
                                _errorMessage.value = null
                            }
                        }
                    } else {
                        val errorCode = response.code()
                        val errorBody = response.errorBody()?.string() ?: ""
                        android.util.Log.e("CollectionViewModel", "API error: $errorCode - ${response.message()}, body: ${errorBody.take(200)}")
                        
                        if (errorCode == 401) {
                            _errorMessage.value = "Unauthorized. Please log in again."
                        } else {
                            _errorMessage.value = "Failed to load collections ($errorCode)"
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("CollectionViewModel", "Exception in loadCollections: ${e.message}", e)
                    _errorMessage.value = "Error: ${e.message ?: "Unknown error"}"
                }
            }

            _isLoading.value = false
        }
    }

    fun createCollection(name: String, description: String?, isPublic: Boolean) {
        viewModelScope.launch {
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val request = com.scenicroutes.app.data.api.CollectionRequest(
                        name = name,
                        description = description,
                        is_public = isPublic,
                        road_ids = null,
                    )
                    val response = apiService.createCollection("Bearer $token", request)
                    if (response.isSuccessful && response.body() != null) {
                        loadCollections() // Reload list
                    } else {
                        _errorMessage.value = response.message()
                    }
                } catch (e: Exception) {
                    _errorMessage.value = e.message
                }
            }
        }
    }

    fun updateCollection(id: Long, name: String, description: String?, isPublic: Boolean) {
        viewModelScope.launch {
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val request = com.scenicroutes.app.data.api.CollectionRequest(
                        name = name,
                        description = description,
                        is_public = isPublic,
                        road_ids = null,
                    )
                    val response = apiService.updateCollection("Bearer $token", id, request)
                    if (response.isSuccessful && response.body() != null) {
                        loadCollections() // Reload list
                    } else {
                        _errorMessage.value = response.message()
                    }
                } catch (e: Exception) {
                    _errorMessage.value = e.message
                }
            }
        }
    }

    fun deleteCollection(id: Long) {
        viewModelScope.launch {
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val response = apiService.deleteCollection("Bearer $token", id)
                    if (response.isSuccessful) {
                        loadCollections() // Reload list
                    } else {
                        _errorMessage.value = response.message()
                    }
                } catch (e: Exception) {
                    _errorMessage.value = e.message
                }
            }
        }
    }
}

// Parses collection responses that may be paginated or raw lists from JSON text.
fun parseCollectionsJsonString(body: String?): List<Collection> {
    if (body.isNullOrBlank()) {
        android.util.Log.d("CollectionViewModel", "parseCollections: empty body")
        return emptyList()
    }

    val trimmed = body.trim()
    android.util.Log.d("CollectionViewModel", "parseCollections: body length=${trimmed.length}, first 100 chars=${trimmed.take(100)}")

    // Primary parse: handle objects with data/collections or raw arrays
    try {
        if (trimmed.startsWith("{")) {
            val obj = JSONObject(trimmed)
            android.util.Log.d("CollectionViewModel", "Parsed JSON object with keys: ${obj.keys().asSequence().toList()}")
            
            val dataArray = when {
                obj.has("data") -> {
                    val arr = obj.optJSONArray("data") ?: JSONArray()
                    android.util.Log.d("CollectionViewModel", "Found 'data' array with ${arr.length()} items")
                    arr
                }
                obj.has("collections") -> {
                    val arr = obj.optJSONArray("collections") ?: JSONArray()
                    android.util.Log.d("CollectionViewModel", "Found 'collections' array with ${arr.length()} items")
                    arr
                }
                else -> {
                    android.util.Log.d("CollectionViewModel", "No 'data' or 'collections' key found")
                    JSONArray()
                }
            }
            val parsed = jsonArrayToCollections(dataArray)
            android.util.Log.d("CollectionViewModel", "Primary parse returned ${parsed.size} collections")
            if (parsed.isNotEmpty()) return parsed
        } else if (trimmed.startsWith("[")) {
            android.util.Log.d("CollectionViewModel", "Parsing as raw JSON array")
            val parsed = jsonArrayToCollections(JSONArray(trimmed))
            android.util.Log.d("CollectionViewModel", "Raw array parse returned ${parsed.size} collections")
            if (parsed.isNotEmpty()) return parsed
        }
    } catch (e: Exception) {
        android.util.Log.e("CollectionViewModel", "Primary parse exception: ${e.message ?: "unknown"}")
        // fall through to fallback parsing
    }

    // Fallback: try to locate the first array in the JSON and parse it
    return try {
        android.util.Log.d("CollectionViewModel", "Trying fallback array detection")
        val root = JSONObject(trimmed)
        val arrayCandidates = root.keys().asSequence()
            .mapNotNull { key -> 
                val arr = root.optJSONArray(key)
                if (arr != null) {
                    android.util.Log.d("CollectionViewModel", "Found array candidate at key '$key' with ${arr.length()} items")
                }
                arr
            }
            .firstOrNull { it.length() > 0 }
        arrayCandidates?.let { 
            val result = jsonArrayToCollections(it)
            android.util.Log.d("CollectionViewModel", "Fallback parse returned ${result.size} collections")
            result
        } ?: run {
            android.util.Log.d("CollectionViewModel", "Fallback: no arrays found")
            emptyList()
        }
    } catch (e: Exception) {
        android.util.Log.e("CollectionViewModel", "Fallback parse exception: ${e.message ?: "unknown"}")
        emptyList()
    }
}

private fun jsonArrayToCollections(array: JSONArray): List<Collection> {
    val result = mutableListOf<Collection>()
    for (i in 0 until array.length()) {
        val item = array.optJSONObject(i) ?: continue
        mapJsonObjectToCollection(item)?.let { result.add(it) }
    }
    return result
}

private fun mapToCollection(map: Map<*, *>?): Collection? {
    if (map == null) return null

    val id = (map["id"] as? Number)?.toLong() ?: return null
    val name = map["name"] as? String ?: return null
    val userId = (map["user_id"] as? Number)?.toLong() ?: return null
    val isPublic = when (val publicValue = map["is_public"]) {
        is Boolean -> publicValue
        is Number -> publicValue.toInt() != 0
        else -> false
    }
    val roadCountRaw = map["roads_count"] ?: map["road_count"]
    val roadCount = (roadCountRaw as? Number)?.toInt() ?: 0
    val rating = (map["rating"] as? Number)?.toDouble()
    val reviewCount = (map["review_count"] as? Number)?.toInt() ?: 0
    val createdAt = map["created_at"] as? String ?: ""
    val updatedAt = map["updated_at"] as? String ?: ""
    val coverImageUrl = map["cover_image_url"] as? String

    return Collection(
        id = id,
        name = name,
        description = map["description"] as? String,
        user_id = userId,
        is_public = isPublic,
        rating = rating,
        review_count = reviewCount,
        road_count = roadCount,
        cover_image_url = coverImageUrl,
        created_at = createdAt,
        updated_at = updatedAt,
        tags = null,
        roads = null,
        user = null,
    )
}

private fun mapJsonObjectToCollection(obj: JSONObject): Collection? {
    val id = obj.optLong("id", -1L)
    val name = obj.optString("name", "")
    val userId = obj.optLong("user_id", -1L)
    
    // Log for debugging
    android.util.Log.d("CollectionViewModel", "Mapping collection: id=$id, name=$name, userId=$userId, has_all=${obj.has("id") && obj.has("name") && obj.has("user_id")}")
    
    // Only require id and name - user_id may be optional for shared/public collections
    if (id <= 0 || name.isBlank()) {
        android.util.Log.d("CollectionViewModel", "Skipping collection mapping: id=$id, name=$name")
        return null
    }

    val isPublic = if (obj.has("is_public")) obj.optBoolean("is_public", false) else false
    val roadCount = when {
        obj.has("roads_count") -> obj.optInt("roads_count", 0)
        obj.has("road_count") -> obj.optInt("road_count", 0)
        else -> 0
    }

    // Some responses use cover_image instead of cover_image_url
    val coverImageUrl = when {
        obj.has("cover_image_url") -> obj.optString("cover_image_url", "")
        obj.has("cover_image") -> obj.optString("cover_image", "")
        else -> null
    }

    return Collection(
        id = id,
        name = name,
        description = obj.optString("description", ""),
        user_id = if (userId > 0) userId else 0L,  // Default to 0 instead of -1
        is_public = isPublic,
        rating = obj.optDouble("rating", Double.NaN).takeIf { !it.isNaN() },
        review_count = obj.optInt("review_count", 0),
        road_count = roadCount,
        cover_image_url = coverImageUrl,
        created_at = obj.optString("created_at", ""),
        updated_at = obj.optString("updated_at", ""),
        tags = null,
        roads = null,
        user = null,
    )
}
