# Quick Testing Guide - Auth & Subscription Features

## Feature 1: Auto-Login with Remember Me

### Test Case 1.1: Remember Me Checkbox Works
**Steps:**
1. Tap Profile tab
2. See login screen
3. ✅ Verify "Remember Me" checkbox exists and is checked by default
4. Enter test credentials
5. Tap "Login"
6. ✅ Verify you're logged in and see profile

### Test Case 1.2: Auto-Login on App Reopen
**Steps:**
1. From Test 1.1, you're logged in with Remember Me checked
2. Close the app completely
3. Reopen the app
4. ✅ Should go DIRECTLY to Profile screen (no login screen flash)
5. ✅ Profile data should load
6. Verify you can navigate normally

### Test Case 1.3: Logout Clears Remember Me
**Steps:**
1. You're logged in with Remember Me
2. Scroll down in Profile and tap "Logout"
3. Close app
4. Reopen app
5. ✅ Should see login screen (remember me was cleared)

### Test Case 1.4: Register with Remember Me
**Steps:**
1. In login screen, tap "Don't have an account? Register"
2. Create new account
3. ✅ Verify "Remember Me" is available (for login mode only)
4. Register
5. Close and reopen app
6. ✅ Should auto-login without login screen

---

## Feature 2: Cancel Subscription

### Test Case 2.1: Upgrade to Premium
**Steps:**
1. Login (if not already)
2. Go to Profile → Subscription
3. On "Upgrade to Premium" card, tap "Upgrade Now"
4. Complete payment (use Stripe test card 4242 4242 4242 4242)
5. You should see "Subscription started" date
6. ✅ Current Plan shows "Premium"

### Test Case 2.2: Cancel Subscription
**Steps:**
1. From Test 2.1, still on Subscription screen
2. Scroll down to "Premium" plan card
3. ✅ Verify you see "Cancel Subscription" button
4. Tap "Cancel Subscription"
5. ✅ Verify message: "Subscription will be cancelled at period end"
6. ✅ Verify "Resume Subscription" button appears instead of Cancel

### Test Case 2.3: Resume Cancelled Subscription
**Steps:**
1. From Test 2.2, subscription is marked for cancellation
2. Tap "Resume Subscription"
3. ✅ Verify button changes back to "Cancel Subscription"
4. ✅ Verify message disappears
5. Go back and return to Subscription screen
6. ✅ Subscription should still be active

---

## Feature 3: Subscription Start/End Dates

### Test Case 3.1: Display Start Date
**Steps:**
1. Upgrade to Premium (from Test 2.1)
2. On Subscription screen, look under "Current Plan" card
3. ✅ Should see: "Subscription started: [Month Day, Year]"
4. Date should be today or recent date

### Test Case 3.2: Display End Date (with days remaining)
**Steps:**
1. Still on Subscription screen with active premium
2. Look below "Subscription started" line
3. ✅ Should see: "Subscription expires: [Month Day, Year] (XX days remaining)"
4. Days remaining should be ~30 days (for monthly) or ~365 (for yearly)

### Test Case 3.3: Color Coding for Expiring Subscription
**Steps:**
1. Create test subscription that expires very soon (admin/DB only, or wait)
2. View Subscription screen
3. When ≤ 1 day remaining:
   - ✅ "Subscription expires: [Date] (Today)" should be RED
4. When expired:
   - ✅ "Subscription expired: [Date]" should be RED
5. When > 1 day:
   - ✅ Text should be normal (gray/dark) color

### Test Case 3.4: Cancelled Subscription with Remaining Days
**Steps:**
1. Upgrade to Premium (monthly)
2. Cancel subscription (from Test 2.2)
3. On Subscription screen:
   - ✅ Should see "Subscription started: [Date]"
   - ✅ Should see "Subscription expires: [Date] (XX days remaining)"
   - ✅ Both dates should display correctly
4. You can still use premium features until expiration

---

## Feature 4: Payment Method Updates (Existing Feature)

### Test Case 4.1: Update Payment Method
**Steps:**
1. Go to Profile → Subscription
2. Scroll to Premium plan section
3. ✅ Verify "Update Payment Method" button exists
4. Tap it
5. ✅ Browser opens for Stripe payment update
6. Update card details (if needed)
7. Return to app

---

## Quick Debug Checklist

- [ ] Check error log: `adb logcat | grep "Subscription\|Auth\|Login"`
- [ ] Verify TokenManager preferences saved: `adb shell "sqlite3 /data/data/com.scenicroutes.app/databases/auth_prefs.db '.dump'"`
- [ ] Check subscription API response: Enable verbose logging in SubscriptionViewModel
- [ ] Verify date parsing: Check for "Failed to parse date" logs
- [ ] Test with real Stripe test cards:
  - Success: 4242 4242 4242 4242
  - Decline: 4000 0000 0000 0002
  - 3D Secure: 4000 0025 0000 3155

---

## Expected Results Summary

| Feature | Expected Behavior |
|---------|-------------------|
| Remember Me | ✅ Checkbox saves preference, auto-login on reopen |
| Cancel Sub | ✅ Button cancels at period end, shows "Resume" |
| Start Date | ✅ Displays formatted date subscription began |
| End Date | ✅ Displays expiration date with days remaining |
| Color Coding | ✅ Red text when expiring/expired, normal when active |

---

## Installation

```powershell
# Install the APK
adb install -r "C:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev\android-native\app\build\outputs\apk\debug\app-debug.apk"

# Clear app data (fresh start for testing)
adb shell pm clear com.scenicroutes.app

# View logs
adb logcat -s "Subscription\|Auth\|Profile"
```

---

## Common Issues & Fixes

**Issue: Login screen shows even with Remember Me checked**
- Solution: Clear app data and re-login with Remember Me checked
- Log: Check for "Token not found" in logcat

**Issue: Dates showing as raw ISO format**
- Solution: This is fallback behavior if parsing fails
- Log: Check for date parsing errors in SubscriptionScreen

**Issue: Days remaining shows wrong number**
- Solution: Device timezone might differ from server timezone (UTC)
- Log: Check ChronoUnit.DAYS.between calculations

**Issue: Cancel button doesn't appear**
- Solution: Only shows for paid plans, not free tier
- Check: `currentSubscription?.plan` should be "premium" or "pro"

