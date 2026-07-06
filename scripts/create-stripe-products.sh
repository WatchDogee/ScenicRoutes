#!/bin/bash
# Bash script to create Stripe products and prices
# Run this after setting up Stripe CLI and logging in

echo "Creating Stripe Products and Prices..."
echo ""

# Premium Monthly
echo "Creating Premium Monthly product..."
PREMIUM_MONTHLY_PRODUCT=$(stripe products create --name="Premium Monthly" --description="Premium subscription - Monthly billing" --expand=default_price | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PREMIUM_MONTHLY_PRICE=$(stripe prices create --product="$PREMIUM_MONTHLY_PRODUCT" --unit-amount=299 --currency=eur --recurring[interval]=month | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Premium Monthly Price ID: $PREMIUM_MONTHLY_PRICE"
echo "Add to .env: STRIPE_PRICE_PREMIUM_MONTHLY=$PREMIUM_MONTHLY_PRICE"
echo ""

# Premium Yearly
echo "Creating Premium Yearly product..."
PREMIUM_YEARLY_PRODUCT=$(stripe products create --name="Premium Yearly" --description="Premium subscription - Yearly billing" --expand=default_price | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PREMIUM_YEARLY_PRICE=$(stripe prices create --product="$PREMIUM_YEARLY_PRODUCT" --unit-amount=2900 --currency=eur --recurring[interval]=year | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Premium Yearly Price ID: $PREMIUM_YEARLY_PRICE"
echo "Add to .env: STRIPE_PRICE_PREMIUM_YEARLY=$PREMIUM_YEARLY_PRICE"
echo ""

# Pro Monthly
echo "Creating Pro Monthly product..."
PRO_MONTHLY_PRODUCT=$(stripe products create --name="Pro Monthly" --description="Pro subscription - Monthly billing" --expand=default_price | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PRO_MONTHLY_PRICE=$(stripe prices create --product="$PRO_MONTHLY_PRODUCT" --unit-amount=599 --currency=eur --recurring[interval]=month | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Pro Monthly Price ID: $PRO_MONTHLY_PRICE"
echo "Add to .env: STRIPE_PRICE_PRO_MONTHLY=$PRO_MONTHLY_PRICE"
echo ""

# Pro Yearly
echo "Creating Pro Yearly product..."
PRO_YEARLY_PRODUCT=$(stripe products create --name="Pro Yearly" --description="Pro subscription - Yearly billing" --expand=default_price | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PRO_YEARLY_PRICE=$(stripe prices create --product="$PRO_YEARLY_PRODUCT" --unit-amount=5900 --currency=eur --recurring[interval]=year | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Pro Yearly Price ID: $PRO_YEARLY_PRICE"
echo "Add to .env: STRIPE_PRICE_PRO_YEARLY=$PRO_YEARLY_PRICE"
echo ""

echo "=== Summary ==="
echo "Premium Monthly: €2.99/month - Price ID: $PREMIUM_MONTHLY_PRICE"
echo "Premium Yearly: €29/year - Price ID: $PREMIUM_YEARLY_PRICE"
echo "Pro Monthly: €5.99/month - Price ID: $PRO_MONTHLY_PRICE"
echo "Pro Yearly: €59/year - Price ID: $PRO_YEARLY_PRICE"
echo ""
echo "Copy these to your .env file:"
echo "STRIPE_PRICE_PREMIUM_MONTHLY=$PREMIUM_MONTHLY_PRICE"
echo "STRIPE_PRICE_PREMIUM_YEARLY=$PREMIUM_YEARLY_PRICE"
echo "STRIPE_PRICE_PRO_MONTHLY=$PRO_MONTHLY_PRICE"
echo "STRIPE_PRICE_PRO_YEARLY=$PRO_YEARLY_PRICE"
