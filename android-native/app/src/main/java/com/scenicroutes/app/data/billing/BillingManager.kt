package com.scenicroutes.app.data.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Manages Google Play Billing for in-app purchases and subscriptions
 * 
 * Product IDs (configure in Google Play Console):
 * - premium_monthly (base plans: "1" for monthly, "yearly")
 * - pro_monthly (base plans: "monthly", "yearly")
 */
class BillingManager(
    private val context: Context,
    private val coroutineScope: CoroutineScope,
) : PurchasesUpdatedListener {

    private val apiService: ApiService = NetworkModule.apiService
    private val tokenManager = TokenManager(context)

    private var billingClient: BillingClient? = null
    private var syncInProgress = false

    // Subscription product IDs (matching Google Play Console)
    companion object {
        // Product IDs (must exist in Google Play Console as SUBS)
        const val PRODUCT_PREMIUM = "premium_monthly"
        const val PRODUCT_PRO = "pro_monthly"
        
        // Base plan IDs for premium
        const val PREMIUM_BASE_PLAN_MONTHLY = "1"  // premium_monthly:1
        const val PREMIUM_BASE_PLAN_YEARLY = "yearly"  // premium_monthly:yearly
        
        // Base plan IDs for pro
        const val PRO_BASE_PLAN_MONTHLY = "monthly"  // pro_monthly:monthly
        const val PRO_BASE_PLAN_YEARLY = "yearly"    // pro_monthly:yearly

        private const val TAG = "BillingManager"
    }

    // Connection state
    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    // Available subscription products
    private val _subscriptionProducts = MutableStateFlow<List<ProductDetails>>(emptyList())
    val subscriptionProducts: StateFlow<List<ProductDetails>> = _subscriptionProducts.asStateFlow()

    // Purchase status
    private val _purchaseStatus = MutableStateFlow<PurchaseStatus>(PurchaseStatus.Idle)
    val purchaseStatus: StateFlow<PurchaseStatus> = _purchaseStatus.asStateFlow()

    // Active purchases
    private val _activePurchases = MutableStateFlow<List<Purchase>>(emptyList())
    val activePurchases: StateFlow<List<Purchase>> = _activePurchases.asStateFlow()
    
    // Track current base plan ID being purchased (needed for backend verification)
    private var currentBasePlanId: String? = null

    sealed class PurchaseStatus {
        object Idle : PurchaseStatus()
        object Processing : PurchaseStatus()
        data class Success(val productId: String) : PurchaseStatus()
        data class Error(val message: String) : PurchaseStatus()
        object Cancelled : PurchaseStatus()
    }

    /**
     * Initialize billing client and connect
     */
    fun initialize() {
        Log.d(TAG, "=== initialize() called ===")
        if (billingClient != null) {
            Log.d(TAG, "Billing client already initialized, isReady=${_isReady.value}")
            return
        }

        Log.d(TAG, "Creating new BillingClient...")
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        startConnection()
    }

    /**
     * Start connection to Google Play Billing
     */
    private fun startConnection() {
        Log.d(TAG, "=== startConnection() called ===")
        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "✓ Billing client connected successfully")
                    _isReady.value = true

                    // Query available products
                    querySubscriptionProducts()

                    // Query existing purchases
                    queryActivePurchases()
                } else {
                    Log.e(TAG, "✗ Billing client connection failed: ${billingResult.debugMessage} (code: ${billingResult.responseCode})")
                    _isReady.value = false
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "⚠ Billing client disconnected, will reconnect...")
                _isReady.value = false
                // Retry connection
                startConnection()
            }
        })
    }

    /**
     * Query available subscription products from Google Play
     * Now queries 2 products (premium_monthly, pro_monthly) each with 2 base plans
     */
    private fun querySubscriptionProducts() {
        Log.d(TAG, "=== querySubscriptionProducts() called ===")
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_PREMIUM)
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_PRO)
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient?.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "✓ Found ${productDetailsList.size} subscription products:")
                productDetailsList.forEach { product ->
                    Log.d(TAG, "  - ${product.productId}")
                    product.subscriptionOfferDetails?.forEach { offer ->
                        Log.d(TAG, "    - Base plan: ${offer.basePlanId}")
                    }
                }
                _subscriptionProducts.value = productDetailsList
            } else {
                Log.e(TAG, "✗ Failed to query products: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Refresh subscription products (safe to call from UI)
     */
    fun refreshSubscriptionProducts() {
        if (billingClient?.isReady == true) {
            querySubscriptionProducts()
        } else {
            Log.w(TAG, "Billing client not ready, cannot refresh products")
        }
    }

    /**
     * Query active purchases (subscriptions user already owns)
     */
    fun queryActivePurchases() {
        if (billingClient?.isReady != true) {
            Log.w(TAG, "Billing client not ready")
            return
        }

        coroutineScope.launch {
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build()

            withContext(Dispatchers.IO) {
                val result = billingClient?.queryPurchasesAsync(params)
                result?.let { purchasesResult ->
                    if (purchasesResult.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        val purchases = purchasesResult.purchasesList
                        Log.d(TAG, "Found ${purchases.size} active purchases")
                        _activePurchases.value = purchases

                        // Verify each purchase with backend
                        purchases.forEach { purchase ->
                            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                                if (!purchase.isAcknowledged) {
                                    // Verify and acknowledge
                                    verifyAndAcknowledgePurchase(purchase)
                                } else {
                                    // Already acknowledged, just sync with backend
                                    syncPurchaseWithBackend(purchase)
                                }
                            }
                        }
                    } else {
                        Log.e(TAG, "Failed to query purchases: ${purchasesResult.billingResult.debugMessage}")
                    }
                }
            }
        }
    }

    /**
     * Find an active subscription for upgrade/downgrade flow
     * Returns the active purchase for a different product (tier), if any
     */
    private fun getActiveSubscriptionForDifferentProduct(newProductId: String, purchases: List<Purchase>): Purchase? {
        return purchases.firstOrNull { active ->
            active.purchaseState == Purchase.PurchaseState.PURCHASED &&
                active.products.none { it == newProductId }
        }
    }

    /**
     * Check if the user already owns the requested product
     */
    private fun isAlreadyOwningProduct(productId: String, purchases: List<Purchase>): Boolean {
        return purchases.any { active ->
            active.purchaseState == Purchase.PurchaseState.PURCHASED &&
                active.products.any { it == productId }
        }
    }

    /**
     * Fetch active purchases directly from Google Play to avoid stale state
     */
    private suspend fun fetchActivePurchases(): List<Purchase> {
        if (billingClient?.isReady != true) {
            Log.w(TAG, "Billing client not ready")
            return emptyList()
        }

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        return withContext(Dispatchers.IO) {
            val result = billingClient?.queryPurchasesAsync(params)
            if (result?.billingResult?.responseCode == BillingClient.BillingResponseCode.OK) {
                val purchases = result.purchasesList
                _activePurchases.value = purchases
                purchases
            } else {
                Log.e(TAG, "Failed to query purchases: ${result?.billingResult?.debugMessage}")
                _activePurchases.value
            }
        }
    }

    /**
     * Launch purchase flow for a subscription
     * @param basePlanId The base plan ID (e.g., "1", "monthly", "yearly")
     */
    fun launchPurchaseFlow(activity: Activity, productDetails: ProductDetails, offerToken: String, basePlanId: String? = null) {
        if (billingClient?.isReady != true) {
            _purchaseStatus.value = PurchaseStatus.Error("Billing not ready")
            return
        }
        
        // Store base plan ID for later use in verification
        currentBasePlanId = basePlanId
        coroutineScope.launch {
            val activePurchases = fetchActivePurchases()

            // Prevent re-purchase of the same active subscription
            if (isAlreadyOwningProduct(productDetails.productId, activePurchases)) {
                Log.d(TAG, "User already owns ${productDetails.productId}")
                _purchaseStatus.value = PurchaseStatus.Error("You already have this subscription")
                return@launch
            }

            val productDetailsParamsList = listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails)
                    .setOfferToken(offerToken)
                    .build(),
            )

            val billingFlowBuilder = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList)

            // If user already has an active subscription for a different product, replace it
            val activeDifferentProduct = getActiveSubscriptionForDifferentProduct(productDetails.productId, activePurchases)
            val oldPurchaseToken = activeDifferentProduct?.purchaseToken
            if (oldPurchaseToken != null) {
                val updateParams = BillingFlowParams.SubscriptionUpdateParams.newBuilder()
                    .setOldPurchaseToken(oldPurchaseToken)
                    .setSubscriptionReplacementMode(3) // REPLACEMENT_MODE_CHARGE_PRORATED_PRICE = 3
                    .build()
                billingFlowBuilder.setSubscriptionUpdateParams(updateParams)
                Log.d(TAG, "Replacing existing subscription with new tier")
            }

            val billingFlowParams = billingFlowBuilder.build()

            _purchaseStatus.value = PurchaseStatus.Processing

            withContext(Dispatchers.Main) {
                val billingResult = billingClient?.launchBillingFlow(activity, billingFlowParams)
                if (billingResult?.responseCode != BillingClient.BillingResponseCode.OK) {
                    Log.e(TAG, "Failed to launch billing flow: ${billingResult?.debugMessage}")
                    _purchaseStatus.value = PurchaseStatus.Error(billingResult?.debugMessage ?: "Unknown error")
                }
            }
        }
    }

    /**
     * Handle purchase updates from Google Play
     */
    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                if (purchases != null) {
                    Log.d(TAG, "Purchase successful: ${purchases.size} items")
                    for (purchase in purchases) {
                        handlePurchase(purchase)
                    }
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                Log.d(TAG, "User cancelled purchase")
                _purchaseStatus.value = PurchaseStatus.Cancelled
            }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                Log.d(TAG, "Item already owned")
                _purchaseStatus.value = PurchaseStatus.Error("You already own this subscription")
                // Re-query to sync
                queryActivePurchases()
            }
            else -> {
                Log.e(TAG, "Purchase failed: ${billingResult.debugMessage}")
                _purchaseStatus.value = PurchaseStatus.Error(billingResult.debugMessage)
            }
        }
    }

    /**
     * Handle a successful purchase
     */
    private fun handlePurchase(purchase: Purchase) {
        Log.d(TAG, "=== handlePurchase() called ===")
        Log.d(TAG, "Purchase state: ${purchase.purchaseState}")
        Log.d(TAG, "Is acknowledged: ${purchase.isAcknowledged}")
        Log.d(TAG, "Products: ${purchase.products.joinToString(", ")}")
        Log.d(TAG, "Purchase token: ${purchase.purchaseToken.take(20)}...")
        
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            if (!purchase.isAcknowledged) {
                // Verify with backend and acknowledge
                Log.d(TAG, "Calling verifyAndAcknowledgePurchase...")
                verifyAndAcknowledgePurchase(purchase)
            } else {
                // Already acknowledged
                Log.d(TAG, "Purchase already acknowledged")
                val productId = purchase.products.firstOrNull() ?: ""
                _purchaseStatus.value = PurchaseStatus.Success(productId)
                queryActivePurchases()
            }
        } else if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
            Log.d(TAG, "Purchase is pending")
            _purchaseStatus.value = PurchaseStatus.Processing
        }
    }

    /**
     * Verify purchase with backend and acknowledge if valid
     */
    private fun verifyAndAcknowledgePurchase(purchase: Purchase) {
        Log.d(TAG, "=== verifyAndAcknowledgePurchase() called ===")
        coroutineScope.launch {
            try {
                Log.d(TAG, "Getting auth token...")
                val token = tokenManager.token.first() ?: run {
                    Log.e(TAG, "No auth token available")
                    _purchaseStatus.value = PurchaseStatus.Error("Not authenticated")
                    return@launch
                }

                val productId = purchase.products.firstOrNull() ?: ""
                val purchaseToken = purchase.purchaseToken

                Log.d(TAG, "Calling backend verification...")
                Log.d(TAG, "Product ID: $productId")
                Log.d(TAG, "Purchase token: ${purchaseToken.take(20)}...")
                Log.d(TAG, "Base plan ID: $currentBasePlanId")

                // Send to backend for verification with base plan ID
                val response = apiService.verifyGooglePlayPurchase(
                    authorization = "Bearer $token",
                    request = buildMap {
                        put("product_id", productId)
                        put("purchase_token", purchaseToken)
                        currentBasePlanId?.let { put("base_plan_id", it) }
                    },
                )
                
                Log.d(TAG, "Backend response code: ${response.code()}")
                Log.d(TAG, "Backend response success: ${response.isSuccessful}")

                if (response.isSuccessful && response.body()?.get("valid") == true) {
                    Log.d(TAG, "Purchase verified successfully by backend")

                    // Acknowledge the purchase
                    val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchaseToken)
                        .build()

                    withContext(Dispatchers.IO) {
                        val ackResult = billingClient?.acknowledgePurchase(acknowledgePurchaseParams)
                        if (ackResult?.responseCode == BillingClient.BillingResponseCode.OK) {
                            Log.d(TAG, "Purchase acknowledged")
                            _purchaseStatus.value = PurchaseStatus.Success(productId)
                            queryActivePurchases()
                        } else {
                            Log.e(TAG, "Failed to acknowledge purchase: ${ackResult?.debugMessage}")
                            _purchaseStatus.value = PurchaseStatus.Error("Failed to acknowledge purchase")
                        }
                    }
                } else {
                    Log.e(TAG, "Backend verification failed")
                    _purchaseStatus.value = PurchaseStatus.Error("Purchase verification failed")
                }
            } catch (e: Exception) {
                Log.e(TAG, "=== ERROR in verifyAndAcknowledgePurchase ===")
                Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
                Log.e(TAG, "Exception message: ${e.message}")
                Log.e(TAG, "Stack trace:", e)
                _purchaseStatus.value = PurchaseStatus.Error("Verification error: ${e.message}")
            }
        }
    }

    /**
     * Sync existing purchase with backend (for already acknowledged purchases)
     */
    private fun syncPurchaseWithBackend(purchase: Purchase) {
        coroutineScope.launch {
            try {
                val token = tokenManager.token.first() ?: return@launch

                val productId = purchase.products.firstOrNull() ?: ""
                val purchaseToken = purchase.purchaseToken

                apiService.syncGooglePlaySubscription(
                    authorization = "Bearer $token",
                    productId = productId,
                    purchaseToken = purchaseToken,
                )
                Log.d(TAG, "Synced purchase with backend: $productId")
            } catch (e: Exception) {
                Log.e(TAG, "Error syncing purchase with backend", e)
            }
        }
    }

    /**
     * Get subscription offer token (for monthly or yearly billing)
     */
    fun getOfferToken(
        productDetails: ProductDetails,
        basePlanId: String,
        requireTrial: Boolean = false,
    ): String? {
        val offers = productDetails.subscriptionOfferDetails
            ?.filter { it.basePlanId == basePlanId }
            ?: return null

        if (!requireTrial) {
            return offers.firstOrNull()?.offerToken
        }

        val trialOffer = offers.firstOrNull { offer ->
            offer.pricingPhases.pricingPhaseList.any { phase ->
                phase.priceAmountMicros == 0L
            }
        }

        return trialOffer?.offerToken
    }

    /**
     * End billing connection
     */
    fun endConnection() {
        billingClient?.endConnection()
        billingClient = null
        _isReady.value = false
    }

    /**
     * Sync all active purchases with backend
     * Call this when app launches or user logs in
     * Ensures cross-device subscription sync
     */
    fun syncPurchasesWithBackend() {
        if (syncInProgress) {
            Log.d(TAG, "Sync already in progress")
            return
        }

        coroutineScope.launch {
            try {
                syncInProgress = true
                val token = tokenManager.token.first() ?: run {
                    Log.w(TAG, "No auth token available for sync")
                    return@launch
                }

                Log.d(TAG, "Starting purchase sync with backend")
                queryActivePurchases()
            } finally {
                syncInProgress = false
            }
        }
    }

    /**
     * Reset purchase status (call after handling success/error)
     */
    fun resetPurchaseStatus() {
        _purchaseStatus.value = PurchaseStatus.Idle
    }
}
