# Google Play Billing & Stripe Sync - Deployment Guide

## Overview
Complete implementation of Google Play Billing Library v6+ with Stripe webhook synchronization. Unified entitlements system handles billing from multiple sources (Play Store, Stripe, manual). 

---

## 1. Backend Setup (Laravel)

### 1.1 Environment Variables

Add to `.env`:

```bash
# Google Play Billing
PLAY_PACKAGE_NAME=com.scenicroutes.app
PLAY_SERVICE_ACCOUNT_JSON_PATH=/path/to/service-account.json

# Stripe Webhooks
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price Mapping (from Stripe Dashboard)
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_xxxxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxxxx

# Optional: Enable grace period for failed payments (days)
BILLING_GRACE_PERIOD_DAYS=7
```

### 1.2 Google Play Service Account Setup

1. **Download Service Account JSON**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select your project
   - Navigate to APIs & Services → Service Accounts
   - Create or select service account
   - Download JSON key file

2. **Grant Play API Access**:
   - Go to [Google Play Console](https://play.google.com/console)
   - Settings → API Access
   - Link service account
   - Grant "Edit and delete draft apps" permission

3. **Store JSON File**:
   ```bash
   # Place in secure location (not in git)
   cp /Downloads/service-account.json /var/scenic-routes/service-account.json
   chmod 600 /var/scenic-routes/service-account.json
   ```

4. **Update .env**:
   ```bash
   PLAY_SERVICE_ACCOUNT_JSON_PATH=/var/scenic-routes/service-account.json
   ```

### 1.3 Run Database Migration

```bash
php artisan migrate
```

This creates the `entitlements` table with:
- `id`: Auto-increment primary key
- `user_id`: Foreign key to users table
- `entitlement_key`: Unique identifier (premium, pro, etc.)
- `status`: active/inactive/grace/cancelled
- `source`: play/stripe/manual
- `product_id`: SKU or Stripe price ID
- `purchase_token`: Play Store token (for revalidation)
- `stripe_subscription_id`: Stripe subscription ID
- `stripe_price_id`: Stripe price ID
- `expires_at`: Expiration timestamp
- `last_validated_at`: Last verification timestamp
- `metadata`: JSON payload for extra data
- `device_id`: Optional, for tighter device binding

### 1.4 Stripe Configuration

#### Create Prices in Stripe Dashboard

1. Go to Product Catalog → Prices
2. Create subscription prices:
   - Premium Monthly: `price_premium_monthly`
   - Premium Annual: `price_premium_annual`
   - Pro Monthly: `price_pro_monthly`
   - Pro Annual: `price_pro_annual`

3. Note the price IDs and add to `.env`

#### Set Up Webhook Endpoint

1. Go to Webhooks → Add endpoint
2. URL: `https://yourdomain.com/webhooks/stripe`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Copy Signing Secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### 1.5 Verify API Routes

Check that routes are registered:

```bash
php artisan route:list | grep billing
```

Expected routes:
- `POST /api/billing/play/verify` (auth required)
- `GET /api/billing/entitlements` (auth required)
- `GET /api/billing/entitlements/{key}` (auth required)
- `POST /api/billing/restore` (auth required)
- `POST /webhooks/stripe` (public)

---

## 2. Android App Setup

### 2.1 Add Google Play Billing Dependency

Edit `app/build.gradle.kts` or `app/build.gradle`:

```gradle
dependencies {
    // Google Play Billing Library v6.0+
    implementation 'com.android.billingclient:billing:6.0.1'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // Retrofit & serialization (if not already present)
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0'
}
```

### 2.2 Add Play Billing Permissions

In `AndroidManifest.xml`:

```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

### 2.3 Initialize Billing Client

In your Activity or Application:

```kotlin
import com.scenicroutes.app.data.service.PlayBillingClientService
import android.app.Activity

class MainActivity : AppCompatActivity() {
    private lateinit var billingService: PlayBillingClientService
    private lateinit var paymentViewModel: PaymentViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize billing service
        val apiService = // Your API service instance
        billingService = PlayBillingClientService(this, apiService)
        
        // Initialize ViewModel
        paymentViewModel = PaymentViewModel(this, billingService, apiService.billingApi)
    }

    override fun onDestroy() {
        super.onDestroy()
        billingService.disconnect()
    }
}
```

### 2.4 Check Entitlements on App Start

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Check entitlements
    paymentViewModel.hasEntitlement("premium") { hasPremium ->
        if (hasPremium) {
            // Show premium features
        } else {
            // Show paywall
        }
    }
}
```

