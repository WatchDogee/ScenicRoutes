package com.scenicroutes.app.data.service

import android.location.Location
import org.osmdroid.util.GeoPoint
import kotlin.math.*

/**
 * Calculates ride statistics from GPS tracking data
 */
object RideStatisticsCalculator {
    
    /**
     * Calculate bearing (direction) between two points in degrees
     * 0 = North, 90 = East, 180 = South, 270 = West
     */
    fun calculateBearing(point1: GeoPoint, point2: GeoPoint): Double {
        val lat1 = Math.toRadians(point1.latitude)
        val lat2 = Math.toRadians(point2.latitude)
        val deltaLon = Math.toRadians(point2.longitude - point1.longitude)
        
        val y = sin(deltaLon) * cos(lat2)
        val x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(deltaLon)
        
        val bearing = Math.toDegrees(atan2(y, x))
        return (bearing + 360) % 360 // Normalize to 0-360
    }
    
    /**
     * Calculate turn angle between three consecutive points
     * Returns angle in degrees: positive = left turn, negative = right turn
     */
    fun calculateTurnAngle(point1: GeoPoint, point2: GeoPoint, point3: GeoPoint): Double {
        val bearing1 = calculateBearing(point1, point2)
        val bearing2 = calculateBearing(point2, point3)
        
        var angle = bearing2 - bearing1
        
        // Normalize to -180 to 180
        if (angle > 180) angle -= 360
        if (angle < -180) angle += 360
        
        return angle
    }
    
    /**
     * Detect corners by analyzing turn direction changes
     * Algorithm: When user transitions from left turn to right turn (or vice versa),
     * that indicates exiting one corner and entering another
     * 
     * @param points List of GPS points
     * @param minTurnAngle Minimum angle (degrees) to consider a turn (default: 15°)
     * @param minCornerDistance Minimum distance (meters) between corners (default: 50m)
     * @return List of corner indices and their turn angles
     */
    fun detectCorners(
        points: List<GeoPoint>,
        minTurnAngle: Double = 15.0,
        minCornerDistance: Double = 50.0
    ): List<Corner> {
        if (points.size < 3) return emptyList()
        
        val corners = mutableListOf<Corner>()
        var lastTurnDirection: TurnDirection? = null
        var lastCornerIndex = -1
        
        // Analyze each point as a potential corner
        for (i in 1 until points.size - 1) {
            val turnAngle = calculateTurnAngle(points[i - 1], points[i], points[i + 1])
            val turnDirection = when {
                turnAngle > minTurnAngle -> TurnDirection.LEFT
                turnAngle < -minTurnAngle -> TurnDirection.RIGHT
                else -> TurnDirection.STRAIGHT
            }
            
            // Check if we've transitioned from one turn direction to another
            if (turnDirection != TurnDirection.STRAIGHT) {
                val isDirectionChange = lastTurnDirection != null && 
                                       lastTurnDirection != turnDirection &&
                                       lastTurnDirection != TurnDirection.STRAIGHT
                
                // Check minimum distance from last corner
                val distanceFromLastCorner = if (lastCornerIndex >= 0) {
                    calculateDistance(points[lastCornerIndex], points[i])
                } else {
                    Double.MAX_VALUE
                }
                
                if (isDirectionChange && distanceFromLastCorner >= minCornerDistance) {
                    // Found a corner transition
                    corners.add(
                        Corner(
                            index = i,
                            turnAngle = abs(turnAngle),
                            direction = turnDirection,
                            location = points[i]
                        )
                    )
                    lastCornerIndex = i
                }
                
                lastTurnDirection = turnDirection
            }
        }
        
        return corners
    }
    
    /**
     * Calculate total elevation gain and loss
     * Uses GPS altitude if available, otherwise returns null
     */
    fun calculateElevationStats(points: List<Location>): ElevationStats? {
        if (points.isEmpty()) return null
        
        var elevationGain = 0.0
        var elevationLoss = 0.0
        var maxElevation = Double.NEGATIVE_INFINITY
        var minElevation = Double.POSITIVE_INFINITY
        
        var lastElevation: Double? = null
        
        for (location in points) {
            val elevation = location.altitude
            
            // Skip invalid elevations (0.0 often means "no data")
            if (elevation != 0.0 && elevation.isFinite()) {
                if (maxElevation == Double.NEGATIVE_INFINITY || elevation > maxElevation) {
                    maxElevation = elevation
                }
                if (minElevation == Double.POSITIVE_INFINITY || elevation < minElevation) {
                    minElevation = elevation
                }
                
                lastElevation?.let { last ->
                    val diff = elevation - last
                    if (diff > 0) {
                        elevationGain += diff
                    } else {
                        elevationLoss += abs(diff)
                    }
                }
                
                lastElevation = elevation
            }
        }
        
        return if (maxElevation != Double.NEGATIVE_INFINITY && minElevation != Double.POSITIVE_INFINITY) {
            ElevationStats(
                gain = elevationGain,
                loss = elevationLoss,
                max = maxElevation,
                min = minElevation
            )
        } else {
            null
        }
    }
    
    /**
     * Calculate speed statistics
     */
    fun calculateSpeedStats(locations: List<Location>): SpeedStats? {
        if (locations.isEmpty()) return null
        
        var totalSpeed = 0.0
        var maxSpeed = 0.0
        var validSpeedCount = 0
        
        for (location in locations) {
            val speed = location.speed.toDouble() // m/s, convert Float to Double
            
            if (speed > 0 && speed.isFinite()) {
                totalSpeed += speed
                if (speed > maxSpeed) {
                    maxSpeed = speed
                }
                validSpeedCount++
            }
        }
        
        return if (validSpeedCount > 0) {
            SpeedStats(
                averageSpeed = (totalSpeed / validSpeedCount) * 3.6, // Convert m/s to km/h
                maxSpeed = maxSpeed * 3.6, // Convert m/s to km/h
                validPoints = validSpeedCount
            )
        } else {
            null
        }
    }
    
    /**
     * Calculate distance between two points in meters
     */
    fun calculateDistance(point1: GeoPoint, point2: GeoPoint): Double {
        val results = FloatArray(1)
        Location.distanceBetween(
            point1.latitude, point1.longitude,
            point2.latitude, point2.longitude,
            results
        )
        return results[0].toDouble()
    }
    
    /**
     * Calculate total distance from a list of points
     */
    fun calculateTotalDistance(points: List<GeoPoint>): Double {
        if (points.size < 2) return 0.0
        
        var totalDistance = 0.0
        for (i in 1 until points.size) {
            totalDistance += calculateDistance(points[i - 1], points[i])
        }
        return totalDistance
    }
}

data class Corner(
    val index: Int,
    val turnAngle: Double,
    val direction: TurnDirection,
    val location: GeoPoint
)

enum class TurnDirection {
    LEFT,
    RIGHT,
    STRAIGHT
}

data class ElevationStats(
    val gain: Double, // meters
    val loss: Double, // meters
    val max: Double, // meters
    val min: Double // meters
)

data class SpeedStats(
    val averageSpeed: Double, // km/h
    val maxSpeed: Double, // km/h
    val validPoints: Int
)









