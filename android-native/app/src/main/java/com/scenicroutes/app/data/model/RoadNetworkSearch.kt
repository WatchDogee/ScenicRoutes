package com.scenicroutes.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Road from OpenStreetMap road network search (not user-saved roads)
 * This represents actual roads found via Overpass API
 */
data class RoadNetworkSearch(
    val id: String, // Can be numeric or "123_456" for connected roads
    val name: String,
    val coordinates: List<List<Double>>, // [[lat, lng], [lat, lng], ...]
    val twistiness: Double,
    val length: Double, // in meters
    val corner_count: Int,
    @SerializedName("is_connected")
    val isConnected: Boolean = false,
    // Optional elevation stats
    val min_elevation: Double? = null,
    val max_elevation: Double? = null,
    val elevation_gain: Double? = null,
    val elevation_loss: Double? = null,
) {
    // Convert coordinates to geometry format (same as SavedRoad)
    val geometry: List<List<Double>>
        get() = coordinates
}
















