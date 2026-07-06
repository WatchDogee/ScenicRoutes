# Cross-Device Subscription Sync Testing Guide

## Architecture Overview

### Subscription Tie: User Account vs Device

**Your system**: Subscriptions are tied to **USER ACCOUNTS**, not devices or Google Play accounts.

```
Logged-In User Account (Database)
    ↓
    Subscription tied to user_id
    ↓
    Can access from ANY device (Android/Web/etc)
    ↓
    Same features unlocked everywhere
```

### Multi-Device Sync Flow

```
Device A (Android)              Device B (Website)
├─ Log in as user@example.com   ├─ Same email/password
├─ Buy Premium                  ├─ Automatically synced
└─ Features unlock              └─ Features unlock
```

---

## Implementation: What's Been Updated

### 1. ✅ PaymentViewModel - Login Check
```kotlin
// NEW: isLoggedIn field
data class PaymentUiState(
    val isLoggedIn: Boolean = false,  // Added
    val isPurchasing: Boolean = false,
)

// NEW: Check login before purchase
fun launchPurchase(activity: Activity, basePlanId: String) {
    if (!_uiState.value.isLoggedIn) {
        error = "Please log in to make a purchase"
        return
    }
    // ... proceed with purchase
}
```

### 2. ✅ BillingManager - Sync Function
```kotlin
// NEW: Sync purchases with backend
fun syncPurchasesWithBackend() {
    // Called when app launches or user logs in
    // Queries all active purchases and syncs them
    queryActivePurchases()
}
```

### 3. ✅ SubscriptionController - Better Sync
```php
// IMPROVED: Logs all active subscriptions for debugging
// IMPROVED: Returns most recent active subscription
// WORKS WITH: Both Stripe (web) and Google Play (Android)
```

---

## 🧪 COMPLETE Test Sequence

### Phase 1: Create Test Account

**Step 1.1**: On Website
```
Visit: https://scenicroutes.me
Sign up:
  Email: scenic-test-user@gmail.com
  Password: SecurePass123
  Confirm password
  Click: Sign Up
```

**Verify**: Check database
```bash
psql -U postgres -d scenicroutes_prod
SELECT id, email, created_at FROM users WHERE email = 'scenic-test-user@gmail.com';
# Result: id=123, email=scenic-test-user@gmail.com
```

### Phase 2: Add Test Account to Google Play

**Step 2.1**: Google Play Console
```
1. Go to Google Play Console
2. Select your app (ScenicRoutes)
3. Account settings → Licenses and API keys
4. License Testing → Add testers
5. Add email: scenic-test-user@gmail.com
6. Save
```

**Verify**: Check Play Console
```
License Testing shows: scenic-test-user@gmail.com ✓
```

### Phase 3: Test Android Purchase (Google Play)

**Step 3.1**: Device Setup
```
Device:
  1. Sign in to Google Play with: scenic-test-user@gmail.com
     (Settings → Accounts & sync)
  2. Open Play Store app
  3. Verify test account is shown
```

**Step 3.2**: Install App
```
1. Go to Play Console → Internal testing
2. Copy internal testing link
3. Open link on test device
4. Tap "Install"
5. App installs and opens
```

**Step 3.3**: Login to App
```
App Login Screen:
  Email: scenic-test-user@gmail.com
  Password: SecurePass123
  Tap: Login
  
Expected: 
  ✓ Login succeeds
  ✓ Auth token stored locally
  ✓ Payment screen shows "Ready to purchase"
```

**Step 3.4**: Purchase Premium
```
App Settings → Payment:
  ✓ See: Premium Monthly $3.99
  ✓ See: Premium Yearly $29.99
  ✓ See: Pro Monthly $5.99
  ✓ See: Pro Yearly $49.99
  
Select: Premium Monthly
Tap: Buy

Google Play Dialog:
  ✓ Shows "Test purchase" label
  ✓ No payment method needed
  Tap: BUY
  
Expected:
  ✓ Purchase completes
  ✓ App shows: "Premium Unlocked"
  ✓ Ride Recording enabled
  ✓ Offline Maps available
```

**Step 3.5**: Verify Backend Received It
```bash
# SSH to backend server
ssh deploy@YOUR_SERVER

# Check logs
tail -f storage/logs/laravel.log | grep -i "google-play\|premium"

# Expected lines:
# local.INFO: Synced subscription from Google Play
# user_id: 123
# product_id: "premium_monthly"
# base_plan_id: "1"
# tier: "premium"
# billing_cycle: "monthly"
```

**Step 3.6**: Check Database
```bash
psql -U postgres -d scenicroutes_prod

SELECT * FROM subscriptions 
WHERE user_id = 123 AND status = 'active';

# Result:
# id | user_id | plan    | status | platform   | ends_at
# 1  | 123     | premium | active | google_play| 2026-02-28
```

