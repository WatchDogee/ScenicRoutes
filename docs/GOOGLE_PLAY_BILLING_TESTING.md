# Google Play Billing Sandbox Testing Guide

## 🧪 Setup Process (Step-by-Step)

### STEP 1: Add Test Accounts in Google Play Console

1. Go to **Google Play Console** → Your app (ScenicRoutes)
2. Click **Account settings** (top right, your name → Account settings)
3. Go to **Licenses and API keys** (left sidebar)
4. Scroll down to **License Testing** section
5. Under **Gmail accounts with access to this license**:
   - Click **Add testers**
   - Enter test account email (e.g., `your-test-account@gmail.com`)
   - Click **Save**

**Important**: 
- Test accounts must be **real Gmail accounts** (can be a separate test Gmail)
- Device signing in with test account must be the **same Google account**
- The test account will NOT be charged for purchases

---

### STEP 2: Configure In-App Products/Subscriptions

#### 2a. Create Subscription Products
1. **Dashboard** → **Monetization** → **Subscriptions** (or **In-app products** depending on version)
2. **Create subscription**:
   - **Product ID**: `premium_monthly`
   - **Type**: Subscription
   - **Title**: "Premium (Monthly)"
   - **Description**: "Access premium features for 1 month"
   - **Billing period**: 1 month
   - **Price**: $3.99 (or your chosen price)
3. Save and activate

Repeat for:
- `premium_yearly` - $29.99/year
- `pro_monthly` - $5.99/month
- `pro_yearly` - $49.99/year

#### 2b. Verify in AndroidManifest.xml
Your app already has Google Play Billing integrated. Verify in `AndroidManifest.xml`:
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

---

### STEP 3: Install Internal Testing Build on Test Device

1. **Find internal test link**:
   - **Dashboard** → **Testing** → **Internal testing**
   - Copy the test link for your testers
   - Open link on test device browser

2. **Device setup**:
   - Device must have Google Play Store app installed
   - Device must be signed in with **test account email** (Settings → Accounts)
   - Open Play Store → Search "ScenicRoutes"
   - Install from internal testing track

3. **Verify app installed**:
   ```bash
   adb shell pm list packages | grep scenicroutes
   # Output: com.scenicroutes.app
   ```

---

### STEP 4: Test Sandbox Purchases

#### 4a. Test Purchase Flow

1. **Open ScenicRoutes app on test device**
2. Navigate to **Settings** → **Subscription** (or paywall screen)
3. Click **Upgrade to Premium** or purchase button
4. Select premium tier (e.g., $3.99/month)
5. **Google Play billing window opens**
   - Shows as "TEST PURCHASE" or "SANDBOX" label
   - Click **Continue**
   - Accept terms → **BUY**

#### 4b. Expected Behavior

**On App**:
- ✓ Purchase completes immediately (no real charge)
- ✓ Premium features unlock
- ✓ Subscription status updates in Settings

**On Backend**:
- ✓ App sends `purchase_token` to backend
- ✓ Backend calls Google Play API to verify
- ✓ Backend marks subscription as `active`
- ✓ Logs show: `Subscription synced from Google Play`

---

### STEP 5: Verify Backend Receives Purchase

#### 5a. Check Server Logs

```bash
# SSH to your backend server
ssh deploy@YOUR_SERVER

# Tail Laravel logs
tail -f storage/logs/laravel.log | grep -i "google-play\|subscription"

# Expected output:
# [timestamp] local.INFO: Synced subscription from Stripe
# [timestamp] local.INFO: getCurrent: Subscription verified and synced
```

#### 5b. Check Database

```bash
# SSH to server, connect to database
psql -U postgres -d scenicroutes_prod

# Check subscriptions for test user
SELECT * FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');

# Should show:
# id | user_id | plan | status | stripe_subscription_id | ends_at
# 1  | 5       | pro  | active | NULL                   | 2026-02-28
```

#### 5c. Check API Response

