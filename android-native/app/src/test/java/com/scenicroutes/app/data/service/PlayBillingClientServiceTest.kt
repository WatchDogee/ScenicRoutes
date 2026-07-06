package com.scenicroutes.app.data.service

import android.app.Activity
import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.android.billingclient.api.*
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class PlayBillingClientServiceTest {

    private lateinit var context: Context
    private lateinit var mockBillingClient: BillingClient
    private lateinit var mockApiService: BillingApiService
    private lateinit var service: PlayBillingClientService

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        mockBillingClient = mockk(relaxed = true)
        mockApiService = mockk(relaxed = true)

        // Create service with mocked dependencies
        service = PlayBillingClientService(context, mockApiService)
    }

    @Test
    fun testBillingClientConnection() = runTest {
        val connectionListener = slot<BillingClientStateListener>()
        every {
            mockBillingClient.startConnection(capture(connectionListener))
        } answers {
            connectionListener.captured.onBillingSetupFinished(
                BillingResult.newBuilder()
                    .setResponseCode(BillingClient.BillingResponseCode.OK)
                    .setDebugMessage("OK")
                    .build()
            )
        }

        // Connection should succeed
        verify { mockBillingClient.startConnection(any()) }
    }

    @Test
    fun testQueryProductDetails() = runTest {
        val skus = listOf("scenic_routes_premium_monthly", "scenic_routes_pro_monthly")

        val mockProductDetails = mockk<ProductDetails>(relaxed = true)
        every { mockProductDetails.productId } returns "scenic_routes_premium_monthly"

        service.queryProductDetails(skus, BillingClient.ProductType.SUBS) { products ->
            assert(products.isNotEmpty())
        }
    }

    @Test
    fun testLaunchBillingFlow() = runTest {
        val mockActivity = mockk<Activity>(relaxed = true)
        val mockProductDetails = mockk<ProductDetails>(relaxed = true)
        val mockSubscriptionOfferDetails = mockk<ProductDetails.SubscriptionOfferDetails>(relaxed = true)

        every { mockProductDetails.subscriptionOfferDetails } returns listOf(mockSubscriptionOfferDetails)
        every { mockSubscriptionOfferDetails.offerToken } returns "test_offer_token"

        var errorCalled = false
        service.launchBillingFlow(mockActivity, mockProductDetails) { error ->
            errorCalled = true
        }

        // Error callback shouldn't be called on successful launch
        assert(!errorCalled)
    }

    @Test
    fun testVerifyAndAcknowledgePurchase() = runTest {
        val mockPurchase = mockk<Purchase>(relaxed = true)
        every { mockPurchase.products } returns listOf("scenic_routes_premium_monthly")
        every { mockPurchase.purchaseToken } returns "test_purchase_token"
        every { mockPurchase.purchaseState } returns Purchase.PurchaseState.PURCHASED

        // Mock API response
        coEvery {
            mockApiService.playBillingVerify(any())
        } returns BillingApiService.BillingResponse(
            success = true,
            message = "Verified",
            data = mapOf(
                "status" to "active",
                "entitlement_key" to "premium"
            )
        )

        // This would test the verification flow
        // Note: In actual implementation, you'd verify the call was made
    }

    @Test
    fun testRestorePurchases() = runTest {
        val mockPurchase1 = mockk<Purchase>(relaxed = true)
        val mockPurchase2 = mockk<Purchase>(relaxed = true)

        every { mockPurchase1.products } returns listOf("scenic_routes_premium_monthly")
        every { mockPurchase1.purchaseToken } returns "token_1"
        every { mockPurchase1.purchaseState } returns Purchase.PurchaseState.PURCHASED

        every { mockPurchase2.products } returns listOf("scenic_routes_pro_monthly")
        every { mockPurchase2.purchaseToken } returns "token_2"
        every { mockPurchase2.purchaseState } returns Purchase.PurchaseState.PURCHASED

        // Mock restore response
        coEvery {
            mockApiService.playBillingRestore(any())
        } returns BillingApiService.BillingResponse(
            success = true,
            message = "Restored 2 purchases"
        )

        service.restorePurchases {
            // Callback after restore
        }

        // Verify API was called
        coVerify { mockApiService.playBillingRestore(any()) }
    }

    @Test
    fun testHasEntitlement() = runTest {
        coEvery {
            mockApiService.checkEntitlement("premium")
        } returns BillingApiService.EntitlementsResponse(
            has_entitlement = true
        )

        var result = false
        service.hasEntitlement("premium") { has ->
            result = has
        }

        // Result should be true
        assert(result)
    }

    @Test
    fun testHasEntitlementFalse() = runTest {
        coEvery {
            mockApiService.checkEntitlement("pro")
        } returns BillingApiService.EntitlementsResponse(
            has_entitlement = false
        )

        var result = true
        service.hasEntitlement("pro") { has ->
            result = has
        }

        // Result should be false
        assert(!result)
    }

    @Test
    fun testDisconnect() {
        every { mockBillingClient.endConnection() } just Runs
        every { mockBillingClient.isReady } returns true

        service.disconnect()

        verify { mockBillingClient.endConnection() }
    }
}