---

## 3. Testing

### 3.1 Testing with Play Billing Test Accounts

1. In Google Play Console → Settings → Internal testers
2. Add test email accounts
3. Install app on test device with account logged in
4. Products will show as free for testing

### 3.2 Testing Stripe Webhooks (Local Development)

Use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your account
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:8000/webhooks/stripe

# Copy the signing secret
stripe listen --print-secret
# Add to .env as STRIPE_WEBHOOK_SECRET
```

Then trigger test events:

```bash
# Test checkout session
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created
```

### 3.3 Backend Tests

Create tests for verification endpoints:

```bash
# Test Play verification
php artisan test tests/Feature/PlayBillingVerifyTest.php

# Test Stripe webhooks
php artisan test tests/Feature/StripeWebhookTest.php

# Test entitlements
php artisan test tests/Feature/EntitlementTest.php
```

Example test:

```php
// tests/Feature/PlayBillingVerifyTest.php
public function test_verify_play_purchase()
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)->postJson('/api/billing/play/verify', [
        'product_id' => 'scenic_routes_premium_monthly',
        'purchase_token' => 'test_token_xxx',
        'device_id' => 'device_id_xxx'
    ]);
    
    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'active');
        
    $this->assertDatabaseHas('entitlements', [
        'user_id' => $user->id,
        'product_id' => 'scenic_routes_premium_monthly',
        'source' => 'play'
    ]);
}
```

### 3.4 Android Tests

Test the BillingClientManager:

```kotlin
// tests/PlayBillingClientServiceTest.kt
class PlayBillingClientServiceTest {
    @Test
    fun testVerifyAndAcknowledgePurchase() {
        // Mock BillingClient
        val mockBillingClient = mockk<BillingClient>()
        val service = PlayBillingClientService(context, mockApiService)
        
        // Simulate purchase
        val purchase = mockk<Purchase>()
        every { purchase.products } returns listOf("scenic_routes_premium_monthly")
        every { purchase.purchaseToken } returns "test_token"
        
        service.verifyAndAcknowledgePurchase(purchase)
        
        // Verify API was called
        coVerify { mockApiService.playBillingVerify(any()) }
    }
}
```

---

## 4. Configuration Reference

### 4.1 Entitlement Keys

Map these keys across Play Store, Stripe, and your app:

| Key | Description | Play SKU | Stripe Price |
|-----|-------------|----------|--------------|
| `premium` | Premium user | `scenic_routes_premium_monthly` | `price_premium_monthly` |
| `premium_annual` | Premium annual | `scenic_routes_premium_annual` | `price_premium_annual` |
| `pro` | Pro user | `scenic_routes_pro_monthly` | `price_pro_monthly` |
| `pro_annual` | Pro annual | `scenic_routes_pro_annual` | `price_pro_annual` |

### 4.2 Status Codes

| Status | Meaning |
|--------|---------|
| `active` | User has access; entitlement is valid |
| `inactive` | User does not have access; entitlement expired or cancelled |
| `grace` | Payment failed; grace period active (user still has access) |
| `cancelled` | User or admin cancelled; no access |

### 4.3 Sources

| Source | Description | Validation |
|--------|-------------|-----------|
| `play` | Google Play Store | Play API token verification |
| `stripe` | Stripe subscription | Webhook-based; no token check |
| `manual` | Admin-granted (testing) | None; manual only |

---

## 5. Deployment Checklist

- [ ] **Secrets**:
  - [ ] Service account JSON downloaded and stored securely
  - [ ] `PLAY_SERVICE_ACCOUNT_JSON_PATH` set in production `.env`
  - [ ] `STRIPE_WEBHOOK_SECRET` set from Stripe Dashboard
  - [ ] All `STRIPE_*_PRICE_ID` constants added

- [ ] **Database**:
  - [ ] Migration run: `php artisan migrate`
  - [ ] Entitlements table created with correct schema
  - [ ] Indices on `user_id`, `status`, `source`, `expires_at` verified

- [ ] **Backend**:
  - [ ] Routes registered: `php artisan route:list`
  - [ ] PlayBillingService tested with real Play API
  - [ ] StripeWebhookController signature verification tested
  - [ ] EntitlementService merge logic tested

- [ ] **Android**:
  - [ ] Play Billing Library dependency added
  - [ ] BILLING permission in manifest
  - [ ] BillingClientManager initialized on app start
  - [ ] PaymentViewModel wired to paywall UI
  - [ ] Purchase flow tested with internal test account

- [ ] **Testing**:
  - [ ] Play Store internal testing configured
  - [ ] Stripe test mode webhook endpoint live
  - [ ] Feature tests passing locally
  - [ ] End-to-end purchase flow tested

- [ ] **Monitoring**:
  - [ ] Logging in place for API calls
  - [ ] Webhook delivery tracked
  - [ ] Entitlement validation errors logged
  - [ ] Alert on bulk token validation failures

---

## 6. Ongoing Maintenance

### 6.1 Periodic Revalidation

Laravel scheduler runs daily revalidation of Play tokens:

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->command('billing:revalidate-entitlements')
        ->daily()
        ->at('02:00'); // Run at 2 AM UTC
}
```

