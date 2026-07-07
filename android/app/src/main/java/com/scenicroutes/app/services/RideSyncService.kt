package com.scenicroutes.app.services

import android.content.Context
import com.scenicroutes.app.data.Ride
import com.scenicroutes.app.data.RideDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Service for syncing recorded rides to backend
 * 
 * Features:
 * - Upload unsynced rides to server
 * - Handle network errors gracefully
 * - Retry failed syncs
 * - Mark rides as synced when successful
 */
class RideSyncService(private val context: Context) {
    
    private val database = RideDatabase.getInstance(context)
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    companion object {
        private const val BASE_URL = "https://scenicroutes.app/api" // Change to your backend
        private const val RIDES_ENDPOINT = "$BASE_URL/rides"
        private const val CONTENT_TYPE = "application/json"
    }
    
    /**
     * Sync all unsynced rides to backend
     */
    suspend fun syncUnsyncedRides(authToken: String): Result {
        return withContext(Dispatchers.IO) {
            try {
                val unsyncedRides = database.rideDao().getUnsyncedRides()
                
                if (unsyncedRides.isEmpty()) {
                    return@withContext Result.Success(0)
                }
                
                var successCount = 0
                var failureCount = 0
                
                for (ride in unsyncedRides) {
                    try {
                        if (uploadRide(ride, authToken)) {
                            database.rideDao().markAsSynced(ride.id)
                            successCount++
                        } else {
                            failureCount++
                        }
                    } catch (e: Exception) {
                        failureCount++
                        e.printStackTrace()
                    }
                }
                
                if (failureCount > 0) {
                    Result.PartialSuccess(successCount, failureCount)
                } else {
                    Result.Success(successCount)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                Result.Error("Failed to sync rides: ${e.message}")
            }
        }
    }
    
    /**
     * Upload a single ride to backend
     */
    private fun uploadRide(ride: Ride, authToken: String): Boolean {
        try {
            val requestBody = createRideJson(ride).toString()
                .toRequestBody(CONTENT_TYPE.toMediaType())
            
            val request = Request.Builder()
                .url(RIDES_ENDPOINT)
                .header("Authorization", "Bearer $authToken")
                .header("Content-Type", CONTENT_TYPE)
                .post(requestBody)
                .build()
            
            val response = httpClient.newCall(request).execute()
            
            return response.isSuccessful.also {
                response.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }
    
    /**
     * Create JSON payload for ride
     */
    private fun createRideJson(ride: Ride): JSONObject {
        return JSONObject().apply {
            put("uuid", ride.id)
            put("linked_route_id", ride.linkedRouteId)
            put("started_at", formatTimestamp(ride.startTime))
            put("ended_at", ride.endTime?.let { formatTimestamp(it) })
            put("distance_meters", ride.distanceMeters)
            put("duration_seconds", ride.durationSeconds)
            put("average_speed", ride.averageSpeed)
            put("max_speed", ride.maxSpeed)
            put("points", ride.pointsJson) // Already JSON string
        }
    }
    
    /**
     * Format timestamp for API
     */
    private fun formatTimestamp(timestamp: Long): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault())
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return sdf.format(java.util.Date(timestamp))
    }
    
    sealed class Result {
        data class Success(val synced: Int) : Result()
        data class PartialSuccess(val synced: Int, val failed: Int) : Result()
        data class Error(val message: String) : Result()
    }
}
