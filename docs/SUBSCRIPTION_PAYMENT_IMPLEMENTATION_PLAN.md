# Subscription & Payment Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to implement subscription management and payment processing for ScenicRoutes. The implementation will enable monetization through tiered subscription plans with feature gating and usage limits.

**Timeline:** 2-3 weeks  
**Priority:** 🔴 CRITICAL  
**Revenue Impact:** CRITICAL (Enables monetization)

---

## Current State Analysis

### ✅ What Exists
- `Subscription` model with basic fields (plan, status, dates)
- `subscriptions` table migration
- `SubscriptionController` (empty skeleton)
- `CheckRouteLimit` middleware (empty skeleton)
- `RouteUsage` model (empty skeleton)
- User model has `subscription()` relationship
- Offline map service already checks subscription for download limits

### ❌ What's Missing
- Payment provider integration (Stripe/Paddle)
- Payment processing logic
- Subscription management endpoints
- Route usage tracking
- Feature gating middleware
- Frontend subscription UI
- Webhook handling
- Database schema enhancements for payment data

---

## Payment Provider Selection

### Recommendation: **Stripe**

**Why Stripe:**
- ✅ Industry standard, widely trusted
- ✅ Excellent Laravel integration (Laravel Cashier)
- ✅ Comprehensive webhook system
- ✅ Strong documentation and support
- ✅ Supports subscriptions, one-time payments, and more
- ✅ Built-in fraud protection
- ✅ PCI compliance handled by Stripe
- ✅ Supports multiple currencies and payment methods

**Alternative: Paddle**
- Good for EU-based businesses (handles VAT automatically)
- Merchant of record model
- Consider if primarily targeting EU market

**Decision:** Use **Stripe with Laravel Cashier** for fastest implementation.

---

## Subscription Tiers & Pricing

### Free Tier
**Limits:**
- 10 route calculations per day
- Basic route planning (straightest route only)
- 5 saved roads maximum
- Public roads only
- Basic POI search (no filters)
- No offline maps
- No ride recording
- No turn-by-turn navigation
- No GPX export

### Premium Tier
**Price:** $9.99/month or $99/year (17% savings)

**Features:**
- ✅ Unlimited route calculations
- ✅ All curvature levels (curvy, extra_curvy, round-trip)
- ✅ Unlimited saved roads
- ✅ Private roads
- ✅ Advanced POI filters
- ✅ 7-day weather forecasts
- ✅ GPX/KML export
- ✅ Offline map downloads (no region limit, 500MB)
- ✅ Turn-by-turn navigation
- ✅ Ride recording
- ✅ Priority email support

### Pro Tier
**Price:** $19.99/month or $199/year (17% savings)

**Features:**
- ✅ Everything in Premium
- ✅ API access (1000 requests/month)
- ✅ Unlimited offline maps
- ✅ Advanced analytics dashboard
- ✅ Custom branding (for API users)
- ✅ Priority support (24/7)
- ✅ Early access to new features

---

## Database Schema

### Enhanced Subscriptions Table

```php
// Migration: 2025_XX_XX_XXXXXX_enhance_subscriptions_table.php

Schema::table('subscriptions', function (Blueprint $table) {
    // Payment provider fields
    $table->string('stripe_subscription_id')->nullable()->unique()->after('user_id');
    $table->string('stripe_customer_id')->nullable()->after('stripe_subscription_id');
    $table->string('stripe_price_id')->nullable()->after('stripe_customer_id');
    
    // Payment details
    $table->string('payment_method')->default('stripe')->after('plan'); // stripe, paddle
    $table->string('billing_cycle')->nullable()->after('payment_method'); // monthly, yearly
    $table->decimal('amount', 10, 2)->nullable()->after('billing_cycle');
    $table->string('currency', 3)->default('USD')->after('amount');
    
    // Subscription lifecycle
    $table->timestamp('trial_ends_at')->nullable()->after('ends_at');
    $table->timestamp('cancelled_at')->nullable()->after('trial_ends_at');
    $table->string('cancellation_reason')->nullable()->after('cancelled_at');
    $table->boolean('cancel_at_period_end')->default(false)->after('cancellation_reason');
    
    // Metadata
    $table->json('metadata')->nullable()->after('cancel_at_period_end');
    
    // Indexes
    $table->index(['user_id', 'status']);
    $table->index('stripe_subscription_id');
    $table->index('stripe_customer_id');
});
```

### Route Usage Tracking Table

```php
// Migration: 2025_XX_XX_XXXXXX_create_route_usages_table.php

Schema::create('route_usages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('saved_road_id')->nullable()->constrained('saved_roads')->onDelete('set null');
    $table->string('route_type'); // graphhopper, round_trip, curved, straightest
    $table->string('curvature_level')->nullable(); // straightest, curvy, extra_curvy
    $table->integer('waypoints_count')->default(2);
    $table->decimal('distance_km', 10, 2)->nullable();
    $table->timestamp('used_at');
    $table->timestamps();
    
    $table->index(['user_id', 'used_at']);
    $table->index(['user_id', 'route_type']);
    $table->index('used_at');
});
```

### Payment Transactions Table (Optional - for detailed history)

