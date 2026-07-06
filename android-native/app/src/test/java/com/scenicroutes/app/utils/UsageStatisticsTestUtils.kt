package com.scenicroutes.app.utils

import com.scenicroutes.app.data.model.UsageStatistics

/**
 * Test utilities for UsageStatistics testing
 */
object UsageStatisticsTestUtils {
    
    fun createUsageStatistics(
        total: Int = 45,
        byType: Map<String, Int>? = mapOf(
            "graphhopper" to 30,
            "round_trip" to 15,
        ),
        byCurvature: Map<String, Int>? = mapOf(
            "curvy" to 20,
            "extra_curvy" to 10,
            "straightest" to 15,
        ),
        totalDistanceKm: Double? = 1250.5,
        period: String? = "month",
        startDate: String? = "2025-01-01T00:00:00Z",
    ): UsageStatistics {
        return UsageStatistics(
            total = total,
            by_type = byType,
            by_curvature = byCurvature,
            total_distance_km = totalDistanceKm,
            period = period,
            start_date = startDate,
        )
    }
    
    fun createEmptyUsageStatistics(): UsageStatistics {
        return UsageStatistics(
            total = 0,
            by_type = null,
            by_curvature = null,
            total_distance_km = null,
            period = "month",
            start_date = null,
        )
    }
    
    fun createUsageStatisticsWithLargeDistance(): UsageStatistics {
        return UsageStatistics(
            total = 100,
            by_type = mapOf("graphhopper" to 100),
            by_curvature = mapOf("curvy" to 100),
            total_distance_km = 1500.0, // > 1000km
            period = "month",
            start_date = null,
        )
    }
    
    fun createUsageStatisticsWithSmallDistance(): UsageStatistics {
        return UsageStatistics(
            total = 5,
            by_type = mapOf("graphhopper" to 5),
            by_curvature = mapOf("straightest" to 5),
            total_distance_km = 0.5, // < 1km
            period = "day",
            start_date = null,
        )
    }
}









