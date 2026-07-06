package com.scenicroutes.app.data.repository

import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.model.Subscription
import com.scenicroutes.app.data.model.SubscriptionPlan
import com.scenicroutes.app.data.model.SubscriptionResponse
import com.scenicroutes.app.data.model.SubscriptionUsage
import com.scenicroutes.app.data.model.UsageStatistics
import com.scenicroutes.app.data.network.NetworkModule

class SubscriptionRepository {
    private val apiService: ApiService = NetworkModule.apiService

    private fun mapToSubscription(responseBody: SubscriptionResponse): Subscription {
        // Backend returns wrapper: { "subscription": {...}, "tier": "...", ... }
        // IMPORTANT: tier field in response is the authoritative tier value
        val tier = responseBody.tier ?: "free"

        val subscription = responseBody.subscription
        return if (subscription != null) {
            // CRITICAL FIX: Always use tier from response, not subscription.plan
            // The subscription.plan might be null for some users
            subscription.copy(plan = tier)
        } else {
            // If subscription is null but tier is provided, create subscription from tier
            val status = if (responseBody.has_active_subscription == true) "active" else "inactive"
            Subscription(
                plan = tier,
                status = status,
            )
        }
    }

    suspend fun getCurrentSubscriptionResponse(token: String): Result<SubscriptionResponse> {
        return try {
            val response = apiService.getCurrentSubscription("Bearer $token")
            android.util.Log.d("SubscriptionRepository", "getCurrentSubscription response code: ${response.code()}, isSuccessful: ${response.isSuccessful}")

            if (response.isSuccessful && response.body() != null) {
                val responseBody = response.body()!!
                android.util.Log.d("SubscriptionRepository", "Response body tier: ${responseBody.tier}, has_active: ${responseBody.has_active_subscription}, subscription: ${responseBody.subscription}")
                Result.success(responseBody)
            } else {
                val errorBody = response.errorBody()?.string()
                android.util.Log.w("SubscriptionRepository", "Failed to get subscription: code=${response.code()}, message=${response.message()}, errorBody=$errorBody")
                Result.failure(Exception(response.message() ?: "Failed to get subscription"))
            }
        } catch (e: Exception) {
            android.util.Log.e("SubscriptionRepository", "Error getting subscription", e)
            Result.failure(e)
        }
    }

    suspend fun getCurrentSubscription(token: String): Result<Subscription> {
        return try {
            getCurrentSubscriptionResponse(token).fold(
                onSuccess = { responseBody ->
                    Result.success(mapToSubscription(responseBody))
                },
                onFailure = { error ->
                    android.util.Log.w("SubscriptionRepository", "Falling back to free tier due to error: ${error.message}")
                    Result.success(
                        Subscription(
                            plan = "free",
                            status = "inactive",
                        )
                    )
                },
            )
        } catch (e: Exception) {
            android.util.Log.e("SubscriptionRepository", "Error getting subscription", e)
            // On error, return free tier subscription
            Result.success(
                Subscription(
                    plan = "free",
                    status = "inactive",
                )
            )
        }
    }

    suspend fun getSubscriptionPlans(): Result<List<SubscriptionPlan>> {
        return try {
            val response = apiService.getSubscriptionPlans()
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                // API returns { "plans": { "free": {...}, "premium": {...}, "pro": {...} } }
                val plansMap = body["plans"] as? Map<*, *>
                if (plansMap != null) {
                    val plansList = plansMap.mapNotNull { (key, value) ->
                        val planData = value as? Map<*, *>
                        if (planData != null && key is String) {
                            SubscriptionPlan(
                                id = key,
                                name = planData["name"] as? String ?: key.replaceFirstChar { it.uppercaseChar() },
                                price_monthly = (planData["price_monthly"] as? Number)?.toDouble() ?: 0.0,
                                price_yearly = (planData["price_yearly"] as? Number)?.toDouble() ?: 0.0,
                                features = (planData["features"] as? List<*>)?.mapNotNull { it as? String } ?: emptyList(),
                                description = planData["description"] as? String,
                            )
                        } else {
                            null
                        }
                    }
                    Result.success(plansList)
                } else {
                    Result.failure(Exception("Invalid plans format"))
                }
            } else {
                Result.failure(Exception(response.message() ?: "Failed to get subscription plans"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSubscriptionUsage(token: String): Result<SubscriptionUsage> {
        return try {
            val response = apiService.getSubscriptionUsage("Bearer $token")
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.message() ?: "Failed to get subscription usage"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createCheckout(
        token: String,
        planId: String,
        billingCycle: String,
    ): Result<Map<String, String>> {
        return try {
            val request = mapOf(
                "plan_id" to planId,
                "billing_cycle" to billingCycle,
            )
            val response = apiService.createCheckout("Bearer $token", request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.message() ?: "Failed to create checkout"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun cancelSubscription(
        token: String,
        atPeriodEnd: Boolean = true,
    ): Result<Subscription> {
        return try {
            val response = apiService.cancelSubscription(
                "Bearer $token",
                mapOf("at_period_end" to atPeriodEnd),
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorText = response.errorBody()?.string()
                Result.failure(Exception(errorText ?: response.message() ?: "Failed to cancel subscription"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resumeSubscription(token: String): Result<Subscription> {
        return try {
            val response = apiService.resumeSubscription("Bearer $token")
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.message() ?: "Failed to resume subscription"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getUsageStatistics(token: String, period: String = "month"): Result<UsageStatistics> {
        return try {
            val response = apiService.getUsageStatistics("Bearer $token", period)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.message() ?: "Failed to get usage statistics"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