```php
// Migration: 2025_XX_XX_XXXXXX_create_payment_transactions_table.php

Schema::create('payment_transactions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('subscription_id')->nullable()->constrained()->onDelete('set null');
    $table->string('stripe_payment_intent_id')->nullable()->unique();
    $table->string('stripe_invoice_id')->nullable();
    $table->string('type'); // subscription, one_time, refund
    $table->decimal('amount', 10, 2);
    $table->string('currency', 3)->default('USD');
    $table->string('status'); // pending, succeeded, failed, refunded
    $table->json('metadata')->nullable();
    $table->timestamps();
    
    $table->index(['user_id', 'status']);
    $table->index('stripe_payment_intent_id');
});
```

---

## Backend Implementation

### 1. Install Dependencies

```bash
composer require laravel/cashier
php artisan vendor:publish --tag="cashier-migrations"
php artisan migrate
```

### 2. Environment Configuration

Add to `.env`:
```env
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_TOLERANCE=300
```

### 3. User Model Enhancement

```php
// app/Models/User.php

use Laravel\Cashier\Billable;

class User extends Authenticatable
{
    use Billable; // Add this trait
    
    // Add method to check subscription tier
    public function hasActiveSubscription($tier = null)
    {
        $subscription = $this->subscription;
        
        if (!$subscription || $subscription->status !== 'active') {
            return false;
        }
        
        if ($subscription->ends_at && $subscription->ends_at->isPast()) {
            return false;
        }
        
        if ($tier) {
            return $subscription->plan === $tier;
        }
        
        return true;
    }
    
    public function getSubscriptionTier()
    {
        if ($this->hasActiveSubscription()) {
            return $this->subscription->plan;
        }
        return 'free';
    }
}
```

### 4. Payment Service

```php
// app/Services/PaymentService.php

namespace App\Services;

use App\Models\User;
use App\Models\Subscription;
use Laravel\Cashier\Subscription as CashierSubscription;
use Stripe\Exception\ApiErrorException;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    protected $stripe;
    
    public function __construct()
    {
        \Stripe\Stripe::setApiKey(config('services.stripe.secret'));
    }
    
    /**
     * Create a checkout session for subscription
     */
    public function createCheckoutSession(User $user, string $plan, string $billingCycle = 'monthly')
    {
        $priceId = $this->getPriceId($plan, $billingCycle);
        
        $session = \Stripe\Checkout\Session::create([
            'customer_email' => $user->email,
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'mode' => 'subscription',
            'success_url' => config('app.frontend_url') . '/subscription?success=true',
            'cancel_url' => config('app.frontend_url') . '/subscription?canceled=true',
            'metadata' => [
                'user_id' => $user->id,
                'plan' => $plan,
                'billing_cycle' => $billingCycle,
            ],
        ]);
        
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
        $subscription = $user->subscription('default');
        
        if (!$subscription) {
            throw new \Exception('No active subscription found');
        }
        
        $newPriceId = $this->getPriceId($newPlan, $billingCycle);
        
        $subscription->swap($newPriceId);
        
        // Update local record
        $localSubscription = Subscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();
            
        if ($localSubscription) {
            $localSubscription->update([
                'plan' => $newPlan,
                'billing_cycle' => $billingCycle,
                'stripe_price_id' => $newPriceId,
            ]);
        }
        
        return $subscription;
    }
    
    /**
     * Cancel subscription
     */
    public function cancelSubscription(User $user, bool $atPeriodEnd = true)
    {
        $subscription = $user->subscription('default');
        
        if (!$subscription) {
            throw new \Exception('No active subscription found');
        }
        
        if ($atPeriodEnd) {
            $subscription->cancel();
        } else {
            $subscription->cancelNow();
        }
        
        // Update local record
        $localSubscription = Subscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();
            
        if ($localSubscription) {
            $localSubscription->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancel_at_period_end' => $atPeriodEnd,
            ]);
        }
        
        return $subscription;
    }
    
    /**
     * Resume cancelled subscription
     */
    public function resumeSubscription(User $user)
    {
        $subscription = $user->subscription('default');
        
        if (!$subscription) {
            throw new \Exception('No subscription found');
        }
        
        $subscription->resume();
        
        // Update local record
        $localSubscription = Subscription::where('user_id', $user->id)
            ->where('status', 'cancelled')
            ->first();
            
        if ($localSubscription) {
            $localSubscription->update([
                'status' => 'active',
                'cancelled_at' => null,
                'cancel_at_period_end' => false,
            ]);
        }
        
        return $subscription;
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
    public function syncSubscriptionFromStripe(User $user, $stripeSubscription, string $plan = null, string $billingCycle = null)
    {
        $subscription = Subscription::updateOrCreate(
            [
                'user_id' => $user->id,
                'stripe_subscription_id' => $stripeSubscription->id,
            ],
            [
                'stripe_customer_id' => $stripeSubscription->customer,
                'stripe_price_id' => $stripeSubscription->items->data[0]->price->id,
                'plan' => $plan ?? $this->getPlanFromPriceId($stripeSubscription->items->data[0]->price->id),
                'billing_cycle' => $billingCycle ?? $this->getBillingCycleFromPriceId($stripeSubscription->items->data[0]->price->id),
                'status' => $this->mapStripeStatus($stripeSubscription->status),
                'starts_at' => now()->setTimestamp($stripeSubscription->current_period_start),
                'ends_at' => now()->setTimestamp($stripeSubscription->current_period_end),
                'trial_ends_at' => $stripeSubscription->trial_end ? now()->setTimestamp($stripeSubscription->trial_end) : null,
                'cancelled_at' => $stripeSubscription->canceled_at ? now()->setTimestamp($stripeSubscription->canceled_at) : null,
                'cancel_at_period_end' => $stripeSubscription->cancel_at_period_end,
                'amount' => $stripeSubscription->items->data[0]->price->unit_amount / 100,
                'currency' => strtoupper($stripeSubscription->items->data[0]->price->currency),
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
        
        return $prices[$plan][$billingCycle] ?? throw new \Exception("Invalid plan or billing cycle");
    }
    
    /**
     * Map Stripe subscription status to local status
     */
    protected function mapStripeStatus(string $stripeStatus): string
    {
        $mapping = [
            'active' => 'active',
            'trialing' => 'active',
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
        // Extract plan from price ID or check Stripe API
        // This should match your Stripe price IDs
        if (str_contains($priceId, 'premium')) {
            return 'premium';
        } elseif (str_contains($priceId, 'pro')) {
            return 'pro';
        }
        return 'premium';
    }
    
    protected function getBillingCycleFromPriceId(string $priceId): string
    {
        // Extract billing cycle from price ID
        if (str_contains($priceId, 'year') || str_contains($priceId, 'annual')) {
            return 'yearly';
        }
        return 'monthly';
    }
}
```

