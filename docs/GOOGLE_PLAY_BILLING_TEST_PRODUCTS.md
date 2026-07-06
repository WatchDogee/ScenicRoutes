# Google Play Billing - Test Products Configuration

## What Changed
Updated BillingManager to use Google Play's **test product IDs** for immediate testing:
- `PRODUCT_PREMIUM = "android.test.purchased"` (TEST)
- `PRODUCT_PRO = "android.test.purchased"` (TEST)

## Why
The previous product IDs (`premium_monthly`, `pro_monthly`) don't exist in your Google Play Console, so BillingManager found **0 products** and purchase always failed with "Product not found".

## Test Product Behavior
Google Play provides built-in test product IDs:
- `android.test.purchased` → Always succeeds purchase (for testing)
- `android.test.canceled` → Always cancels purchase
- `android.test.refunded` → Simulates refunded purchase
- `android.test.item_unavailable` → Product not available

## New APK Status
✅ **Rebuilt and installed** with test product IDs
- Can now query products from Google Play Billing
- Purchase flow should work end-to-end

## Testing Steps

### 1. Open Subscription Screen
- App opens → Navigate to **Subscription** tab
- Should load all 3 plans (Free, Premium, Pro)

### 2. Click "Upgrade Monthly" on Premium
- Opens **PaymentScreen** 
- Shows pricing: $3.99/month for Premium
- Displays features list
- "Complete Purchase" button ready

### 3. Click "Complete Purchase"
- **Logs should show**: `✓ Found X subscription products:` (not 0!)
- Google Play Billing dialog appears (~1 second)
- Test purchase completes
- Backend receives purchase token for verification

### 4. Verify in Logs
Watch `adb logcat` for:
```
BillingManager: === querySubscriptionProducts() called ===
BillingManager: ✓ Found 2 subscription products:
BillingManager: ✓ Billing client connected successfully
PaymentScreen: Waited X attempts, isReady=true
PaymentScreen: Product found: android.test.purchased
PaymentScreen: ✓ Purchase successful
```

If you see `✓ Found 0 subscription products:` → Products not recognized by Google Play

## For Production
When ready for Google Play Console:

1. **Create real products** in Google Play Console:
   - Product ID: `premium_monthly` (subscription)
   - Base plans: `1` (monthly), `yearly` (yearly)
   
   - Product ID: `pro_monthly` (subscription)
   - Base plans: `monthly`, `yearly`

2. **Update BillingManager.kt**:
   ```kotlin
   const val PRODUCT_PREMIUM = "premium_monthly"  // FROM GOOGLE PLAY
   const val PRODUCT_PRO = "pro_monthly"          // FROM GOOGLE PLAY
   const val PREMIUM_BASE_PLAN_MONTHLY = "1"      // Base plan from console
   const val PREMIUM_BASE_PLAN_YEARLY = "yearly"
   const val PRO_BASE_PLAN_MONTHLY = "monthly"
   const val PRO_BASE_PLAN_YEARLY = "yearly"
   ```

3. **Rebuild and test** on real device with real Google Play account

## Command to Install Updated APK
```powershell
# Navigate to android-native folder
cd "c:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev\android-native"

# Uninstall old version
& "C:\Users\mairi\AppData\Local\Android\Sdk\platform-tools\adb.exe" uninstall com.scenicroutes.app.debug

# Install new version
& "C:\Users\mairi\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r "app\build\outputs\apk\debug\app-debug.apk"

# View logs
& "C:\Users\mairi\AppData\Local\Android\Sdk\platform-tools\adb.exe" logcat | Select-String "BillingManager|PaymentScreen|Product"
```

## Expected Log Output Now
```
BillingManager: === initialize() called ===
BillingManager: Creating new BillingClient...
BillingManager: === startConnection() called ===
BillingManager: ✓ Billing client connected successfully
BillingManager: === querySubscriptionProducts() called ===
BillingManager: ✓ Found 2 subscription products:   ← Should be 2, NOT 0!
```

## If Still Seeing "Found 0 products"
1. Verify emulator is running: `adb devices`
2. Check Google Play Services are installed on emulator
3. Google Play Account is logged in on emulator
4. No network issues accessing Google Play

Next step after testing: Navigate to subscription and try purchasing!
