<?php

namespace App\Services;

use App\Models\User;
use App\Models\Subscription;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public function __construct()
    {
        // Initialize Stripe API key
        \Stripe\Stripe::setApiKey(config('services.stripe.secret'));
    }
    
    /**
     * Create a checkout session for subscription
     */
    public function createCheckoutSession(User $user, string $plan, string $billingCycle = 'monthly', ?int $trialDays = null)
    {
        $priceId = $this->getPriceId($plan, $billingCycle);
        
        // Ensure user has a Stripe customer ID before creating checkout
        if (!$user->stripe_id) {
            $user->createAsStripeCustomer();
        }
        
        $payload = [
            'customer' => $user->stripe_id,
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'mode' => 'subscription',
            'success_url' => config('app.frontend_url', url('/')) . '/map?subscription=success',
            'cancel_url' => config('app.frontend_url', url('/')) . '/map?subscription=canceled',
            'metadata' => [
                'user_id' => $user->id,
                'plan' => $plan,
                'billing_cycle' => $billingCycle,
            ],
        ];

        if ($trialDays && $trialDays > 0) {
            $payload['subscription_data'] = [
                'trial_period_days' => $trialDays,
            ];
        }

        $session = \Stripe\Checkout\Session::create($payload);
        
        return $session;
    }
    
    /**
     * Create subscription directly (for API)
     */
    public function createSubscription(User $user, string $paymentMethodId, string $plan, string $billingCycle = 'monthly')
    {
        try {
            $priceId = $this->getPriceId($plan, $billingCycle);
            
            // Create or get Stripe customer
            if (!$user->stripe_id) {
                $user->createAsStripeCustomer();
            }
            
            // Attach payment method
            $user->updateDefaultPaymentMethod($paymentMethodId);
            
            // Create subscription
            $subscription = $user->newSubscription('default', $priceId)
                ->create($paymentMethodId);
            
            // Update local subscription record
            $this->syncSubscriptionFromStripe($user, $subscription, $plan, $billingCycle);
            
            return $subscription;
        } catch (\Exception $e) {
            Log::error('Failed to create subscription', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
    
    /**
     * Update subscription plan
     */
    public function updateSubscription(User $user, string $newPlan, string $billingCycle = 'monthly')
    {
        // Get local subscription
        $localSubscription = Subscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();
        
        if (!$localSubscription) {
            throw new \Exception('No active subscription found');
        }
        
        if (!$localSubscription->stripe_subscription_id) {
            throw new \Exception('No Stripe subscription found');
        }
        
        $newPriceId = $this->getPriceId($newPlan, $billingCycle);
        
        // Swap plan using Stripe API
        try {
            \Stripe\Subscription::update(
                $localSubscription->stripe_subscription_id,
                ['items' => [['id' => $localSubscription->stripe_subscription_id, 'price' => $newPriceId]]]
            );
        } catch (\Exception $e) {
            Log::error('Failed to update Stripe subscription', [
                'error' => $e->getMessage(),
                'stripe_id' => $localSubscription->stripe_subscription_id,
            ]);
            throw $e;
        }
        
        // Update local record
        $localSubscription->update([
            'plan' => $newPlan,
            'billing_cycle' => $billingCycle,
            'stripe_price_id' => $newPriceId,
        ]);
        
        return $localSubscription;
    }
    
    /**
     * Cancel subscription
     */
    public function cancelSubscription(User $user, bool $atPeriodEnd = true)
    {
        // Get local subscription
        $localSubscription = Subscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();
            
        if (!$localSubscription) {
            throw new \Exception('No active subscription found');
        }
        
        // Cancel Stripe subscription directly using Stripe API
        if ($localSubscription->stripe_subscription_id) {
            try {
                if ($atPeriodEnd) {
                    // Cancel at period end (preserve access until expiration)
                    \Stripe\Subscription::update(
                        $localSubscription->stripe_subscription_id,
                        ['cancel_at_period_end' => true]
                    );
                } else {
                    // Cancel immediately
                    \Stripe\Subscription::retrieve(
                        $localSubscription->stripe_subscription_id
                    )->cancel();
                }
            } catch (\Exception $e) {
                Log::error('Failed to cancel Stripe subscription', [
                    'error' => $e->getMessage(),
                    'stripe_id' => $localSubscription->stripe_subscription_id,
                ]);
                throw $e;
            }
        }
        
        // Update local subscription record
        $localSubscription->update([
            'cancelled_at' => now(),
            'cancel_at_period_end' => $atPeriodEnd,
        ]);
        
        return $localSubscription;
    }
    
    /**
     * Resume cancelled subscription
     */
    public function resumeSubscription(User $user)
    {
        // Find local subscription with cancel_at_period_end flag
        $localSubscription = Subscription::where('user_id', $user->id)
            ->where('cancel_at_period_end', true)
            ->first();
            
        if (!$localSubscription) {
            throw new \Exception('No subscription scheduled for cancellation');
        }
        
        // Resume Stripe subscription using Stripe API
        if ($localSubscription->stripe_subscription_id) {
            try {
                \Stripe\Subscription::update(
                    $localSubscription->stripe_subscription_id,
                    ['cancel_at_period_end' => false]
                );
            } catch (\Exception $e) {
                Log::error('Failed to resume Stripe subscription', [
                    'error' => $e->getMessage(),
                    'stripe_id' => $localSubscription->stripe_subscription_id,
                ]);
                throw $e;
            }
        }
        
        // Update local record
        $localSubscription->update([
            'cancelled_at' => null,
            'cancel_at_period_end' => false,
        ]);
        
        return $localSubscription;
    }
    
    /**
     * Update payment method
     */
    public function updatePaymentMethod(User $user, string $paymentMethodId)
    {
        if (!$user->stripe_id) {
            $user->createAsStripeCustomer();
        }
        
        $user->updateDefaultPaymentMethod($paymentMethodId);
        
        return $user->defaultPaymentMethod();
    }
    
    /**
     * Sync subscription from Stripe webhook
     */
    public function syncSubscriptionFromStripe(User $user, $stripeSubscription, ?string $plan = null, ?string $billingCycle = null)
    {
        // Ensure we have a full subscription object (expand if needed)
        if (is_string($stripeSubscription)) {
            $stripeSubscription = \Stripe\Subscription::retrieve($stripeSubscription);
        }
        
        $price = $stripeSubscription->items->data[0]->price ?? null;
        if (!$price) {
            throw new \Exception('No price found in subscription');
        }
        
        $subscription = Subscription::updateOrCreate(
            [
                'user_id' => $user->id,
                'stripe_subscription_id' => $stripeSubscription->id,
            ],
            [
                'stripe_customer_id' => $stripeSubscription->customer,
                'stripe_price_id' => $price->id,
                'plan' => $plan ?? $this->getPlanFromPriceId($price->id),
                'billing_cycle' => $billingCycle ?? $this->getBillingCycleFromPriceId($price->id),
                'status' => $this->mapStripeStatus($stripeSubscription->status),
                'starts_at' => isset($stripeSubscription->current_period_start) ? now()->setTimestamp($stripeSubscription->current_period_start) : now(),
                'ends_at' => isset($stripeSubscription->current_period_end) ? now()->setTimestamp($stripeSubscription->current_period_end) : now()->addMonth(),
                'trial_ends_at' => isset($stripeSubscription->trial_end) && $stripeSubscription->trial_end ? now()->setTimestamp($stripeSubscription->trial_end) : null,
                'cancelled_at' => isset($stripeSubscription->canceled_at) && $stripeSubscription->canceled_at ? now()->setTimestamp($stripeSubscription->canceled_at) : null,
                'cancel_at_period_end' => $stripeSubscription->cancel_at_period_end ?? false,
                'amount' => isset($price->unit_amount) ? $price->unit_amount / 100 : 0,
                'currency' => isset($price->currency) ? strtoupper($price->currency) : 'USD',
            ]
        );
        
        return $subscription;
    }
    
    /**
     * Get Stripe price ID for plan
     */
    protected function getPriceId(string $plan, string $billingCycle): string
    {
        $prices = [
            'premium' => [
                'monthly' => config('services.stripe.prices.premium_monthly'),
                'yearly' => config('services.stripe.prices.premium_yearly'),
            ],
            'pro' => [
                'monthly' => config('services.stripe.prices.pro_monthly'),
                'yearly' => config('services.stripe.prices.pro_yearly'),
            ],
        ];
        
        if (!isset($prices[$plan][$billingCycle])) {
            throw new \Exception("Invalid plan or billing cycle: {$plan} - {$billingCycle}");
        }

        if (empty($prices[$plan][$billingCycle])) {
            throw new \Exception("Stripe price ID not configured for {$plan} ({$billingCycle})");
        }
        
        return $prices[$plan][$billingCycle];
    }
    
    /**
     * Map Stripe subscription status to local status
     */
    protected function mapStripeStatus(string $stripeStatus): string
    {
        $mapping = [
            'active' => 'active',
            'trialing' => 'trialing',
            'past_due' => 'active', // Still active but payment failed
            'canceled' => 'cancelled',
            'unpaid' => 'expired',
            'incomplete' => 'active',
            'incomplete_expired' => 'expired',
        ];
        
        return $mapping[$stripeStatus] ?? 'active';
    }
    
    protected function getPlanFromPriceId(string $priceId): string
    {
        // Check if price ID contains plan name or check Stripe API
        $premiumMonthly = config('services.stripe.prices.premium_monthly');
        $premiumYearly = config('services.stripe.prices.premium_yearly');
        $proMonthly = config('services.stripe.prices.pro_monthly');
        $proYearly = config('services.stripe.prices.pro_yearly');
        
        if ($priceId === $premiumMonthly || $priceId === $premiumYearly) {
            return 'premium';
        } elseif ($priceId === $proMonthly || $priceId === $proYearly) {
            return 'pro';
        }
        
        // Fallback: try to get from Stripe
        try {
            $price = \Stripe\Price::retrieve($priceId);
            $product = \Stripe\Product::retrieve($price->product);
            $name = strtolower($product->name);
            
            if (str_contains($name, 'pro')) {
                return 'pro';
            } elseif (str_contains($name, 'premium')) {
                return 'premium';
            }
        } catch (\Exception $e) {
            Log::warning('Could not determine plan from price ID', ['price_id' => $priceId]);
        }
        
        return 'premium'; // Default fallback
    }
    
    protected function getBillingCycleFromPriceId(string $priceId): string
    {
        $premiumYearly = config('services.stripe.prices.premium_yearly');
        $proYearly = config('services.stripe.prices.pro_yearly');
        
        if ($priceId === $premiumYearly || $priceId === $proYearly) {
            return 'yearly';
        }
        
        // Fallback: check Stripe
        try {
            $price = \Stripe\Price::retrieve($priceId);
            if ($price->recurring && $price->recurring->interval === 'year') {
                return 'yearly';
            }
        } catch (\Exception $e) {
            Log::warning('Could not determine billing cycle from price ID', ['price_id' => $priceId]);
        }
        
        return 'monthly'; // Default fallback
    }
}