### 5. Subscription Service

```php
// app/Services/SubscriptionService.php

namespace App\Services;

use App\Models\User;
use App\Models\RouteUsage;
use Carbon\Carbon;

class SubscriptionService
{
    /**
     * Check if user can calculate more routes
     */
    public function canCalculateRoute(User $user): array
    {
        $tier = $user->getSubscriptionTier();
        
        if ($tier === 'pro' || $tier === 'premium') {
            return [
                'allowed' => true,
                'remaining' => PHP_INT_MAX,
                'limit' => PHP_INT_MAX,
            ];
        }
        
        // Free tier: 10 routes per day
        $today = now()->startOfDay();
        $todayCount = RouteUsage::where('user_id', $user->id)
            ->where('used_at', '>=', $today)
            ->count();
        
        $limit = 10;
        $remaining = max(0, $limit - $todayCount);
        
        return [
            'allowed' => $remaining > 0,
            'remaining' => $remaining,
            'limit' => $limit,
            'reset_at' => $today->copy()->addDay(),
        ];
    }
    
    /**
     * Record route usage
     */
    public function recordRouteUsage(User $user, array $data): RouteUsage
    {
        return RouteUsage::create([
            'user_id' => $user->id,
            'saved_road_id' => $data['saved_road_id'] ?? null,
            'route_type' => $data['route_type'] ?? 'graphhopper',
            'curvature_level' => $data['curvature_level'] ?? null,
            'waypoints_count' => $data['waypoints_count'] ?? 2,
            'distance_km' => $data['distance_km'] ?? null,
            'used_at' => now(),
        ]);
    }
    
    /**
     * Check if user has access to feature
     */
    public function hasFeatureAccess(User $user, string $feature): bool
    {
        $tier = $user->getSubscriptionTier();
        
        $featureAccess = [
            'curved_routes' => ['premium', 'pro'],
            'round_trip' => ['premium', 'pro'],
            'extra_curvy' => ['premium', 'pro'],
            'offline_maps' => ['premium', 'pro'],
            'ride_recording' => ['premium', 'pro'],
            'turn_by_turn' => ['premium', 'pro'],
            'gpx_export' => ['premium', 'pro'],
            'private_roads' => ['premium', 'pro'],
            'api_access' => ['pro'],
            'unlimited_offline_maps' => ['pro'],
        ];
        
        $requiredTiers = $featureAccess[$feature] ?? [];
        return in_array($tier, $requiredTiers);
    }
    
    /**
     * Get usage statistics
     */
    public function getUsageStats(User $user, string $period = 'month'): array
    {
        $startDate = match($period) {
            'day' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };
        
        $usages = RouteUsage::where('user_id', $user->id)
            ->where('used_at', '>=', $startDate)
            ->get();
        
        return [
            'total' => $usages->count(),
            'by_type' => $usages->groupBy('route_type')->map->count(),
            'by_curvature' => $usages->whereNotNull('curvature_level')
                ->groupBy('curvature_level')
                ->map->count(),
            'total_distance_km' => $usages->sum('distance_km'),
            'period' => $period,
            'start_date' => $startDate,
        ];
    }
    
    /**
     * Get subscription limits
     */
    public function getLimits(string $tier): array
    {
        return match($tier) {
            'free' => [
                'routes_per_day' => 10,
                'saved_roads' => 5,
                'offline_map_regions' => 0,
                'offline_map_storage_mb' => 0,
            ],
            'premium' => [
                'routes_per_day' => PHP_INT_MAX,
                'saved_roads' => PHP_INT_MAX,
                'offline_map_regions' => 5,
                'offline_map_storage_mb' => 500,
            ],
            'pro' => [
                'routes_per_day' => PHP_INT_MAX,
                'saved_roads' => PHP_INT_MAX,
                'offline_map_regions' => PHP_INT_MAX,
                'offline_map_storage_mb' => PHP_INT_MAX,
            ],
            default => [],
        };
    }
}
```

### 6. Subscription Controller

