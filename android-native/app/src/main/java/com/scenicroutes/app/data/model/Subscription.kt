package com.scenicroutes.app.data.model

data class Subscription(
    val id: Long? = null,
    val user_id: Long? = null,
    val plan: String? = null, // "free", "premium", "pro"
    val status: String? = null, // "active", "cancelled", "expired"
    val payment_method: String? = null,
    val external_subscription_id: String? = null, // Google Play purchase token
    val product_id: String? = null, // Google Play product ID (e.g., "scenic_routes_premium_monthly")
    val platform: String? = null, // "google_play" for Android
    val billing_cycle: String? = null, // "monthly", "yearly"
    val amount: Double? = null,
    val currency: String? = null,
    val starts_at: String? = null,
    val ends_at: String? = null,
    val trial_ends_at: String? = null,
    val cancelled_at: String? = null,
    val cancellation_reason: String? = null,
    val cancel_at_period_end: Boolean? = null,
    val metadata: Map<String, Any>? = null,
)
