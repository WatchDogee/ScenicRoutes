package com.scenicroutes.app.utils

import androidx.compose.runtime.Composable
import java.util.Locale

/**
 * Utility class for formatting distances based on measurement units
 */
object DistanceFormatter {
    /**
     * Composable helper to format distance using current user settings
     * @param distanceMeters Distance in meters
     * @return Formatted string (e.g., "5.2 km" or "3.2 mi")
     */
    @Composable
    fun formatDistanceWithSettings(distanceMeters: Double): String {
        val units = SettingsManager.getMeasurementUnits()
        return formatDistance(distanceMeters, units)
    }
    private const val METERS_TO_MILES = 0.000621371
    private const val METERS_TO_FEET = 3.28084
    private const val KM_TO_MILES = 0.621371

    /**
     * Format distance in meters to a human-readable string
     * @param distanceMeters Distance in meters
     * @param units "metric" or "imperial"
     * @return Formatted string (e.g., "5.2 km" or "3.2 mi")
     */
    fun formatDistance(distanceMeters: Double, units: String = "metric"): String {
        return if (units == "imperial") {
            formatDistanceImperial(distanceMeters)
        } else {
            formatDistanceMetric(distanceMeters)
        }
    }

    /**
     * Format distance in meters to metric (km/m)
     */
    private fun formatDistanceMetric(distanceMeters: Double): String {
        return when {
            distanceMeters < 1000 -> {
                String.format(Locale.getDefault(), "%.0f m", distanceMeters)
            }
            distanceMeters < 10000 -> {
                String.format(Locale.getDefault(), "%.1f km", distanceMeters / 1000)
            }
            else -> {
                String.format(Locale.getDefault(), "%.0f km", distanceMeters / 1000)
            }
        }
    }

    /**
     * Format distance in meters to imperial (mi/ft)
     */
    private fun formatDistanceImperial(distanceMeters: Double): String {
        val miles = distanceMeters * METERS_TO_MILES
        return when {
            miles < 0.1 -> {
                val feet = distanceMeters * METERS_TO_FEET
                String.format(Locale.getDefault(), "%.0f ft", feet)
            }
            miles < 1.0 -> {
                String.format(Locale.getDefault(), "%.2f mi", miles)
            }
            miles < 10.0 -> {
                String.format(Locale.getDefault(), "%.1f mi", miles)
            }
            else -> {
                String.format(Locale.getDefault(), "%.0f mi", miles)
            }
        }
    }

    /**
     * Format speed in m/s to km/h or mph
     * @param speedMs Speed in meters per second
     * @param units "metric" or "imperial"
     * @return Formatted string (e.g., "60 km/h" or "37 mph")
     */
    fun formatSpeed(speedMs: Double, units: String = "metric"): String {
        return if (units == "imperial") {
            val mph = speedMs * 2.23694 // m/s to mph
            String.format(Locale.getDefault(), "%.1f mph", mph)
        } else {
            val kmh = speedMs * 3.6 // m/s to km/h
            String.format(Locale.getDefault(), "%.1f km/h", kmh)
        }
    }

    /**
     * Convert meters to the appropriate unit
     * @param distanceMeters Distance in meters
     * @param units "metric" or "imperial"
     * @return Pair of (value, unit) e.g., (5.2, "km") or (3.2, "mi")
     */
    fun convertDistance(distanceMeters: Double, units: String = "metric"): Pair<Double, String> {
        return if (units == "imperial") {
            val miles = distanceMeters * METERS_TO_MILES
            Pair(miles, "mi")
        } else {
            val km = distanceMeters / 1000.0
            Pair(km, "km")
        }
    }
}







