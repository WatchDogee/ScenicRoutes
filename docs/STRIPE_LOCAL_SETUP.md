# Stripe Local Testing Setup Guide

## Overview

This guide explains how to set up Stripe for local development and testing of subscription features.

---

## Prerequisites

1. **Stripe Account**
   - Sign up at https://stripe.com
   - Access Dashboard: https://dashboard.stripe.com

2. **Stripe CLI**
   - Download: https://stripe.com/docs/stripe-cli
   - Install for your OS (Windows/Mac/Linux)

---

## Step 1: Install Stripe CLI

### Windows (PowerShell)
```powershell
# Download from https://github.com/stripe/stripe-cli/releases
# Or use winget
winget install stripe.stripe-cli
```

### Mac
```bash
brew install stripe/stripe-cli/stripe
```

### Linux
```bash
# Download latest release
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_*_linux_x86_64.tar.gz
tar -xvf stripe_*_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

Verify installation:
```bash
stripe --version
```

---

## Step 2: Login to Stripe CLI

```bash
stripe login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Save your API keys locally

---

## Step 3: Get Your Stripe API Keys

### Test Mode Keys (for development)

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### Add to `.env` file:

```env
STRIPE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_... # Will be generated in next step
```

---

## Step 4: Set Up Webhook Forwarding

Stripe webhooks notify your app about subscription events (payment succeeded, subscription canceled, etc.).

### Start Webhook Listener

In a separate terminal, run:

```bash
stripe listen --forward-to http://localhost:8000/api/subscriptions/webhook
```

**Important:** Keep this terminal open while testing!

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Copy Webhook Secret

Copy the `whsec_...` value and add it to your `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Step 5: Create Test Products & Prices

### Option A: Use Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Create products:
   - **Premium Monthly** - €9.99/month
   - **Premium Yearly** - €99/year
   - **Pro Monthly** - €19.99/month
   - **Pro Yearly** - €199/year

3. Copy Price IDs (starts with `price_...`)

### Option B: Use Stripe CLI

```bash
# Premium Monthly
stripe products create --name="Premium Monthly" --description="Premium subscription monthly"
stripe prices create --product=prod_xxxxx --unit-amount=999 --currency=eur --recurring[interval]=month

# Premium Yearly
stripe prices create --product=prod_xxxxx --unit-amount=9900 --currency=eur --recurring[interval]=year

# Pro Monthly
stripe products create --name="Pro Monthly" --description="Pro subscription monthly"
stripe prices create --product=prod_xxxxx --unit-amount=1999 --currency=eur --recurring[interval]=month

# Pro Yearly
stripe prices create --product=prod_xxxxx --unit-amount=19900 --currency=eur --recurring[interval]=year
```

### Add Price IDs to `.env`:

```env
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxx
```

---

## Step 6: Configure Laravel

### Check `config/services.php`:

```php
'stripe' => [
    'key' => env('STRIPE_KEY'),
    'secret' => env('STRIPE_SECRET'),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
],
```

### Check `app/Services/PaymentService.php`:

Ensure it uses the price IDs from `.env`:

```php
protected function getPriceId(string $plan, string $billingCycle): string
{
    $prices = [
        'premium' => [
            'monthly' => env('STRIPE_PRICE_PREMIUM_MONTHLY'),
            'yearly' => env('STRIPE_PRICE_PREMIUM_YEARLY'),
        ],
        'pro' => [
            'monthly' => env('STRIPE_PRICE_PRO_MONTHLY'),
            'yearly' => env('STRIPE_PRICE_PRO_YEARLY'),
        ],
    ];
    
    return $prices[$plan][$billingCycle] ?? throw new \Exception("Invalid plan or billing cycle");
}
```

---

## Step 7: Test Subscription Flow

### 1. Start Laravel Server

```bash
php artisan serve
```

### 2. Start Stripe Webhook Listener (in separate terminal)

```bash
stripe listen --forward-to http://localhost:8000/api/subscriptions/webhook
```

### 3. Test Checkout

1. Go to http://localhost:8000/map
2. Open Settings → Subscription tab
3. Click "Upgrade to Premium" (Monthly or Yearly)
4. You'll be redirected to Stripe Checkout

### 4. Use Test Card

In Stripe Checkout, use test card:
- **Card:** 4242 4242 4242 4242
- **Expiry:** Any future date (e.g., 12/34)
- **CVC:** Any 3 digits (e.g., 123)
- **ZIP:** Any 5 digits (e.g., 12345)

### 5. Complete Payment

After payment, you'll be redirected back to your app. The webhook will update the subscription in your database.

---

## Step 8: Test Webhook Events

### Trigger Test Events

```bash
# Payment succeeded
stripe trigger payment_intent.succeeded

