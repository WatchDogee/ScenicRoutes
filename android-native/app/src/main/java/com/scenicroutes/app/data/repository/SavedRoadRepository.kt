package com.scenicroutes.app.data.repository

import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.model.SavedRoadRequest
import com.scenicroutes.app.data.network.NetworkModule
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

class SavedRoadRepository {
    private val apiService: ApiService = NetworkModule.apiService

    suspend fun getSavedRoads(token: String): Result<List<SavedRoad>> {
        return try {
            val response = apiService.getSavedRoads("Bearer $token")
            if (response.isSuccessful && response.body() != null) {
                val roads = response.body()!!
                android.util.Log.d("SavedRoadRepository", "Successfully parsed ${roads.size} saved roads")
                Result.success(roads)
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e("SavedRoadRepository", "API error: ${response.code()} - ${response.message()}")
                if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                    android.util.Log.e("SavedRoadRepository", "API returned HTML instead of JSON - authentication may be required")
                }
                Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
            }
        } catch (e: com.google.gson.JsonSyntaxException) {
            android.util.Log.e("SavedRoadRepository", "JSON parsing error: ${e.message}", e)
            // Check if it's a malformed JSON error that we can't recover from
            if (e.message?.contains("Unterminated") == true || e.message?.contains("Malformed") == true) {
                android.util.Log.e("SavedRoadRepository", "Malformed JSON in response - backend may have data corruption or response was truncated")
                // Try to parse partial JSON if possible - this is a workaround for backend issues
                // Return empty list rather than failing completely
                android.util.Log.w("SavedRoadRepository", "Returning empty list due to malformed JSON - backend needs to be fixed")
                Result.success(emptyList())
            } else {
                Result.failure(Exception("JSON parsing error: ${e.message}"))
            }
        } catch (e: java.io.EOFException) {
            android.util.Log.e("SavedRoadRepository", "Unexpected end of JSON input: ${e.message}", e)
            // Response was truncated - return empty list as fallback
            android.util.Log.w("SavedRoadRepository", "Returning empty list due to truncated JSON response")
            Result.success(emptyList())
        } catch (e: Exception) {
            android.util.Log.e("SavedRoadRepository", "Error loading saved roads: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun saveRoad(token: String, request: SavedRoadRequest): Result<SavedRoad> {
        return try {
            val response = apiService.saveRoad("Bearer $token", request)
            if (response.isSuccessful && response.body() != null) {
                android.util.Log.d("SavedRoadRepository", "Road saved successfully: ${response.body()!!.road_name}")
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e("SavedRoadRepository", "API error: ${response.code()} - ${response.message()}")

                // Check if API returned HTML instead of JSON (authentication/redirect issue)
                if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                    android.util.Log.e("SavedRoadRepository", "API returned HTML instead of JSON - possible authentication or validation error")
                    Result.failure(Exception("Server error: Please try logging in again"))
                } else if (errorBody != null) {
                    android.util.Log.e("SavedRoadRepository", "Error body: $errorBody")
                    // Try to parse error message from JSON
                    try {
                        val errorJson = com.google.gson.JsonParser.parseString(errorBody).asJsonObject
                        val errorMessage = errorJson.get("error")?.asString
                            ?: errorJson.get("message")?.asString
                            ?: response.message()
                        Result.failure(Exception(errorMessage))
                    } catch (e: Exception) {
                        Result.failure(Exception("Failed to save road: ${response.message()}"))
                    }
                } else {
                    Result.failure(Exception(response.message()))
                }
            }
        } catch (e: com.google.gson.JsonSyntaxException) {
            android.util.Log.e("SavedRoadRepository", "JSON parsing error when saving road: ${e.message}", e)
            Result.failure(Exception("Server returned invalid response. Please try again."))
        } catch (e: Exception) {
            android.util.Log.e("SavedRoadRepository", "Error saving road: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun deleteRoad(token: String, id: Long): Result<Unit> {
        return try {
            val response = apiService.deleteSavedRoad("Bearer $token", id)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    @Suppress("unused")
    suspend fun getPublicRoads(): Result<List<SavedRoad>> {
        return try {
            val response = apiService.getPublicRoads()
            if (response.isSuccessful && response.body() != null) {
                val roadsResponse = response.body()!!
                Result.success(roadsResponse.roads)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSavedRoad(token: String, id: Long): Result<SavedRoad> {
        return try {
            val response = apiService.getSavedRoad("Bearer $token", id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadRoadPhoto(
        token: String,
        roadId: Long,
        photoFile: java.io.File,
        caption: String? = null,
    ): Result<SavedRoad> {
        return try {
            val imageMediaType = "image/*".toMediaTypeOrNull() ?: throw IllegalArgumentException("Invalid media type: image/*")
            val fileBytes = photoFile.readBytes()
            val requestFile = fileBytes.toRequestBody(imageMediaType)
            val photoPart = okhttp3.MultipartBody.Part.createFormData("photo", photoFile.name, requestFile)
            val captionPart = caption?.let {
                val textMediaType = "text/plain".toMediaTypeOrNull() ?: throw IllegalArgumentException("Invalid media type: text/plain")
                it.toRequestBody(textMediaType)
            }

            val response = apiService.uploadRoadPhoto("Bearer $token", roadId, photoPart, captionPart)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val road = body["road"] as? Map<*, *>
                if (road != null) {
                    // Parse road from response
                    // This is a simplified version - you may need to adjust based on actual API response
                    Result.success(getSavedRoad(token, roadId).getOrNull() ?: throw Exception("Failed to get updated road"))
                } else {
                    Result.failure(Exception("Invalid response format"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    @Suppress("unused")
    suspend fun deleteRoadPhoto(token: String, photoId: Long): Result<Unit> {
        return try {
            val response = apiService.deleteRoadPhoto("Bearer $token", photoId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
