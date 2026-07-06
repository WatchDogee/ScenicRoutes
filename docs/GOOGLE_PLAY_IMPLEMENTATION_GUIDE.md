# Google Play Billing Implementation Guide

## ✅ What's Already Done

Your Google Play billing is **90% implemented**. Here's what works:

### Backend (PHP/Laravel)
- ✅ Google Play API verification endpoints (`/api/google-play/verify`, `/api/google-play/sync`)
- ✅ Product ID to tier/billing cycle mapping
- ✅ Subscription creation/updates for Google Play purchases
- ✅ Supports both Stripe (web) and Google Play (Android) billing
- ✅ Updated to handle base plan IDs

### Android App (Kotlin)
- ✅ BillingManager handles all Google Play communication
- ✅ Product querying and purchase flows
- ✅ Backend verification and acknowledgment
- ✅ Purchase restoration
- ✅ Updated to use your Google Play Console product structure

---

## 🔧 Quick Setup Required

### 1. Update Product IDs in PaymentViewModel

Your PaymentViewModel still references old product IDs. Update it to match your Google Play Console:

**File:** `android-native/app/src/main/java/com/scenicroutes/app/ui/viewmodel/PaymentViewModel.kt`

**Change line ~82:**
```kotlin
// OLD
val premiumSKU = "scenic_routes_premium_monthly"
val proSKU = "scenic_routes_pro_monthly"

// NEW (matching your Google Play Console)
val premiumProductId = "premium_monthly"
val proProductId = "pro_monthly"
```

### 2. Update launchPurchase to Pass Base Plan ID

**File:** `android-native/app/src/main/java/com/scenicroutes/app/ui/viewmodel/PaymentViewModel.kt`

**Replace the `launchPurchase` function (~line 117):**
```kotlin
/**
 * Launch billing flow for selected product with specific base plan
 */
fun launchPurchase(activity: Activity, basePlanId: String) {
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
            basePlanId  // Pass base plan ID to BillingManager
        ) { error ->
            _uiState.value = _uiState.value.copy(isPurchasing = false)
            _billingState.value = PaymentState.PurchaseError(error)
        }
    } else {
        _uiState.value = _uiState.value.copy(isPurchasing = false)
        _billingState.value = PaymentState.PurchaseError("Offer not available")
    }
}
```

### 3. Update PlayBillingClientService

Your `PlayBillingClientService.kt` needs to forward the base plan ID to BillingManager.

**File:** `android-native/app/src/main/java/com/scenicroutes/app/data/service/PlayBillingClientService.kt`

Find `launchBillingFlow` and update signature:
```kotlin
fun launchBillingFlow(
    activity: Activity,
    productDetails: ProductDetails,
    offerToken: String?,
    basePlanId: String? = null,  // Add this parameter
    onError: (String) -> Unit
) {
    if (offerToken == null) {
        onError("No offer token available")
        return
    }
    
    // Pass basePlanId to BillingManager
    billingManager.launchPurchaseFlow(activity, productDetails, offerToken, basePlanId)
}
```

---

## 🧪 Testing Instructions

### Step 1: Rebuild App
```powershell
cd ScenicRoutes_dev/android-native
./gradlew assembleRelease
# or bundleRelease for AAB
./gradlew bundleRelease
```

### Step 2: Upload to Internal Testing
Upload the new AAB to Google Play Console → Testing → Internal testing

### Step 3: Install on Test Device
1. Sign in with your test account on device
2. Install from internal testing link
3. Open app

### Step 4: Test Premium Monthly Purchase
1. Open app → Settings → Payment/Subscription
2. Select **Premium** plan
3. Choose **Monthly** billing (base plan ID = "1")
4. Click purchase
5. **Expected**: Google Play billing dialog with "Test purchase" label
6. Complete purchase

**Verify Backend:**
```bash
# Check Laravel logs
tail -f storage/logs/laravel.log | grep "google-play"

# Should see:
# "Synced subscription from Google Play"
# product_id: "premium_monthly"
# base_plan_id: "1"
# tier: "premium"
# billing_cycle: "monthly"
```