**Step 3.7**: Check API Endpoint
```powershell
# Get auth token from Step 3.3
$token = "eyJ0eXAiOiJKV1QiLC..."

$headers = @{ 
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/subscriptions/current" `
    -Headers $headers `
    -Method GET

$response | ConvertTo-Json

# Expected:
#{
#  "subscription": {
#    "plan": "premium",
#    "billing_cycle": "monthly",
#    "status": "active",
#    "ends_at": "2026-02-28T00:00:00Z"
#  },
#  "tier": "premium",
#  "has_active_subscription": true
#}
```

### Phase 4: Test Same Account on Website

**Step 4.1**: Website Login
```
Visit: https://scenicroutes.me/login
Login:
  Email: scenic-test-user@gmail.com
  Password: SecurePass123
  Tap: Login

Expected:
  ✓ Login succeeds
  ✓ Dashboard shows: "Premium - Renews Feb 28, 2026"
```

**Step 4.2**: Check Features Enabled
```
Website Settings → Subscription:
  ✓ Plan: Premium
  ✓ Billing Cycle: Monthly ($3.99/month)
  ✓ Renewal Date: Feb 28, 2026
  ✓ Cancel Subscription button visible

Settings → Features:
  ✓ Ride Recording: ENABLED ✓
  ✓ Offline Maps: ENABLED ✓
  ✓ GPX Export: ENABLED ✓
  ✓ Turn-by-turn Navigation: ENABLED ✓
```

### Phase 5: Test Logout/Login Persistence

**Step 5.1**: Android Logout
```
App Settings → Account:
  Tap: Logout
  
Expected:
  ✓ Session cleared
  ✓ Auth token deleted
  ✓ Premium features disappear (local cache cleared)
  ✓ Back to login screen
```

**Step 5.2**: Android Login Again
```
App Login Screen:
  Email: scenic-test-user@gmail.com
  Password: SecurePass123
  Tap: Login

Expected:
  ✓ Login succeeds
  ✓ API call: GET /api/subscriptions/current
  ✓ Returns: tier = "premium"
  ✓ Ride Recording re-enabled ✓
  ✓ Same subscription found in database
```

**Verify Logs**:
```bash
tail -f storage/logs/laravel.log | grep "getCurrent"

# Should see:
# local.INFO: getCurrent: Returning subscription data
# user_id: 123
# tier: "premium"
# has_active_subscription: true
```

### Phase 6: Test Multiple Users on Same Device

**Step 6.1**: Create Second Test Account
```
Website: https://scenicroutes.me/signup
Sign up:
  Email: scenic-test-user-2@gmail.com
  Password: SecurePass456
  Confirm & Sign Up
```

**Add to Google Play Test Accounts**:
```
Play Console → License Testing → Add testers
Add: scenic-test-user-2@gmail.com
```

**Step 6.2**: Android Switch User
```
App Settings → Account → Logout

App Login Screen:
  Email: scenic-test-user-2@gmail.com
  Password: SecurePass456
  Tap: Login

Expected:
  ✓ Login succeeds
  ✓ API shows: tier = "free"
  ✓ No premium features
  ✓ Payment screen available
```

**Step 6.3**: User 2 Purchases Pro
```
App Settings → Payment:
  Select: Pro Monthly
  Tap: Buy
  
Google Play Dialog appears (with test label)
  Tap: BUY

Expected:
  ✓ Purchase completes
  ✓ Backend receives: user_id=124, product_id="pro_monthly"
  ✓ Subscription stored: user_id=124, plan="pro"
```

**Step 6.4**: Check User 1 Not Affected
```
Logout from App
Login as: scenic-test-user@gmail.com

Expected:
  ✓ API returns: tier = "premium" (unchanged)
  ✓ User 1's subscription still exists
  ✓ User 2's purchase didn't override it
```

**Verify in Database**:
```sql
SELECT user_id, plan, status FROM subscriptions 
WHERE user_id IN (123, 124) AND status = 'active';

# Result:
# user_id | plan    | status
# 123     | premium | active
# 124     | pro     | active
```

### Phase 7: Test Android→Website Cross-Sync

**Step 7.1**: User 1 Upgrades on Android
```
App (logged in as scenic-test-user@gmail.com):
  Settings → Payment
  Select: Pro Monthly $5.99
  Tap: Buy
  Complete purchase

Backend receives: user_id=123, product_id="pro_monthly"
Database updates: subscriptions SET plan="pro" WHERE user_id=123
```

