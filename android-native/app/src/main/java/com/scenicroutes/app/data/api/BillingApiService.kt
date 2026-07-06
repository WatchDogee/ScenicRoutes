package com.scenicroutes.app.data.api

import retrofit2.http.*

interface BillingApiService {
    
    data class PlayVerifyRequest(
        val product_id: String,
        val purchase_token: String,
        val device_id: String? = null
    )

    data class PlayRestoreRequest(
        val purchases: List<Map<String, String>>
    )

    data class BillingResponse(
        val success: Boolean,
        val message: String? = null,
        val data: Map<String, Any?>? = null
    )

    data class EntitlementsResponse(
        val entitlements: List<EntitlementInfo>? = null,
        val has_entitlement: Boolean? = null
    )

    data class EntitlementInfo(
        val key: String,
        val status: String, // active, inactive, grace, cancelled
        val source: String, // play, stripe, manual
        val product_id: String,
        val expires_at: String?
    )

    /**
     * Verify Play Store purchase with backend
     */
    @POST("api/billing/play/verify")
    suspend fun playBillingVerify(
        @Body request: PlayVerifyRequest
    ): BillingResponse

    /**
     * Restore multiple purchases from device
     */
    @POST("api/billing/restore")
    suspend fun playBillingRestore(
        @Body request: PlayRestoreRequest
    ): BillingResponse

    /**
     * Get all active entitlements for user
     */
    @GET("api/billing/entitlements")
    suspend fun getEntitlements(): EntitlementsResponse

    /**
     * Check if user has specific entitlement
     */
    @GET("api/billing/entitlements/{key}")
    suspend fun checkEntitlement(
        @Path("key") key: String
    ): EntitlementsResponse
}

/**
 * Helper extension functions
 */
class BillingApiHelper {
    companion object {
        fun playVerifyRequest(
            productId: String,
            purchaseToken: String,
            deviceId: String? = null
        ): BillingApiService.PlayVerifyRequest {
            return BillingApiService.PlayVerifyRequest(
                product_id = productId,
                purchase_token = purchaseToken,
                device_id = deviceId
            )
        }

        fun playRestoreRequest(
            purchases: List<Map<String, String>>
        ): BillingApiService.PlayRestoreRequest {
            return BillingApiService.PlayRestoreRequest(purchases)
        }
    }
}
