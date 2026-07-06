# Final Setup Steps - Ready to Go! 🚀

## ✅ What's Already Done

- ✅ Laravel Cashier installed
- ✅ Stripe.js installed  
- ✅ Database migrations created
- ✅ All code implemented
- ✅ Cashier migrations published (kept only what we need)

## 📋 What You Need to Do Now

### Step 1: Get Your Price IDs (2 minutes)

1. Go to: **https://dashboard.stripe.com/test/products**
2. Click on **Premium** product
3. You'll see prices - click on each one
4. Copy the **Price ID** (starts with `price_...`)
   - Premium Monthly: `price_...`
   - Premium Yearly: `price_...`
5. Click on **Pro** product  
6. Copy:
   - Pro Monthly: `price_...`
   - Pro Yearly: `price_...`

### Step 2: Add to .env File

Open your `.env` file and add these at the end:

```env
# ============================================
# STRIPE CONFIGURATION
# ============================================

STRIPE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
STRIPE_WEBHOOK_TOLERANCE=300

STRIPE_PRICE_PREMIUM_MONTHLY=price_YOUR_PREMIUM_MONTHLY_ID
STRIPE_PRICE_PREMIUM_YEARLY=price_YOUR_PREMIUM_YEARLY_ID
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_MONTHLY_ID
STRIPE_PRICE_PRO_YEARLY=price_YOUR_PRO_YEARLY_ID

FRONTEND_URL=http://localhost:5173
```

**Replace ALL `YOUR_*` placeholders with actual values!**

### Step 3: Run Migrations

```bash
php artisan migrate
```

This will:
- Add `stripe_id` column to users table (from Cashier)
- Enhance subscriptions table with payment fields
- Create route_usages table

### Step 4: Set Up Webhook Forwarding

Open a **NEW terminal window** and run:

```bash
stripe listen --forward-to localhost:8000/api/subscriptions/webhook
```

**Keep this terminal open!** It will:
- Show a webhook signing secret (starts with `whsec_...`)
- Forward Stripe events to your local server

**If you see a new webhook secret**, copy it and update `STRIPE_WEBHOOK_SECRET` in your `.env` file.

### Step 5: Test It! 🧪

1. **Start Laravel server** (in another terminal):
   ```bash
   php artisan serve
   ```

2. **Test the API**:
   ```bash
   curl http://localhost:8000/api/subscriptions/plans
   ```

   You should see JSON with subscription plans!

3. **Or test in browser:**
   - Go to: http://localhost:8000/api/subscriptions/plans
   - Should show your subscription plans

## ✅ Quick Checklist

- [ ] Got all 4 Price IDs from Stripe dashboard
- [ ] Added all keys to `.env` file (STRIPE_KEY, STRIPE_SECRET, etc.)
- [ ] Added all Price IDs to `.env` file
- [ ] Ran `php artisan migrate` successfully
- [ ] Started Stripe webhook forwarding (`stripe listen`)
- [ ] Tested `/api/subscriptions/plans` endpoint

## 🎯 Next Steps After Setup

Once everything is working:

1. ✅ Backend is ready!
2. Next: Create frontend subscription page
3. Next: Add subscription badge to header
4. Next: Add route limit warnings
5. Next: Test full subscription flow

## 🐛 Troubleshooting

**"Price ID not found" error:**
- Check Price IDs in `.env` exactly match Stripe dashboard
- No extra spaces or quotes around values
- Run `php artisan config:clear`

**"Stripe key not set":**
- Verify `.env` has STRIPE_KEY and STRIPE_SECRET
- Run `php artisan config:clear`
- Make sure `.env` file is in project root

**Migration errors:**
- Check if `subscriptions` table already exists
- If conflict, we may need to adjust migration order
- Check database connection

**Webhook not working:**
- Make sure Stripe CLI is running (`stripe listen`)
- Check webhook secret in `.env` matches what Stripe CLI shows
- Verify Laravel server is running on port 8000

---

**Once you've completed these steps, let me know and we'll continue with the frontend!** 🎉



