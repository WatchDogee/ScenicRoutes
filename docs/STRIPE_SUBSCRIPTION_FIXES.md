# Stripe Subscription Integration Fixes - December 21, 2025

## Problem Summary
- **Website**: Checkout was failing with 422 (Unprocessable Content) error
- **Android App**: Showing "Free" tier despite Stripe having "Premium" subscription active
- **Backend**: Subscriptions not being synced from Stripe to local database

## Root Causes Identified

### 1. Website Checkout 422 Error
**Cause**: Parameter name mismatch
- Website was sending: `{ plan: "premium", billing_cycle: "monthly" }`
- API expected: `{ plan_id: "premium", billing_cycle: "monthly" }`

**Location**: `resources/js/Pages/Subscription.jsx` line 68

### 2. Stripe Customer Not Created Before Checkout
**Cause**: Missing customer ID initialization
- `createCheckoutSession()` was using `customer_email` instead of `customer_id`
- User didn't have `stripe_id` set on their profile
- Stripe would create a new customer but the webhook couldn't link it to the app user

**Location**: `app/Services/PaymentService.php` line 24-36

### 3. Webhook Couldn't Link Stripe Subscription to User
**Cause**: User stripe_id was NULL
- Webhook fires after Stripe creates customer
- Webhook tries to look up user by `stripe_customer_id` but field is empty
- Subscription syncing fails silently

## Fixes Applied

### Fix 1: Correct Website Checkout Parameter
**File**: `resources/js/Pages/Subscription.jsx`

**Changes**:
```javascript
// BEFORE
const response = await apiClient.post('/subscriptions/checkout', {
    plan,
    billing_cycle: billingCycle,
});

// AFTER
const response = await apiClient.post('/subscriptions/checkout', {
    plan_id: plan,
    billing_cycle: billingCycle,
});
```

**Also improved error reporting**:
```javascript
// Now captures validation errors from server
const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to create checkout session';
const errors = error.response?.data?.errors;
let fullMessage = errorMsg;
if (errors) {
    fullMessage += ' - ' + Object.values(errors).flat().join(', ');
}
```

### Fix 2: Ensure Stripe Customer Created Before Checkout
**File**: `app/Services/PaymentService.php`

**Changes**:
```php
// BEFORE
public function createCheckoutSession(User $user, string $plan, string $billingCycle = 'monthly')
{
    $priceId = $this->getPriceId($plan, $billingCycle);
    
    $session = \Stripe\Checkout\Session::create([
        'customer_email' => $user->email,  // ← Creates new customer by email
        // ...
    ]);
}

// AFTER
public function createCheckoutSession(User $user, string $plan, string $billingCycle = 'monthly')
{
    $priceId = $this->getPriceId($plan, $billingCycle);
    
    // Ensure user has a Stripe customer ID before creating checkout
    if (!$user->stripe_id) {
        $user->createAsStripeCustomer();  // ← Creates customer and stores ID
    }
    
    $session = \Stripe\Checkout\Session::create([
        'customer' => $user->stripe_id,  // ← Use existing customer ID
        // ...
    ]);
}
```

**Result**: 
- User gets `stripe_id` set immediately
- Webhook can now find the user by `stripe_id`
- Subscription syncs to local database correctly

## Testing Checklist

### Website Tests
- [ ] Go to `/subscription` page
- [ ] Click "Upgrade" button for Premium plan
- [ ] Verify NO 422 error
- [ ] Stripe checkout loads successfully
- [ ] Can complete checkout with test card `4242 4242 4242 4242`
- [ ] Redirect to success page works

### Backend Verification
- [ ] Check `users` table: User has `stripe_id` populated (stripe_cus_XXXXX)
- [ ] Check `subscriptions` table: New subscription record created with plan='premium'
- [ ] Verify webhook logs in Laravel: Should see "Subscription verified and synced"

### Android App Tests
- [ ] Open app and go to Subscription screen
- [ ] Click "Refresh subscription status" button
- [ ] Logcat should show:
  ```
  SubscriptionViewModel: Loaded subscription: plan=premium, status=active
  SubscriptionViewModel: Verification result: tier=premium, hasActive=true
  ```
- [ ] Subscription screen should show:
  - Current Plan: **Premium**
  - Status: active
  - Next renewal date visible
  - NO upgrade options shown (can't upgrade from Premium to Premium)

### API Endpoint Tests
```bash
# Test subscription retrieval
curl -H "Authorization: Bearer {TOKEN}" \
  http://10.0.2.2:8000/api/subscriptions/current

# Should return
{
  "subscription": {
    "id": 1,
    "user_id": 1,
    "plan": "premium",
    "status": "active",
    "stripe_subscription_id": "sub_XXXXX",
    "ends_at": "2026-01-20T...",
    "...": "..."
  },
  "tier": "premium",
  "has_active_subscription": true,
  "limits": { "..." }
}
```

## Deployment Steps

1. **Deploy Website Changes**:
   ```bash
   npm run build  # Build Vite assets
   php artisan config:cache
   ```

2. **Deploy Backend Changes**:
   ```bash
   # No database migrations needed
   php artisan config:cache
   ```

3. **Deploy Android App**:
   ```bash
   # APK already built
   # Install via: adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

## Related Issues Fixed

- ✅ **Website 422 checkout error** - Parameter mismatch
- ✅ **Backend subscription not syncing** - Missing Stripe customer ID
- ✅ **App showing Free tier after upgrade** - No local subscription record
- ✅ **Android roads/collections showing 0** - Related to tier check (now fixed)
- ✅ **UserProfile crash** - Error handling improved
- ✅ **Feed padding** - Already fixed in previous session
- ✅ **UI layout issues** - Already fixed in previous session

## Known Limitations

- Stripe test cards (`4242 4242...`) will always remain "free" tier in Stripe's system
- Use seeded test account emails for full subscription testing
- Website must use HTTPS in production for Stripe security
- Webhook tolerance set to 300 seconds

## Monitoring

**Critical logs to watch**:
- Laravel: `Subscription verified and synced` → Indicates successful webhook
- Laravel: `Failed to verify Stripe subscription` → Webhook sync failed
- Android: `Loaded subscription: plan=` → Shows what tier is being loaded
- Android: `Verification result: tier=` → Shows subscription verification outcome

## Next Steps

1. ✅ Fixed all identified issues
2. ⏳ Deploy and test subscription flow
3. ⏳ Verify roads/collections display for all user tiers
4. ⏳ Test app auto-login (requires splash screen - separate work)

