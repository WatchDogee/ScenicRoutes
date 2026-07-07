package com.scenicroutes.app.data.service

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.osmdroid.util.GeoPoint
import com.scenicroutes.app.data.model.Route
import com.scenicroutes.app.data.model.RouteInstruction

/**
 * NavigationRerouteIntegration: Bridges RerouteManager with NavigationService
 * Handles:
 * - Off-route detection and state management
 * - Reroute stage determination
 * - Route merging (combining reroute segment with remaining original route)
 * - Callback coordination between services
 */
class NavigationRerouteIntegration(
    private val navigationService: NavigationService,
    private val coroutineScope: CoroutineScope
) {
    private val TAG = "NavRerouteIntegration"

    private val routeRepository = com.scenicroutes.app.data.repository.RouteRepository()
    private val rerouteManager = RerouteManager(coroutineScope, routeRepository)
    private val routeCalculator = RouteCalculator(routeRepository, coroutineScope)

    // State for route merging
    private var originalRouteGeometry: List<List<Double>> = emptyList()
    private var originalRouteInstructions: List<RouteInstruction> = emptyList()

    /**
     * Initialize reroute system with current route
     */
    fun initializeRoute(
        routeCalculator: RouteCalculator,
        rerouteManager: RerouteManager,
        routeGeometry: List<List<Double>>,
        instructions: List<RouteInstruction>? = null
    ) {
        originalRouteGeometry = routeGeometry
        originalRouteInstructions = instructions ?: emptyList()
        Log.d(TAG, "Route initialized: ${routeGeometry.size} points, ${instructions?.size ?: 0} instructions")
    }

    /**
     * Check for off-route and trigger appropriate reroute stage
     */
    fun processLocationUpdate(
        currentLocation: GeoPoint,
        currentBearing: Float?,
        routeGeometry: List<List<Double>>,
        routeEndPoint: GeoPoint?
    ) {
        if (routeGeometry.isEmpty()) return

        // Set bearing for heading validation
        if (currentBearing != null) {
            rerouteManager.setUserBearing(currentBearing)
        }

        // Check off-route status
        val offRouteState = rerouteManager.checkOffRoute(currentLocation, routeGeometry)

        if (offRouteState.isOffRoute && routeEndPoint != null) {
            // Trigger appropriate reroute stage
            coroutineScope.launch {
                val result = rerouteManager.handleOffRoute(
                    currentLocation = currentLocation,
                    routeGeometry = routeGeometry,
                    endPoint = routeEndPoint,
                    onRerouteNeeded = { start, end, profile ->
                        // This will be handled by the callback mechanism
                    }
                )

                if (result != null) {
                    // Handle completed reroute result
                    completeReroute(result)
                }
            }
        }
    }

    /**
     * Complete a reroute and merge with original route
     */
    private fun completeReroute(result: RerouteResult) {
        val mergedGeometry = mergeRoutes(
            rerouteSegment = result.rerouteSegment,
            remainingOriginal = result.remainingGeometry,
            joinPointIndex = result.joinPointIndex
        )

        Log.d(TAG, "Reroute complete: merged ${result.rerouteSegment.size} + ${result.remainingGeometry.size} points")
        Log.d(TAG, "Original route preserved: ${originalRouteGeometry.size} points")

        // Update navigation service with merged route
        navigationService.updateRouteGeometry(mergedGeometry, originalRouteGeometry)
    }

    /**
     * Merge reroute segment with remaining original route
     * Keeps original route intact in memory
     */
    private fun mergeRoutes(
        rerouteSegment: List<List<Double>>,
        remainingOriginal: List<List<Double>>,
        joinPointIndex: Int
    ): List<List<Double>> {
        // Combined route: [new segment] + [remaining original from join point]
        val merged = rerouteSegment + remainingOriginal

        Log.d(TAG, """
            Route Merge Summary:
            - Reroute segment: ${rerouteSegment.size} points
            - Join point index: $joinPointIndex
            - Remaining original: ${remainingOriginal.size} points
            - Merged total: ${merged.size} points
            - Original preserved: ${originalRouteGeometry.size} points
        """.trimIndent())

        return merged
    }

    /**
     * Get current off-route state
     */
    fun getOffRouteState(): OffRouteState = rerouteManager.offRouteState.value

    /**
     * Get reroute stage
     */
    fun getRerouteStage(): RerouteStage = rerouteManager.rerouteStage.value

    /**
     * Get direct path geometry (for Stage 2 visualization)
     */
    fun getDirectPathGeometry(): List<List<Double>> = rerouteManager.directPathGeometry.value

    /**
     * Cancel ongoing operations
     */
    fun cancel() {
        rerouteManager.cancel()
    }

    /**
     * Clear reroute cache (useful when conditions change)
     */
    fun clearCache() {
        routeCalculator.clearCache()
        Log.d(TAG, "Reroute cache cleared")
    }

    /**
     * Get debug info for testing/logging
     */
    fun getDebugInfo(): String {
        return """
            RerouteManager Debug Info:
            - Off-route: ${rerouteManager.offRouteState.value.isOffRoute}
            - Stage: ${rerouteManager.rerouteStage.value}
            - Is rerouting: ${rerouteManager.isRerouting.value}
            - ${routeCalculator.getCacheStats()}
        """.trimIndent()
    }
}

/**
 * Extension function on NavigationService to integrate rerouting
 * Call this in NavigationService.init() or onCreate()
 */
fun NavigationService.initializeRerouting(
    coroutineScope: CoroutineScope,
    onRerouteRequested: (GeoPoint, GeoPoint, String) -> Unit
) {
    this.navigationRerouteIntegration = NavigationRerouteIntegration(this, coroutineScope)
}

/**
 * Update route geometry with merged route while keeping original intact
 * This should be called from NavigationService
 */
fun NavigationService.updateRouteGeometry(
    newGeometry: List<List<Double>>,
    originalGeometry: List<List<Double>>
) {
    // Update active route
    val scenicRoute = com.scenicroutes.app.data.model.Route(
        geometry = newGeometry,
        distance = calculateRouteLengthMeters(newGeometry),
        time = 0 // Duration will be recalculated from instructions
    )
    this.completeReroute(scenicRoute, emptyList())

    // Original is preserved in memory as originalRouteGeometry
}

/**
 * Calculate route length in meters
 */
private fun calculateRouteLengthMeters(geometry: List<List<Double>>): Double {
    if (geometry.size < 2) return 0.0
    var totalDistance = 0.0
    for (i in 0 until geometry.size - 1) {
        val dist = com.scenicroutes.app.utils.calculateHaversineDistance(
            geometry[i][0], geometry[i][1],
            geometry[i + 1][0], geometry[i + 1][1]
        )
        totalDistance += dist
    }
    return totalDistance
}
