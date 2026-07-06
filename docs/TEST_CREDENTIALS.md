# Test Account Credentials - Quick Reference

## Test Accounts

### Free Tier Account
```
Email: test_free@example.com
Password: Password123!
Tier: Free
Limits: 10 routes/month, 5 saved roads, 2 collections
```

### Premium Tier Account
```
Email: test_premium@example.com
Password: Password123!
Tier: Premium (Active)
Subscription ID: test_premium_sub
Limits: Unlimited
```

### Professional Tier Account
```
Email: test_pro@example.com
Password: Password123!
Tier: Professional
Subscription ID: test_pro_sub
Limits: Unlimited + Advanced Features
```

**Important:** Run this command to create the test accounts:
```bash
php artisan db:seed --class=TestSubscriptionUsersSeeder
```

---

## Stripe Test Cards

### Successful Payment
```
Card Number: 4242 4242 4242 4242
Expiry: 12/25 (any future date)
CVC: 123 (any 3 digits)
ZIP: 12345 (any)
```

### Declined Payment
```
Card Number: 4000 0000 0000 0002
```

### Insufficient Funds
```
Card Number: 4000 0000 0000 9995
```

### 3D Secure Authentication
```
Card Number: 4000 0027 6000 3184
```

---

## Quick Test Sequence

1. **Free Tier Limits**
   - Login as test_free@example.com / Password123!
   - Calculate 10 routes
   - Try 11th route → Should show upgrade prompt

2. **Upgrade Flow**
   - Click "Upgrade to Premium"
   - Use test card: 4242 4242 4242 4242
   - Verify subscription activated immediately

3. **Premium Features**
   - Login as test_premium@example.com / Password123!
   - Access offline maps
   - Export GPX
   - Use advanced route options

4. **Backend Connection**
   - Ensure Laravel running: `php artisan serve`
   - If not running, app shows clear error message

---

## Critical API Endpoints to Test

```bash
GET /api/subscriptions/current
GET /api/subscriptions/usage
POST /api/subscriptions/checkout
POST /api/subscriptions/cancel
```

---

## Quick Laravel Setup

```bash
cd ScenicRoutes_dev

# Start backend
php artisan serve

# Create test accounts (if needed)
php artisan db:seed --class=TestSubscriptionSeeder

# Watch logs
tail -f storage/logs/laravel.log
```

---

## Quick Android Build

```bash
cd android-native

# Build debug
./gradlew assembleDebug

# Install on device
./gradlew installDebug

# Watch logcat for errors
adb logcat | grep -E "(TripsViewModel|SubscriptionManager|ScenicRoutes)"
```

---

## Common Issues & Fixes

### Issue: My Roads shows empty
**Fix:** Check if Laravel backend is running on port 8000

### Issue: Can't upgrade subscription
**Fix:** Verify Stripe API keys are set in Laravel .env file

### Issue: App crashes on My Roads click
**Fix:** Navigation route fixed - now uses "trips" instead of "my_roads"

---

**Note:** These are TEST credentials only. Do NOT use in production!