```php
// app/Http/Controllers/SubscriptionController.php

namespace App\Http\Controllers;

use App\Services\PaymentService;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class SubscriptionController extends Controller
{
    protected $paymentService;
    protected $subscriptionService;
    
    public function __construct(PaymentService $paymentService, SubscriptionService $subscriptionService)
    {
        $this->paymentService = $paymentService;
        $this->subscriptionService = $subscriptionService;
    }
    
    /**
     * Get available subscription plans
     */
    public function getPlans(): JsonResponse
    {
        return response()->json([
            'plans' => [
                'free' => [
                    'name' => 'Free',
                    'price_monthly' => 0,
                    'price_yearly' => 0,
                    'features' => [
                        '10 routes per day',
                        'Basic route planning',
                        '5 saved roads',
                        'Public roads only',
                    ],
                ],
                'premium' => [
                    'name' => 'Premium',
                    'price_monthly' => 9.99,
                    'price_yearly' => 99,
                    'features' => [
                        'Unlimited routes',
                        'All curvature levels',
                        'Unlimited saved roads',
                        'Private roads',
                        'Offline maps (no region limit)',
                        'Turn-by-turn navigation',
                        'Ride recording',
                        'GPX export',
                    ],
                ],
                'pro' => [
                    'name' => 'Pro',
                    'price_monthly' => 19.99,
                    'price_yearly' => 199,
                    'features' => [
                        'Everything in Premium',
                        'API access',
                        'Unlimited offline maps',
                        'Advanced analytics',
                        'Priority support',
                    ],
                ],
            ],
        ]);
    }
    
    /**
     * Get current subscription
     */
    public function getCurrent(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription;
        $tier = $user->getSubscriptionTier();
        $limits = $this->subscriptionService->getLimits($tier);
        
        return response()->json([
            'subscription' => $subscription,
            'tier' => $tier,
            'limits' => $limits,
            'has_active_subscription' => $user->hasActiveSubscription(),
        ]);
    }
    
    /**
     * Create checkout session
     */
    public function createCheckout(Request $request): JsonResponse
    {
        $request->validate([
            'plan' => 'required|in:premium,pro',
            'billing_cycle' => 'required|in:monthly,yearly',
        ]);
        
        try {
            $user = $request->user();
            $session = $this->paymentService->createCheckoutSession(
                $user,
                $request->plan,
                $request->billing_cycle
            );
            
            return response()->json([
                'checkout_url' => $session->url,
                'session_id' => $session->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create checkout session', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);
            
            return response()->json([
                'error' => 'Failed to create checkout session',
            ], 500);
        }
    }
    
    /**
     * Upgrade subscription
     */
    public function upgrade(Request $request): JsonResponse
    {
        $request->validate([
            'plan' => 'required|in:premium,pro',
            'billing_cycle' => 'required|in:monthly,yearly',
        ]);
        
        try {
            $user = $request->user();
            
            if (!$user->hasActiveSubscription()) {
                return response()->json([
                    'error' => 'No active subscription found',
                ], 400);
            }
            
            $subscription = $this->paymentService->updateSubscription(
                $user,
                $request->plan,
                $request->billing_cycle
            );
            
            return response()->json([
                'message' => 'Subscription upgraded successfully',
                'subscription' => $user->fresh()->subscription,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to upgrade subscription', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);
            
            return response()->json([
                'error' => 'Failed to upgrade subscription',
            ], 500);
        }
    }
    
    /**
     * Cancel subscription
     */
    public function cancel(Request $request): JsonResponse
    {
        $request->validate([
            'at_period_end' => 'boolean',
        ]);
        
        try {
            $user = $request->user();
            $atPeriodEnd = $request->input('at_period_end', true);
            
            $this->paymentService->cancelSubscription($user, $atPeriodEnd);
            
            return response()->json([
                'message' => $atPeriodEnd 
                    ? 'Subscription will be cancelled at the end of the billing period'
                    : 'Subscription cancelled immediately',
                'subscription' => $user->fresh()->subscription,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to cancel subscription', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);
            
            return response()->json([
                'error' => 'Failed to cancel subscription',
            ], 500);
        }
    }
    
    /**
     * Resume subscription
     */
    public function resume(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $this->paymentService->resumeSubscription($user);
            
            return response()->json([
                'message' => 'Subscription resumed successfully',
                'subscription' => $user->fresh()->subscription,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to resume subscription', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);
            
            return response()->json([
                'error' => 'Failed to resume subscription',
            ], 500);
        }
    }
    
    /**
     * Update payment method
     */
    public function updatePaymentMethod(Request $request): JsonResponse
    {
        $request->validate([
            'payment_method_id' => 'required|string',
        ]);
        
        try {
            $user = $request->user();
            $this->paymentService->updatePaymentMethod($user, $request->payment_method_id);
            
            return response()->json([
                'message' => 'Payment method updated successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update payment method', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);
            
            return response()->json([
                'error' => 'Failed to update payment method',
            ], 500);
        }
    }
    
    /**
     * Get usage statistics
     */
    public function getUsage(Request $request): JsonResponse
    {
        $period = $request->input('period', 'month');
        $user = $request->user();
        
        $stats = $this->subscriptionService->getUsageStats($user, $period);
        
        return response()->json($stats);
    }
    
    /**
     * Handle Stripe webhook
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $endpointSecret = config('services.stripe.webhook_secret');
        
        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload,
                $sigHeader,
                $endpointSecret
            );
        } catch (\Exception $e) {
            Log::error('Stripe webhook signature verification failed', [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }
        
        // Handle the event
        switch ($event->type) {
            case 'checkout.session.completed':
                $this->handleCheckoutCompleted($event->data->object);
                break;
                
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                $this->handleSubscriptionUpdated($event->data->object);
                break;
                
            case 'customer.subscription.deleted':
                $this->handleSubscriptionDeleted($event->data->object);
                break;
                
            case 'invoice.payment_succeeded':
                $this->handlePaymentSucceeded($event->data->object);
                break;
                
            case 'invoice.payment_failed':
                $this->handlePaymentFailed($event->data->object);
                break;
        }
        
        return response()->json(['received' => true]);
    }
    
    protected function handleCheckoutCompleted($session)
    {
        $userId = $session->metadata->user_id ?? null;
        if (!$userId) {
            Log::warning('Checkout session completed but no user_id in metadata', [
                'session_id' => $session->id,
            ]);
            return;
        }
        
        $user = \App\Models\User::find($userId);
        if (!$user) {
            Log::warning('User not found for checkout session', [
                'user_id' => $userId,
                'session_id' => $session->id,
            ]);
            return;
        }
        
        // Get subscription from Stripe
        $stripeSubscription = \Stripe\Subscription::retrieve($session->subscription);
        $this->paymentService->syncSubscriptionFromStripe(
            $user,
            $stripeSubscription,
            $session->metadata->plan ?? null,
            $session->metadata->billing_cycle ?? null
        );
    }
    
    protected function handleSubscriptionUpdated($stripeSubscription)
    {
        $customerId = $stripeSubscription->customer;
        $user = \App\Models\User::where('stripe_id', $customerId)->first();
        
        if (!$user) {
            Log::warning('User not found for subscription update', [
                'customer_id' => $customerId,
                'subscription_id' => $stripeSubscription->id,
            ]);
            return;
        }
        
        $this->paymentService->syncSubscriptionFromStripe($user, $stripeSubscription);
    }
    
    protected function handleSubscriptionDeleted($stripeSubscription)
    {
        $customerId = $stripeSubscription->customer;
        $user = \App\Models\User::where('stripe_id', $customerId)->first();
        
        if (!$user) {
            return;
        }
        
        $subscription = \App\Models\Subscription::where('stripe_subscription_id', $stripeSubscription->id)->first();
        if ($subscription) {
            $subscription->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);
        }
    }
    
    protected function handlePaymentSucceeded($invoice)
    {
        // Payment succeeded - subscription is active
        Log::info('Payment succeeded', [
            'invoice_id' => $invoice->id,
            'customer_id' => $invoice->customer,
        ]);
    }
    
    protected function handlePaymentFailed($invoice)
    {
        // Payment failed - handle dunning
        Log::warning('Payment failed', [
            'invoice_id' => $invoice->id,
            'customer_id' => $invoice->customer,
        ]);
        
        // Optionally send notification to user
    }
}
```

