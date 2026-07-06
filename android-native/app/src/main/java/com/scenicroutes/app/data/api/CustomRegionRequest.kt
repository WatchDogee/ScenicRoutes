package com.scenicroutes.app.data.api

/**
 * Data class for offline maps custom region request
 * Avoids Retrofit wildcard type issues
 */
data class CustomRegionRequest(
    val region_id: String,
    val region_name: String,
    val bounds: BoundsData,
    val zoom_levels: List<Int>,
    val radius_km: Double? = null
)

data class BoundsData(
    val south: Double,
    val west: Double,
    val north: Double,
    val east: Double
)
