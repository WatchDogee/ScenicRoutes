# Subscription & Payment Implementation - Quick Checklist

## Pre-Implementation Setup

### Stripe Account Setup
- [ ] Create Stripe account
- [ ] Complete business verification
- [ ] Get API keys (test and live)
- [ ] Create products in Stripe dashboard:
  - [ ] Premium Monthly ($9.99)
  - [ ] Premium Yearly ($99)
  - [ ] Pro Monthly ($19.99)
  - [ ] Pro Yearly ($199)
- [ ] Configure webhook endpoint
- [ ] Get webhook signing secret

### Environment Configuration
- [ ] Add Stripe keys to `.env`
- [ ] Add Stripe price IDs to `.env`
- [ ] Add webhook secret to `.env`
- [ ] Update `config/services.php`

## Backend Implementation

### Dependencies
- [ ] Install Laravel Cashier: `composer require laravel/cashier`
- [ ] Publish Cashier migrations: `php artisan vendor:publish --tag="cashier-migrations"`
- [ ] Install Stripe.js: `npm install @stripe/stripe-js`

### Database
- [ ] Create migration: `enhance_subscriptions_table.php`
- [ ] Create migration: `create_route_usages_table.php`
- [ ] Create migration: `create_payment_transactions_table.php` (optional)
- [ ] Run migrations: `php artisan migrate`

### Models
- [ ] Add `Billable` trait to User model
- [ ] Add `hasActiveSubscription()` method to User
- [ ] Add `getSubscriptionTier()` method to User
- [ ] Enhance Subscription model with new fields
- [ ] Create RouteUsage model

### Services
- [ ] Create `app/Services/PaymentService.php`
  - [ ] `createCheckoutSession()`
  - [ ] `createSubscription()`
  - [ ] `updateSubscription()`
  - [ ] `cancelSubscription()`
  - [ ] `resumeSubscription()`
  - [ ] `updatePaymentMethod()`
  - [ ] `syncSubscriptionFromStripe()`
- [ ] Create `app/Services/SubscriptionService.php`
  - [ ] `canCalculateRoute()`
  - [ ] `recordRouteUsage()`
  - [ ] `hasFeatureAccess()`
  - [ ] `getUsageStats()`
  - [ ] `getLimits()`

### Controllers
- [ ] Implement `SubscriptionController`
  - [ ] `getPlans()`
  - [ ] `getCurrent()`
  - [ ] `createCheckout()`
  - [ ] `upgrade()`
  - [ ] `cancel()`
  - [ ] `resume()`
  - [ ] `updatePaymentMethod()`
  - [ ] `getUsage()`
  - [ ] `handleWebhook()`
  - [ ] Webhook handlers (checkout, subscription events, invoices)

### Middleware
- [ ] Implement `CheckRouteLimit` middleware
- [ ] Implement `CheckFeatureAccess` middleware
- [ ] Register middleware in `bootstrap/app.php`

### Routes
- [ ] Add subscription routes to `routes/api.php`
- [ ] Add webhook route (no auth)
- [ ] Add route usage check endpoint
- [ ] Apply middleware to route calculation endpoints
- [ ] Add route usage tracking to RouteController

## Frontend Implementation

### Components
- [ ] Create `resources/js/Pages/Subscription.jsx`
  - [ ] Plan comparison table
  - [ ] Current subscription display
  - [ ] Subscribe buttons
  - [ ] Cancel/resume buttons
  - [ ] Usage statistics
- [ ] Create `resources/js/Components/SubscriptionBadge.jsx`
- [ ] Create `resources/js/Components/RouteLimitWarning.jsx`
- [ ] Create `resources/js/Components/FeatureGate.jsx`

### Integration
- [ ] Add subscription badge to header
- [ ] Add route limit warning to route planner
- [ ] Gate premium features with FeatureGate
- [ ] Add subscription link to navigation
- [ ] Update user object to include subscription

### Environment
- [ ] Add `VITE_STRIPE_KEY` to `.env`
- [ ] Rebuild frontend assets

## Testing

### Payment Flow
- [ ] Test checkout session creation
- [ ] Test Stripe checkout redirect
- [ ] Test successful payment
- [ ] Test webhook processing
- [ ] Test subscription creation

### Subscription Management
- [ ] Test plan upgrade
- [ ] Test plan downgrade
- [ ] Test cancellation
- [ ] Test resumption
- [ ] Test payment method update

### Route Limits
- [ ] Test free tier limit (10/day)
- [ ] Test premium/pro unlimited
- [ ] Test limit warning (80%)
- [ ] Test limit error (100%)
- [ ] Test daily reset

### Feature Gating
- [ ] Test curved routes (Premium+)
- [ ] Test round-trip (Premium+)
- [ ] Test offline maps (Premium+)
- [ ] Test API access (Pro)
- [ ] Test feature gate UI

### Webhooks
- [ ] Test `checkout.session.completed`
- [ ] Test `customer.subscription.updated`
- [ ] Test `customer.subscription.deleted`
- [ ] Test `invoice.payment_succeeded`
- [ ] Test `invoice.payment_failed`
- [ ] Test webhook signature verification

## Deployment

### Pre-Deployment
- [ ] Switch to live Stripe keys
- [ ] Update webhook URL to production
- [ ] Test with real payment (small amount)
- [ ] Verify webhook endpoint is accessible
- [ ] Check all environment variables

### Post-Deployment
- [ ] Monitor webhook logs
- [ ] Monitor payment processing
- [ ] Monitor subscription creation
- [ ] Check error logs
- [ ] Verify user subscriptions are created

## Documentation

- [ ] Update user documentation
- [ ] Document subscription tiers
- [ ] Document feature access by tier
- [ ] Document API endpoints
- [ ] Create admin guide for subscription management

## Monitoring & Analytics

- [ ] Set up subscription metrics tracking
- [ ] Monitor conversion rates
- [ ] Track churn rate
- [ ] Monitor payment failures
- [ ] Set up alerts for webhook failures

---

## Quick Command Reference

```bash
# Install dependencies
composer require laravel/cashier
npm install @stripe/stripe-js

# Create migrations
php artisan make:migration enhance_subscriptions_table
php artisan make:migration create_route_usages_table

# Run migrations
php artisan migrate

# Publish Cashier config
php artisan vendor:publish --tag="cashier-migrations"

# Test webhook locally (use Stripe CLI)
stripe listen --forward-to localhost:8000/api/subscriptions/webhook
```

---

## Critical Path Items

These must be completed in order:

1. ✅ Stripe account setup & products created
2. ✅ Environment variables configured
3. ✅ Database migrations run
4. ✅ PaymentService implemented
5. ✅ SubscriptionService implemented
6. ✅ Webhook handler working
7. ✅ Route limits enforced
8. ✅ Frontend subscription page
9. ✅ End-to-end testing
10. ✅ Production deployment

---

**Status:** Ready for Implementation  
**Estimated Time:** 2-3 weeks  
**Priority:** 🔴 CRITICAL