# Subscription created
stripe trigger customer.subscription.created

# Subscription updated
stripe trigger customer.subscription.updated

# Subscription canceled
stripe trigger customer.subscription.deleted
```

### View Webhook Logs

```bash
stripe logs tail
```

---

## Step 9: Test Subscription Management

### Cancel Subscription

1. Go to Settings → Subscription
2. Click "Cancel Subscription"
3. Check webhook logs to see `customer.subscription.updated` event

### Change Billing Cycle

1. Go to Settings → Subscription
2. Click "Switch to Yearly" (if on monthly)
3. Complete checkout
4. Verify subscription updated in database

---

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook listener is running:**
   ```bash
   stripe listen --forward-to http://localhost:8000/api/subscriptions/webhook
   ```

2. **Check webhook secret matches:**
   ```bash
   # In webhook listener output, copy the whsec_... value
   # Make sure it matches STRIPE_WEBHOOK_SECRET in .env
   ```

3. **Check Laravel logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

### Checkout Not Redirecting

1. **Check Stripe keys are correct:**
   ```bash
   # Test API connection
   stripe customers list --limit=1
   ```

2. **Check Laravel routes:**
   ```bash
   php artisan route:list | grep subscription
   ```

3. **Check browser console for errors**

### Subscription Not Updating

1. **Check webhook endpoint:**
   ```bash
   # Test webhook endpoint manually
   curl -X POST http://localhost:8000/api/subscriptions/webhook \
     -H "Content-Type: application/json" \
     -d '{"type":"test"}'
   ```

2. **Check database:**
   ```sql
   SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;
   ```

3. **Check webhook signature validation in code**

---

## Production Setup

When deploying to production:

1. **Switch to Live Mode:**
   - Get live API keys from https://dashboard.stripe.com/apikeys
   - Update `.env` with live keys

2. **Set Up Webhook Endpoint:**
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://yourdomain.com/api/subscriptions/webhook`
   - Copy webhook signing secret
   - Update `STRIPE_WEBHOOK_SECRET` in production `.env`

3. **Create Live Products:**
   - Create products and prices in live mode
   - Update price IDs in production `.env`

---

## Useful Commands

```bash
# List all customers
stripe customers list

# List all subscriptions
stripe subscriptions list

# Get subscription details
stripe subscriptions retrieve sub_xxxxx

# Cancel a subscription
stripe subscriptions cancel sub_xxxxx

# Refund a payment
stripe refunds create ch_xxxxx

# View events
stripe events list --limit=10
```

---

## Additional Resources

- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Stripe Testing:** https://stripe.com/docs/testing
- **Webhook Testing:** https://stripe.com/docs/webhooks/test
- **Test Cards:** https://stripe.com/docs/testing#cards

---

## Quick Start Checklist

- [ ] Install Stripe CLI
- [ ] Login: `stripe login`
- [ ] Copy test API keys to `.env`
- [ ] Start webhook listener: `stripe listen --forward-to http://localhost:8000/api/subscriptions/webhook`
- [ ] Copy webhook secret to `.env`
- [ ] Create test products and prices
- [ ] Add price IDs to `.env`
- [ ] Test checkout flow
- [ ] Verify webhook events are received
- [ ] Test subscription management

---

## Support

If you encounter issues:

1. Check Stripe Dashboard → Developers → Logs
2. Check Laravel logs: `storage/logs/laravel.log`
3. Check webhook logs: `stripe logs tail`
4. Review Stripe documentation: https://stripe.com/docs

