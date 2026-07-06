# Quick Setup Steps - Do This Now!

## Step 1: Get Your Price IDs (2 minutes)

1. Go to: https://dashboard.stripe.com/test/products
2. Click on **Premium** product
3. You'll see prices listed - click on each price
4. Copy the **Price ID** (starts with `price_...`)
   - Premium Monthly: `price_...`
   - Premium Yearly: `price_...`
5. Click on **Pro** product
6. Copy the Price IDs:
   - Pro Monthly: `price_...`
   - Pro Yearly: `price_...`

## Step 2: Add to .env File

Open your `.env` file and add these lines (replace with your actual values):

```env
# Stripe Configuration
STRIPE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_WEBHOOK_TOLERANCE=300

# Stripe Price IDs
STRIPE_PRICE_PREMIUM_MONTHLY=price_YOUR_PREMIUM_MONTHLY_ID
STRIPE_PRICE_PREMIUM_YEARLY=price_YOUR_PREMIUM_YEARLY_ID
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_MONTHLY_ID
STRIPE_PRICE_PRO_YEARLY=price_YOUR_PRO_YEARLY_ID

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Important:** 
- Replace ALL `YOUR_*` placeholders with actual values
- Don't include quotes around the values
- Make sure there are no spaces around the `=` sign

## Step 3: Run Migrations

After adding to .env, run:

```bash
php artisan migrate
```

## Step 4: Set Up Webhook Forwarding

Open a **new terminal window** and run:

```bash
stripe listen --forward-to localhost:8000/api/subscriptions/webhook
```

This will:
- Forward Stripe webhooks to your local server
- Show you a webhook signing secret (starts with `whsec_...`)
- Keep running (don't close this terminal)

**If you see a webhook secret**, copy it and add it to `.env` as `STRIPE_WEBHOOK_SECRET`

## Step 5: Test It!

1. Start your Laravel server (in another terminal):
   ```bash
   php artisan serve
   ```

2. Test the API:
   ```bash
   curl http://localhost:8000/api/subscriptions/plans
   ```

   You should see JSON with your subscription plans!

## ✅ Checklist

- [ ] Got all 4 Price IDs from Stripe
- [ ] Added all keys to `.env` file
- [ ] Ran `php artisan migrate`
- [ ] Started Stripe webhook forwarding
- [ ] Tested `/api/subscriptions/plans` endpoint

## 🐛 Troubleshooting

**"Price ID not found" error:**
- Double-check Price IDs in `.env` match Stripe dashboard
- Make sure no extra spaces or quotes

**"Stripe key not set" error:**
- Check `.env` file has STRIPE_KEY and STRIPE_SECRET
- Run `php artisan config:clear`

**Webhook not working:**
- Make sure Stripe CLI is running
- Check webhook secret is correct in `.env`

---

**Once you've done these steps, let me know and we'll continue!**



