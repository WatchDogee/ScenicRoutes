package com.scenicroutes.app.navigation

import android.location.Location
import com.scenicroutes.app.location.LocationProvider
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * NavigationSession manages turn-by-turn navigation state.
 * 
 * Features:
 * - Independent from ride recording
 * - Uses shared LocationProvider
 * - Handles route following and rerouting
 * - Provides navigation instructions
 * 
 * Note: This is a simplified abstraction. Full implementation would integrate
 * with mapping services (Google Maps, Mapbox, etc.)
 */
class NavigationSession(
    private val locationProvider: LocationProvider,
    private val routeId: String,
    private val routePoints: List<RoutePoint>
) {
    
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    
    // Navigation state
    private val _isActive = MutableStateFlow(false)
    val isActive: StateFlow<Boolean> = _isActive.asStateFlow()
    
    private val _currentInstruction = MutableStateFlow<NavigationInstruction?>(null)
    val currentInstruction: StateFlow<NavigationInstruction?> = _currentInstruction.asStateFlow()
    
    private val _distanceToDestination = MutableStateFlow<Double>(0.0)
    val distanceToDestination: StateFlow<Double> = _distanceToDestination.asStateFlow()
    
    private val _estimatedTimeToDestination = MutableStateFlow<Long>(0L)
    val estimatedTimeToDestination: StateFlow<Long> = _estimatedTimeToDestination.asStateFlow()
    
    private val _isOffRoute = MutableStateFlow(false)
    val isOffRoute: StateFlow<Boolean> = _isOffRoute.asStateFlow()
    
    // Route tracking
    private var currentRouteIndex = 0
    private var currentLocation: Location? = null
    private var locationCallback: ((Location) -> Unit)? = null
    
    // Callbacks
    private val navigationListeners = mutableSetOf<NavigationListener>()
    
    companion object {
        private const val OFF_ROUTE_THRESHOLD_METERS = 50.0 // 50 meters
        private const val WAYPOINT_REACHED_THRESHOLD_METERS = 20.0 // 20 meters
    }
    
    interface NavigationListener {
        fun onNavigationStarted(routeId: String)
        fun onNavigationEnded()
        fun onInstructionUpdated(instruction: NavigationInstruction)
        fun onOffRoute()
        fun onRerouting()
        fun onRouteRecalculated()
    }
    
    data class RoutePoint(
        val latitude: Double,
        val longitude: Double,
        val instruction: String? = null,
        val distanceToNext: Double = 0.0
    )
    
    data class NavigationInstruction(
        val text: String,
        val distanceToNext: Double,
        val maneuverType: ManeuverType = ManeuverType.CONTINUE
    )
    
    enum class ManeuverType {
        START,
        CONTINUE,
        TURN_LEFT,
        TURN_RIGHT,
        TURN_SLIGHT_LEFT,
        TURN_SLIGHT_RIGHT,
        TURN_SHARP_LEFT,
        TURN_SHARP_RIGHT,
        ARRIVE
    }
    
    // Public API
    
    fun addListener(listener: NavigationListener) {
        navigationListeners.add(listener)
    }
    
    fun removeListener(listener: NavigationListener) {
        navigationListeners.remove(listener)
    }
    
    fun getRouteId(): String = routeId
    
    fun start() {
        if (_isActive.value) return
        
        _isActive.value = true
        currentRouteIndex = 0
        
        startLocationTracking()
        
        navigationListeners.forEach { it.onNavigationStarted(routeId) }
    }
    
    fun stop() {
        if (!_isActive.value) return
        
        _isActive.value = false
        
        stopLocationTracking()
        
        navigationListeners.forEach { it.onNavigationEnded() }
    }
    
    fun requestReroute() {
        if (!_isActive.value) return
        
        scope.launch {
            navigationListeners.forEach { it.onRerouting() }
            
            // Simulate reroute calculation
            // In real implementation, call routing API
            delay(1000)
            
            navigationListeners.forEach { it.onRouteRecalculated() }
        }
    }
    
    // Private methods
    
    private fun startLocationTracking() {
        locationCallback = { location ->
            onLocationUpdate(location)
        }
        
        locationProvider.requestLocationUpdates(
            intervalMs = LocationProvider.HIGH_ACCURACY_INTERVAL_MS,
            callback = locationCallback!!
        )
    }
    
    private fun stopLocationTracking() {
        locationCallback?.let { callback ->
            locationProvider.removeLocationUpdates(callback)
        }
        locationCallback = null
    }
    
    private fun onLocationUpdate(location: Location) {
        currentLocation = location
        
        // Check if off route
        val nearestPoint = findNearestRoutePoint(location)
        val distanceFromRoute = nearestPoint?.let { point ->
            val results = FloatArray(1)
            Location.distanceBetween(
                location.latitude, location.longitude,
                point.latitude, point.longitude,
                results
            )
            results[0].toDouble()
        } ?: Double.MAX_VALUE
        
        if (distanceFromRoute > OFF_ROUTE_THRESHOLD_METERS) {
            if (!_isOffRoute.value) {
                _isOffRoute.value = true
                navigationListeners.forEach { it.onOffRoute() }
            }
        } else {
            _isOffRoute.value = false
        }
        
        // Update current instruction
        updateNavigationInstruction(location)
        
        // Calculate remaining distance and time
        updateDistanceAndTime(location)
    }
    
    private fun findNearestRoutePoint(location: Location): RoutePoint? {
        if (routePoints.isEmpty()) return null
        
        return routePoints.minByOrNull { point ->
            val results = FloatArray(1)
            Location.distanceBetween(
                location.latitude, location.longitude,
                point.latitude, point.longitude,
                results
            )
            results[0]
        }
    }
    
    private fun updateNavigationInstruction(location: Location) {
        if (currentRouteIndex >= routePoints.size) return
        
        val nextPoint = routePoints[currentRouteIndex]
        val results = FloatArray(1)
        Location.distanceBetween(
            location.latitude, location.longitude,
            nextPoint.latitude, nextPoint.longitude,
            results
        )
        val distanceToNext = results[0].toDouble()
        
        // Check if waypoint reached
        if (distanceToNext < WAYPOINT_REACHED_THRESHOLD_METERS) {
            currentRouteIndex++
            if (currentRouteIndex < routePoints.size) {
                updateNavigationInstruction(location)
            } else {
                // Destination reached
                val arriveInstruction = NavigationInstruction(
                    text = "You have arrived at your destination",
                    distanceToNext = 0.0,
                    maneuverType = ManeuverType.ARRIVE
                )
                _currentInstruction.value = arriveInstruction
                navigationListeners.forEach { it.onInstructionUpdated(arriveInstruction) }
            }
            return
        }
        
        // Update instruction
        val instruction = NavigationInstruction(
            text = nextPoint.instruction ?: "Continue on route",
            distanceToNext = distanceToNext,
            maneuverType = ManeuverType.CONTINUE
        )
        _currentInstruction.value = instruction
        navigationListeners.forEach { it.onInstructionUpdated(instruction) }
    }
    
    private fun updateDistanceAndTime(location: Location) {
        if (currentRouteIndex >= routePoints.size) {
            _distanceToDestination.value = 0.0
            _estimatedTimeToDestination.value = 0L
            return
        }
        
        // Calculate remaining distance
        var totalDistance = 0.0
        
        // Distance to next waypoint
        val nextPoint = routePoints[currentRouteIndex]
        val results = FloatArray(1)
        Location.distanceBetween(
            location.latitude, location.longitude,
            nextPoint.latitude, nextPoint.longitude,
            results
        )
        totalDistance += results[0]
        
        // Add distances between remaining waypoints
        for (i in currentRouteIndex until routePoints.size - 1) {
            totalDistance += routePoints[i].distanceToNext
        }
        
        _distanceToDestination.value = totalDistance
        
        // Estimate time (assuming average speed from current location)
        val speed = location.speed.toDouble() // m/s
        val estimatedSeconds = if (speed > 0) {
            (totalDistance / speed).toLong()
        } else {
            0L
        }
        _estimatedTimeToDestination.value = estimatedSeconds
    }
    
    fun cleanup() {
        stop()
        scope.cancel()
    }
}
