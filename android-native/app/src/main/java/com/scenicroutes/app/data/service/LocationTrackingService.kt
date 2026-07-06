package com.scenicroutes.app.data.service

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.osmdroid.util.GeoPoint

class LocationTrackingService(private val context: Context) {
    private val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager

    private val _currentLocation = MutableStateFlow<GeoPoint?>(null)
    val currentLocation: StateFlow<GeoPoint?> = _currentLocation.asStateFlow()

    private val _isTracking = MutableStateFlow(false)
    val isTracking: StateFlow<Boolean> = _isTracking.asStateFlow()
    
    private val _isPaused = MutableStateFlow(false)
    val isPaused: StateFlow<Boolean> = _isPaused.asStateFlow()

    private val _trackedPoints = MutableStateFlow<List<GeoPoint>>(emptyList())
    val trackedPoints: StateFlow<List<GeoPoint>> = _trackedPoints.asStateFlow()
    
    // Store full Location objects for statistics (altitude, speed, etc.)
    private val _trackedLocations = MutableStateFlow<List<Location>>(emptyList())
    val trackedLocations: StateFlow<List<Location>> = _trackedLocations.asStateFlow()

    private val _totalDistance = MutableStateFlow(0.0) // in meters
    val totalDistance: StateFlow<Double> = _totalDistance.asStateFlow()
    
    // Statistics
    private val _cornerCount = MutableStateFlow(0)
    val cornerCount: StateFlow<Int> = _cornerCount.asStateFlow()
    
    private val _elevationStats = MutableStateFlow<ElevationStats?>(null)
    val elevationStats: StateFlow<ElevationStats?> = _elevationStats.asStateFlow()
    
    private val _speedStats = MutableStateFlow<SpeedStats?>(null)
    val speedStats: StateFlow<SpeedStats?> = _speedStats.asStateFlow()

    private var lastLocation: Location? = null
    private var locationListener: LocationListener? = null
    
    // Route linking - store reference to planned route if recording from a route
    private var _linkedRouteId: String? = null
    private var _linkedRouteGeometry: List<List<Double>>? = null

    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Start tracking with optional route linking
     * @param routeId Optional route ID to link this recording to a planned route
     * @param routeGeometry Optional route geometry to compare against
     */
    fun startTracking(routeId: String? = null, routeGeometry: List<List<Double>>? = null) {
        if (!hasLocationPermission()) {
            android.util.Log.e("LocationTracking", "Location permission not granted")
            return
        }

        if (_isTracking.value) {
            return // Already tracking
        }

        _isTracking.value = true
        _trackedPoints.value = emptyList()
        _trackedLocations.value = emptyList()
        _totalDistance.value = 0.0
        _cornerCount.value = 0
        _elevationStats.value = null
        _speedStats.value = null
        lastLocation = null
        
        // Store route linking info
        _linkedRouteId = routeId
        _linkedRouteGeometry = routeGeometry

        locationListener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                val geoPoint = GeoPoint(location.latitude, location.longitude)
                _currentLocation.value = geoPoint

                // Add to tracked points and locations
                val currentPoints = _trackedPoints.value.toMutableList()
                currentPoints.add(geoPoint)
                _trackedPoints.value = currentPoints
                
                val currentLocations = _trackedLocations.value.toMutableList()
                currentLocations.add(location)
                _trackedLocations.value = currentLocations

                // Calculate distance
                lastLocation?.let { last ->
                    val distance = location.distanceTo(last)
                    _totalDistance.value = _totalDistance.value + distance
                }
                
                // Update statistics on every location change for live stats
                // Performance impact is minimal since this is already in a location listener
                updateStatistics()

                lastLocation = location
                android.util.Log.d("LocationTracking", "Location updated: ${location.latitude}, ${location.longitude}, distance=${_totalDistance.value}m, speed=${location.speed * 3.6} km/h")
            }

