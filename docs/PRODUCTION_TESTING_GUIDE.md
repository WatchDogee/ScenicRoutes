# ScenicRoutes Production Testing Guide

## Critical Testing Areas for Profitability

This document outlines crucial tests to ensure the app is production-ready and profitable.

---

## 1. Subscription & Payment Testing

### Free Tier Testing
**Test Account Credentials:**
```
Email: test_free@example.com
Password: Password123!
Tier: Free
```

**Note:** Run `php artisan db:seed --class=TestSubscriptionUsersSeeder` to create these test accounts.

**Test Cases:**
- [ ] **Route Calculation Limits**
  - Calculate exactly 10 routes in a month
  - Attempt 11th route - should show upgrade prompt
  - Verify error message: "You've reached your free tier limit (10/10 routes)"
  
- [ ] **Saved Roads Limits**
  - Save exactly 5 roads
  - Attempt to save 6th road - should show upgrade prompt
  - Verify count display shows "5/5 roads"
  
- [ ] **Collections Limits**
  - Create exactly 2 collections
  - Attempt 3rd collection - should show upgrade prompt
  
- [ ] **Feature Restrictions**
  - Offline maps - should show "Premium Only" badge
  - Advanced route options - should be disabled
  - GPX export - should show upgrade prompt
  
- [ ] **Usage Statistics Display**
  - Navigate to Profile → Usage Statistics
  - Verify correct counts: Routes (X/10), Roads (X/5), Collections (X/2)
  - Verify chart shows usage progression
  - Verify reset date displays correctly

### Premium Tier Testing
**Test Account Credentials:**
```
Email: test_premium@example.com
Password: Password123!
Tier: Premium (Active subscription)
Subscription ID: test_premium_sub
```

**Test Cases:**
- [ ] **Unlimited Access**
  - Calculate 20+ routes - should work without limits
  - Save 15+ roads - should work without limits
  - Create 5+ collections - should work without limits
  
- [ ] **Premium Features**
  - Access offline maps download
  - Use advanced route options (avoid highways, ferry avoidance)
  - Export routes to GPX
  - Use turn-by-turn navigation
  
- [ ] **Subscription Display**
  - Navigate to Profile → Subscription
  - Verify shows: "Premium - Active"
  - Verify expiry date: "Renews on [date]"
  - Verify "Cancel Subscription" button works
  
- [ ] **Usage Statistics**
  - Verify shows "Unlimited" for route calculations
  - Verify shows "Unlimited" for saved roads
  - Verify shows actual counts without limits

### Professional Tier Testing
**Test Account Credentials:**
```
Email: test_pro@example.com
Password: Password123!
Tier: Professional
Subscription ID: test_pro_sub
```

**Test Cases:**
- [ ] **Advanced Features**
  - Bulk road management (select 10+ roads at once)
  - Advanced analytics and insights
  - Priority support access
  - API access (if implemented)
  
- [ ] **Team Features** (if applicable)
  - Invite team members
  - Share collections with team
  - View team usage statistics

---

## 2. Subscription Upgrade/Downgrade Flow

### Upgrade Testing
**Starting Point:** Free tier account

**Test Cases:**
- [ ] **Trigger Upgrade Prompt**
  1. Hit free tier limit (e.g., try to calculate 11th route)
  2. Verify upgrade prompt appears with clear pricing
  3. Verify "Upgrade to Premium" button is visible
  
- [ ] **Upgrade Process**
  1. Click "Upgrade to Premium"
  2. Navigate to subscription screen
  3. Select Premium tier
  4. Click "Subscribe"
  5. **CRITICAL:** Verify Stripe/payment gateway integration
     - Payment form loads correctly
     - Can enter test card: `4242 4242 4242 4242`
     - Expiry: Any future date (e.g., 12/25)
     - CVC: Any 3 digits (e.g., 123)
  6. Submit payment
  7. Verify success message: "Subscription activated!"
  8. Verify tier changes from Free to Premium
  9. Verify limits are removed immediately
  