### 7. Middleware

```php
// app/Http/Middleware/CheckRouteLimit.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\SubscriptionService;
use Symfony\Component\HttpFoundation\Response;

class CheckRouteLimit
{
    protected $subscriptionService;
    
    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }
    
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        $check = $this->subscriptionService->canCalculateRoute($user);
        
        if (!$check['allowed']) {
            return response()->json([
                'error' => 'Route limit reached',
                'message' => "You've reached your daily limit of {$check['limit']} routes. Upgrade to Premium for unlimited routes.",
                'limit' => $check['limit'],
                'remaining' => $check['remaining'],
                'reset_at' => $check['reset_at'] ?? null,
            ], 403);
        }
        
        return $next($request);
    }
}

// app/Http/Middleware/CheckFeatureAccess.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\SubscriptionService;
use Symfony\Component\HttpFoundation\Response;

class CheckFeatureAccess
{
    protected $subscriptionService;
    
    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }
    
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        if (!$this->subscriptionService->hasFeatureAccess($user, $feature)) {
            $tier = $user->getSubscriptionTier();
            $requiredTier = $this->getRequiredTier($feature);
            
            return response()->json([
                'error' => 'Feature not available',
                'message' => "This feature requires a {$requiredTier} subscription. Upgrade to unlock it.",
                'feature' => $feature,
                'current_tier' => $tier,
                'required_tier' => $requiredTier,
            ], 403);
        }
        
        return $next($request);
    }
    
    protected function getRequiredTier(string $feature): string
    {
        $featureTiers = [
            'api_access' => 'Pro',
            'unlimited_offline_maps' => 'Pro',
        ];
        
        return $featureTiers[$feature] ?? 'Premium';
    }
}
```

### 8. Route Updates

Add to `routes/api.php`:

```php
// Subscription routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/subscriptions/plans', [SubscriptionController::class, 'getPlans']);
    Route::get('/subscriptions/current', [SubscriptionController::class, 'getCurrent']);
    Route::post('/subscriptions/checkout', [SubscriptionController::class, 'createCheckout']);
    Route::post('/subscriptions/upgrade', [SubscriptionController::class, 'upgrade']);
    Route::post('/subscriptions/cancel', [SubscriptionController::class, 'cancel']);
    Route::post('/subscriptions/resume', [SubscriptionController::class, 'resume']);
    Route::post('/subscriptions/payment-method', [SubscriptionController::class, 'updatePaymentMethod']);
    Route::get('/subscriptions/usage', [SubscriptionController::class, 'getUsage']);
});

// Webhook (no auth required, uses signature verification)
Route::post('/subscriptions/webhook', [SubscriptionController::class, 'handleWebhook']);

// Route usage check
Route::middleware(['auth:sanctum'])->get('/route-usage/check', function (Request $request) {
    $subscriptionService = app(\App\Services\SubscriptionService::class);
    return response()->json($subscriptionService->canCalculateRoute($request->user()));
});
```