            @Deprecated("Deprecated in Java")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        try {
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000L, // Update every 1 second
                5f, // Minimum distance change in meters
                locationListener!!,
            )
            android.util.Log.d("LocationTracking", "Started location tracking")
        } catch (e: SecurityException) {
            android.util.Log.e("LocationTracking", "Security exception: ${e.message}", e)
            _isTracking.value = false
        } catch (e: Exception) {
            android.util.Log.e("LocationTracking", "Error starting tracking: ${e.message}", e)
            _isTracking.value = false
        }
    }

    fun pauseTracking() {
        if (!_isTracking.value || _isPaused.value) {
            return
        }

        _isPaused.value = true
        locationListener?.let {
            try {
                locationManager.removeUpdates(it)
                android.util.Log.d("LocationTracking", "Paused location tracking")
            } catch (e: Exception) {
                android.util.Log.e("LocationTracking", "Error pausing tracking: ${e.message}", e)
            }
        }
        locationListener = null
        
        // Update statistics when pausing
        updateStatistics()
    }
    
    fun resumeTracking() {
        if (!_isTracking.value || !_isPaused.value) {
            return
        }

        if (!hasLocationPermission()) {
            android.util.Log.e("LocationTracking", "Location permission not granted")
            return
        }

        _isPaused.value = false

        locationListener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                val geoPoint = GeoPoint(location.latitude, location.longitude)
                _currentLocation.value = geoPoint

                // Add to tracked points and locations
                val currentPoints = _trackedPoints.value.toMutableList()
                currentPoints.add(geoPoint)
                _trackedPoints.value = currentPoints
                
                val currentLocations = _trackedLocations.value.toMutableList()
                currentLocations.add(location)
                _trackedLocations.value = currentLocations

                // Calculate distance
                lastLocation?.let { last ->
                    val distance = location.distanceTo(last)
                    _totalDistance.value = _totalDistance.value + distance
                }
                
                // Update statistics on every location change for live stats
                // Performance impact is minimal since this is already in a location listener
                updateStatistics()

                lastLocation = location
                android.util.Log.d("LocationTracking", "Location updated: ${location.latitude}, ${location.longitude}, distance=${_totalDistance.value}m, speed=${location.speed * 3.6} km/h")
            }

            @Deprecated("Deprecated in Java")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        try {
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000L, // Update every 1 second
                5f, // Minimum distance change in meters
                locationListener!!,
            )
            android.util.Log.d("LocationTracking", "Resumed location tracking")
        } catch (e: SecurityException) {
            android.util.Log.e("LocationTracking", "Security exception: ${e.message}", e)
            _isPaused.value = true
        } catch (e: Exception) {
            android.util.Log.e("LocationTracking", "Error resuming tracking: ${e.message}", e)
            _isPaused.value = true
        }
    }

    fun stopTracking() {
        if (!_isTracking.value) {
            return
        }

        _isTracking.value = false
        _isPaused.value = false
        locationListener?.let {
            try {
                locationManager.removeUpdates(it)
                android.util.Log.d("LocationTracking", "Stopped location tracking")
            } catch (e: Exception) {
                android.util.Log.e("LocationTracking", "Error stopping tracking: ${e.message}", e)
            }
        }
        locationListener = null
        lastLocation = null
        
        // Final statistics calculation
        updateStatistics()
    }
    
    /**
     * Update all statistics from tracked locations
     */
    private fun updateStatistics() {
        val locations = _trackedLocations.value
        val points = _trackedPoints.value
        
        if (locations.isNotEmpty()) {
            // Calculate elevation stats
            val elevationStats = RideStatisticsCalculator.calculateElevationStats(locations)
            _elevationStats.value = elevationStats
            
            // Calculate speed stats
            val speedStats = RideStatisticsCalculator.calculateSpeedStats(locations)
            _speedStats.value = speedStats
        }
        
        if (points.size >= 3) {
            // Detect corners
            val corners = RideStatisticsCalculator.detectCorners(points)
            _cornerCount.value = corners.size
        }
    }
    
    /**
     * Get linked route ID if recording was started from a route
     */
    fun getLinkedRouteId(): String? = _linkedRouteId
    
    /**
     * Get linked route geometry for comparison
     */
    fun getLinkedRouteGeometry(): List<List<Double>>? = _linkedRouteGeometry

    fun clearTrack() {
        _trackedPoints.value = emptyList()
        _trackedLocations.value = emptyList()
        _totalDistance.value = 0.0
        _cornerCount.value = 0
        _elevationStats.value = null
        _speedStats.value = null
        _isPaused.value = false
        lastLocation = null
        _linkedRouteId = null
        _linkedRouteGeometry = null
    }
}