### Step 5: Test Premium Yearly Purchase
1. Same flow but select **Yearly** billing (base plan ID = "yearly")
2. Verify logs show `billing_cycle: "yearly"`

### Step 6: Test Pro Monthly/Yearly
Repeat with Pro tier:
- Pro Monthly: `product_id: "pro_monthly"`, `base_plan_id: "monthly"`
- Pro Yearly: `product_id: "pro_monthly"`, `base_plan_id: "yearly"`

---

## 🔍 Product ID Mapping Reference

### Your Google Play Console Setup:

| Product ID | Base Plan ID | Tier | Billing Cycle | Price |
|------------|--------------|------|---------------|-------|
| `premium_monthly` | `1` | Premium | Monthly | $3.99 |
| `premium_monthly` | `yearly` | Premium | Yearly | $29.99 |
| `pro_monthly` | `monthly` | Pro | Monthly | $5.99 |
| `pro_monthly` | `yearly` | Pro | Yearly | $49.99 |

### Backend Mapping Logic:

```php
// Product ID → Tier
"premium_monthly" → "premium"
"pro_monthly" → "pro"

// Base Plan ID → Billing Cycle
"1" → "monthly"
"monthly" → "monthly"
"yearly" → "yearly"
```

---

## 🚀 Complete Test Scenarios

- [ ] **Premium Monthly**: Buy, verify unlock, check backend
- [ ] **Premium Yearly**: Buy, verify unlock, check backend
- [ ] **Pro Monthly**: Buy, verify unlock, check backend
- [ ] **Pro Yearly**: Buy, verify unlock, check backend
- [ ] **Upgrade**: Premium → Pro (verify tier changes)
- [ ] **Restore**: Reinstall app, verify purchase restores
- [ ] **Cancellation**: Cancel in-app, verify status updates
- [ ] **Backend Sync**: Check `/api/subscriptions/current` returns correct tier

---

## 🔐 Stripe + Google Play Coexistence

Your system supports **both** billing platforms:

### Web Users (Stripe)
- Use Stripe Checkout for subscriptions
- `platform: "stripe"` in database
- Product IDs from Stripe Price API

### Android Users (Google Play)
- Use Google Play Billing for subscriptions
- `platform: "google_play"` in database
- Product IDs from Google Play Console

### Backend Logic
```php
// GooglePlayController handles Google Play
if ($subscription->platform === 'google_play') {
    // Verify with Google Play API
    $result = $this->verifyWithGooglePlay($productId, $purchaseToken);
}

// StripeController handles Stripe
if ($subscription->platform === 'stripe') {
    // Verify with Stripe API
    $result = Stripe::verifySubscription($subscriptionId);
}
```

Both platforms sync to same `subscriptions` table with different platform identifiers.

---

## 📞 Support Endpoints

Your app uses these endpoints during billing:

### Verify Purchase
```
POST /api/google-play/verify
Authorization: Bearer {token}
Body: {
  "product_id": "premium_monthly",
  "purchase_token": "eofj2k3j...",
  "base_plan_id": "1"
}
Response: {
  "valid": true,
  "subscription": {...},
  "tier": "premium"
}
```

### Sync Subscription
```
POST /api/google-play/sync
Body: Same as verify
Response: { "success": true, "tier": "premium" }
```

### Get Current Subscription
```
GET /api/subscriptions/current
Authorization: Bearer {token}
Response: {
  "subscription": {
    "plan": "premium",
    "billing_cycle": "monthly",
    "status": "active"
  },
  "tier": "premium",
  "has_active_subscription": true
}
```

---

## ✅ Implementation Checklist

- [x] Backend supports base_plan_id parameter
- [x] BillingManager uses new product IDs
- [x] BillingManager passes base_plan_id to backend
- [ ] PaymentViewModel updated with new product IDs
- [ ] PlayBillingClientService forwards base_plan_id
- [ ] UI shows monthly/yearly options correctly
- [ ] Test all 4 subscription options
- [ ] Verify backend logs show correct tier/billing_cycle
- [ ] Test upgrade/downgrade flows
- [ ] Test restore purchases

---

**Last Updated**: January 28, 2026
**Status**: Ready for final testing after PaymentViewModel updates