### 9. Update Route Controller

Add route usage tracking to `RouteController`:

```php
// In RouteController methods (calculate, curved, etc.)

use App\Services\SubscriptionService;

protected $subscriptionService;

public function __construct(SubscriptionService $subscriptionService)
{
    $this->subscriptionService = $subscriptionService;
}

// In calculate() method, after successful route calculation:
$this->subscriptionService->recordRouteUsage($request->user(), [
    'route_type' => 'graphhopper',
    'curvature_level' => $request->input('curvature_level'),
    'waypoints_count' => count($waypoints),
    'distance_km' => $routeData['distance'] ?? null,
]);
```

---

## Frontend Implementation

### 1. Install Stripe.js

```bash
npm install @stripe/stripe-js
```

### 2. Subscription Page Component

```jsx
// resources/js/Pages/Subscription.jsx

import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

export default function Subscription() {
    const { auth } = usePage().props;
    const [plans, setPlans] = useState(null);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [loading, setLoading] = useState(false);
    const [usage, setUsage] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [plansRes, currentRes, usageRes] = await Promise.all([
                axios.get('/api/subscriptions/plans'),
                axios.get('/api/subscriptions/current'),
                axios.get('/api/subscriptions/usage'),
            ]);
            
            setPlans(plansRes.data.plans);
            setCurrentSubscription(currentRes.data);
            setUsage(usageRes.data);
        } catch (error) {
            console.error('Failed to load subscription data', error);
        }
    };

    const handleSubscribe = async (plan, billingCycle) => {
        setLoading(true);
        try {
            const response = await axios.post('/api/subscriptions/checkout', {
                plan,
                billing_cycle: billingCycle,
            });
            
            const stripe = await stripePromise;
            const { error } = await stripe.redirectToCheckout({
                sessionId: response.data.session_id,
            });
            
            if (error) {
                console.error('Stripe checkout error', error);
            }
        } catch (error) {
            console.error('Failed to create checkout', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your subscription?')) {
            return;
        }
        
        setLoading(true);
        try {
            await axios.post('/api/subscriptions/cancel', {
                at_period_end: true,
            });
            await loadData();
        } catch (error) {
            console.error('Failed to cancel subscription', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async () => {
        setLoading(true);
        try {
            await axios.post('/api/subscriptions/resume');
            await loadData();
        } catch (error) {
            console.error('Failed to resume subscription', error);
        } finally {
            setLoading(false);
        }
    };

    if (!plans) {
        return <div>Loading...</div>;
    }

    const currentTier = currentSubscription?.tier || 'free';
    const isCancelled = currentSubscription?.subscription?.status === 'cancelled';

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Subscription Plans</h1>
            
            {/* Current Subscription Status */}
            {currentSubscription && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h2 className="text-xl font-semibold mb-2">Current Plan: {currentTier.toUpperCase()}</h2>
                    {currentSubscription.subscription && (
                        <div className="space-y-1">
                            <p>Status: {currentSubscription.subscription.status}</p>
                            {currentSubscription.subscription.ends_at && (
                                <p>Renews: {new Date(currentSubscription.subscription.ends_at).toLocaleDateString()}</p>
                            )}
                            {isCancelled && (
                                <div className="mt-2">
                                    <p className="text-red-600">Subscription will end at period end</p>
                                    <button
                                        onClick={handleResume}
                                        className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                        Resume Subscription
                                    </button>
                                </div>
                            )}
                            {!isCancelled && (
                                <button
                                    onClick={handleCancel}
                                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Cancel Subscription
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Usage Statistics */}
            {usage && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold mb-2">Usage This Month</h3>
                    <p>Routes calculated: {usage.total}</p>
                </div>
            )}

            {/* Plan Comparison */}
            <div className="grid md:grid-cols-3 gap-6">
                {Object.entries(plans).map(([key, plan]) => (
                    <div
                        key={key}
                        className={`border rounded-lg p-6 ${
                            currentTier === key
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200'
                        }`}
                    >
                        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                        <div className="mb-4">
                            <span className="text-3xl font-bold">${plan.price_monthly}</span>
                            <span className="text-gray-600">/month</span>
                        </div>
                        {plan.price_yearly > 0 && (
                            <div className="mb-4 text-sm text-gray-600">
                                or ${plan.price_yearly}/year (save 17%)
                            </div>
                        )}
                        <ul className="space-y-2 mb-6">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start">
                                    <span className="text-green-500 mr-2">✓</span>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                        {currentTier !== key && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleSubscribe(key, 'monthly')}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Subscribe Monthly
                                </button>
                                <button
                                    onClick={() => handleSubscribe(key, 'yearly')}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    Subscribe Yearly (Save 17%)
                                </button>
                            </div>
                        )}
                        {currentTier === key && (
                            <div className="text-center text-blue-600 font-semibold">
                                Current Plan
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### 3. Subscription Badge Component

```jsx
// resources/js/Components/SubscriptionBadge.jsx

