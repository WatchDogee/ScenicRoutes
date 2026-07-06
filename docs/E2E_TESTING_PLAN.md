# End-to-End Testing Plan for ScenicRoutes

**Last Updated:** 2025-01-XX  
**Status:** Ready for Implementation

---

## 📋 OVERVIEW

This document provides a comprehensive end-to-end testing plan for both the website and Android app, covering all critical user flows, subscription testing, and edge cases.

---

## 🎯 TESTING SCOPE

### **Platforms to Test:**
- ✅ Website (React + Laravel)
- ✅ Android App (Kotlin/Compose)
- ✅ API Endpoints (Laravel)

### **Test Environments:**
- **Development:** Local testing
- **Staging:** Pre-production testing
- **Production:** Final verification (limited)

---

## 🔐 AUTHENTICATION & USER MANAGEMENT

### **Test Suite 1: User Registration & Login**

#### **Website Tests:**
- [ ] **Register New User**
  - Navigate to registration form
  - Fill in name, email, password
  - Submit form
  - Verify email verification sent
  - Check user created in database
  - Verify redirect to login

- [ ] **Login with Email**
  - Enter valid credentials
  - Submit form
  - Verify token stored in localStorage
  - Verify user redirected to map
  - Verify user menu shows profile

- [ ] **Login with Username**
  - Enter username (not email)
  - Enter password
  - Verify login succeeds

- [ ] **Invalid Credentials**
  - Enter wrong password
  - Verify error message shown
  - Verify no token stored

- [ ] **Email Verification Required**
  - Register new user
  - Try to login before verification
  - Verify error message
  - Verify email sent

- [ ] **Password Reset**
  - Click "Forgot Password"
  - Enter email
  - Verify reset email sent
  - Click reset link
  - Enter new password
  - Verify password changed
  - Login with new password

#### **Android Tests:**
- [ ] **Register New User**
  - Open app
  - Navigate to registration
  - Fill form
  - Submit
  - Verify email verification prompt

- [ ] **Login**
  - Enter credentials
  - Submit
  - Verify token stored in DataStore
  - Verify navigation to map screen

- [ ] **Auto-login**
  - Login once
  - Close app
  - Reopen app
  - Verify auto-login works

- [ ] **Logout**
  - Open profile
  - Click logout
  - Verify token cleared
  - Verify redirect to login

---

## 💳 SUBSCRIPTION & PAYMENT TESTING

### **Test Suite 2: Subscription Flow**

#### **Website Tests:**
- [ ] **View Subscription Plans**
  - Navigate to `/subscription`
  - Verify all plans displayed
  - Verify pricing correct
  - Verify features listed

- [ ] **Create Checkout Session (Premium Monthly)**
  - Click "Subscribe" on Premium Monthly
  - Verify redirect to Stripe Checkout
  - Use test card: `4242 4242 4242 4242`
  - Complete payment
  - Verify redirect back to app
  - Verify subscription active in database
  - Verify user tier updated to "premium"

- [ ] **Create Checkout Session (Premium Yearly)**
  - Same as above, select yearly
  - Verify correct price charged

- [ ] **Create Checkout Session (Pro)**
  - Subscribe to Pro plan
  - Verify all Pro features unlocked

- [ ] **Payment Failure**
  - Use test card: `4000 0000 0000 0002` (declined)
  - Verify error message shown
  - Verify subscription not created

- [ ] **Webhook Handling**
  - Complete checkout
  - Verify webhook received
  - Verify subscription synced in database
  - Check subscription status, dates, price_id

- [ ] **Subscription Upgrade**
  - User with Premium subscription
  - Navigate to subscription page
  - Click "Upgrade to Pro"
  - Complete payment
  - Verify subscription upgraded
  - Verify Pro features unlocked

- [ ] **Subscription Cancellation**
  - User with active subscription
  - Click "Cancel Subscription"
  - Verify cancellation at period end
  - Verify subscription continues until period end
  - Verify status updated to "cancelled"

- [ ] **Subscription Resume**
  - User with cancelled subscription (not expired)
  - Click "Resume Subscription"
  - Verify subscription reactivated
  - Verify status updated to "active"

#### **Android Tests:**
- [ ] **View Subscription Plans**
  - Navigate to subscription screen
  - Verify plans displayed
  - Verify pricing correct

- [ ] **Create Checkout (In-App Browser)**
  - Click subscribe button
  - Verify Stripe Checkout opens in browser
  - Complete payment
  - Verify redirect back to app
  - Verify subscription active

- [ ] **Subscription Status Display**
  - User with active subscription
  - Open profile
  - Verify subscription status shown
  - Verify tier displayed correctly

- [ ] **Feature Gating**
  - Free user tries premium feature
  - Verify upgrade prompt shown
  - Premium user tries premium feature
  - Verify feature works

---

## 🗺️ ROUTE PLANNING TESTING

### **Test Suite 3: Route Calculation**

