# Quick Testing Guide - Google Play Billing

## Build & Test Locally

### 1. Build Debug APK
```bash
cd ScenicRoutes_dev/android-native
./gradlew assembleDebug --no-build-cache
```

**APK Location**: `app/build/outputs/apk/debug/app-debug.apk`

### 2. Install on Test Device
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3. Run App
1. Open app on test device
2. Navigate to Subscription tab
3. Click "Upgrade Monthly" or "Upgrade Yearly"

### 4. Expected Behavior

**What You Should See**:
- Payment screen appears with plan details
- Shows correct plan name (Premium or Pro)
- Shows correct billing cycle (Monthly or Yearly)
- Shows correct pricing:
  - Premium: $3.99/month or $29.99/year
  - Pro: $5.99/month or $49.99/year
- Shows features list with checkmarks
- "Complete Purchase" button is clickable

### 5. Test Purchase Flow (Sandbox)

**Sandbox Testing**:
1. Use Gmail account added to Google Play Internal Testing
2. Click "Complete Purchase" button
3. Google Play Billing dialog should appear
4. Complete test purchase
5. Backend should receive and verify purchase
6. Check logs: `adb logcat | grep PaymentScreen`

## Logs to Monitor

### Android Logs
```bash
# Watch payment screen logs
adb logcat | grep PaymentScreen

# Watch billing manager logs
adb logcat | grep BillingManager

# Watch all app logs
adb logcat | grep scenicroutes
```

### Expected Log Messages
```
PaymentScreen: Loading pricing for planId=premium, billingCycle=monthly
PaymentScreen: Price for premium_monthly: $3.99
PaymentScreen: Starting purchase flow for premium/monthly
PaymentScreen: Launching billing: productId=premium_monthly, basePlanId=1
BillingManager: Billing client connected successfully
BillingManager: Found 2 subscription products
BillingManager: Launching billing flow
PaymentScreen: Billing flow launched successfully
```

## Troubleshooting

### Issue: "Billing service not ready"
```
Check:
1. Device has Google Play Store app installed
2. Google Play Services is up to date
3. Device has internet connection
4. App is signed with correct certificate

Fix:
1. Update Google Play Services
2. Restart app
3. Try again
```

### Issue: "Product not available"
```
Check:
1. Go to Google Play Console
2. Verify product IDs exist:
   - premium_monthly
   - pro_monthly
3. Check product status is "Active"
4. Verify base plans are configured

Fix:
1. Create missing products
2. Activate products
3. Configure base plans
4. Rebuild and reinstall app
```

### Issue: Purchase dialog doesn't appear
```
Check:
1. Logs show "Billing flow launched successfully"
2. Google Play Billing dialog should appear

Fix:
1. Ensure you're using test account
2. Check device has Google Play Store
3. Update Google Play Services
4. Restart app
```

## Build for Release (Upload to Google Play)

### 1. Build Release Bundle
```bash
cd ScenicRoutes_dev/android-native
./gradlew bundleRelease --no-build-cache --rerun-tasks
```

**AAB Location**: `app/build/outputs/bundle/release/app-release.aab`

### 2. Upload to Google Play Console
1. Go to Google Play Console → ScenicRoutes app
2. Release → Production (or Internal Testing)
3. Upload app bundle
4. Review and publish

### 3. Wait for Review
- Google Play reviews app (typically 1-2 hours)
- App becomes available when approved

## Key Files to Monitor

1. **PaymentScreen.kt** - User sees this screen
   - Check: Pricing display correct?
   - Check: Features list correct?
   - Check: Button clickable?

2. **BillingManager.kt** - Handles billing logic
   - Check: Products queried correctly?
   - Check: Offer tokens retrieved?
   - Check: Purchase verified?

3. **GooglePlayController.php** - Backend verification
   - Check: Purchase token received?
   - Check: Google Play API verification works?
   - Check: Subscription created in database?

## Quick Verification

Run these commands to verify setup:

### Check Billing Manager Initialization
```kotlin
// Add to MainActivity after initialization
val billingManager = BillingManager(this, lifecycleScope)
billingManager.initialize()
Log.d("Setup", "BillingManager initialized")
Log.d("Setup", "isReady: ${billingManager.isReady.value}")
Log.d("Setup", "Products: ${billingManager.subscriptionProducts.value.size}")
```

### Check Backend Endpoint
```bash
curl -X POST http://localhost/api/verify-google-play \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "product_id": "premium_monthly",
    "purchase_token": "test_token",
    "base_plan_id": "1"
  }'
```

## Success Indicators

✅ App builds without errors
✅ Payment screen appears when clicking upgrade
✅ Correct pricing shown for selected plan
✅ Features list displayed with checkmarks
✅ Google Play Billing dialog appears on purchase button click
✅ Purchase completes without errors
✅ Backend logs show purchase verification
✅ Database shows new subscription record
✅ User gains access to premium features

## Common Mistakes to Avoid

❌ Using wrong product IDs
❌ Forgot to sign app with Play Signing Certificate
❌ Base plan IDs don't match Google Play Console
❌ Pricing not updated in code
❌ Backend API endpoint not implemented
❌ Test account not added to internal testers
❌ Using web checkout instead of Google Play Billing

## Support

For issues, check:
1. [BILLING_IMPLEMENTATION_COMPLETE.md](BILLING_IMPLEMENTATION_COMPLETE.md) - Full documentation
2. Gradle compilation logs
3. App runtime logs via `adb logcat`
4. Backend verification logs in Laravel
5. Google Play Console dashboard

