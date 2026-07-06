# Stripe Implementation Testing Guide

## 🧪 Complete Testing Checklist

### Step 1: Verify Environment Configuration

**Check your `.env` file has all required keys:**

```bash
# Backend keys
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_TOLERANCE=300

# Price IDs
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

# Frontend key
VITE_STRIPE_KEY=pk_test_...

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Test:**
```bash
php artisan config:clear
php artisan tinker
>>> config('services.stripe.key')
>>> config('services.stripe.prices.premium_monthly')
```

Should return your actual values, not `null`.

---

### Step 2: Test Backend API Endpoints

#### 2.1 Test Plans Endpoint (No Auth Required)

```bash
curl http://localhost:8000/api/subscriptions/plans
```

**Expected Response:**
```json
{
  "plans": {
    "free": { "name": "Free", "price_monthly": 0, ... },
    "premium": { "name": "Premium", "price_monthly": 9.99, ... },
    "pro": { "name": "Pro", "price_monthly": 19.99, ... }
  }
}
```

✅ **Success:** JSON with all plans  
❌ **Failure:** Check routes and controller

---

#### 2.2 Test Current Subscription (Auth Required)

**Get auth token first:**
```bash
# Login and get token
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

**Then test:**
```bash
curl http://localhost:8000/api/subscriptions/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "subscription": null,
  "tier": "free",
  "limits": { "routes_per_day": 10, ... },
  "has_active_subscription": false
}
```

✅ **Success:** Returns subscription info  
❌ **Failure:** Check authentication and user model

---

#### 2.3 Test Route Usage Check

```bash
curl http://localhost:8000/api/route-usage/check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "allowed": true,
  "remaining": 10,
  "limit": 10,
  "reset_at": "2025-11-23T00:00:00.000000Z"
}
```

✅ **Success:** Returns route limit info  
❌ **Failure:** Check SubscriptionService

---

#### 2.4 Test Checkout Creation (Auth Required)

```bash
curl -X POST http://localhost:8000/api/subscriptions/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan":"premium","billing_cycle":"monthly"}'
```

**Expected Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_..."
}
```

✅ **Success:** Returns Stripe checkout URL  
❌ **Failure:** Check Stripe keys and PaymentService

---

### Step 3: Test Database

**Check tables exist:**
```bash
php artisan tinker
>>> Schema::hasTable('subscriptions')
>>> Schema::hasTable('route_usages')
>>> Schema::hasTable('users')
```

**Check user has stripe_id column:**
```bash
php artisan tinker
>>> $user = \App\Models\User::first();
>>> $user->getConnection()->getSchemaBuilder()->hasColumn('users', 'stripe_id')
```

✅ **Success:** All return `true`  
❌ **Failure:** Run migrations

---

### Step 4: Test Frontend Components

#### 4.1 Test Subscription Page

1. Start servers:
   ```bash
   # Terminal 1
   php artisan serve
   
   # Terminal 2
   npm run dev
   ```

2. Navigate to: http://localhost:5173/subscription

3. **Expected:**
   - ✅ Page loads without errors
   - ✅ Shows all 3 plans (Free, Premium, Pro)
   - ✅ Shows current subscription status (if logged in)
   - ✅ Shows usage statistics (if logged in)
   - ✅ Subscribe buttons are visible

4. **Check browser console:**
   - ✅ No JavaScript errors
   - ✅ No "Stripe is not defined" errors
   - ✅ API calls succeed (check Network tab)

---

#### 4.2 Test Subscription Badge

1. Login to your app
2. Check header for subscription badge
3. **Expected:**
   - ✅ Badge shows for Premium/Pro users
   - ✅ Badge links to `/subscription` page
   - ✅ Badge doesn't show for free users

---

#### 4.3 Test Stripe Checkout Flow

1. Go to `/subscription` page
2. Click "Subscribe Monthly" or "Subscribe Yearly"
3. **Expected:**
   - ✅ Redirects to Stripe checkout page
   - ✅ Shows correct price
   - ✅ Shows correct plan name

4. **Use Stripe test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

5. Complete checkout
6. **Expected:**
   - ✅ Redirects back to your app
   - ✅ Subscription is created in database
   - ✅ User subscription status updates

---

### Step 5: Test Webhooks

#### 5.1 Start Stripe Webhook Forwarding

```bash
stripe listen --forward-to localhost:8000/api/subscriptions/webhook
```

**Expected:**
- ✅ Shows webhook signing secret
- ✅ Shows "Ready! Your webhook signing secret is whsec_..."
- ✅ Keeps running (don't close terminal)

---

#### 5.2 Test Webhook Endpoint

**In another terminal:**
```bash
curl -X POST http://localhost:8000/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

