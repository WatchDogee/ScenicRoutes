package com.scenicroutes.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Ride data model
 */
@Entity(tableName = "rides")
data class Ride(
    @PrimaryKey
    val id: String,
    val startTime: Long,
    val endTime: Long?,
    val distanceMeters: Double,
    val durationSeconds: Long,
    val averageSpeed: Double,
    val maxSpeed: Double,
    val pointsJson: String, // Serialized list of RidePoint
    val linkedRouteId: String?, // Nullable - links to planned route
    val isSynced: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Individual GPS point in a ride
 */
data class RidePoint(
    val latitude: Double,
    val longitude: Double,
    val altitude: Double?,
    val speed: Double,
    val heading: Double?,
    val accuracy: Double?,
    val timestamp: Long
)
