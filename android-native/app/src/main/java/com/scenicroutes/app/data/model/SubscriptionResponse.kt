package com.scenicroutes.app.data.model

/**
 * Wrapper for subscription API response
 * Backend returns: { "subscription": {...}, "tier": "...", "limits": {...}, "has_active_subscription": true/false }
 */
data class SubscriptionResponse(
    val subscription: Subscription? = null,
    val tier: String? = null,
    val limits: Map<String, Any>? = null,
    val has_active_subscription: Boolean? = null,
    val can_start_premium_trial: Boolean? = null,
    val premium_trial_days: Int? = null,
)