#### **Website Tests:**
- [ ] **Basic Route Calculation**
  - Enter start location (e.g., "Riga, Latvia")
  - Enter end location (e.g., "Tallinn, Estonia")
  - Click "Calculate Route"
  - Verify route displayed on map
  - Verify route info card shows distance/time
  - Verify polyline drawn correctly

- [ ] **Route with Waypoints**
  - Add start and end
  - Add waypoint in between
  - Calculate route
  - Verify route passes through waypoint

- [ ] **Curvature Levels**
  - Calculate route with "Straightest"
  - Verify route is direct
  - Calculate same route with "Extra Curvy"
  - Verify route is more curved
  - Compare distances

- [ ] **Avoid Options**
  - Calculate route with "Avoid Highways"
  - Verify route avoids highways
  - Test with "Avoid Tolls"
  - Test with "Avoid Unpaved"

- [ ] **Round Trip**
  - Enter start location
  - Select "Round Trip"
  - Enter distance (e.g., 200km)
  - Calculate
  - Verify route returns to start
  - Verify distance approximately matches

- [ ] **Route Alternatives (Premium)**
  - Premium user
  - Enable "Alternative Routes"
  - Calculate route
  - Verify multiple routes shown
  - Verify route comparison works

- [ ] **Section-Specific Curvature (Premium)**
  - Premium user
  - Add multiple waypoints
  - Set different curvature per segment
  - Calculate route
  - Verify each segment uses correct curvature

- [ ] **Route Export (GPX)**
  - Calculate route
  - Click "Export GPX"
  - Verify GPX file downloaded
  - Verify file contains route data

- [ ] **Route Import (GPX)**
  - Click "Import GPX"
  - Upload GPX file
  - Verify route loaded on map
  - Verify route data correct

#### **Android Tests:**
- [ ] **Basic Route Calculation**
  - Open map screen
  - Enter start/end locations
  - Calculate route
  - Verify route displayed
  - Verify route info card shown

- [ ] **Route with Waypoints**
  - Add waypoints
  - Calculate route
  - Verify route passes waypoints

- [ ] **Curvature Selection**
  - Select different curvature levels
  - Calculate routes
  - Verify routes differ

- [ ] **Route Save**
  - Calculate route
  - Click "Save Route"
  - Enter name
  - Save
  - Verify route saved
  - Verify appears in saved roads

- [ ] **Route Navigation**
  - Calculate route
  - Click "Navigate"
  - Verify navigation screen opens
  - Verify turn-by-turn instructions

---

## 📍 POI & ROAD SEARCH TESTING

### **Test Suite 4: Points of Interest**

#### **Website Tests:**
- [ ] **POI Search**
  - Click "Search POIs"
  - Select location on map
  - Select POI type (Tourism, Fuel, Charging)
  - Search
  - Verify POIs displayed on map
  - Verify POI markers correct

- [ ] **POI Details**
  - Click on POI marker
  - Verify details shown
  - Verify name, type, location

- [ ] **POI Along Route**
  - Calculate route
  - Click "POIs Along Route"
  - Verify POIs shown along route path
  - Verify distance from route shown

- [ ] **Add POI to Route**
  - Find POI
  - Click "Add to Route"
  - Verify POI added as waypoint
  - Recalculate route
  - Verify route passes through POI

#### **Android Tests:**
- [ ] **POI Search**
  - Open POI search
  - Search for POIs
  - Verify results displayed
  - Verify markers on map

- [ ] **POI Details**
  - Tap POI marker
  - Verify details dialog
  - Verify information correct

---

## 💾 SAVED ROADS & COLLECTIONS

### **Test Suite 5: Saved Content**

#### **Website Tests:**
- [ ] **Save Route**
  - Calculate route
  - Click "Save Route"
  - Enter name and description
  - Set public/private
  - Save
  - Verify route saved
  - Verify appears in "My Roads"

- [ ] **Edit Saved Road**
  - Open saved road
  - Click "Edit"
  - Change name/description
  - Save
  - Verify changes saved

- [ ] **Delete Saved Road**
  - Open saved road
  - Click "Delete"
  - Confirm
  - Verify road deleted

- [ ] **Public/Private Toggle**
  - Save road as private
  - Verify not visible to others
  - Toggle to public
  - Verify visible to others

- [ ] **Road Reviews**
  - View public road
  - Add review with rating
  - Verify review saved
  - Verify rating updated

- [ ] **Create Collection**
  - Navigate to Collections
  - Click "Create Collection"
  - Enter name/description
  - Add roads
  - Save
  - Verify collection created

- [ ] **Add Roads to Collection**
  - Open collection
  - Click "Add Roads"
  - Select roads
  - Add
  - Verify roads added

#### **Android Tests:**
- [ ] **View Saved Roads**
  - Navigate to "Saved" tab
  - Verify saved roads listed
  - Verify road cards show info

- [ ] **Edit Saved Road**
  - Open saved road
  - Edit details
  - Save
  - Verify changes saved

- [ ] **Delete Saved Road**
  - Delete road
  - Verify removed from list

