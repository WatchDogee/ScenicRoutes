package com.scenicroutes.app.ui.viewmodel

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.android.billingclient.api.ProductDetails
import com.scenicroutes.app.data.api.BillingApiService
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.service.PlayBillingClientService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * ViewModel for managing billing/paywall state
 */
class PaymentViewModel(
    private val billingService: PlayBillingClientService,
    private val getEntitlements: suspend () -> List<BillingApiService.EntitlementInfo>, // Function to fetch entitlements
    private val tokenManager: TokenManager, // For checking login status
) : ViewModel() {

    // UI State
    data class PaymentUiState(
        val isLoading: Boolean = true,
        val products: List<ProductDetails> = emptyList(),
        val userEntitlements: List<BillingApiService.EntitlementInfo> = emptyList(),
        val selectedProduct: ProductDetails? = null,
        val isLoggedIn: Boolean = false,
        val isPurchasing: Boolean = false,
        val error: String? = null
    )

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()

    private val _billingState = MutableStateFlow<PaymentState>(PaymentState.Idle)
    val billingState: StateFlow<PaymentState> = _billingState.asStateFlow()

    sealed class PaymentState {
        object Idle : PaymentState()
        object Loading : PaymentState()
        object PurchaseInProgress : PaymentState()
        data class PurchaseSuccess(val entitlementKey: String) : PaymentState()
        data class PurchaseError(val message: String) : PaymentState()
        object RestoreInProgress : PaymentState()
        data class RestoreSuccess(val count: Int) : PaymentState()
        data class RestoreError(val message: String) : PaymentState()
    }

    init {
        checkLoginStatusAndInitialize()
    }

    /**
     * Check if user is logged in, then initialize billing
     */
    private fun checkLoginStatusAndInitialize() {
        viewModelScope.launch {
            try {
                val token = tokenManager.token.first()
                val isLoggedIn = token != null
                _uiState.value = _uiState.value.copy(isLoggedIn = isLoggedIn)
                
                if (isLoggedIn) {
                    initializeBilling()
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Please log in to view subscriptions"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Failed to check login status"
                )
            }
        }
    }

    /**
     * Initialize billing client and load products
     */
    private fun initializeBilling() {
        viewModelScope.launch {
            _billingState.value = PaymentState.Loading
            _uiState.value = _uiState.value.copy(isLoading = true)

            try {
                billingService.connect {
                    loadProductsAndEntitlements()
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to initialize billing",
                    isLoading = false
                )
                _billingState.value = PaymentState.PurchaseError(e.message ?: "Initialization failed")
            }
        }
    }

    /**
     * Load available products and user's entitlements
     */
    private fun loadProductsAndEntitlements() {
        viewModelScope.launch {
            try {
                // Load products from Play Store (matching Google Play Console setup)
                val premiumProductId = "premium_monthly"  // Has base plans: "1" (monthly) and "yearly"
                val proProductId = "pro_monthly"  // Has base plans: "monthly" and "yearly"
                
                billingService.queryProductDetails(
                    listOf(premiumProductId, proProductId),
                    productType = "subs"
                ) { products ->
                    viewModelScope.launch {
                        _uiState.value = _uiState.value.copy(products = products)
                    }
                }

                // Load user's entitlements from backend
                val entitlements = getEntitlements()
                _uiState.value = _uiState.value.copy(
                    userEntitlements = entitlements,
                    isLoading = false
                )
                _billingState.value = PaymentState.Idle

            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to load products",
                    isLoading = false
                )
                _billingState.value = PaymentState.PurchaseError(e.message ?: "Load failed")
            }
        }
    }

    /**
     * Select a product for purchase
     */
    fun selectProduct(product: ProductDetails) {
        _uiState.value = _uiState.value.copy(selectedProduct = product)
    }

    /**
     * Launch billing flow for selected product with specific base plan
     * @param basePlanId The base plan ID:
     *   - For premium_monthly: "1" (monthly) or "yearly"
     *   - For pro_monthly: "monthly" or "yearly"
     */
    fun launchPurchase(activity: Activity, basePlanId: String) {
        // Check if logged in first
        if (!_uiState.value.isLoggedIn) {
            _uiState.value = _uiState.value.copy(
                error = "Please log in to make a purchase"
            )
            return
        }
        
        val product = _uiState.value.selectedProduct ?: return
        _uiState.value = _uiState.value.copy(isPurchasing = true)
        _billingState.value = PaymentState.PurchaseInProgress

        // Get the specific offer for the selected base plan
        val subscriptionOfferDetails = product.subscriptionOfferDetails
            ?.find { it.basePlanId == basePlanId }
        val offerToken = subscriptionOfferDetails?.offerToken

        if (offerToken != null) {
            billingService.launchBillingFlow(
                activity,
                product,
                offerToken,
                basePlanId  // Pass base plan ID to track billing cycle
            ) { error ->
                _uiState.value = _uiState.value.copy(isPurchasing = false)
                _billingState.value = PaymentState.PurchaseError(error)
            }
        } else {
            _uiState.value = _uiState.value.copy(isPurchasing = false)
            _billingState.value = PaymentState.PurchaseError("Offer not available for this plan")
        }
    }

    /**
     * Restore purchases from Play Store
     */
    fun restorePurchases() {
        viewModelScope.launch {
            _billingState.value = PaymentState.RestoreInProgress
            _uiState.value = _uiState.value.copy(isLoading = true)

            try {
                billingService.restorePurchases {
                    viewModelScope.launch {
                        // Reload entitlements after restore
                        val entitlements = getEntitlements()
                        _uiState.value = _uiState.value.copy(
                            userEntitlements = entitlements,
                            isLoading = false
                        )
                        _billingState.value = PaymentState.RestoreSuccess(entitlements.size)
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false)
                _billingState.value = PaymentState.RestoreError(e.message ?: "Restore failed")
            }
        }
    }

    /**
     * Check if user has specific entitlement
     */
    fun hasEntitlement(key: String, onResult: (Boolean) -> Unit) {
        billingService.hasEntitlement(key) { has ->
            onResult(has)
        }
    }

    /**
     * Get active entitlements for user
     */
    fun getActiveEntitlements(): List<BillingApiService.EntitlementInfo> {
        return _uiState.value.userEntitlements.filter { it.status == "active" }
    }

    /**
     * Refresh entitlements from backend
     */
    fun refreshEntitlements() {
        viewModelScope.launch {
            try {
                val entitlements = getEntitlements()
                _uiState.value = _uiState.value.copy(
                    userEntitlements = entitlements
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to refresh entitlements"
                )
            }
        }
    }

    /**
     * Check if entitlement is expiring soon (within 7 days)
     */
    fun isExpiringWithin(days: Int = 7): Boolean {
        val threshold = System.currentTimeMillis() + (days * 24 * 60 * 60 * 1000)
        return _uiState.value.userEntitlements.any { entitlement ->
            entitlement.expires_at?.let { expiry ->
                try {
                    // Simple ISO 8601 parsing - adjust if needed
                    val expiryMillis = expiry.toLongOrNull() ?: return@let false
                    expiryMillis < threshold
                } catch (e: Exception) {
                    false
                }
            } ?: false
        }
    }

    override fun onCleared() {
        super.onCleared()
        billingService.disconnect()
    }
}
