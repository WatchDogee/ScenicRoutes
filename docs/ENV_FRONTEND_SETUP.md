# Frontend Environment Setup

## Add Stripe Publishable Key

Add this to your `.env` file:

```env
VITE_STRIPE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**Important:** 
- This is the **publishable key** (starts with `pk_test_...`)
- NOT the secret key
- This is safe to expose in frontend code

After adding, restart your Vite dev server:
```bash
npm run dev
```

## Summary of Environment Variables Needed

Your `.env` file should now have:

```env
# Backend Stripe Keys
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_TOLERANCE=300

# Stripe Price IDs
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

# Frontend Stripe Key (for Stripe.js)
VITE_STRIPE_KEY=pk_test_...

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

---

**Note:** The `VITE_` prefix makes the variable available in the frontend code via `import.meta.env.VITE_STRIPE_KEY`



