package com.scenicroutes.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.model.Subscription
import com.scenicroutes.app.data.model.SubscriptionPlan
import com.scenicroutes.app.data.model.SubscriptionUsage
import com.scenicroutes.app.data.repository.SubscriptionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class SubscriptionViewModel(application: Application) : AndroidViewModel(application) {
    private val subscriptionRepository = SubscriptionRepository()
    private val tokenManager = TokenManager(application)

    private val _currentSubscription = MutableStateFlow<Subscription?>(null)
    val currentSubscription: StateFlow<Subscription?> = _currentSubscription.asStateFlow()

    private val _plans = MutableStateFlow<List<SubscriptionPlan>>(emptyList())
    val plans: StateFlow<List<SubscriptionPlan>> = _plans.asStateFlow()

    private val _usage = MutableStateFlow<SubscriptionUsage?>(null)
    val usage: StateFlow<SubscriptionUsage?> = _usage.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _canStartPremiumTrial = MutableStateFlow(false)
    val canStartPremiumTrial: StateFlow<Boolean> = _canStartPremiumTrial.asStateFlow()

    private val _premiumTrialDays = MutableStateFlow(7)
    val premiumTrialDays: StateFlow<Int> = _premiumTrialDays.asStateFlow()
    
    fun clearError() {
        _errorMessage.value = null
    }

    fun setErrorMessage(message: String?) {
        _errorMessage.value = message
    }

    fun loadData() {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            _isLoading.value = true
            try {
                val token = tokenManager.token.first()

                if (token != null) {
                    // Load subscription (full response for trial eligibility)
                    subscriptionRepository.getCurrentSubscriptionResponse(token).fold(
                        onSuccess = { response ->
                            val subscription = response.subscription
                            val tier = response.tier ?: "free"
                            val resolvedSubscription = if (subscription != null) {
                                subscription.copy(plan = tier)
                            } else {
                                val status = if (response.has_active_subscription == true) "active" else "inactive"
                                Subscription(
                                    plan = tier,
                                    status = status,
                                )
                            }

                            _currentSubscription.value = resolvedSubscription
                            _canStartPremiumTrial.value = response.can_start_premium_trial == true
                            _premiumTrialDays.value = response.premium_trial_days ?: 7

                            android.util.Log.d(
                                "SubscriptionViewModel",
                                "Loaded subscription: plan=${resolvedSubscription.plan}, status=${resolvedSubscription.status}, ends_at=${resolvedSubscription.ends_at}, canStartTrial=${_canStartPremiumTrial.value}",
                            )
                        },
                        onFailure = {
                            android.util.Log.e("SubscriptionViewModel", "Failed to load subscription: ${it.message}")
                            _errorMessage.value = it.message
                        },
                    )

                    // Load usage
                    subscriptionRepository.getSubscriptionUsage(token).fold(
                        onSuccess = { 
                            // Ensure default values if null
                            _usage.value = it.copy(
                                route_calculations_today = it.route_calculations_today ?: 0,
                                route_calculations_limit = it.route_calculations_limit ?: 0,
                                saved_roads_count = it.saved_roads_count ?: 0,
                                saved_roads_limit = it.saved_roads_limit ?: 0,
                            )
                        },
                        onFailure = { 
                            // Set default values on failure
                            _usage.value = SubscriptionUsage(
                                route_calculations_today = 0,
                                route_calculations_limit = 0,
                                saved_roads_count = 0,
                                saved_roads_limit = 0,
                            )
                        },
                    )
                }

                // Load plans (public, no auth needed)
                subscriptionRepository.getSubscriptionPlans().fold(
                    onSuccess = { _plans.value = it },
                    onFailure = { _errorMessage.value = it.message },
                )
            } catch (e: kotlinx.coroutines.CancellationException) {
                // Re-throw cancellation exceptions
                throw e
            } catch (e: Exception) {
                android.util.Log.e("SubscriptionViewModel", "Error loading data: ${e.message}", e)
                _errorMessage.value = e.message ?: "Failed to load subscription data"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun verifySubscriptionAfterCheckout() {
        viewModelScope.launch {
            _isLoading.value = true
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.verifySubscription("Bearer $token")
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        val tier = (body["tier"] as? String) ?: "free"
                        val hasActive = (body["has_active_subscription"] as? Boolean) ?: false
                        android.util.Log.d("SubscriptionViewModel", "Verification result: tier=$tier, hasActive=$hasActive, full response=$body")

                        // Reload subscription data
                        loadData()
                        // Do not surface subscription tier as an error banner.
                        // The current plan card already displays tier; keep error banner only for real errors.
                    } else {
                        val errorBody = response.errorBody()?.string()
                        android.util.Log.w("SubscriptionViewModel", "Verification failed: ${response.code()} - ${response.message()} - $errorBody")
                        _errorMessage.value = "Failed to verify: ${response.code()}"
                    }
                } catch (e: Exception) {
                    android.util.Log.e("SubscriptionViewModel", "Error verifying subscription: ${e.message}", e)
                    _errorMessage.value = "Verification error: ${e.message}"
                } finally {
                    _isLoading.value = false
                }
            } else {
                _isLoading.value = false
                _errorMessage.value = "Not logged in"
            }
        }
    }

    // IMPORTANT: On Android, we MUST use Google Play Billing (not Stripe/web checkout)
    // to comply with Google Play Store policies. Stripe is only for web subscriptions.
    // This function should trigger Google Play Billing flow instead of web checkout.
    fun createCheckout(planId: String, billingCycle: String) {
        viewModelScope.launch {
            _errorMessage.value = "Please use the Payment screen to subscribe via Google Play Billing. " +
                "Note: This app must use Google Play Billing on Android to comply with Google Play policies."
        }
    }

    fun cancelSubscription() {
        viewModelScope.launch {
            val token = tokenManager.token.first()
            if (token != null) {
                val result = subscriptionRepository.cancelSubscription(token, true)
                result.fold(
                    onSuccess = {
                        _currentSubscription.value = it
                        val endDate = it.ends_at ?: "the period end"
                        _errorMessage.value = "Payments canceled. Your perks stay active until $endDate."
                    },
                    onFailure = { _errorMessage.value = it.message ?: "Failed to cancel subscription" },
                )
            }
        }
    }

    fun resumeSubscription() {
        viewModelScope.launch {
            val token = tokenManager.token.first()
            if (token != null) {
                val result = subscriptionRepository.resumeSubscription(token)
                result.fold(
                    onSuccess = {
                        _currentSubscription.value = it
                        _errorMessage.value = "Subscription resumed"
                    },
                    onFailure = { _errorMessage.value = it.message },
                )
            }
        }
    }

    fun updatePaymentMethod() {
        viewModelScope.launch {
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.updatePaymentMethod("Bearer $token")
                    if (response.isSuccessful && response.body() != null) {
                        val checkoutUrl = response.body()!!["checkout_url"] as? String
                        if (checkoutUrl != null) {
                            // Open payment URL in browser
                            val context = getApplication<Application>()
                            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(checkoutUrl))
                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                            context.startActivity(intent)
                            _errorMessage.value = "Opening payment method update..."
                        } else {
                            _errorMessage.value = "Failed to get checkout URL"
                        }
                    } else {
                        _errorMessage.value = "Failed to update payment method"
                    }
                } catch (e: Exception) {
                    _errorMessage.value = "Error: ${e.message}"
                }
            }
        }
    }
}