```powershell
# Get auth token for test account
$token = "your-auth-token"

# Call subscriptions API
$headers = @{ "Authorization" = "Bearer $token" }
$response = Invoke-RestMethod -Uri "https://scenicroutes.me/api/subscriptions/current" -Headers $headers
$response | ConvertTo-Json

# Expected response:
# {
#   "subscription": {
#     "plan": "pro",
#     "status": "active",
#     "ends_at": "2026-02-28T00:00:00Z"
#   },
#   "tier": "pro",
#   "has_active_subscription": true
# }
```

---

### STEP 6: Test Subscription Cancellation

1. **In-app**:
   - Settings → Subscription → Cancel
   - Confirm cancellation
   - Status changes to "Cancelling" (ends at period end) or "Cancelled" (immediate)

2. **Backend**:
   - Logs show: `Subscription cancelled`
   - Database shows `cancel_at_period_end = true` or `status = cancelled`

3. **Verify**:
   - Call `/api/subscriptions/current` → should show `cancel_at_period_end: true`

---

### STEP 7: Test Restore Purchase

If app is reinstalled on device with test account:

1. **Open app on same test device**
2. Sign in with same test account
3. Go to Settings → Subscription
4. App automatically syncs with Google Play
5. Premium status restores without re-purchasing
6. Backend receives same `purchase_token` and verifies it again

---

## 🔍 Troubleshooting Sandbox Billing

### "No payment method available"
- ✓ This is normal in sandbox - test accounts don't need payment methods
- Just click "Continue" without selecting a card

### Purchase button does nothing
- Check: Test account is signed in on device
- Check: Device has Play Store app (not Play Games)
- Check: In-app product exists in console and is activated
- Check: Product ID in app matches console exactly (case-sensitive)

### "This product is not available"
- Verify product ID is correct in console
- Verify product status is **Active**
- Try signing out and back in to Play Store
- Clear Play Store cache: **Settings** → **Apps** → **Play Store** → **Storage** → **Clear cache**

### Backend doesn't receive purchase token
- Check logs: `tail -f storage/logs/laravel.log`
- Verify backend URL is correct (in `GooglePlayController`)
- Verify app has network access (check logcat: `adb logcat | grep -i network`)
- Check `AndroidManifest.xml` has internet permission

### Subscription doesn't sync to backend
- Logs may show: `Failed to sync subscription from Stripe`
- Root cause usually: **Missing GOOGLE_PLAY_BILLING env variables**
- Check backend `.env`:
  ```
  GOOGLE_PLAY_PACKAGE_NAME=com.scenicroutes.app
  GOOGLE_PLAY_KEY_FILE=/path/to/service-account-key.json
  ```
- If missing, download Service Account Key from Google Cloud Console

---

## 📊 Test Scenarios Checklist

- [ ] **First purchase**: Buy premium, verify premium features unlock
- [ ] **Subscription active**: Check `/api/subscriptions/current` shows tier
- [ ] **Upgrade tier**: Buy pro from premium, verify tier changes
- [ ] **Restore purchase**: Reinstall app, sign in, premium auto-restores
- [ ] **Cancel subscription**: Cancel in-app, verify status changes
- [ ] **Reactivate**: Resume cancelled subscription, verify it reactivates
- [ ] **Multiple test accounts**: Ensure each account has separate subscription
- [ ] **Offline purchase**: Purchase without internet, verify sync when online

---

## 🚀 When Tests Pass, Move to Closed Beta

Once sandbox testing succeeds:
1. **Dashboard** → **Testing** → **Closed beta**
2. **Create new release** with same AAB
3. Add 5-10 trusted testers
4. Run 1-2 weeks with real users
5. Collect feedback
6. Fix any issues
7. **Move to production** with staged rollout (5% → 25% → 100%)

---

## 📞 Key Endpoints Your App Uses

During testing, the app calls:

```
POST /api/google-play/verify
  {
    "product_id": "premium_monthly",
    "purchase_token": "eofj2k3j2k3j..."
  }
  Response: { "subscription": {...}, "tier": "premium" }

GET /api/subscriptions/current
  Response: { "subscription": {...}, "tier": "premium" }
```

Backend must handle both Stripe (web) and Google Play (Android) purchases. Verify both work correctly.

---

**Last Updated**: January 28, 2026
