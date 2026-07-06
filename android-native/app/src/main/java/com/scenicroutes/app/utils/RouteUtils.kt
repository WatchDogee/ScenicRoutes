package com.scenicroutes.app.utils

import com.scenicroutes.app.data.model.Route
import com.scenicroutes.app.data.model.SavedRoad
import kotlin.math.*

/**
 * Utility functions for route conversion and calculations
 */

/**
 * Calculate Haversine distance between two points in meters
 */
fun calculateHaversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val earthRadius = 6371000.0 // Earth radius in meters
    
    val lat1Rad = Math.toRadians(lat1)
    val lat2Rad = Math.toRadians(lat2)
    val deltaLat = Math.toRadians(lat2 - lat1)
    val deltaLon = Math.toRadians(lon2 - lon1)
    
    val a = sin(deltaLat / 2) * sin(deltaLat / 2) +
        cos(lat1Rad) * cos(lat2Rad) *
        sin(deltaLon / 2) * sin(deltaLon / 2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    return earthRadius * c
}

/**
 * Convert SavedRoad to Route for navigation
 * Returns null if road doesn't have geometry
 * 
 * @param currentLocation Optional current location. If provided, the route geometry will be
 *                        reversed if the end point is closer to the current location than the start point.
 */
fun SavedRoad.toRoute(currentLocation: Pair<Double, Double>? = null): Route? {
    val geometry = this.geometry ?: return null
    if (geometry.isEmpty()) return null
    
    // Determine if we should reverse the geometry based on current location
    val finalGeometry = if (currentLocation != null && geometry.size >= 2) {
        val startPoint = geometry.first()
        val endPoint = geometry.last()
        
        if (startPoint.size >= 2 && endPoint.size >= 2) {
            val distanceToStart = calculateHaversineDistance(
                currentLocation.first, currentLocation.second,
                startPoint[0], startPoint[1]
            )
            val distanceToEnd = calculateHaversineDistance(
                currentLocation.first, currentLocation.second,
                endPoint[0], endPoint[1]
            )
            
            // If end point is closer, reverse the geometry
            if (distanceToEnd < distanceToStart) {
                android.util.Log.d("RouteUtils", "Reversing route geometry: end point (${distanceToEnd}m) is closer than start point (${distanceToStart}m)")
                geometry.reversed()
            } else {
                android.util.Log.d("RouteUtils", "Keeping route geometry as-is: start point (${distanceToStart}m) is closer than end point (${distanceToEnd}m)")
                geometry
            }
        } else {
            geometry
        }
    } else {
        geometry
    }
    
    // Calculate distance from geometry if not provided
    val distanceMeters = this.distance ?: run {
        var totalDistance = 0.0
        for (i in 0 until finalGeometry.size - 1) {
            val p1 = finalGeometry[i]
            val p2 = finalGeometry[i + 1]
            if (p1.size >= 2 && p2.size >= 2) {
                totalDistance += calculateHaversineDistance(p1[0], p1[1], p2[0], p2[1])
            }
        }
        totalDistance
    }
    
    val distanceKm = distanceMeters / 1000.0
    // Estimate time based on average speed (assuming 60 km/h for curved roads)
    val estimatedTimeMs = (distanceKm / 60.0 * 3600.0 * 1000).toLong()
    
    return Route(
        distance = distanceMeters,
        time = estimatedTimeMs,
        geometry = finalGeometry,
        instructions = null, // Instructions would need to be calculated from backend
        curvature = null,
        curvatureLevel = "balanced",
    )
}