**Expected:**
- ✅ Returns `{"received": true}` or error about signature
- ✅ Webhook forwarding terminal shows event received

---

#### 5.3 Test Real Webhook Events

1. Complete a test subscription checkout
2. **Check webhook terminal:**
   - ✅ Shows `checkout.session.completed` event
   - ✅ Shows `customer.subscription.created` event

3. **Check Laravel logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```
   - ✅ No webhook errors
   - ✅ Subscription synced successfully

---

### Step 6: Test Route Limits

#### 6.1 Test Free Tier Limit

1. Login as free user
2. Calculate 10 routes
3. Try to calculate 11th route
4. **Expected:**
   - ✅ Returns 403 error
   - ✅ Error message: "Route limit reached"
   - ✅ Shows upgrade prompt

---

#### 6.2 Test Premium/Pro Unlimited

1. Login as Premium/Pro user
2. Calculate multiple routes
3. **Expected:**
   - ✅ No limit errors
   - ✅ Routes calculate successfully
   - ✅ Usage tracked in database

---

### Step 7: Test Feature Gating

1. Try to access premium feature as free user
2. **Expected:**
   - ✅ Shows upgrade prompt
   - ✅ Feature is blocked

3. Upgrade to Premium
4. **Expected:**
   - ✅ Feature becomes accessible
   - ✅ No upgrade prompt

---

## 🔍 Quick Verification Commands

### Check Stripe Connection
```bash
php artisan tinker
>>> \Stripe\Stripe::setApiKey(config('services.stripe.secret'));
>>> \Stripe\Product::all();
```

Should return your products.

### Check Database Records
```bash
php artisan tinker
>>> \App\Models\Subscription::count()
>>> \App\Models\RouteUsage::count()
>>> \App\Models\User::whereNotNull('stripe_id')->count()
```

### Check Routes
```bash
php artisan route:list | grep subscription
```

Should show all subscription routes.

### Check Configuration
```bash
php artisan config:show services.stripe
```

Should show all Stripe config values.

---

## 🐛 Common Issues & Solutions

### Issue: "Stripe key not set"
**Solution:**
- Check `.env` has `STRIPE_KEY` and `STRIPE_SECRET`
- Run `php artisan config:clear`
- Verify keys start with `pk_test_` and `sk_test_`

### Issue: "Price ID not found"
**Solution:**
- Check Price IDs in `.env` match Stripe dashboard
- Verify Price IDs start with `price_`
- Check `config/services.php` reads from `.env`

### Issue: Webhook not working
**Solution:**
- Make sure Stripe CLI is running
- Check webhook secret in `.env`
- Verify endpoint URL is correct
- Check Laravel logs for errors

### Issue: Frontend "Stripe is not defined"
**Solution:**
- Check `VITE_STRIPE_KEY` in `.env`
- Restart Vite dev server
- Clear browser cache

### Issue: Checkout redirect fails
**Solution:**
- Check `FRONTEND_URL` in `.env`
- Verify URL matches your Vite dev server
- Check Stripe checkout session creation succeeds

---

## ✅ Success Criteria

Your Stripe implementation is correct if:

- ✅ All API endpoints return expected responses
- ✅ Subscription page loads and displays plans
- ✅ Checkout flow redirects to Stripe
- ✅ Test payment completes successfully
- ✅ Subscription created in database
- ✅ Webhooks process correctly
- ✅ Route limits enforced for free users
- ✅ Premium features gated correctly
- ✅ No errors in Laravel logs
- ✅ No errors in browser console

---

## 📝 Testing Checklist

- [ ] Environment variables configured
- [ ] Backend API endpoints work
- [ ] Database tables exist
- [ ] Frontend subscription page loads
- [ ] Stripe checkout redirects work
- [ ] Test payment completes
- [ ] Subscription created in database
- [ ] Webhooks process events
- [ ] Route limits enforced
- [ ] Feature gating works
- [ ] No errors in logs

---

**Once all tests pass, your Stripe implementation is complete!** 🎉