**Step 7.2**: Check Website Reflects Change
```
Website (user already logged in):
  Refresh page (F5)
  
OR

Website (if not logged in):
  Login as: scenic-test-user@gmail.com
  
Settings → Subscription:
  Expected: Shows "Pro - Renews Feb 28, 2026"
```

**Step 7.3**: Website Purchase Sync to Android
```
Website Settings → Payment:
  Downgrade to: Premium Monthly $3.99
  Complete Stripe payment
  
Backend updates: subscriptions SET plan="premium" WHERE user_id=123
```

**Android Verification**:
```
App (Settings → Payment):
  If user refreshes/reopens: Shows "Premium - Renews..."
  
OR

Backend API call:
  GET /api/subscriptions/current
  Returns: tier = "premium"
```

---

## ✅ Full Test Checklist

### Account & Login
- [ ] Create test account on website
- [ ] Add to Google Play Test Accounts
- [ ] Android login works
- [ ] Website login works
- [ ] Login persists across app restarts

### Single Device Purchase (Android)
- [ ] Premium Monthly purchase completes
- [ ] Backend logs show: user_id, product_id, base_plan_id
- [ ] Database subscription created
- [ ] Premium features unlock immediately
- [ ] Ride Recording enabled

### Cross-Device Sync (Same User)
- [ ] Website shows same tier as Android
- [ ] Website shows same end date as Android
- [ ] Premium features enabled on website
- [ ] Logout/login preserves subscription
- [ ] Database shows only 1 active subscription per user

### Multiple Users (Same Device)
- [ ] User 1 logs out, logs in: Same subscription
- [ ] User 2 logs in: Different user_id in database
- [ ] User 2 purchases: Own subscription created
- [ ] User 1 and User 2 have separate subscriptions
- [ ] Features correct for each user

### Cross-Platform Purchase
- [ ] Android purchase syncs to website ✓
- [ ] Website purchase syncs to Android ✓
- [ ] Database shows latest tier only
- [ ] Both platforms show same tier
- [ ] Both platforms show same renewal date

### Edge Cases
- [ ] Logout prevents purchase (error shown) ✓
- [ ] Login without internet then online: Syncs ✓
- [ ] Reinstall app: Purchase restores ✓
- [ ] Device time change: Subscription still valid
- [ ] Cancel subscription: Both platforms reflect change

---

## 🔍 Troubleshooting

### "Please log in to make a purchase" appears
**Expected behavior**: Feature is working correctly ✓
- User is not logged in
- Fix: User must login first

### Website doesn't show Android purchase
**Check**:
1. Both devices using same Google account
2. Both devices using same user account (email/password)
3. Backend logs: Look for sync errors
4. Database: Run query to find subscription
```sql
SELECT * FROM subscriptions WHERE user_id = 123;
```

### Android shows "Offer not available"
**Check**:
1. Product exists in Google Play Console
2. Base plan ID matches code:
   - premium_monthly: "1" or "yearly"
   - pro_monthly: "monthly" or "yearly"
3. Product is activated (not draft)

### Multiple subscriptions per user
**Should not happen** with this implementation
- Check GooglePlayController.php: Uses `updateOrCreate()`
- Ensure purchase_token stored correctly
- Database should have max 1 active subscription per user

---

## 📊 Database Schema Reference

### subscriptions Table
```sql
CREATE TABLE subscriptions (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,  -- ← KEY: Tied to user account
    plan VARCHAR (e.g., "premium", "pro"),
    status VARCHAR (e.g., "active", "cancelled"),
    platform VARCHAR (e.g., "google_play", "stripe"),
    purchase_token VARCHAR,
    stripe_subscription_id VARCHAR,
    stripe_price_id VARCHAR,
    billing_cycle VARCHAR (e.g., "monthly", "yearly"),
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Key Queries

Get user's active subscription:
```sql
SELECT * FROM subscriptions 
WHERE user_id = ? AND status = 'active'
ORDER BY updated_at DESC LIMIT 1;
```

Get all users with Premium:
```sql
SELECT user_id, plan, tier FROM subscriptions 
WHERE plan = 'premium' AND status = 'active';
```

---

## 🚀 Success Criteria

All tests pass when:
- ✅ User can purchase on Android with login check
- ✅ Purchase syncs to website automatically
- ✅ Logout/login preserves subscription
- ✅ Multiple users on same device have separate subscriptions
- ✅ Cross-platform purchases work (Android→Web, Web→Android)
- ✅ Database shows clean subscription state (no duplicates)
- ✅ Backend logs show proper user_id and product_id
- ✅ Features unlock correctly on all devices

**Status**: Ready for testing!

---

**Last Updated**: January 29, 2026
**Implementation Status**: Complete ✅
