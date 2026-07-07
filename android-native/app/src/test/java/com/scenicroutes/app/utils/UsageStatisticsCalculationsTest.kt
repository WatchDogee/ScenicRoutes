package com.scenicroutes.app.utils

import com.scenicroutes.app.data.model.UsageStatistics
import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for UsageStatistics calculation logic
 */
class UsageStatisticsCalculationsTest {
    
    @Test
    fun `calculate average distance correctly`() {
        // Given
        val stats = UsageStatisticsTestUtils.createUsageStatistics(
            total = 10,
            totalDistanceKm = 100.0,
        )
        
        // When
        val avgDistance = if (stats.total > 0) {
            (stats.total_distance_km ?: 0.0) / stats.total
        } else {
            0.0
        }
        
        // Then
        assertEquals(10.0, avgDistance, 0.01)
    }
    
    @Test
    fun `calculate average distance returns zero when total is zero`() {
        // Given
        val stats = UsageStatisticsTestUtils.createEmptyUsageStatistics()
        
        // When
        val avgDistance = if (stats.total > 0) {
            (stats.total_distance_km ?: 0.0) / stats.total
        } else {
            0.0
        }
        
        // Then
        assertEquals(0.0, avgDistance, 0.01)
    }
    
    @Test
    fun `calculate routes per day for day period`() {
        // Given
        val stats = UsageStatisticsTestUtils.createUsageStatistics(
            total = 5,
            period = "day",
        )
        val period = "day"
        
        // When
        val routesPerDay = when (period) {
            "day" -> stats.total.toFloat()
            "week" -> stats.total.toFloat() / 7f
            "month" -> stats.total.toFloat() / 30f
            "year" -> stats.total.toFloat() / 365f
            else -> 0f
        }
        
        // Then
        assertEquals(5.0f, routesPerDay, 0.01f)
    }
    
    @Test
    fun `calculate routes per day for week period`() {
        // Given
        val stats = UsageStatisticsTestUtils.createUsageStatistics(
            total = 14,
            period = "week",
        )
        val period = "week"
        
        // When
        val routesPerDay = when (period) {
            "day" -> stats.total.toFloat()
            "week" -> stats.total.toFloat() / 7f
            "month" -> stats.total.toFloat() / 30f
            "year" -> stats.total.toFloat() / 365f
            else -> 0f
        }
        
        // Then
        assertEquals(2.0f, routesPerDay, 0.01f)
    }
    
    @Test
    fun `calculate routes per day for month period`() {
        // Given
        val stats = UsageStatisticsTestUtils.createUsageStatistics(
            total = 30,
            period = "month",
        )
        val period = "month"
        
        // When
        val routesPerDay = when (period) {
            "day" -> stats.total.toFloat()
            "week" -> stats.total.toFloat() / 7f
            "month" -> stats.total.toFloat() / 30f
            "year" -> stats.total.toFloat() / 365f
            else -> 0f
        }
        
        // Then
        assertEquals(1.0f, routesPerDay, 0.01f)
    }
    
    @Test
    fun `calculate routes per day for year period`() {
        // Given
        val stats = UsageStatisticsTestUtils.createUsageStatistics(
            total = 365,
            period = "year",
        )
        val period = "year"
        
        // When
        val routesPerDay = when (period) {
            "day" -> stats.total.toFloat()
            "week" -> stats.total.toFloat() / 7f
            "month" -> stats.total.toFloat() / 30f
            "year" -> stats.total.toFloat() / 365f
            else -> 0f
        }
        
        // Then
        assertEquals(1.0f, routesPerDay, 0.01f)
    }
    
    @Test
    fun `format distance less than 1km as meters`() {
        // Given
        val distanceKm = 0.5
        
        // When
        val formatted = when {
            distanceKm < 1 -> "${(distanceKm * 1000).toInt()} m"
            distanceKm < 1000 -> "${String.format("%.1f", distanceKm)} km"
            else -> "${String.format("%.2f", distanceKm / 1000)} thousand km"
        }
        
        // Then
        assertEquals("500 m", formatted)
    }
    
    @Test
    fun `format distance less than 1000km as km`() {
        // Given
        val distanceKm = 125.5
        
        // When
        val formatted = when {
            distanceKm < 1 -> "${(distanceKm * 1000).toInt()} m"
            distanceKm < 1000 -> "${String.format("%.1f", distanceKm)} km"
            else -> "${String.format("%.2f", distanceKm / 1000)} thousand km"
        }
        
        // Then
        assertEquals("125.5 km", formatted)
    }
    
    @Test
    fun `format distance greater than 1000km as thousand km`() {
        // Given
        val distanceKm = 1500.0
        
        // When
        val formatted = when {
            distanceKm < 1 -> "${(distanceKm * 1000).toInt()} m"
            distanceKm < 1000 -> "${String.format("%.1f", distanceKm)} km"
            else -> "${String.format("%.2f", distanceKm / 1000)} thousand km"
        }
        
        // Then
        assertEquals("1.50 thousand km", formatted)
    }
    
    @Test
    fun `calculate chart percentage correctly`() {
        // Given
        val value = 20
        val total = 100
        
        // When
        val percentage = if (total > 0) {
            (value.toFloat() / total) * 100f
        } else {
            0f
        }
        
        // Then
        assertEquals(20.0f, percentage, 0.01f)
    }
    
    @Test
    fun `calculate chart percentage handles zero total`() {
        // Given
        val value = 20
        val total = 0
        
        // When
        val percentage = if (total > 0) {
            (value.toFloat() / total) * 100f
        } else {
            0f
        }
        
        // Then
        assertEquals(0.0f, percentage, 0.01f)
        // Note: Division by zero is prevented by the if check above
    }
}