Run locally:
```bash
php artisan billing:revalidate-entitlements
```

### 6.2 Monitoring Endpoints

Add to monitoring/alerting:

```
GET /api/billing/entitlements  (user: authenticated)
    - Should return < 100ms
    - Should return 200 with entitlements array
    
POST /webhooks/stripe  (public)
    - Should return 200 for valid signature
    - Should return 403 for invalid signature
```

### 6.3 Grace Period Management

Grace period allows continued access after payment failure:

```php
// Payment failed → marked as "grace" with expires_at in 7 days
// Cron job at day 6 → sends reminder
// At day 7 → marked "inactive" if payment still failed
```

Configure in `.env`:
```bash
BILLING_GRACE_PERIOD_DAYS=7
```

---

## 7. Troubleshooting

### Issue: "Service account credentials not found"
**Solution**: Verify `PLAY_SERVICE_ACCOUNT_JSON_PATH` points to correct file with 600 permissions

### Issue: Stripe webhook not delivering
**Solution**: Check signing secret in Dashboard matches `.env`; verify endpoint URL is public (not localhost)

### Issue: Purchase token validation fails
**Solution**: Ensure Play API has access to subscriptions; check service account has correct IAM role

### Issue: User has both Play and Stripe entitlements
**Solution**: This is expected! `EntitlementService::getStrongestEntitlement()` picks longest-lasting one

### Issue: Entitlement status not updating after purchase
**Solution**: Call `/api/billing/entitlements` to refresh; if still not updated, check webhook logs

---

## 8. Production Deployment

### 8.1 Pre-Deployment

```bash
# Run all tests
php artisan test
./gradlew testDebug  # Android

# Check credentials file permissions
ls -la /var/scenic-routes/service-account.json  # Should be 600

# Verify routes
php artisan route:list | grep billing
```

### 8.2 Deploy Backend

```bash
# Standard Laravel deployment
git push heroku main
heroku run "php artisan migrate"
```

Or with manual deployment:
```bash
# SSH to server
cd /var/scenic-routes
git pull origin main
php artisan migrate --force
php artisan cache:clear
```

### 8.3 Deploy Android

1. Build signed APK:
   ```bash
   ./gradlew assembleRelease --release-notes="Billing integration"
   ```

2. Upload to Play Console → Internal testing → Staged rollout (5% initially)

3. Monitor crash reports and payment flow

4. Gradually increase rollout as issues are resolved

---

## 9. Support & Documentation

- [Google Play Billing Docs](https://developer.android.com/google/play/billing/integrate)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Laravel Webhooks](https://laravel.com/docs/11.x/cashier#handling-stripe-webhooks)
- [Android Kotlin Serialization](https://github.com/Kotlin/kotlinx.serialization)

