package com.scenicroutes.app.data.service

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.osmdroid.util.GeoPoint
import com.scenicroutes.app.utils.calculateHaversineDistance
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.pow

/**
 * Reroute stages based on distance from route
 */
enum class RerouteStage {
    // Stage 1: 0-75m - Closest point recovery (offline, instant)
    CLOSEST_POINT_RECOVERY,
    // Stage 2: 75-200m - Direct path to closest point (offline, instant)
    DIRECT_PATH_GUIDANCE,
    // Stage 3: >500m - Full API reroute via GraphHopper (online, 8-10s)
    API_REROUTING,
    // No reroute needed
    NONE
}

/**
 * Off-route detection state with hysteresis and heading validation
 */
data class OffRouteState(
    val isOffRoute: Boolean = false,
    val distanceToRoute: Double = 0.0,
    val closestRouteIndex: Int = 0,
    val closestPoint: GeoPoint? = null,
    val stage: RerouteStage = RerouteStage.NONE,
    val headingMismatch: Float = 0f,
    val durationMs: Long = 0L
)

/**
 * Reroute result containing original route and new reroute segment
 */
data class RerouteResult(
    val originalRouteGeometry: List<List<Double>>,
    val rerouteSegment: List<List<Double>>,
    val joinPointIndex: Int,
    val remainingGeometry: List<List<Double>>,
    val isApproachReroute: Boolean = false
)

/**
 * RerouteManager: Encapsulates all hybrid rerouting logic
 * - Off-route detection with hysteresis and heading validation
 * - Multi-stage rerouting (Stage 1: closest point, Stage 2: direct path, Stage 3: API)
 * - Route merging while keeping original intact
 * - Rate limiting to prevent thrashing
 */
