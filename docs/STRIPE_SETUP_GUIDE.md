# Stripe Dashboard Setup Guide

## Step 1: Get Your API Keys

1. Go to https://dashboard.stripe.com
2. Make sure you're in **Test mode** (toggle in top right)
3. Click **Developers** → **API keys**
4. Copy these values (you'll need them for `.env`):
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

## Step 2: Create Products and Prices

### Create Premium Product

1. Go to **Products** in the left sidebar
2. Click **+ Add product**
3. Fill in:
   - **Name:** Premium
   - **Description:** Premium subscription for ScenicRoutes
   - Click **Save product**

4. **Add Monthly Price:**
   - Click **Add another price**
   - **Price:** $9.99
   - **Billing period:** Recurring → Monthly
   - **Currency:** USD
   - Click **Add price**
   - **Copy the Price ID** (starts with `price_...`) - you'll need this!

5. **Add Yearly Price:**
   - Click **Add another price** on the same product
   - **Price:** $99.00
   - **Billing period:** Recurring → Yearly
   - **Currency:** USD
   - Click **Add price**
   - **Copy the Price ID** (starts with `price_...`) - you'll need this!

### Create Pro Product

1. Click **+ Add product** again
2. Fill in:
   - **Name:** Pro
   - **Description:** Pro subscription for ScenicRoutes
   - Click **Save product**

3. **Add Monthly Price:**
   - **Price:** $19.99
   - **Billing period:** Recurring → Monthly
   - **Currency:** USD
   - Click **Add price**
   - **Copy the Price ID**

4. **Add Yearly Price:**
   - **Price:** $199.00
   - **Billing period:** Recurring → Yearly
   - **Currency:** USD
   - Click **Add price**
   - **Copy the Price ID**

## Step 3: Set Up Webhooks (For Local Development)

### Option A: Using Stripe CLI (Recommended for Development)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:8000/api/subscriptions/webhook
   ```
4. Copy the **webhook signing secret** (starts with `whsec_...`)

### Option B: Using Stripe Dashboard (For Production)

1. Go to **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. **Endpoint URL:** `https://yourdomain.com/api/subscriptions/webhook`
4. **Description:** ScenicRoutes Subscription Webhooks
5. **Events to send:**
   - Select **Select events**
   - Choose these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
6. Click **Add endpoint**
7. Click on the endpoint → **Signing secret** → **Reveal** → Copy it

## Step 4: Summary - What You Need

After completing the above, you should have:

✅ **API Keys:**
- Publishable key: `pk_test_...`
- Secret key: `sk_test_...`

✅ **Price IDs:**
- Premium Monthly: `price_...`
- Premium Yearly: `price_...`
- Pro Monthly: `price_...`
- Pro Yearly: `price_...`

✅ **Webhook Secret:**
- Webhook signing secret: `whsec_...`

**Next:** We'll add these to your `.env` file in the next step!