- [ ] **Pro-rated Billing**
  - Upgrade mid-month
  - Verify correct pro-rated amount charged
  - Verify next billing date is correct

### Downgrade Testing
**Starting Point:** Premium tier account

**Test Cases:**
- [ ] **Downgrade Process**
  1. Navigate to Profile → Subscription
  2. Click "Change Plan"
  3. Select "Free" tier
  4. Verify warning: "You'll lose premium features at end of billing period"
  5. Confirm downgrade
  6. Verify "Pending Cancellation" status
  7. Verify access continues until period end
  
- [ ] **Post-Downgrade Verification**
  1. Wait for billing period to end (or simulate date change)
  2. Verify tier changes to Free
  3. Verify limits are enforced
  4. Verify saved data remains (roads, collections)
  5. Verify usage counts reset

---

## 3. Payment Gateway Integration

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
3D Secure Required: 4000 0027 6000 3184
```

**Test Cases:**
- [ ] **Successful Payment**
  - Use success card
  - Verify payment processed
  - Verify subscription activated immediately
  - Verify receipt email sent
  
- [ ] **Failed Payment**
  - Use declined card
  - Verify error message: "Payment failed. Please try another card."
  - Verify subscription not activated
  - Verify user can retry
  
- [ ] **3D Secure Authentication**
  - Use 3D Secure test card
  - Verify authentication popup appears
  - Complete authentication
  - Verify payment succeeds after auth
  
- [ ] **Subscription Renewal**
  - Simulate automatic renewal date
  - Verify payment processed automatically
  - Verify subscription extends for another period
  - Verify renewal email sent
  
- [ ] **Failed Renewal**
  - Update payment method to declined card
  - Simulate renewal
  - Verify payment fails
  - Verify user notified: "Payment failed - Update payment method"
  - Verify grace period of 3 days before downgrade
  
- [ ] **Payment Method Management**
  - Navigate to Profile → Subscription → Payment Method
  - Update card details
  - Verify new card saved
  - Verify old card removed

---

## 4. Feature Access Control Testing

### Test Matrix
Create a test matrix documenting feature access by tier:

| Feature | Free | Premium | Professional |
|---------|------|---------|--------------|
| Route Calculations | 10/month | Unlimited | Unlimited |
| Saved Roads | 5 | Unlimited | Unlimited |
| Collections | 2 | Unlimited | Unlimited |
| Offline Maps | ❌ | ✅ | ✅ |
| Turn-by-Turn Nav | ❌ | ✅ | ✅ |
| GPX Export | ❌ | ✅ | ✅ |
| Advanced Route Options | ❌ | ✅ | ✅ |
| Bulk Operations | ❌ | ❌ | ✅ |
| Analytics | Basic | Advanced | Advanced |
| Priority Support | ❌ | ❌ | ✅ |

**Verification Steps:**
1. Test each feature with each tier
2. Verify upgrade prompts appear for restricted features
3. Verify upgrade prompts show correct pricing
4. Verify clear value proposition in prompts

---

## 5. Critical Backend API Endpoints

### Subscription Endpoints
Test these endpoints are working and properly secured:

```bash
# Get current subscription
GET /api/subscriptions/current
Authorization: Bearer {token}
Expected: 200 OK with subscription details

# Get subscription plans
GET /api/subscriptions/plans
Expected: 200 OK with pricing info

# Get usage statistics
GET /api/subscriptions/usage
Authorization: Bearer {token}
Expected: 200 OK with current usage counts

# Create checkout session
POST /api/subscriptions/checkout
Authorization: Bearer {token}
Body: {"plan": "premium"}
Expected: 200 OK with Stripe session URL

