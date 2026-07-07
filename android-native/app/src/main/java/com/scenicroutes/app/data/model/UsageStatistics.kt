package com.scenicroutes.app.data.model

/**
 * Detailed usage statistics from the API
 */
data class UsageStatistics(
    val total: Int,
    val by_type: Map<String, Int>? = null,
    val by_curvature: Map<String, Int>? = null,
    val total_distance_km: Double? = null,
    val period: String? = null,
    val start_date: String? = null,
)