import React from 'react';
import { Link } from '@inertiajs/react';

export default function SubscriptionBadge({ user }) {
    if (!user?.subscription) {
        return null;
    }

    const tier = user.subscription.plan || 'free';
    const tierColors = {
        free: 'bg-gray-500',
        premium: 'bg-blue-500',
        pro: 'bg-purple-500',
    };

    return (
        <Link
            href="/subscription"
            className={`inline-flex items-center px-3 py-1 rounded-full text-white text-sm font-medium ${tierColors[tier] || tierColors.free} hover:opacity-80`}
        >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </Link>
    );
}
```

### 4. Route Limit Warning Component

```jsx
// resources/js/Components/RouteLimitWarning.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from '@inertiajs/react';

export default function RouteLimitWarning() {
    const [limitCheck, setLimitCheck] = useState(null);

    useEffect(() => {
        checkLimit();
    }, []);

    const checkLimit = async () => {
        try {
            const response = await axios.get('/api/route-usage/check');
            setLimitCheck(response.data);
        } catch (error) {
            console.error('Failed to check route limit', error);
        }
    };

    if (!limitCheck || limitCheck.allowed || limitCheck.remaining === PHP_INT_MAX) {
        return null;
    }

    const percentageUsed = ((limitCheck.limit - limitCheck.remaining) / limitCheck.limit) * 100;
    const isWarning = percentageUsed >= 80;
    const isError = !limitCheck.allowed;

    if (isError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-red-800 font-semibold">Route Limit Reached</h3>
                        <p className="text-red-600 text-sm">
                            You've used all {limitCheck.limit} of your daily routes.
                            {limitCheck.reset_at && (
                                <> Reset in {new Date(limitCheck.reset_at).toLocaleTimeString()}</>
                            )}
                        </p>
                    </div>
                    <Link
                        href="/subscription"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Upgrade to Premium
                    </Link>
                </div>
            </div>
        );
    }

    if (isWarning) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-yellow-800 font-semibold">Approaching Route Limit</h3>
                        <p className="text-yellow-600 text-sm">
                            {limitCheck.remaining} of {limitCheck.limit} routes remaining today
                        </p>
                        <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
                            <div
                                className="bg-yellow-600 h-2 rounded-full"
                                style={{ width: `${percentageUsed}%` }}
                            />
                        </div>
                    </div>
                    <Link
                        href="/subscription"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                        Upgrade
                    </Link>
                </div>
            </div>
        );
    }

    return null;
}
```

### 5. Feature Gate Component

```jsx
// resources/js/Components/FeatureGate.jsx

import React from 'react';
import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';

export default function FeatureGate({ feature, children, fallback = null }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    
    if (!user) {
        return fallback || (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-600">Please log in to access this feature.</p>
            </div>
        );
    }

    const tier = user.subscription?.plan || 'free';
    const hasAccess = checkFeatureAccess(tier, feature);

    if (hasAccess) {
        return <>{children}</>;
    }

    const requiredTier = getRequiredTier(feature);

    return fallback || (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Premium Feature
            </h3>
            <p className="text-blue-600 mb-4">
                This feature requires a {requiredTier} subscription.
            </p>
            <Link
                href="/subscription"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Upgrade to {requiredTier}
            </Link>
        </div>
    );
}

function checkFeatureAccess(tier, feature) {
    const featureAccess = {
        curved_routes: ['premium', 'pro'],
        round_trip: ['premium', 'pro'],
        extra_curvy: ['premium', 'pro'],
        offline_maps: ['premium', 'pro'],
        ride_recording: ['premium', 'pro'],
        turn_by_turn: ['premium', 'pro'],
        gpx_export: ['premium', 'pro'],
        private_roads: ['premium', 'pro'],
        api_access: ['pro'],
        unlimited_offline_maps: ['pro'],
    };

    const requiredTiers = featureAccess[feature] || [];
    return requiredTiers.includes(tier);
}

