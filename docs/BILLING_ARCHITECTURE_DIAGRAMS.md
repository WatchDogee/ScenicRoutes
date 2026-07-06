# Billing Implementation - Architecture Diagrams

## 1. Complete Purchase Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ Subscription Tab │
    │                  │
    │ [Premium Monthly]│
    │ [Premium Yearly] │
    │ [Pro Monthly]    │
    │ [Pro Yearly]     │
    └────────┬─────────┘
             │ User clicks "Upgrade Monthly"
             ▼
    ┌──────────────────────────────────────┐
    │    launchPurchase Lambda             │
    │ Maps basePlanId → planId/billingCycle│
    │ basePlanId="1" → premium/monthly     │
    │ basePlanId="yearly" → premium/yearly │
    └────────┬─────────────────────────────┘
             │ Navigate with parameters
             ▼
    ┌──────────────────────────────────────┐
    │      Payment Screen                   │
    │                                      │
    │  Premium - Monthly                   │
    │  ────────────────────────            │
    │  Price: $3.99                        │
    │                                      │
    │  ✓ Extra curvy routes                │
    │  ✓ Unlimited round trips             │
    │  ✓ Turn-by-turn navigation           │
    │  ...                                 │
    │                                      │
    │  [Complete Purchase]                 │
    │  ────────────────────────            │
    │  Payment secured by Google Play       │
    └────────┬─────────────────────────────┘
             │ User clicks "Complete Purchase"
             ▼
    ┌──────────────────────────────────────┐
    │   Google Play Billing Dialog          │
    │                                      │
    │  Purchase Premium Monthly - $3.99    │
    │  ────────────────────────────        │
    │  [Buy]        [Cancel]               │
    │                                      │
    └────────┬─────────────────────────────┘
             │ User completes purchase
             ▼
    ┌──────────────────────────────────────┐
    │   Purchase Completed                  │
    │   (Return to Payment Screen)          │
    │   (Verify with Backend)               │
    └─────────────────────────────────────┘
```

## 2. Technical Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   BILLING ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────┘

  ┌────────────────────┐
  │   PaymentScreen    │
  │   (Kotlin/Compose) │
  └────────┬───────────┘
           │
           │ Initialize & Launch
           ▼
  ┌────────────────────────────────┐
  │     BillingManager             │
  │                                │
  │ ├─ initializeBillingClient()   │
  │ ├─ queryProducts()             │
  │ ├─ getOfferToken()             │
  │ └─ launchPurchaseFlow()        │
  └────────┬────────────────────────┘
           │
           │ Connect & Query
           ▼
  ┌────────────────────────────────┐
  │  Google Play Billing Client    │
  │                                │
  │ ├─ Connect to service          │
  │ ├─ Query subscription products │
  │ ├─ Manage billing flow         │
  │ └─ Handle purchase updates     │
  └────────┬────────────────────────┘
           │
           │ Purchase Token
           ▼
  ┌────────────────────────────────┐
  │    Backend Verification        │
  │  (GooglePlayController.php)    │
  │                                │
  │ ├─ Receive purchase token      │
  │ ├─ Verify with Google API      │
  │ ├─ Create subscription record  │
  │ └─ Send entitlements           │
  └────────┬────────────────────────┘
           │
           │ Subscription Record
           ▼
  ┌────────────────────────────────┐
  │     Database                   │
  │   (subscriptions table)        │
  │                                │
  │ user_id: 123                   │
  │ product_id: premium_monthly    │
  │ base_plan_id: "1"              │
  │ billing_cycle: monthly         │
  │ purchase_token: xxx...         │
  │ status: active                 │
  └────────────────────────────────┘
```

## 3. Product & Base Plan Structure

```
┌─────────────────────────────────────────────────────────────┐
│         GOOGLE PLAY CONSOLE STRUCTURE                       │
└─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │      premium_monthly                │
  │    (Product ID)                     │
  │                                     │
  │  ├─ Base Plan "1"                   │
  │  │  └─ Offer Token: "monthly_..."   │
  │  │  └─ Price: $3.99/month           │
  │  │  └─ Renewal: Monthly             │
  │  │                                  │
  │  └─ Base Plan "yearly"              │
  │     └─ Offer Token: "yearly_..."    │
  │     └─ Price: $29.99/year           │
  │     └─ Renewal: Yearly              │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │      pro_monthly                    │
  │    (Product ID)                     │
  │                                     │
  │  ├─ Base Plan "monthly"             │
  │  │  └─ Offer Token: "monthly_..."   │
  │  │  └─ Price: $5.99/month           │
  │  │  └─ Renewal: Monthly             │
  │  │                                  │
  │  └─ Base Plan "yearly"              │
  │     └─ Offer Token: "yearly_..."    │
  │     └─ Price: $49.99/year           │
  │     └─ Renewal: Yearly              │
  └─────────────────────────────────────┘
```

## 4. Parameter Mapping

