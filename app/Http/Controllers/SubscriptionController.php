<?php

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
                        'Unlimited route calculations',
                        'Round trips up to 300km',
                        'Basic curvature levels (straightest, balanced, curvy)',
                        'Unlimited saved roads',
                        'Avoid roads (highways, unpaved, tolls, ferries)',
                        'GPX export',
                        'Elevation profile',
                        'Route analytics',
                        'Waypoint management',
                    ],
                ],
                'premium' => [
                    'name' => 'Premium',
                    'price_monthly' => 3.99,
                    'price_yearly' => 29.99,
                    'features' => [
                        'Everything in Free',
                        'Extra curvy routes',
                        'Unlimited round trips',
                        'Turn-by-turn navigation',
                        'Offline maps (coming soon)',
                        'Ride recording',
                        'Private roads',
                    ],
                ],
                'pro' => [
                    'name' => 'Pro',
                    'price_monthly' => 5.99,
                    'price_yearly' => 49.99,
                    'features' => [
                        'Everything in Premium',
                        'Unlimited offline maps (no region limit, coming soon)',
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
        
        // Support unauthenticated web view gracefully
        if (!$user) {
            return response()->json([
                'subscription' => null,
                'tier' => 'free',
                'limits' => $this->subscriptionService->getLimits('free'),
                'has_active_subscription' => false,
                'can_start_premium_trial' => false,
                'premium_trial_days' => 0,
            ]);
        }

        // Fresh user instance with subscription loaded
        $user = $user->fresh(['subscription']);
        
        // Sync from Stripe if needed (web purchases)
        $needsStripeSync = $user->stripe_id && (
            !$user->subscription ||
            ($user->subscription->status === 'trialing' && empty($user->subscription->trial_ends_at))
        );
        if ($needsStripeSync) {
            try {
                \Log::info('getCurrent: User has no local subscription, syncing from Stripe', [
                    'user_id' => $user->id,
                    'stripe_id' => $user->stripe_id,
                ]);
                
                \Stripe\Stripe::setApiKey(config('services.stripe.secret'));
                $subscriptions = \Stripe\Subscription::all(['customer' => $user->stripe_id, 'limit' => 100]);
                
                foreach ($subscriptions->data as $stripeSubscription) {
                    if ($stripeSubscription->status === 'active' || $stripeSubscription->status === 'trialing') {
                        // Determine plan from price ID
                        $plan = 'free';
                        $priceId = null;
                        if (count($stripeSubscription->items->data) > 0) {
                            $priceId = $stripeSubscription->items->data[0]->price->id;
                            
                            if ($priceId === getenv('STRIPE_PRICE_PRO_MONTHLY') || 
                                $priceId === getenv('STRIPE_PRICE_PRO_YEARLY')) {
                                $plan = 'pro';
                            } elseif ($priceId === getenv('STRIPE_PRICE_PREMIUM_MONTHLY') || 
                                      $priceId === getenv('STRIPE_PRICE_PREMIUM_YEARLY')) {
                                $plan = 'premium';
                            }
                        }
                        
                        $trialEndsAt = $stripeSubscription->trial_end
                            ? \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end)
                            : null;

                        // Create subscription record
                        $endsAt = null;
                        if ($stripeSubscription->cancel_at) {
                            $endsAt = \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at);
                        } elseif (isset($stripeSubscription->current_period_end) && $stripeSubscription->current_period_end) {
                            $endsAt = \Carbon\Carbon::createFromTimestamp($stripeSubscription->current_period_end);
                        } else {
                            // Fallback: add 30 days from now
                            $endsAt = \Carbon\Carbon::now()->addDays(30);
                        }
                        
                        \App\Models\Subscription::updateOrCreate(
                            ['user_id' => $user->id, 'stripe_subscription_id' => $stripeSubscription->id],
                            [
                                'plan' => $plan,
                                'status' => $stripeSubscription->status,
                                'stripe_price_id' => $priceId,
                                'starts_at' => \Carbon\Carbon::createFromTimestamp($stripeSubscription->start_date),
                                'ends_at' => $endsAt,
                                'trial_ends_at' => $trialEndsAt,
                                'cancel_at_period_end' => $stripeSubscription->cancel_at_period_end ?? false,
                            ]
                        );
                        
                        \Log::info('getCurrent: Synced subscription from Stripe', [
                            'user_id' => $user->id,
                            'plan' => $plan,
                            'subscription_id' => $stripeSubscription->id,
                        ]);
                    }
                }
                
                // Reload user with freshly synced subscription
                $user = $user->fresh(['subscription']);
            } catch (\Exception $e) {
                \Log::warning('getCurrent: Failed to sync subscription from Stripe', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        
        // Get the active subscription (prefer most recent)
        $subscriptionModel = $user->subscription;
        
        // Log all subscriptions for this user (for debugging)
        $allSubscriptions = \App\Models\Subscription::where('user_id', $user->id)
            ->whereIn('status', ['active', 'trialing'])
            ->orderBy('updated_at', 'desc')
            ->get();

        \Log::debug('getCurrent: Checking subscriptions for user', [
            'user_id' => $user->id,
            'active_subscriptions_count' => $allSubscriptions->count(),
            'active_subscriptions' => $allSubscriptions->map(fn($s) => [
                'id' => $s->id,
                'plan' => $s->plan,
                'status' => $s->status,
                'platform' => $s->platform,
                'ends_at' => $s->ends_at,
                'updated_at' => $s->updated_at,
            ])->toArray(),
        ]);
        
        $tier = $user->getSubscriptionTier();
        $limits = $this->subscriptionService->getLimits($tier);
        $canStartPremiumTrial = $this->subscriptionService->canStartPremiumTrial($user);

        // Serialize subscription as array to ensure front-end fields are present
        $subscription = null;
        if ($subscriptionModel) {
            $subscription = $subscriptionModel->toArray();
            // Normalize date fields to ISO strings
            foreach (['starts_at','ends_at','trial_ends_at','cancelled_at'] as $dateField) {
                if (!empty($subscription[$dateField])) {
                    $subscription[$dateField] = \Illuminate\Support\Carbon::parse($subscription[$dateField])->toIso8601String();
                }
            }
        }
        
        \Log::info('getCurrent: Returning subscription data to client', [
            'user_id' => $user->id,
            'tier' => $tier,
            'has_active_subscription' => $user->hasActiveSubscription(),
            'subscription_plan' => $subscription['plan'] ?? null,
        ]);
        
        return response()->json([
            'subscription' => $subscription,
            'tier' => $tier,
            'limits' => $limits,
            'has_active_subscription' => $user->hasActiveSubscription(),
            'can_start_premium_trial' => $canStartPremiumTrial,
            'premium_trial_days' => $canStartPremiumTrial ? \App\Services\SubscriptionService::PREMIUM_TRIAL_DAYS : 0,
        ]);
    }
    
    /**
     * Verify and sync Stripe subscription
     * Called after checkout to ensure subscription is recorded locally
     */
    public function verifySubscription(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user->stripe_id) {
                return response()->json([
                    'tier' => 'free',
                    'has_active_subscription' => false,
                    'verified' => false,
                    'message' => 'No Stripe customer ID',
                ]);
            }
            
            // Fetch subscriptions from Stripe for this customer
            $stripeSubscriptions = \Stripe\Subscription::all([
                'customer' => $user->stripe_id,
                'limit' => 10,
                'status' => 'all', // Get all statuses initially
            ]);
            
            $activeSubscription = null;
            foreach ($stripeSubscriptions->data as $stripeSubscription) {
                // Look for active or trialing subscriptions (paid or on trial)
                if (in_array($stripeSubscription->status, ['active', 'trialing', 'past_due'])) {
                    $activeSubscription = $stripeSubscription;
                    break;
                }
                // Also check for recently created subscriptions that might not be active yet
                // (give webhook time to process)
                if ($stripeSubscription->status === 'incomplete' && 
                    $stripeSubscription->latest_invoice) {
                    $invoice = \Stripe\Invoice::retrieve($stripeSubscription->latest_invoice);
                    if ($invoice->status === 'paid' || $invoice->paid) {
                        // Manually activate this subscription
                        $activeSubscription = $stripeSubscription;
                        break;
                    }
                }
            }
            
            if ($activeSubscription) {
                // Sync this subscription to local DB
                $this->paymentService->syncSubscriptionFromStripe($user, $activeSubscription);
                
                // Refresh user to get updated tier
                $user->refresh();
                $tier = $user->getSubscriptionTier();
                
                Log::info('Subscription verified and synced', [
                    'user_id' => $user->id,
                    'tier' => $tier,
                    'stripe_subscription_id' => $activeSubscription->id,
                ]);
                
                return response()->json([
                    'tier' => $tier,
                    'has_active_subscription' => true,
                    'verified' => true,
                    'subscription' => $user->subscription,
                    'message' => 'Subscription verified and synced',
                ]);
            }
            
            return response()->json([
                'tier' => 'free',
                'has_active_subscription' => false,
                'verified' => true,
                'message' => 'No active subscription found',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to verify Stripe subscription', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'error' => 'Failed to verify subscription',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
    
    /**
     * Create checkout session
     */
    public function createCheckout(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => 'required|in:premium,pro',
            'billing_cycle' => 'required|in:monthly,yearly',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Login required to start a subscription.',
            ], 401);
        }

        if (!config('services.stripe.secret')) {
            return response()->json([
                'error' => 'Stripe not configured',
                'message' => 'Stripe secret key is missing. Check STRIPE_SECRET in your .env.',
            ], 500);
        }

        $priceKey = $request->plan_id . '_' . $request->billing_cycle;
        $priceMap = config('services.stripe.prices');
        if (empty($priceMap[$priceKey])) {
            return response()->json([
                'error' => 'Stripe price not configured',
                'message' => "Missing price ID for {$priceKey}. Check STRIPE_PRICE_* in your .env.",
            ], 500);
        }
        
        try {
            $trialDays = null;
            if ($request->plan_id === 'premium' && $this->subscriptionService->canStartPremiumTrial($user)) {
                $trialDays = \App\Services\SubscriptionService::PREMIUM_TRIAL_DAYS;
            }

            $session = $this->paymentService->createCheckoutSession(
                $user,
                $request->plan_id,
                $request->billing_cycle,
                $trialDays
            );
            
            return response()->json([
                'checkout_url' => $session->url,
                'session_id' => $session->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create checkout session', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);
            
            return response()->json([
                'error' => 'Failed to create checkout session',
                'message' => $e->getMessage(),
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
                'message' => $e->getMessage(),
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
                'message' => $e->getMessage(),
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
                'message' => $e->getMessage(),
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
                'message' => $e->getMessage(),
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
        
        if (!$endpointSecret) {
            Log::error('Stripe webhook secret not configured');
            return response()->json(['error' => 'Webhook secret not configured'], 500);
        }

        // In local development, allow webhooks without signature verification
        // (Stripe dashboard webhooks and CLI can have mismatched secrets)
        $skipSignatureVerification = app()->environment(['local', 'testing']);
        
        if (!$skipSignatureVerification) {
            try {
                $event = \Stripe\Webhook::constructEvent(
                    $payload,
                    $sigHeader,
                    $endpointSecret
                );
            } catch (\UnexpectedValueException $e) {
                Log::error('Stripe webhook invalid payload', [
                    'error' => $e->getMessage(),
                ]);
                return response()->json(['error' => 'Invalid payload'], 400);
            } catch (\Stripe\Exception\SignatureVerificationException $e) {
                Log::error('Stripe webhook signature verification failed', [
                    'error' => $e->getMessage(),
                ]);
                return response()->json(['error' => 'Invalid signature'], 400);
            }
        } else {
            // Local development: parse payload directly without signature verification
            try {
                $event = json_decode($payload, false);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new \Exception('Invalid JSON payload');
                }
                Log::warning('Stripe webhook processed without signature verification (local mode)', [
                    'event_type' => $event->type ?? 'unknown',
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to parse webhook payload', [
                    'error' => $e->getMessage(),
                ]);
                return response()->json(['error' => 'Invalid payload'], 400);
            }
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
        if ($session->subscription) {
            try {
                $stripeSubscription = \Stripe\Subscription::retrieve($session->subscription);
                $this->paymentService->syncSubscriptionFromStripe(
                    $user,
                    $stripeSubscription,
                    $session->metadata->plan ?? null,
                    $session->metadata->billing_cycle ?? null
                );
            } catch (\Exception $e) {
                Log::error('Failed to sync subscription from checkout', [
                    'error' => $e->getMessage(),
                    'session_id' => $session->id,
                ]);
            }
        }
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
        // You can add email notification here
    }
}
