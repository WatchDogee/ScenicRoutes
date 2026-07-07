package com.scenicroutes.app.data.service

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.scenicroutes.app.data.model.Route
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.osmdroid.util.GeoPoint
import java.io.File
import kotlin.math.*

data class CachedRoute(
    val route: com.scenicroutes.app.data.model.Route,
    val timestamp: Long = System.currentTimeMillis(),
    val startPoint: List<Double>,
    val endPoint: List<Double>,
    val waypoints: List<List<Double>> = emptyList(),
)

class OfflineNavigationManager(private val context: Context) {
    private val routesCacheFile = File(context.filesDir, "cached_routes.json")
    private val gson: Gson = GsonBuilder().setLenient().create()

    private val _cachedRoutes = MutableStateFlow<List<CachedRoute>>(emptyList())
    val cachedRoutes: StateFlow<List<CachedRoute>> = _cachedRoutes.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    init {
        loadCachedRoutes()
        checkConnectivity()
    }

    fun isOnline(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun checkConnectivity() {
        _isOffline.value = !isOnline()
    }

    fun cacheRoute(route: com.scenicroutes.app.data.model.Route, startPoint: List<Double>, endPoint: List<Double>, waypoints: List<List<Double>> = emptyList()) {
        val cachedRoute = CachedRoute(
            route = route,
            startPoint = startPoint,
            endPoint = endPoint,
            waypoints = waypoints,
        )

        val updatedRoutes = _cachedRoutes.value.toMutableList()
        // Remove old route if exists (same start/end)
        updatedRoutes.removeAll {
            it.startPoint == startPoint && it.endPoint == endPoint && it.waypoints == waypoints
        }
        // Add new route at the beginning
        updatedRoutes.add(0, cachedRoute)

        // Keep only last 50 routes
        if (updatedRoutes.size > 50) {
            updatedRoutes.removeAt(updatedRoutes.size - 1)
        }

        _cachedRoutes.value = updatedRoutes
        saveCachedRoutes()
    }

    fun findCachedRoute(startPoint: List<Double>, endPoint: List<Double>, waypoints: List<List<Double>> = emptyList()): com.scenicroutes.app.data.model.Route? {
        return _cachedRoutes.value.firstOrNull {
            it.startPoint == startPoint && it.endPoint == endPoint && it.waypoints == waypoints
        }?.route
    }

    fun findSimilarCachedRoute(currentLocation: GeoPoint, destination: GeoPoint, maxDistance: Double = 5000.0): com.scenicroutes.app.data.model.Route? {
        // Find a cached route that's similar to the requested route
        // Used for offline recalculation when exact match isn't found
        return _cachedRoutes.value.firstOrNull { cached ->
            val cachedStart = GeoPoint(cached.startPoint[0], cached.startPoint[1])
            val cachedEnd = GeoPoint(cached.endPoint[0], cached.endPoint[1])

            val startDistance = calculateDistance(currentLocation, cachedStart)
            val endDistance = calculateDistance(destination, cachedEnd)

            startDistance <= maxDistance && endDistance <= maxDistance
        }?.route
    }

    fun recalculateRouteOffline(
        currentLocation: GeoPoint,
        destination: GeoPoint,
        waypoints: List<GeoPoint> = emptyList(),
    ): com.scenicroutes.app.data.model.Route? {
        checkConnectivity()

        if (isOnline()) {
            // If online, don't use offline recalculation
            return null
        }

        // Try to find exact match first
        val startPoint = listOf(currentLocation.latitude, currentLocation.longitude)
        val endPoint = listOf(destination.latitude, destination.longitude)
        val waypointList = waypoints.map { listOf(it.latitude, it.longitude) }

        val exactMatch = findCachedRoute(startPoint, endPoint, waypointList)
        if (exactMatch != null) {
            return exactMatch
        }

        // Try to find similar route
        val similarRoute = findSimilarCachedRoute(currentLocation, destination)
        if (similarRoute != null) {
            // Create a modified route based on the similar one
            // This is a basic implementation - in a full version, you'd do proper route recalculation
            return similarRoute.copy(
                geometry = listOf(
                    listOf(currentLocation.latitude, currentLocation.longitude),
                    listOf(destination.latitude, destination.longitude),
                ),
            )
        }

        // If no cached route found, create a simple straight-line route
        return createStraightLineRoute(currentLocation, destination, waypoints)
    }

    private fun createStraightLineRoute(start: GeoPoint, end: GeoPoint, waypoints: List<GeoPoint>): com.scenicroutes.app.data.model.Route {
        val geometry = mutableListOf<List<Double>>()
        geometry.add(listOf(start.latitude, start.longitude))

        waypoints.forEach { waypoint ->
            geometry.add(listOf(waypoint.latitude, waypoint.longitude))
        }

        geometry.add(listOf(end.latitude, end.longitude))

        // Calculate distance
        var totalDistance = calculateDistance(start, end)
        waypoints.forEachIndexed { index, waypoint ->
            val prevPoint = if (index == 0) start else waypoints[index - 1]
            totalDistance += calculateDistance(prevPoint, waypoint)
        }

        // Estimate time (assuming average speed of 60 km/h)
        val estimatedTime = (totalDistance / 1000.0 / 60.0 * 3600.0 * 1000.0).toLong()

        return com.scenicroutes.app.data.model.Route(
            geometry = geometry,
            distance = totalDistance,
            time = estimatedTime,
            instructions = null,
        )
    }

    private fun calculateDistance(p1: GeoPoint, p2: GeoPoint): Double {
        val earthRadius = 6371000.0 // Earth radius in meters

        val lat1 = Math.toRadians(p1.latitude)
        val lat2 = Math.toRadians(p2.latitude)
        val deltaLat = Math.toRadians(p2.latitude - p1.latitude)
        val deltaLon = Math.toRadians(p2.longitude - p1.longitude)

        val a = sin(deltaLat / 2) * sin(deltaLat / 2) +
            cos(lat1) * cos(lat2) *
            sin(deltaLon / 2) * sin(deltaLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return earthRadius * c
    }

    private fun loadCachedRoutes() {
        try {
            if (routesCacheFile.exists()) {
                val jsonString = routesCacheFile.readText()
                val type = object : com.google.gson.reflect.TypeToken<List<CachedRoute>>() {}.type
                val cachedRoutes: List<CachedRoute> = gson.fromJson(jsonString, type)
                _cachedRoutes.value = cachedRoutes
            }
        } catch (e: Exception) {
            android.util.Log.e("OfflineNavigationManager", "Error loading cached routes: ${e.message}", e)
        }
    }

    private fun saveCachedRoutes() {
        try {
            val jsonString = gson.toJson(_cachedRoutes.value)
            routesCacheFile.writeText(jsonString)
        } catch (e: Exception) {
            android.util.Log.e("OfflineNavigationManager", "Error saving cached routes: ${e.message}", e)
        }
    }

    fun clearCache() {
        _cachedRoutes.value = emptyList()
        if (routesCacheFile.exists()) {
            routesCacheFile.delete()
        }
    }
}
