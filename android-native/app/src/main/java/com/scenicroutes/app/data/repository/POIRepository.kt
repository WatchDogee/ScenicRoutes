package com.scenicroutes.app.data.repository

import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.model.POI
import com.scenicroutes.app.data.network.NetworkModule

class POIRepository {
    private val apiService: ApiService = NetworkModule.apiService

    suspend fun searchPOIs(
        lat: Double,
        lng: Double,
        radius: Double = 5.0,
        type: String? = null,
    ): Result<List<POI>> {
        return try {
            val response = apiService.searchPOIs(lat, lng, radius, type)
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
















