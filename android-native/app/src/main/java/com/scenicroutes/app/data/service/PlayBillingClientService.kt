package com.scenicroutes.app.data.service

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import android.util.Log

/**
 * Service for Google Play Billing Library v6+
 * Handles purchase verification and restoration
 */
class PlayBillingClientService(
    private val context: Context,
    private val getAuthToken: () -> String?, // Function to get current auth token
) {
    private lateinit var billingClient: BillingClient
    private val scope = CoroutineScope(Dispatchers.IO)

    private val _billingState = MutableStateFlow<BillingState>(BillingState.Idle)
    val billingState: StateFlow<BillingState> = _billingState.asStateFlow()

    private val _purchases = MutableStateFlow<List<Purchase>>(emptyList())
    val purchases: StateFlow<List<Purchase>> = _purchases.asStateFlow()

    sealed class BillingState {
        object Idle : BillingState()
        object Connecting : BillingState()
        object Connected : BillingState()
        data class Error(val message: String) : BillingState()
    }

    init {
        setupBillingClient()
    }

    private fun setupBillingClient() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(::handlePurchasesUpdated)
            .enablePendingPurchases()
            .build()
    }

    /**
     * Connect to Play Billing service
     */
    fun connect(onConnected: (() -> Unit)? = null) {
        _billingState.value = BillingState.Connecting

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    _billingState.value = BillingState.Connected
                    Log.d("PlayBillingClient", "Billing client connected")
                    onConnected?.invoke()
                    
                    // Restore purchases on connect
                    restorePurchases()
                } else {
                    _billingState.value = BillingState.Error(billingResult.debugMessage)
                    Log.e("PlayBillingClient", "Billing setup failed: ${billingResult.debugMessage}")
                }
            }

            override fun onBillingServiceDisconnected() {
                _billingState.value = BillingState.Idle
                Log.w("PlayBillingClient", "Billing service disconnected")
            }
        })
    }

    /**
     * Disconnect from Play Billing service
     */
    fun disconnect() {
        if (billingClient.isReady) {
            billingClient.endConnection()
        }
        _billingState.value = BillingState.Idle
    }

    /**
     * Query available products/subscriptions
     */
    fun queryProductDetails(
        skuList: List<String>,
        productType: String = BillingClient.ProductType.SUBS,
        onResult: (List<ProductDetails>) -> Unit
    ) {
        scope.launch {
            if (!billingClient.isReady) {
                Log.w("PlayBillingClient", "Billing client not ready")
                return@launch
            }

            val queryProductDetailsParams = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    skuList.map { sku ->
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(sku)
                            .setProductType(productType)
                            .build()
                    }
                )
                .build()

            billingClient.queryProductDetailsAsync(queryProductDetailsParams) { billingResult, productDetailsList ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    onResult(productDetailsList)
                } else {
                    Log.e("PlayBillingClient", "Query product details failed: ${billingResult.debugMessage}")
                }
            }
        }
    }

    /**
     * Launch billing flow for a product
     * @param basePlanId The base plan ID to track for backend verification
     */
    fun launchBillingFlow(
        activity: Activity,
        productDetails: ProductDetails,
        offerToken: String? = null,
        basePlanId: String? = null,
        onError: (String) -> Unit = {}
    ) {
        if (!billingClient.isReady) {
            onError("Billing client not ready")
            return
        }

        val productDetailsParamsList = listOf(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .apply {
                    if (offerToken != null) {
                        setOfferToken(offerToken)
                    }
                }
                .build()
        )

        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productDetailsParamsList)
            .build()

        val billingResult = billingClient.launchBillingFlow(activity, billingFlowParams)
        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            onError(billingResult.debugMessage)
            Log.e("PlayBillingClient", "Launch billing flow failed: ${billingResult.debugMessage}")
        }
    }

    /**
     * Handle purchase updates (called by BillingClientStateListener)
     */
    private fun handlePurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                    // Purchase is complete; send to backend for verification
                    verifyAndAcknowledgePurchase(purchase)
                } else if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
                    // Purchase is pending; wait for it to complete
                    Log.d("PlayBillingClient", "Purchase pending: ${purchase.products}")
                }
            }
        } else {
            Log.e("PlayBillingClient", "Purchase update failed: ${billingResult.debugMessage}")
        }
    }

    /**
     * Verify purchase with backend and acknowledge
     */
    private fun verifyAndAcknowledgePurchase(purchase: Purchase) {
        scope.launch {
            try {
                // Get auth token from provided function
                val token = getAuthToken()
                if (token.isNullOrEmpty()) {
                    Log.e("PlayBillingClient", "No auth token for verification")
                    return@launch
                }

                // TODO: Call your API service here
                // Example: val response = apiService.playBillingVerify(...)
                // For now, just acknowledge the purchase
                
                acknowledgePurchase(purchase.purchaseToken)
                Log.d("PlayBillingClient", "Purchase acknowledged")
                
                // Update local state
                _purchases.value = _purchases.value + listOf(purchase)
            } catch (e: Exception) {
                Log.e("PlayBillingClient", "Verification error", e)
            }
        }
    }

    /**
     * Acknowledge purchase with Play Billing
     */
    private fun acknowledgePurchase(purchaseToken: String) {
        scope.launch {
            val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build()

            billingClient.acknowledgePurchase(acknowledgePurchaseParams) { billingResult ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d("PlayBillingClient", "Purchase acknowledged")
                } else {
                    Log.e("PlayBillingClient", "Acknowledge failed: ${billingResult.debugMessage}")
                }
            }
        }
    }

    /**
     * Restore purchases (called on app start)
     */
    fun restorePurchases(onComplete: (() -> Unit)? = null) {
        scope.launch {
            if (!billingClient.isReady) {
                onComplete?.invoke()
                return@launch
            }

            // Query subscriptions
            val subsParams = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
            billingClient.queryPurchasesAsync(subsParams) { billingResult, purchases ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    handleRestoredPurchases(purchases)
                }
            }

            // Query one-time products
            val inappParams = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
            billingClient.queryPurchasesAsync(inappParams) { billingResult, purchases ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    handleRestoredPurchases(purchases)
                }
                onComplete?.invoke()
            }
        }
    }

    /**
     * Handle restored purchases from queryPurchasesAsync
     */
    private fun handleRestoredPurchases(purchases: List<Purchase>) {
        try {
            val token = getAuthToken()
            if (token.isNullOrEmpty()) {
                Log.e("PlayBillingClient", "No auth token for restore")
                return
            }

            scope.launch {
                // TODO: Call your API service to restore purchases
                // Example: val response = apiService.playBillingRestore(purchaseList)
                
                // For now, just update local state with purchased items
                _purchases.value = purchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                Log.d("PlayBillingClient", "Purchases restored: ${_purchases.value.size}")
            }
        } catch (e: Exception) {
            Log.e("PlayBillingClient", "Error handling restored purchases", e)
        }
    }

    /**
     * Check if user has active entitlement
     * NOTE: You need to implement this by calling your backend API
     */
    fun hasEntitlement(entitlementKey: String, onResult: (Boolean) -> Unit) {
        scope.launch {
            try {
                val token = getAuthToken()
                if (token.isNullOrEmpty()) {
                    onResult(false)
                    return@launch
                }

                // TODO: Call your API service
                // Example: val response = apiService.checkEntitlement(entitlementKey)
                // onResult(response.has_entitlement ?: false)
                
                // For now, return false - you need to implement the API call
                onResult(false)
            } catch (e: Exception) {
                Log.e("PlayBillingClient", "Error checking entitlement", e)
                onResult(false)
            }
        }
    }
}