# Cancel subscription
POST /api/subscriptions/cancel
Authorization: Bearer {token}
Expected: 200 OK with updated subscription status
```

### Test Checklist:
- [ ] All endpoints return correct status codes
- [ ] Authentication is properly enforced
- [ ] Rate limiting is in place
- [ ] Error responses are meaningful
- [ ] HTTPS is enforced
- [ ] CORS is properly configured

---

## 6. Critical Production Tests

### Performance & Scalability
- [ ] **Load Testing**
  - Simulate 100 concurrent users
  - Verify route calculations complete in <3 seconds
  - Verify no server crashes
  - Verify database connections don't exhaust
  
- [ ] **Route Calculation Performance**
  - Calculate long routes (500+ km)
  - Verify completes in <5 seconds
  - Verify no timeout errors
  - Verify map renders smoothly

### Data Integrity
- [ ] **Saved Roads Persistence**
  - Save a road
  - Force-close app
  - Reopen app
  - Verify road is still there
  
- [ ] **Subscription State Persistence**
  - Subscribe to Premium
  - Log out
  - Log back in
  - Verify still shows Premium
  
- [ ] **Usage Count Accuracy**
  - Calculate 5 routes
  - Verify count shows "5/10"
  - Save 3 roads
  - Verify count shows "3/5"
  - Counts should match backend exactly

### Error Handling
- [ ] **Backend Down Scenario**
  - Stop Laravel backend
  - Try to calculate route
  - Verify error: "Failed to connect. Make sure Laravel backend is running on port 8000."
  - Verify app doesn't crash
  - Verify user can retry when backend comes back
  
- [ ] **Network Timeout**
  - Simulate slow network (throttle to 2G speed)
  - Try to load saved roads
  - Verify loading indicator shows
  - Verify timeout error after 30 seconds
  - Verify graceful fallback
  
- [ ] **Invalid Authentication**
  - Manually expire auth token
  - Try to access protected feature
  - Verify error: "Session expired. Please log in again."
  - Verify redirects to login

### Security Tests
- [ ] **Authentication Required**
  - Try to access premium features without login
  - Verify redirects to login
  
- [ ] **Subscription Verification**
  - Manually set client to Premium (if possible)
  - Try to use premium feature
  - Verify backend still enforces subscription check
  
- [ ] **Payment Security**
  - Verify credit card numbers never stored locally
  - Verify all payment data sent via HTTPS
  - Verify Stripe handles all sensitive data

---

## 7. User Experience Critical Paths

### New User Onboarding
- [ ] Register new account
- [ ] Calculate first route (should be smooth)
- [ ] Save first road
- [ ] View usage statistics (should show 1/10, 1/5)
- [ ] Hit free tier limit
- [ ] See upgrade prompt
- [ ] Clear upgrade path visible

### Paying Customer Journey
- [ ] Sign up for free tier
- [ ] Use app for a few days
- [ ] Hit limit
- [ ] Upgrade to Premium
- [ ] Payment succeeds
- [ ] Immediately unlocked
- [ ] Use premium features
- [ ] Renew automatically
- [ ] No disruption

### Churn Prevention
- [ ] User tries to cancel
- [ ] Show retention offer?
- [ ] Clear cancellation process
- [ ] Verify downgrade grace period
- [ ] Send win-back email (if applicable)

---

## 8. Revenue Protection Tests

### Prevent Subscription Abuse
- [ ] **Limit Bypass Attempts**
  - Try to manipulate local storage to bypass limits
  - Verify backend enforces limits
  
- [ ] **Multiple Accounts**
  - Create multiple free accounts with same email+1 trick
  - Verify rate limiting prevents abuse
  
- [ ] **Payment Failures**
  - Subscription payment fails
  - Verify grace period (3 days)
  - Verify downgrade after grace period
  - Verify user can't access premium features if payment truly failed

### Subscription Analytics
- [ ] **Tracking Setup**
  - Verify conversion tracking (free → premium)
  - Verify churn tracking
  - Verify MRR (Monthly Recurring Revenue) calculation
  - Verify LTV (Lifetime Value) tracking
  
- [ ] **Key Metrics**
  - Free to Premium conversion rate
  - Churn rate per month
  - Average revenue per user (ARPU)
  - Customer acquisition cost (CAC)

---

## 9. Mobile-Specific Tests

### Android Testing
- [ ] Test on Android 8.0 (minimum supported)
- [ ] Test on Android 14 (latest)
- [ ] Test on different screen sizes (phone, tablet)
- [ ] Verify offline functionality
- [ ] Verify background location tracking
- [ ] Verify notifications work
- [ ] Test app resume after background kill

### iOS Testing (if applicable)
- [ ] Test on iOS 14 (minimum)
- [ ] Test on iOS 17 (latest)
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 15 Pro Max (large screen)
- [ ] Test In-App Purchase flow

---

## 10. Compliance & Legal

### GDPR Compliance
- [ ] Privacy policy is accessible
- [ ] Users can export their data
- [ ] Users can delete their account
- [ ] Data deletion happens within 30 days
- [ ] Clear consent for data collection

### Payment Compliance
- [ ] PCI-DSS compliance (Stripe handles this)
- [ ] Clear refund policy displayed
- [ ] Terms of service during subscription
- [ ] Cancellation rights clearly stated

---

## Quick Testing Checklist Before Launch

### Pre-Launch Critical Tests
- [ ] Register new free account ✅
- [ ] Calculate a route ✅
- [ ] Save a road ✅
- [ ] Hit free tier limit ✅
- [ ] See upgrade prompt ✅
- [ ] Subscribe to Premium (test card) ✅
- [ ] Verify premium features work ✅
- [ ] Cancel subscription ✅
- [ ] Verify downgrade at period end ✅
- [ ] Backend API all endpoints working ✅
- [ ] Payment webhook configured ✅
- [ ] SSL certificates valid ✅
- [ ] Error tracking enabled (Sentry/similar) ✅
- [ ] Analytics tracking working ✅
- [ ] Email notifications sending ✅

---

## Testing Tools & Setup

### Laravel Backend Testing
```bash
# Start backend
cd ScenicRoutes_dev
php artisan serve

