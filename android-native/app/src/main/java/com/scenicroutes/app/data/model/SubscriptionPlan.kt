package com.scenicroutes.app.data.model

data class SubscriptionPlan(
    val id: String, // "free", "premium", "pro"
    val name: String,
    val price_monthly: Double,
    val price_yearly: Double,
    val features: List<String>,
    val description: String? = null,
)
