```
┌─────────────────────────────────────────────────────────────┐
│         PARAMETER MAPPING LOGIC                              │
└─────────────────────────────────────────────────────────────┘

  USER CLICKS "UPGRADE MONTHLY" (basePlanId="1")
        │
        ├─ planId Mapping:
        │  • "1" or "yearly" → planId = "premium"
        │  • "monthly" → planId = "pro"
        │
        ├─ billingCycle Mapping:
        │  • "1" or "monthly" → billingCycle = "monthly"
        │  • "yearly" → billingCycle = "yearly"
        │
        └─ Navigate: "payment?planId=premium&billingCycle=monthly"
               │
               ▼
        PaymentScreen receives parameters
               │
               ├─ Map to productId:
               │  • planId="premium" → productId="premium_monthly"
               │  • planId="pro" → productId="pro_monthly"
               │
               ├─ Map to basePlanId:
               │  • premium+monthly → basePlanId="1"
               │  • premium+yearly → basePlanId="yearly"
               │  • pro+monthly → basePlanId="monthly"
               │  • pro+yearly → basePlanId="yearly"
               │
               └─ Query BillingManager:
                  • Get ProductDetails for premium_monthly
                  • Get OfferToken for basePlanId="1"
                  • Launch billing flow
```

## 5. State Management

```
┌─────────────────────────────────────────────────────────────┐
│         PAYMENT SCREEN STATE                                 │
└─────────────────────────────────────────────────────────────┘

  var isLoading: Boolean = false
    ├─ false: Show "Complete Purchase" button
    └─ true: Show loading spinner, disable button

  var errorMessage: String? = null
    ├─ null: Don't show error card
    └─ "message": Show dismissible error card

  var productPrice: String? = null
    ├─ null: Show "Loading..."
    └─ "$3.99": Show actual price in card

  Computed Values:
    productId = if (planId == "premium") "premium_monthly" else "pro_monthly"
    basePlanId = when(planId, billingCycle) { ... }
    billingCycleDisplay = billingCycle.replaceFirstChar { it.uppercaseChar() }
```

## 6. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│         ERROR HANDLING CHAIN                                 │
└─────────────────────────────────────────────────────────────┘

  Click "Complete Purchase"
        │
        ▼
  ┌─ Activity null? ──────→ "Activity not available"
  │
  ├─ Token null? ────────→ "Please log in to make a purchase"
  │
  ├─ Billing not ready? ─→ "Billing service not ready"
  │
  ├─ Product not found? ─→ "Product not available"
  │
  ├─ No offer token? ────→ "Offer not available for this plan"
  │
  ├─ Launch fails? ──────→ "Error: {exception message}"
  │
  └─ Success ────────────→ Billing flow launches
```

## 7. Data Flow Timeline

```
T=0s:   App Launches
        │
        ├─ MainActivity.onCreate()
        │  └─ BillingManager.initialize()
        │
        └─ Start querying products in background

T=0.5s: Products Queried
        │
        └─ subscriptionProducts StateFlow updated

T=1s:   User clicks "Upgrade Monthly"
        │
        └─ SubscriptionScreen launches PaymentScreen with parameters

T=1.5s: PaymentScreen Rendered
        │
        ├─ Load pricing from map
        ├─ Initialize BillingManager (second instance)
        └─ Query products (cached results)

T=2s:   User clicks "Complete Purchase"
        │
        ├─ Verify user authenticated
        ├─ Get product details
        ├─ Get offer token
        └─ Launch billing flow

T=2.5s: Google Play Billing Dialog Opens
        │
        └─ User completes purchase

T=3s:   Purchase Completed
        │
        ├─ onPurchasesUpdated callback fired
        ├─ Send to backend for verification
        ├─ Backend verifies with Google Play
        ├─ Create subscription record
        └─ User gains premium/pro access

T=5s:   Subscription Active
        │
        └─ Features available, UI updates accordingly
```

## 8. Class Relationships

```
┌─────────────────────────────────────────────────────────────┐
│         CLASS STRUCTURE                                      │
└─────────────────────────────────────────────────────────────┘

  ┌────────────────────┐
  │  PaymentScreen()   │
  │  @Composable       │
  └────────┬───────────┘
           │ uses
           ▼
  ┌────────────────────┐
  │  BillingManager    │
  │  - billingClient   │
  │  - subscriptionProducts StateFlow
  │  - purchaseStatus StateFlow
  │  - initialize()
  │  - launchPurchaseFlow()
  │  - getOfferToken()
  └────────┬───────────┘
           │ manages
           ▼
  ┌────────────────────┐
  │  BillingClient     │
  │  (from Google)     │
  │  - startConnection()
  │  - queryProductDetails()
  │  - launchBillingFlow()
  │  - queryPurchases()
  └────────────────────┘

  ┌────────────────────┐
  │  TokenManager      │
  │  - token Flow      │
  │  - first()         │
  └────────┬───────────┘
           │ provides token to
           │
  ┌────────▼───────────┐
  │  ApiService        │
  │  - verifyGooglePlay()
  │  - syncGooglePlay()
  └────────────────────┘
```

---

**Note**: All diagrams are ASCII for clarity and easy reading in any editor.