class RerouteManager(
    private val coroutineScope: CoroutineScope,
    private val routeRepository: com.scenicroutes.app.data.repository.RouteRepository
) {
    private val TAG = "RerouteManager"

    // ===== THRESHOLDS =====
    companion object {
        // Distance thresholds for reroute stages (meters)
        // NOTE: Increased thresholds to account for sparse backend geometry (34 points/9km = 277m spacing)
        // With sparse geometry, straight-line segments cut across curves, causing false off-route detection
        const val STAGE_1_THRESHOLD = 150.0          // Stage 1: Closest point recovery (increased from 75m)
        const val STAGE_2_THRESHOLD = 250.0          // Stage 2: Direct path guidance (increased from 200m)
        const val STAGE_3_THRESHOLD = 500.0          // Stage 3: Full API reroute

        // Off-route detection timing
        const val OFF_ROUTE_DURATION_MS = 6000L      // 6 seconds sustained off-route (increased from 4s for sparse geometry)
        const val HEADING_MISMATCH_THRESHOLD = 60f   // degrees
        const val HEADING_MISMATCH_DURATION_MS = 2000L  // 2 seconds for heading check

        // Rate limiting
        const val REROUTE_RATE_LIMIT_MS = 10000L     // 10 seconds between reroutes
        const val MIN_REROUTE_SPACING_M = 50.0       // meters

        // Reroute target selection
        const val FORWARD_PROGRESS_MIN_M = 30.0      // minimum forward progress
        const val UTURN_PENALTY_ANGLE = 120f         // degrees (180 = perfect U-turn)
    }

    // ===== STATE FLOWS =====
    private val _offRouteState = MutableStateFlow(OffRouteState())
    val offRouteState: StateFlow<OffRouteState> = _offRouteState.asStateFlow()

    private val _isOffRoute = MutableStateFlow(false)
    val isOffRoute: StateFlow<Boolean> = _isOffRoute.asStateFlow()

    private val _rerouteStage = MutableStateFlow(RerouteStage.NONE)
    val rerouteStage: StateFlow<RerouteStage> = _rerouteStage.asStateFlow()

    private val _isRerouting = MutableStateFlow(false)
    val isRerouting: StateFlow<Boolean> = _isRerouting.asStateFlow()

    private val _directPathGeometry = MutableStateFlow<List<List<Double>>>(emptyList())
    val directPathGeometry: StateFlow<List<List<Double>>> = _directPathGeometry.asStateFlow()

    private val _originalRouteGeometry = MutableStateFlow<List<List<Double>>>(emptyList())
    val originalRouteGeometry: StateFlow<List<List<Double>>> = _originalRouteGeometry.asStateFlow()

    // ===== INTERNAL STATE =====
    private var offRouteStartTimeMs: Long = 0L
    private var headingMismatchStartTimeMs: Long = 0L
    private var lastRerouteAttemptMs: Long = 0L
    private var lastRerouteLocationM: GeoPoint? = null
    private var userBearing: Float? = null
    private var lastLocationOnRoute: GeoPoint? = null

    /**
     * Set current user bearing from device sensors
     */
    fun setUserBearing(bearing: Float?) {
        userBearing = bearing
    }

    /**
     * Main entry point: Check and update off-route state
     */
    fun checkOffRoute(
        currentLocation: GeoPoint,
        routeGeometry: List<List<Double>>
    ): OffRouteState {
        if (routeGeometry.isEmpty()) {
            return _offRouteState.value
        }

        val now = System.currentTimeMillis()

        // Find closest point on route
        val (closestIndex, closestPoint, distanceToRoute) = findClosestPointOnRoute(
            currentLocation,
            routeGeometry
        )

        val headingMismatch = calculateHeadingMismatch(currentLocation, closestIndex, routeGeometry)
        val currentState = _offRouteState.value

        // ===== OFF-ROUTE DETECTION WITH HYSTERESIS =====
        if (distanceToRoute > STAGE_1_THRESHOLD) {
            // Potentially off-route
            if (!currentState.isOffRoute) {
                // Start off-route timer
                offRouteStartTimeMs = now
                Log.d(TAG, "Off-route zone entered: ${distanceToRoute.toInt()}m (heading mismatch: ${headingMismatch.toInt()}°)")
            } else {
                // Check if sustained off-route
                val offRouteDuration = now - offRouteStartTimeMs
                if (offRouteDuration >= OFF_ROUTE_DURATION_MS) {
                    // Confirmed off-route - check heading too
                    val isHeadingDeviated = headingMismatch > HEADING_MISMATCH_THRESHOLD

                    if (isHeadingDeviated) {
                        if (headingMismatchStartTimeMs == 0L) {
                            headingMismatchStartTimeMs = now
                        } else if (now - headingMismatchStartTimeMs >= HEADING_MISMATCH_DURATION_MS) {
                            // Both distance AND heading confirm off-route
                            Log.w(TAG, "OFF-ROUTE CONFIRMED: distance=${distanceToRoute.toInt()}m, heading_mismatch=${headingMismatch.toInt()}°, duration=${offRouteDuration}ms")
                            val stage = determineRerouteStage(distanceToRoute)
                            updateOffRouteState(
                                isOffRoute = true,
                                distance = distanceToRoute,
                                closestIndex = closestIndex,
                                closestPoint = closestPoint,
                                stage = stage,
                                headingMismatch = headingMismatch,
                                duration = offRouteDuration
                            )
                        }
                    }
                }
            }
        } else {
            // Back on route - reset timers
            if (currentState.isOffRoute) {
                Log.d(TAG, "Back on route (distance: ${distanceToRoute.toInt()}m)")
                resetOffRouteState()
            }
            offRouteStartTimeMs = 0L
            headingMismatchStartTimeMs = 0L
            lastLocationOnRoute = currentLocation
        }

        return _offRouteState.value
    }

    /**
     * Determine which reroute stage is appropriate
     */
    fun determineRerouteStage(distanceToRoute: Double): RerouteStage {
        return when {
            distanceToRoute <= STAGE_1_THRESHOLD -> RerouteStage.CLOSEST_POINT_RECOVERY
            distanceToRoute <= STAGE_2_THRESHOLD -> RerouteStage.DIRECT_PATH_GUIDANCE
            distanceToRoute > STAGE_3_THRESHOLD -> RerouteStage.API_REROUTING
            else -> RerouteStage.DIRECT_PATH_GUIDANCE
        }
    }

    /**
     * Handle off-route: choose appropriate reroute stage
     */
    fun handleOffRoute(
        currentLocation: GeoPoint,
        routeGeometry: List<List<Double>>,
        endPoint: GeoPoint,
        onRerouteNeeded: (GeoPoint, GeoPoint, String) -> Unit
    ): RerouteResult? {
        val state = _offRouteState.value
        if (!state.isOffRoute) return null

        Log.d(TAG, "Handling off-route - Stage: ${state.stage}")

        return when (state.stage) {
            RerouteStage.CLOSEST_POINT_RECOVERY -> {
                // Stage 1: Just snap to closest point (no active reroute)
                _rerouteStage.value = RerouteStage.CLOSEST_POINT_RECOVERY
                _directPathGeometry.value = emptyList()
                Log.d(TAG, "Stage 1: Closest point recovery at index ${state.closestRouteIndex}")
                null // No new route needed
            }

            RerouteStage.DIRECT_PATH_GUIDANCE -> {
                // Stage 2: Show direct path to closest point
                if (state.closestPoint != null) {
                    val directPath = listOf(
                        listOf(currentLocation.latitude, currentLocation.longitude),
                        listOf(state.closestPoint.latitude, state.closestPoint.longitude)
                    )
                    _directPathGeometry.value = directPath
                    _rerouteStage.value = RerouteStage.DIRECT_PATH_GUIDANCE
                    Log.d(TAG, "Stage 2: Direct path from current to closest point (index ${state.closestRouteIndex})")
                }
                null // No new route yet
            }

            RerouteStage.API_REROUTING -> {
                // Stage 3: Request new route via GraphHopper
                val now = System.currentTimeMillis()
                val timeSinceLastReroute = now - lastRerouteAttemptMs
                val spacingSinceLastReroute = if (lastRerouteLocationM != null) {
                    calculateHaversineDistance(
                        lastRerouteLocationM!!.latitude,
                        lastRerouteLocationM!!.longitude,
                        currentLocation.latitude,
                        currentLocation.longitude
                    )
                } else {
                    Double.MAX_VALUE
                }

                // Rate limit reroutes
                if (timeSinceLastReroute < REROUTE_RATE_LIMIT_MS && spacingSinceLastReroute < MIN_REROUTE_SPACING_M) {
                    Log.d(TAG, "Reroute rate-limited (time: ${timeSinceLastReroute}ms, spacing: ${spacingSinceLastReroute.toInt()}m)")
                    return null
                }

                // Trigger API reroute
                _isRerouting.value = true
                _rerouteStage.value = RerouteStage.API_REROUTING
                lastRerouteAttemptMs = now
                lastRerouteLocationM = currentLocation

                Log.d(TAG, "Stage 3: Requesting API reroute from (${currentLocation.latitude},${currentLocation.longitude}) to (${endPoint.latitude},${endPoint.longitude})")
                onRerouteNeeded(currentLocation, endPoint, "scenic")
                null // Will be handled by callback
            }

            RerouteStage.NONE -> null
        }
    }

    /**
     * Complete Stage 3 reroute after GraphHopper returns new route
     */
    fun completeReroute(
        newRouteGeometry: List<List<Double>>,
        originalRouteGeometry: List<List<Double>>,
        currentLocation: GeoPoint
    ): RerouteResult? {
        if (newRouteGeometry.isEmpty()) {
            Log.e(TAG, "Cannot complete reroute: new route is empty")
            _isRerouting.value = false
            return null
        }

        _isRerouting.value = false
        resetOffRouteState()

        // Find join point on original route (closest to current location)
        val (joinIndex, _, _) = findClosestPointOnRoute(currentLocation, originalRouteGeometry)

        // Get remaining original route after join point
        val remainingOriginal = if (joinIndex < originalRouteGeometry.size - 1) {
            originalRouteGeometry.drop(joinIndex)
        } else {
            emptyList()
        }

        Log.d(TAG, "Reroute complete: new segment=${newRouteGeometry.size} points, join at index $joinIndex, remaining=${remainingOriginal.size} points")

        return RerouteResult(
            originalRouteGeometry = originalRouteGeometry,
            rerouteSegment = newRouteGeometry,
            joinPointIndex = joinIndex,
            remainingGeometry = remainingOriginal,
            isApproachReroute = false
        )
    }

    /**
     * Failed reroute - fallback to staying on original route
     */
    fun rerouteFailed() {
        _isRerouting.value = false
        _rerouteStage.value = RerouteStage.NONE
        Log.w(TAG, "Reroute failed, reverting to original route")
    }

    /**
     * Generate start-approach route when user is far from route start
     */
    fun generateApproachRoute(
        currentLocation: GeoPoint,
        routeStart: GeoPoint,
        distanceToStart: Double,
        onRouteRequested: (GeoPoint, GeoPoint, String) -> Unit
    ) {
        if (distanceToStart < 50.0) {
            // Already at start
            Log.d(TAG, "Already at route start (${distanceToStart.toInt()}m away)")
            return
        }

        Log.d(TAG, "Generating approach route from (${currentLocation.latitude},${currentLocation.longitude}) to (${routeStart.latitude},${routeStart.longitude}), distance: ${distanceToStart.toInt()}m")
        onRouteRequested(currentLocation, routeStart, "approach")
    }

    /**
     * Find closest point on route to current location
     * Returns: (index in geometry, GeoPoint, distance in meters)
     */
    private fun findClosestPointOnRoute(
        currentLocation: GeoPoint,
        geometry: List<List<Double>>
    ): Triple<Int, GeoPoint, Double> {
        var closestIndex = 0
        var minDistance = Double.MAX_VALUE
        var closestGeoPoint = GeoPoint(geometry[0][0], geometry[0][1])

        geometry.forEachIndexed { index, coord ->
            if (coord.size >= 2) {
                val distance = calculateHaversineDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    coord[0], coord[1]
                )
                if (distance < minDistance) {
                    minDistance = distance
                    closestIndex = index
                    closestGeoPoint = GeoPoint(coord[0], coord[1])
                }
            }
        }

        return Triple(closestIndex, closestGeoPoint, minDistance)
    }

    /**
     * Calculate heading mismatch between user bearing and route direction at closest point
     */
    private fun calculateHeadingMismatch(
        currentLocation: GeoPoint,
        closestIndex: Int,
        routeGeometry: List<List<Double>>
    ): Float {
        // If we don't have user bearing from sensors, return 0
        if (userBearing == null) return 0f

        // Calculate route direction at closest point
        val nextIndex = (closestIndex + 1).coerceAtMost(routeGeometry.size - 1)
        if (closestIndex >= routeGeometry.size - 1) return 0f

        val point1 = routeGeometry[closestIndex]
        val point2 = routeGeometry[nextIndex]

        val routeBearing = calculateBearing(
            point1[0], point1[1],
            point2[0], point2[1]
        )

        // Calculate angle difference
        var angleDiff = (userBearing!! - routeBearing) % 360f
        if (angleDiff > 180f) angleDiff = 360f - angleDiff
        if (angleDiff < 0f) angleDiff = -angleDiff

        return angleDiff
    }

    /**
     * Calculate bearing between two lat/lon points (degrees, 0-360)
     */
    private fun calculateBearing(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Float {
        val dLon = Math.toRadians(lon2 - lon1)
        val lat1Rad = Math.toRadians(lat1)
        val lat2Rad = Math.toRadians(lat2)

        val y = sin(dLon) * cos(lat2Rad)
        val x = cos(lat1Rad) * sin(lat2Rad) - sin(lat1Rad) * cos(lat2Rad) * cos(dLon)
        val bearing = atan2(y, x)

        return (Math.toDegrees(bearing).toFloat() + 360f) % 360f
    }

    /**
     * Update off-route state
     */
    private fun updateOffRouteState(
        isOffRoute: Boolean,
        distance: Double,
        closestIndex: Int,
        closestPoint: GeoPoint,
        stage: RerouteStage,
        headingMismatch: Float,
        duration: Long
    ) {
        val newState = OffRouteState(
            isOffRoute = isOffRoute,
            distanceToRoute = distance,
            closestRouteIndex = closestIndex,
            closestPoint = closestPoint,
            stage = stage,
            headingMismatch = headingMismatch,
            durationMs = duration
        )
        _offRouteState.value = newState
        _isOffRoute.value = isOffRoute
        _rerouteStage.value = stage
    }

    /**
     * Reset off-route state
     */
    private fun resetOffRouteState() {
        val resetState = OffRouteState()
        _offRouteState.value = resetState
        _isOffRoute.value = false
        _rerouteStage.value = RerouteStage.NONE
        _directPathGeometry.value = emptyList()
        offRouteStartTimeMs = 0L
        headingMismatchStartTimeMs = 0L
    }

    /**
     * Cancel ongoing reroute attempt
     */
    fun cancel() {
        _isRerouting.value = false
        _rerouteStage.value = RerouteStage.NONE
        resetOffRouteState()
    }
}
