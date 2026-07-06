package com.scenicroutes.app.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

/**
 * Shared GPS location provider for both Navigation and Ride Recording.
 * 
 * Features:
 * - Single GPS source to conserve battery
 * - Provides raw GPS locations (no route snapping)
 * - Multiple consumers can subscribe
 * - Handles permission checks
 */
class LocationProvider private constructor(private val context: Context) {
    
    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)
    
    private val locationCallbacks = mutableMapOf<(Location) -> Unit, LocationCallback>()
    
    companion object {
        @Volatile
        private var instance: LocationProvider? = null
        
        fun getInstance(context: Context): LocationProvider {
            return instance ?: synchronized(this) {
                instance ?: LocationProvider(context.applicationContext).also { instance = it }
            }
        }
        
        // Location update configurations
        const val HIGH_ACCURACY_INTERVAL_MS = 1000L // 1 second for recording
        const val BALANCED_INTERVAL_MS = 5000L // 5 seconds for general use
        const val LOW_POWER_INTERVAL_MS = 15000L // 15 seconds for background
    }
    
    /**
     * Check if location permissions are granted
     */
    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * Get last known location
     */
    @SuppressLint("MissingPermission")
    fun getLastLocation(callback: (Location?) -> Unit) {
        if (!hasLocationPermission()) {
            callback(null)
            return
        }
        
        fusedLocationClient.lastLocation
            .addOnSuccessListener { location ->
                callback(location)
            }
            .addOnFailureListener {
                callback(null)
            }
    }
    
    /**
     * Request location updates with callback
     */
    @SuppressLint("MissingPermission")
    fun requestLocationUpdates(
        intervalMs: Long = HIGH_ACCURACY_INTERVAL_MS,
        priority: Int = LocationRequest.PRIORITY_HIGH_ACCURACY,
        callback: (Location) -> Unit
    ) {
        if (!hasLocationPermission()) {
            return
        }
        
        val locationRequest = LocationRequest.create().apply {
            this.interval = intervalMs
            this.fastestInterval = intervalMs / 2
            this.priority = priority
            this.maxWaitTime = intervalMs
        }
        
        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    callback(location)
                }
            }
        }
        
        locationCallbacks[callback] = locationCallback
        
        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }
    
    /**
     * Remove specific location updates callback
     */
    fun removeLocationUpdates(callback: (Location) -> Unit) {
        locationCallbacks[callback]?.let { locationCallback ->
            fusedLocationClient.removeLocationUpdates(locationCallback)
            locationCallbacks.remove(callback)
        }
    }
    
    /**
     * Remove all location updates
     */
    fun removeAllLocationUpdates() {
        locationCallbacks.values.forEach { locationCallback ->
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
        locationCallbacks.clear()
    }
    
    /**
     * Get location updates as Flow (for coroutine consumers)
     */
    @SuppressLint("MissingPermission")
    fun getLocationFlow(
        intervalMs: Long = HIGH_ACCURACY_INTERVAL_MS,
        priority: Int = LocationRequest.PRIORITY_HIGH_ACCURACY
    ): Flow<Location> = callbackFlow {
        if (!hasLocationPermission()) {
            close()
            return@callbackFlow
        }
        
        val locationRequest = LocationRequest.create().apply {
            this.interval = intervalMs
            this.fastestInterval = intervalMs / 2
            this.priority = priority
            this.maxWaitTime = intervalMs
        }
        
        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    trySend(location)
                }
            }
        }
        
        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
        
        awaitClose {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }
    
    /**
     * Calculate distance between two locations in meters
     */
    fun calculateDistance(from: Location, to: Location): Float {
        val results = FloatArray(1)
        Location.distanceBetween(
            from.latitude, from.longitude,
            to.latitude, to.longitude,
            results
        )
        return results[0]
    }
}
