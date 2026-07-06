package com.scenicroutes.app.data.service

import android.content.Context
import android.util.Log
import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Telemetry service for tracking user events and analytics
 * Fire-and-forget event logging for product insights
 */
class TelemetryService(private val context: Context) {
    private val apiService: ApiService = NetworkModule.apiService
    private val scope = CoroutineScope(Dispatchers.IO)

    /**
     * Log a telemetry event
     * This is fire-and-forget - errors are logged but don't affect user experience
     */
    fun logEvent(
        eventType: String,
        payload: Map<String, Any?> = emptyMap(),
        context: Map<String, Any?>? = null,
    ) {
        scope.launch {
            try {
                val eventData = mapOf(
                    "event_type" to eventType,
                    "payload" to payload,
                    "context" to (context ?: emptyMap()),
                    "timestamp" to System.currentTimeMillis(),
                    "platform" to "android",
                )

                withContext(Dispatchers.IO) {
                    try {
                        apiService.logTelemetryEvent(eventData)
                    } catch (e: Exception) {
                        // Ignore network errors for telemetry
                        Log.d("TelemetryService", "Network error logging event: $eventType", e)
                    }
                }
            } catch (e: Exception) {
                // Fire-and-forget: log error but don't throw
                Log.d("TelemetryService", "Failed to log event: $eventType", e)
            }
        }
    }

    // Convenience methods for common events

    fun logRouteCalculation(
        curvatureLevel: String?,
        hasWaypoints: Boolean,
        hasAlternatives: Boolean,
        success: Boolean,
        error: String? = null,
    ) {
        logEvent(
            eventType = if (success) "route_calculation_completed" else "route_calculation_failed",
            payload = mapOf(
                "curvature_level" to (curvatureLevel ?: "unknown"),
                "has_waypoints" to hasWaypoints,
                "has_alternatives" to hasAlternatives,
                "error" to (error ?: ""),
            ),
        )
    }

    fun logSegmentCurvatureCalculation(
        segmentCount: Int,
        success: Boolean,
        error: String? = null,
    ) {
        logEvent(
            eventType = if (success) "segment_curvature_calculation_completed" else "segment_curvature_calculation_failed",
            payload = mapOf(
                "segment_count" to segmentCount,
                "error" to (error ?: ""),
            ),
        )
    }

    fun logWaypointAdded(waypointCount: Int) {
        logEvent(
            eventType = "routeplanner_waypoint_added",
            payload = mapOf("waypoint_count" to waypointCount),
        )
    }

    fun logAlternativeRouteSelected(routeIndex: Int) {
        logEvent(
            eventType = "routeplanner_alternative_selected",
            payload = mapOf("route_index" to routeIndex),
        )
    }

    fun logPOIWaypointRequested(poiType: String) {
        logEvent(
            eventType = "poi_waypoint_requested",
            payload = mapOf("poi_type" to poiType),
        )
    }

    fun logFeatureUsage(featureName: String, action: String) {
        logEvent(
            eventType = "feature_usage",
            payload = mapOf(
                "feature" to featureName,
                "action" to action,
            ),
        )
    }
}