function getRequiredTier(feature) {
    const featureTiers = {
        api_access: 'Pro',
        unlimited_offline_maps: 'Pro',
    };
    return featureTiers[feature] || 'Premium';
}
```

---

## Implementation Timeline

### Week 1: Backend Foundation

**Day 1-2: Setup & Database**
- [ ] Install Laravel Cashier
- [ ] Create database migrations
- [ ] Run migrations
- [ ] Configure Stripe in `.env`
- [ ] Set up Stripe products and prices in dashboard

**Day 3-4: Services**
- [ ] Create `PaymentService`
- [ ] Create `SubscriptionService`
- [ ] Implement payment methods
- [ ] Implement subscription management
- [ ] Add route usage tracking

**Day 5: Models & Relationships**
- [ ] Enhance User model (add Billable trait)
- [ ] Enhance Subscription model
- [ ] Create RouteUsage model
- [ ] Test relationships

### Week 2: API & Middleware

**Day 1-2: Controllers**
- [ ] Implement `SubscriptionController`
- [ ] Add all subscription endpoints
- [ ] Implement webhook handler
- [ ] Add route usage endpoints

**Day 3: Middleware**
- [ ] Implement `CheckRouteLimit` middleware
- [ ] Implement `CheckFeatureAccess` middleware
- [ ] Test middleware

**Day 4-5: Route Integration**
- [ ] Apply middleware to route calculation endpoints
- [ ] Add route usage tracking to RouteController
- [ ] Test route limit enforcement
- [ ] Test feature gating

### Week 3: Frontend & Testing

**Day 1-2: Frontend Components**
- [ ] Create Subscription page
- [ ] Create SubscriptionBadge component
- [ ] Create RouteLimitWarning component
- [ ] Create FeatureGate component

**Day 3: Integration**
- [ ] Integrate subscription checks in route planner
- [ ] Add route limit warnings
- [ ] Gate premium features
- [ ] Add subscription management UI

**Day 4: Testing**
- [ ] Test subscription flow end-to-end
- [ ] Test webhook handling
- [ ] Test route limits
- [ ] Test feature gating
- [ ] Test payment method updates
- [ ] Test cancellation/resumption

**Day 5: Polish & Documentation**
- [ ] Fix any bugs
- [ ] Add error handling
- [ ] Write user documentation
- [ ] Deploy to staging
- [ ] Test in staging environment

---

## Testing Checklist

### Payment Flow
- [ ] User can view subscription plans
- [ ] User can create checkout session
- [ ] Stripe checkout redirects correctly
- [ ] Successful payment creates subscription
- [ ] Webhook updates subscription status
- [ ] User sees updated subscription in UI

### Subscription Management
- [ ] User can upgrade plan
- [ ] User can downgrade plan
- [ ] User can cancel subscription
- [ ] User can resume cancelled subscription
- [ ] User can update payment method
- [ ] Subscription status updates correctly

### Route Limits
- [ ] Free tier limited to 10 routes/day
- [ ] Premium/Pro have unlimited routes
- [ ] Route limit warning shows at 80%
- [ ] Route limit error shows at 100%
- [ ] Route limit resets daily
- [ ] Route usage is tracked correctly

### Feature Gating
- [ ] Curved routes require Premium+
- [ ] Round-trip requires Premium+
- [ ] Offline maps require Premium+
- [ ] API access requires Pro
- [ ] Feature gate shows upgrade prompt
- [ ] Premium features work for paid users

### Webhooks
- [ ] `checkout.session.completed` handled
- [ ] `customer.subscription.updated` handled
- [ ] `customer.subscription.deleted` handled
- [ ] `invoice.payment_succeeded` handled
- [ ] `invoice.payment_failed` handled
- [ ] Webhook signature verification works

---

## Security Considerations

1. **Webhook Security**
   - Always verify Stripe webhook signatures
   - Use HTTPS for webhook endpoints
   - Validate all webhook data

2. **Payment Data**
   - Never store credit card numbers
   - Use Stripe.js for secure payment collection
   - Store only Stripe customer/subscription IDs

3. **Authorization**
   - Verify user owns subscription before operations
   - Use middleware for route protection
   - Validate subscription status server-side

4. **Rate Limiting**
   - Limit subscription API endpoints
   - Prevent abuse of webhook endpoints
   - Monitor for suspicious activity

---

## Configuration

### Stripe Setup Steps

1. **Create Stripe Account**
   - Sign up at stripe.com
   - Complete business verification
   - Get API keys

2. **Create Products & Prices**
   - Create "Premium" product
     - Monthly price: $9.99
     - Yearly price: $99
   - Create "Pro" product
     - Monthly price: $19.99
     - Yearly price: $199

3. **Configure Webhooks**
   - Add webhook endpoint: `https://yourdomain.com/api/subscriptions/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy webhook signing secret

4. **Add to `.env`**
   ```env
   STRIPE_KEY=pk_live_...
   STRIPE_SECRET=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_WEBHOOK_TOLERANCE=300
   ```

5. **Add to `config/services.php`**
   ```php
   'stripe' => [
       'key' => env('STRIPE_KEY'),
       'secret' => env('STRIPE_SECRET'),
       'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
       'webhook_tolerance' => env('STRIPE_WEBHOOK_TOLERANCE', 300),
       'prices' => [
           'premium_monthly' => env('STRIPE_PRICE_PREMIUM_MONTHLY'),
           'premium_yearly' => env('STRIPE_PRICE_PREMIUM_YEARLY'),
           'pro_monthly' => env('STRIPE_PRICE_PRO_MONTHLY'),
           'pro_yearly' => env('STRIPE_PRICE_PRO_YEARLY'),
       ],
   ],
   ```

---

## Success Metrics

- ✅ Stripe integration working
- ✅ Subscriptions can be created
- ✅ Webhooks processed correctly
- ✅ Route limits enforced
- ✅ Feature gating functional
- ✅ Subscription management UI complete
- ✅ Payment method updates work
- ✅ Cancellation/resumption works
- ✅ All tests passing
- ✅ Documentation complete

---

## Next Steps After Implementation

1. **Analytics**
   - Track subscription conversion rates
   - Monitor churn rate
   - Analyze feature usage by tier

2. **Optimization**
   - A/B test pricing
   - Optimize checkout flow
   - Improve upgrade prompts

3. **Features**
   - Add trial periods
   - Add promotional codes
   - Add referral program
   - Add usage-based billing options

---

## Support & Resources

- **Laravel Cashier Docs:** https://laravel.com/docs/cashier
- **Stripe API Docs:** https://stripe.com/docs/api
- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **Stripe Testing:** https://stripe.com/docs/testing

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Planning Phase





