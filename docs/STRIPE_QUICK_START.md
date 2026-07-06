# Stripe Quick Start - Launch Locally

## New Competitive Pricing

| Tier | Monthly | Yearly | Competitive Position |
|------|---------|--------|---------------------|
| **Premium** | €2.99 | €29/year | Matches Kurviger Tourer+ (€30/year) |
| **Pro** | €5.99 | €59/year | Beats Calimoto (€60/year) |

---

## Step 1: Start Stripe Webhook Listener

Open a terminal and run (keep it running):

```bash
stripe listen --forward-to http://localhost:8000/api/subscriptions/webhook
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**Copy the `whsec_...` value** and add to your `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Step 2: Create Stripe Products & Prices

### Option A: Use Stripe Dashboard (Easiest)

1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Create products with these prices:

**Premium Monthly:**
- Name: "Premium Monthly"
- Description: "Premium subscription - Monthly billing"
- Price: €2.99/month (recurring)
- Currency: EUR

**Premium Yearly:**
- Name: "Premium Yearly"
- Description: "Premium subscription - Yearly billing"
- Price: €29/year (recurring)
- Currency: EUR

**Pro Monthly:**
- Name: "Pro Monthly"
- Description: "Pro subscription - Monthly billing"
- Price: €5.99/month (recurring)
- Currency: EUR

**Pro Yearly:**
- Name: "Pro Yearly"
- Description: "Pro subscription - Yearly billing"
- Price: €59/year (recurring)
- Currency: EUR

4. Copy the **Price IDs** (start with `price_...`) from each product

### Option B: Use Stripe CLI

**Windows (PowerShell):**
```powershell
.\scripts\create-stripe-products.ps1
```

**Mac/Linux:**
```bash
chmod +x scripts/create-stripe-products.sh
./scripts/create-stripe-products.sh
```

Or manually:
```bash
# Premium Monthly
stripe products create --name="Premium Monthly" --description="Premium subscription - Monthly billing"
stripe prices create --product=prod_xxxxx --unit-amount=299 --currency=eur --recurring[interval]=month

# Premium Yearly
stripe prices create --product=prod_xxxxx --unit-amount=2900 --currency=eur --recurring[interval]=year

# Pro Monthly
stripe products create --name="Pro Monthly" --description="Pro subscription - Monthly billing"
stripe prices create --product=prod_xxxxx --unit-amount=599 --currency=eur --recurring[interval]=month

# Pro Yearly
stripe prices create --product=prod_xxxxx --unit-amount=5900 --currency=eur --recurring[interval]=year
```

---

## Step 3: Update .env File

Add the Price IDs to your `.env`:

```env
# Stripe API Keys (from https://dashboard.stripe.com/test/apikeys)
STRIPE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price IDs (from products you just created)
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxx
```

---

## Step 4: Start Laravel Server

```bash
php artisan serve
```

---

## Step 5: Test Checkout

1. Go to http://localhost:8000/map
2. Open Settings → Subscription tab
3. Click "Upgrade to Premium" or "Upgrade to Pro"
4. You'll be redirected to Stripe Checkout

### Use Test Card:
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

5. Complete payment
6. You'll be redirected back to your app
7. Check that subscription is active in Settings

---

## Step 6: Verify Webhook Events

In the terminal where `stripe listen` is running, you should see events like:
```
2024-01-01 12:00:00   --> payment_intent.succeeded [evt_xxxxx]
2024-01-01 12:00:01   --> customer.subscription.created [evt_xxxxx]
2024-01-01 12:00:02   --> customer.subscription.updated [evt_xxxxx]
```

Check Laravel logs:
```bash
tail -f storage/logs/laravel.log
```

---

## Troubleshooting

### "Plan id field is required" Error
✅ **Fixed!** The code now sends `plan_id` instead of `plan`.

### Webhook Not Working
1. Make sure `stripe listen` is running
2. Check `STRIPE_WEBHOOK_SECRET` in `.env` matches the output from `stripe listen`
3. Check Laravel logs for errors

### Checkout Not Redirecting
1. Check Stripe keys are correct in `.env`
2. Check browser console for errors
3. Verify price IDs are correct

### Subscription Not Updating
1. Check webhook events in `stripe listen` terminal
2. Check database: `SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;`
3. Check Laravel logs

---

## Price Verification

Verify prices are correct:
- Premium Monthly: €2.99/month
- Premium Yearly: €29/year (saves €6.88/year vs monthly)
- Pro Monthly: €5.99/month
- Pro Yearly: €59/year (saves €12.88/year vs monthly)

---

## Next Steps

1. ✅ Test complete subscription flow
2. ✅ Verify webhook events are received
3. ✅ Test subscription cancellation
4. ✅ Test billing cycle changes
5. ✅ Verify paywalls are enforced (extra curvy, offline maps, etc.)

---

## Production Deployment

When ready for production:

1. Switch to **Live Mode** in Stripe Dashboard
2. Get live API keys from https://dashboard.stripe.com/apikeys
3. Create live products with same prices
4. Set up webhook endpoint: `https://yourdomain.com/api/subscriptions/webhook`
5. Update `.env` with live keys and price IDs

---

## Quick Reference

```bash
# Start webhook listener
stripe listen --forward-to http://localhost:8000/api/subscriptions/webhook

# View webhook logs
stripe logs tail

# List customers
stripe customers list

# List subscriptions
stripe subscriptions list

# Test card: 4242 4242 4242 4242
```

