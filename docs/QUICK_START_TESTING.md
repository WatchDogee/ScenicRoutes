# Quick Start: Testing Payments & Sync

## 📍 What You Have Now

✅ Complete payment system  
✅ Cross-device subscription sync  
✅ Login requirement enforced  
✅ Multi-user support (same device)  
✅ Both Android (Google Play) and Web (Stripe) billing

---

## 🚀 Quick 10-Minute Setup

### 1. Create Test Account (1 min)
```
Website: https://scenicroutes.me/signup
├─ Email: scenic-test@gmail.com
├─ Password: SecurePass123
└─ Sign up ✓
```

### 2. Add to Google Play Test Accounts (2 min)
```
Play Console → Your App
├─ Account settings → Licenses and API keys
├─ License Testing
├─ Add testers: scenic-test@gmail.com
└─ Save ✓
```

### 3. Build & Upload APK (3 min)
```powershell
cd ScenicRoutes_dev/android-native
./gradlew bundleRelease

# Upload to Play Console
# Testing → Internal testing → Upload new AAB
```

### 4. Install on Test Device (2 min)
```
Device:
├─ Sign in to Play Store: scenic-test@gmail.com
├─ Go to internal testing link (from Play Console)
└─ Install app ✓
```

### 5. Test Purchase (2 min)
```
App:
├─ Login: scenic-test@gmail.com / SecurePass123
├─ Settings → Payment
├─ Select: Premium Monthly $3.99
├─ Tap: Buy
├─ Google Play dialog (shows "Test purchase")
├─ Tap: BUY
└─ Premium features unlock ✓
```

---

## ✅ Verify It Worked

### Check Backend
```bash
cd ScenicRoutes_dev
tail -f storage/logs/laravel.log | grep "google-play"

# Should show:
# local.INFO: Synced subscription from Google Play
# user_id: (some number)
# product_id: "premium_monthly"
# tier: "premium"
```

### Check Website
```
Website: https://scenicroutes.me/login
├─ Email: scenic-test@gmail.com
├─ Password: SecurePass123
├─ Login ✓
└─ Settings → Subscription shows: "Premium"
```

---

## 📊 What Each Component Does

| Component | Does What | Why It Matters |
|-----------|-----------|---------------|
| PaymentViewModel | Checks login before purchase | Ensures billing tied to user account |
| BillingManager | Sends purchase to backend | Backend records subscription |
| GooglePlayController | Verifies purchase with Google | Confirms purchase is legitimate |
| SubscriptionController | Returns subscription tier | App knows what features to unlock |
| TokenManager | Stores auth token | App remembers logged-in user |

---

## 🔄 How Sync Works

```
User logs in (test@example.com)
        ↓
Auth token created (contains user_id)
        ↓
User buys Premium on Android
        ↓
Backend stores: subscriptions{user_id: 123, plan: "premium"}
        ↓
User logs into website with same email
        ↓
Backend queries: subscriptions WHERE user_id=123
        ↓
Finds Premium subscription
        ↓
Website shows: "Premium - Active" ✓
        ↓
Both Android & Website unlock same features
```

---

## ⚠️ Important Behaviors

### ✅ What WILL Work
- Same user on Android + Website = Same tier
- Logout then login = Subscription preserved
- Multiple users on same device = Separate subscriptions
- Purchase on Android visible on website
- Purchase on website visible on Android

### ❌ What WON'T Work (By Design)
- Buying without login (error shown)
- Transfer subscription between accounts
- Same Google Play account with different app users

---

## 🧪 Test Scenarios (Pick One)

### Scenario 1: Simple Purchase
**Time**: 10 minutes
1. Create account
2. Buy Premium on Android
3. Check website shows Premium
**Validates**: Basic payment flow ✓

### Scenario 2: Logout/Login
**Time**: 5 minutes
1. Buy Premium on Android
2. Logout app
3. Login again
4. Premium still active
**Validates**: Login persistence ✓

### Scenario 3: Multi-User
**Time**: 15 minutes
1. User A buys Premium
2. User B logs in same device
3. User B buys Pro
4. User A logs back in: Still Premium
5. User B logs back in: Still Pro
**Validates**: Account isolation ✓

### Scenario 4: All Tiers
**Time**: 20 minutes
1. Test all 4 subscription types:
   - Premium Monthly ($3.99)
   - Premium Yearly ($29.99)
   - Pro Monthly ($5.99)
   - Pro Yearly ($49.99)
2. Verify each shows correct tier
**Validates**: All price points work ✓

---

## 📋 Debugging Checklist

**Problem**: "Please log in to make a purchase"
- ✓ This is correct - user must login first
- Fix: Login to app before purchasing

**Problem**: Backend log doesn't show purchase
- Check: Device is signed into correct Google Play account
- Check: Test account added to Play Console test accounts
- Check: App is from internal testing track (not production)
- Fix: Check logs with: `grep "google-play" storage/logs/laravel.log`

**Problem**: Website doesn't show subscription
- Check: Logged in with same email on both devices
- Check: Database: `SELECT * FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE email='...');`
- Fix: Refresh website page

**Problem**: Multiple subscriptions per user in database
- This shouldn't happen with current code
- Check: Backend is using `updateOrCreate()` with user_id
- Fix: Delete duplicates: `DELETE FROM subscriptions WHERE user_id = X AND created_at < NOW();`

---

## 🎯 Success Looks Like

```
Terminal 1: Backend logs
❯ tail -f storage/logs/laravel.log | grep "google-play"
[2026-01-29 14:30:15] local.INFO: Synced subscription from Google Play
    user_id: 123
    product_id: "premium_monthly"
    tier: "premium"

Terminal 2: Database query
❯ psql -d scenicroutes_prod
select * from subscriptions where status='active';
 id | user_id | plan    | status | platform   | ends_at
 1  | 123     | premium | active | google_play| 2026-02-28

Browser: Website
Settings → Subscription
"Premium - Renews Feb 28, 2026" ✅

Android: App
Settings → Payment
"Premium Unlocked - Next charge: Feb 28" ✅
Ride Recording: ENABLED ✅
Offline Maps: ENABLED ✅
```

---

## 🚀 Next Steps

1. **Pick a test scenario** (above)
2. **Follow CROSS_DEVICE_SYNC_TESTING.md** for detailed steps
3. **Run through all test scenarios**
4. **Check logs & database** to verify
5. **Report any issues** with exact error messages

---

## 📞 Support Docs

| Situation | Read This |
|-----------|-----------|
| How do I test payments? | CROSS_DEVICE_SYNC_TESTING.md |
| How does sync work? | SYNC_IMPLEMENTATION_SUMMARY.md |
| What was implemented? | GOOGLE_PLAY_IMPLEMENTATION_GUIDE.md |
| How do I build the app? | GOOGLE_PLAY_APK_TESTING_GUIDE.md |
| Full billing guide | GOOGLE_PLAY_BILLING_TESTING.md |

---

**Ready?** Start with the Simple Purchase scenario (Scenario 1) above! 🎉

---

**Status**: 🟢 Ready for Testing  
**Last Updated**: January 29, 2026  
**Implementation**: 100% Complete ✅
