package com.scenicroutes.app.data.repository

import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.model.Weather
import com.scenicroutes.app.data.network.NetworkModule

class WeatherRepository {
    private val apiService: ApiService = NetworkModule.apiService

    suspend fun getWeather(lat: Double, lng: Double): Result<Weather> {
        return try {
            // Validate coordinates before making API call
            if (!lat.isFinite() || !lng.isFinite() || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                android.util.Log.e("WeatherRepository", "Invalid coordinates: lat=$lat, lng=$lng")
                return Result.failure(Exception("Invalid coordinates: lat=$lat, lng=$lng"))
            }
            val response = apiService.getWeather(lat, lng)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.e("WeatherRepository", "Weather API error: ${response.code()} - ${response.message()}, body: $errorBody")
                Result.failure(Exception("Weather API error: ${response.code()} - ${response.message()}. $errorBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("WeatherRepository", "Exception getting weather: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun getWeatherForRoad(roadId: Long): Result<Weather> {
        return try {
            val response = apiService.getWeatherForRoad(roadId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