---

## 🌐 SOCIAL FEATURES

### **Test Suite 6: Community Features**

#### **Website Tests:**
- [ ] **Follow User**
  - View user profile
  - Click "Follow"
  - Verify follow status updated
  - Verify appears in following list

- [ ] **Social Feed**
  - Navigate to feed
  - Verify activities shown
  - Verify infinite scroll works
  - Verify pull-to-refresh works

- [ ] **Leaderboard**
  - Navigate to leaderboard
  - Verify top roads shown
  - Verify top collections shown
  - Verify user rankings shown

- [ ] **Road Comments**
  - View road
  - Add comment
  - Verify comment saved
  - Verify comment displayed

#### **Android Tests:**
- [ ] **Social Feed**
  - Navigate to Explore → Social
  - Verify feed loads
  - Verify scroll works

- [ ] **Follow User**
  - View user profile
  - Follow user
  - Verify follow status updated

---

## 📱 ANDROID-SPECIFIC FEATURES

### **Test Suite 7: Mobile Features**

- [ ] **Turn-by-Turn Navigation**
  - Calculate route
  - Start navigation
  - Verify voice instructions
  - Verify distance to turn shown
  - Verify route recalculation on deviation

- [ ] **Offline Maps**
  - Navigate to offline maps
  - Select region
  - Download
  - Verify download progress
  - Verify region downloaded
  - Disable internet
  - Verify maps work offline

- [ ] **Ride Recording**
  - Start ride recording
  - Move location (simulate)
  - Verify GPS tracking
  - Stop recording
  - Save ride
  - Verify ride saved
  - Verify appears in saved roads

- [ ] **Push Notifications**
  - Calculate route
  - Verify notification when complete
  - Start ride recording
  - Verify notifications for start/stop

---

## 🔒 SECURITY & EDGE CASES

### **Test Suite 8: Security Testing**

- [ ] **Unauthorized Access**
  - Try to access protected endpoint without auth
  - Verify 401 returned

- [ ] **Subscription Bypass**
  - Free user tries premium feature via API
  - Verify 403 returned
  - Verify error message

- [ ] **Input Validation**
  - Submit invalid coordinates
  - Submit SQL injection attempt
  - Submit XSS attempt
  - Verify all rejected

- [ ] **Rate Limiting**
  - Make many rapid API calls
  - Verify rate limit enforced

- [ ] **CSRF Protection**
  - Try to submit form without CSRF token
  - Verify rejected

---

## 📊 PERFORMANCE TESTING

### **Test Suite 9: Performance**

- [ ] **Route Calculation Speed**
  - Calculate multiple routes
  - Verify response time < 5 seconds
  - Verify no timeouts

- [ ] **Map Rendering**
  - Load map with many markers
  - Verify smooth scrolling
  - Verify no lag

- [ ] **Database Queries**
  - Monitor query count
  - Verify N+1 queries avoided
  - Verify indexes used

- [ ] **API Response Times**
  - Test all endpoints
  - Verify response times acceptable
  - Identify slow endpoints

---

## 🧪 AUTOMATED TESTING

### **Test Suite 10: Automated Tests**

#### **Backend (PHPUnit):**
- [ ] Run `php artisan test`
- [ ] Verify all tests pass
- [ ] Verify coverage > 70%

#### **Frontend (Jest/React Testing Library):**
- [ ] Run `npm test`
- [ ] Verify all tests pass
- [ ] Verify component tests pass

#### **API Tests:**
- [ ] Run Stripe subscription tests
- [ ] Run route calculation tests
- [ ] Run authentication tests

---

## 📝 TEST EXECUTION CHECKLIST

### **Pre-Testing Setup:**
- [ ] Stripe test account configured
- [ ] Test cards ready
- [ ] Test users created (free, premium, pro)
- [ ] Test data prepared
- [ ] Test environment configured

### **Daily Testing:**
- [ ] Run automated tests
- [ ] Test critical user flows
- [ ] Test subscription flows
- [ ] Test route calculation

### **Before Release:**
- [ ] Complete all test suites
- [ ] Fix all critical bugs
- [ ] Verify all features work
- [ ] Performance testing complete
- [ ] Security testing complete

---

## 🐛 BUG REPORTING

### **Bug Report Template:**
```
**Title:** [Brief description]
**Platform:** Website / Android
**Priority:** Critical / High / Medium / Low
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshots:**
[Attach if applicable]

**Environment:**
- Browser/Device: [e.g., Chrome 120 / Pixel 7]
- OS: [e.g., Windows 11 / Android 14]
- App Version: [e.g., 1.0.0]
```

---

## ✅ TEST COMPLETION CRITERIA

### **Ready for Production:**
- ✅ All critical test suites passed
- ✅ All subscription flows tested
- ✅ All security tests passed
- ✅ Performance acceptable
- ✅ No critical bugs
- ✅ Automated tests passing

---

**Last Updated:** 2025-01-XX  
**Next Review:** After each major release


