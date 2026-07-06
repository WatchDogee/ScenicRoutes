package com.scenicroutes.app.data.service

import android.content.Context
import com.scenicroutes.app.BuildConfig
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.repository.SubscriptionRepository
import kotlinx.coroutines.flow.first

class FeatureAccessService(private val context: Context) {
    private val subscriptionRepository = SubscriptionRepository()
    private val tokenManager = TokenManager(context)

    /**
     * Check if user has access to a specific feature
     * @param feature Feature name (e.g., "extra_curvy", "offline_maps", "gpx_export")
     * @return true if user has access, false otherwise
     */
    suspend fun hasFeatureAccess(feature: String): Boolean {
        if (!BuildConfig.OFFLINE_MAPS_ENABLED && feature in listOf("offline_maps", "unlimited_offline_maps")) {
            return false
        }

        val token = tokenManager.token.first() ?: return false

        // Use getCurrentTier() which has offline caching built-in
        val tier = getCurrentTier() ?: "free"

        return when (feature) {
            // Premium/Pro features
            "extra_curvy",
            "round_trip_unlimited",
            "route_alternatives",
            "offline_maps",
            "gpx_export",
            "turn_by_turn",
            "ride_recording",
            "private_roads",
            "segment_curvature",
            -> tier in listOf("premium", "pro")

            // Pro-only features
            "api_access",
            "unlimited_offline_maps",
            -> tier == "pro"

            // Free features (always available)
            else -> true
        }
    }

    /**
     * Get the required subscription tier for a feature
     * @param feature Feature name
     * @return "Premium" or "Pro" or "Free"
     */
    fun getRequiredTier(feature: String): String {
        return when (feature) {
            "api_access",
            "unlimited_offline_maps",
            -> "Pro"
            "extra_curvy",
            "round_trip_unlimited",
            "route_alternatives",
            "offline_maps",
            "gpx_export",
            "turn_by_turn",
            "ride_recording",
            "private_roads",
            "segment_curvature",
            -> "Premium"
            else -> "Free"
        }
    }

    /**
     * Check if a feature is available to free users
     */
    private fun isFreeFeature(feature: String): Boolean {
        return feature !in listOf(
            "extra_curvy",
            "round_trip_unlimited",
            "route_alternatives",
            "offline_maps",
            "gpx_export",
            "turn_by_turn",
            "ride_recording",
            "private_roads",
            "segment_curvature",
            "api_access",
            "unlimited_offline_maps",
        )
    }

    /**
     * Get current subscription tier
     * @return "free", "premium", "pro", or null if not authenticated
     */
    suspend fun getCurrentTier(): String? {
        // TODO: Remove development override before production
        val DEV_OVERRIDE_TIER = "premium" // Set to null to disable override
        if (DEV_OVERRIDE_TIER != null) {
            android.util.Log.d("FeatureAccess", "DEV MODE: Overriding tier to $DEV_OVERRIDE_TIER")
            return DEV_OVERRIDE_TIER
        }
        
        val token = tokenManager.token.first() ?: return null
        val prefs = context.getSharedPreferences("subscription_cache", Context.MODE_PRIVATE)

        val subscriptionResult = subscriptionRepository.getCurrentSubscription(token)
        val subscription = subscriptionResult.getOrNull()
        
        if (subscription != null) {
            val isActive = subscription.status == "active"
            val tier = if (isActive) {
                subscription.plan ?: "free"
            } else {
                "free"
            }
            // Cache the tier for offline use
            prefs.edit().putString("cached_tier", tier).apply()
            android.util.Log.d("FeatureAccess", "Cached subscription tier: $tier")
            return tier
        } else {
            // If API fails (offline), use cached tier
            val cachedTier = prefs.getString("cached_tier", "free") ?: "free"
            android.util.Log.d("FeatureAccess", "Using cached subscription tier (offline): $cachedTier")
            return cachedTier
        }
    }

    /**
     * Check if user can use round trip with specified distance
     * Free tier: max 300km, Premium/Pro: unlimited
     * @param distanceKm Distance in kilometers
     * @return Pair of (hasAccess: Boolean, maxDistanceKm: Double?)
     */
    suspend fun canUseRoundTrip(distanceKm: Double): Pair<Boolean, Double?> {
        val hasUnlimited = hasFeatureAccess("round_trip_unlimited")
        return if (hasUnlimited) {
            Pair(true, null) // Unlimited
        } else {
            val maxDistance = 300.0 // Free tier limit
            Pair(distanceKm <= maxDistance, maxDistance)
        }
    }

    /**
     * Check offline map limits
     * @return Pair of (maxRegions: Int?, maxStorageMB: Int?)
     */
    suspend fun getOfflineMapLimits(): Pair<Int?, Int?> {
        val tier = getCurrentTier() ?: "free"
        return when (tier) {
            "pro" -> Pair(null, null) // Unlimited
            "premium" -> Pair(null, 500) // Unlimited regions, 500MB storage
            else -> Pair(0, 0) // No offline maps for free
        }
    }
}
