# Seed test data
php artisan db:seed --class=TestSubscriptionSeeder

# Run subscription tests
php artisan test --filter=SubscriptionTest
```

### Android App Testing
```bash
# Build and install
cd android-native
./gradlew installDebug

# Run instrumented tests
./gradlew connectedAndroidTest

# Run subscription tests
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scenicroutes.app.SubscriptionTest
```

### Stripe Testing
```bash
# Listen to webhooks locally
stripe listen --forward-to localhost:8000/api/stripe/webhook

# Trigger test payment
stripe trigger payment_intent.succeeded
```

---

## Success Criteria

### Before Going Live
✅ All free tier limits enforced correctly  
✅ Upgrade flow works end-to-end  
✅ Payment processing works with test cards  
✅ Subscription status syncs correctly  
✅ Usage statistics are accurate  
✅ Error messages are clear and helpful  
✅ App doesn't crash when backend is down  
✅ Performance is acceptable (<3s route calculations)  
✅ All premium features are properly gated  
✅ Webhook handling works for renewals/cancellations  

---

## Troubleshooting Common Issues

### Issue: "Subscription status out of sync"
**Solution:** Check webhook delivery in Stripe dashboard, verify webhook secret is correct

### Issue: "Payment succeeds but subscription not activated"
**Solution:** Check Laravel logs for webhook processing errors, verify database migration ran

### Issue: "User can access premium features without subscribing"
**Solution:** Check backend middleware, ensure subscription check happens on every request

### Issue: "Usage counts reset incorrectly"
**Solution:** Check cron job for usage reset, verify timezone settings

---

## Monitoring After Launch

### Daily Checks
- [ ] Check error logs for crashes
- [ ] Monitor payment success rate
- [ ] Monitor API response times
- [ ] Check subscription churn rate

### Weekly Checks
- [ ] Review user feedback
- [ ] Analyze conversion funnel
- [ ] Check for unusual usage patterns
- [ ] Review customer support tickets

### Monthly Checks
- [ ] Calculate MRR growth
- [ ] Analyze cohort retention
- [ ] Review feature usage statistics
- [ ] Plan feature improvements based on data

---

**Last Updated:** December 20, 2025  
**Version:** 1.0  
**Author:** ScenicRoutes Development Team

