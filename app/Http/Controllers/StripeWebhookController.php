<?php

namespace App\Http\Controllers;

use App\Models\Entitlement;
use App\Models\Subscription;
use App\Services\EntitlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Webhook controller for Stripe billing events
 * 
 * Events handled:
 * - checkout.session.completed: New subscription via Checkout
 * - customer.subscription.updated: Subscription changes (upgrade/downgrade)
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_succeeded: Recurring payment success
 * - invoice.payment_failed: Payment failure
 */
class StripeWebhookController extends Controller
{
    protected EntitlementService $entitlementService;

    public function __construct(EntitlementService $entitlementService)
    {
        $this->entitlementService = $entitlementService;
    }

    /**
     * POST /webhooks/stripe
     * 
     * Handle incoming Stripe webhook events
     */
    public function handle(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $secret = config('billing.stripe.webhook_secret');

        try {
            // Verify webhook signature
            $event = \Stripe\Webhook::constructEvent(
                $payload,
                $sigHeader,
                $secret
            );
        } catch (\UnexpectedValueException $e) {
            Log::error('Invalid Stripe webhook payload', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid payload'], 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Log::error('Invalid Stripe webhook signature', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        // Route to appropriate handler
        try {
            match ($event->type) {
                'checkout.session.completed' => $this->handleCheckoutSessionCompleted($event),
                'customer.subscription.created' => $this->handleSubscriptionCreated($event),
                'customer.subscription.updated' => $this->handleSubscriptionUpdated($event),
                'customer.subscription.deleted' => $this->handleSubscriptionDeleted($event),
                'invoice.payment_succeeded' => $this->handlePaymentSucceeded($event),
                'invoice.payment_failed' => $this->handlePaymentFailed($event),
                default => Log::info('Unhandled Stripe event', ['type' => $event->type]),
            };

            return response()->json(['status' => 'received']);
        } catch (\Exception $e) {
            Log::error('Error processing Stripe webhook', [
                'event_type' => $event->type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => 'Internal error'], 500);
        }
    }

    /**
     * Handle checkout.session.completed
     * User completed Stripe Checkout; create subscription
     */
    private function handleCheckoutSessionCompleted(\Stripe\Event $event): void
    {
        $session = $event->data->object;
        
        // Session metadata should contain user_id
        $userId = $session->metadata->user_id ?? null;
        if (!$userId) {
            Log::warning('Checkout session missing user_id metadata', [
                'session_id' => $session->id,
            ]);
            return;
        }

        $user = \App\Models\User::findOrFail($userId);
        $subscriptionId = $session->subscription;
        $customerId = $session->customer;

        // Update user's Stripe customer ID if needed
        if ($customerId && !$user->stripe_id) {
            $user->update(['stripe_id' => $customerId]);
        }

        // Fetch subscription details
        $subscription = \Stripe\Subscription::retrieve($subscriptionId);

        // Extract price_id (could be from line items or plan)
        $priceId = $subscription->items->data[0]->price->id ?? null;
        $expiresAt = $subscription->current_period_end ? 
            \Carbon\Carbon::createFromTimestamp($subscription->current_period_end) : null;
        $trialEndsAt = $subscription->trial_end ?
            \Carbon\Carbon::createFromTimestamp($subscription->trial_end) : null;

        // Map price_id to plan name
        $planName = $this->mapStripePriceToPlan($priceId);

        // Create/update entitlement
        Entitlement::updateOrCreate(
            [
                'user_id' => $userId,
                'source' => 'stripe',
                'stripe_subscription_id' => $subscriptionId,
            ],
            [
                'entitlement_key' => $this->mapStripeProductToEntitlement($priceId),
                'product_id' => $priceId,
                'stripe_price_id' => $priceId,
                'status' => 'active',
                'starts_at' => now(),
                'expires_at' => $expiresAt,
                'next_billing_date' => $expiresAt,
                'last_validated_at' => now(),
                'last_validation_result' => 'stripe_webhook',
                'metadata' => [
                    'session_id' => $session->id,
                    'customer_id' => $customerId,
                ],
            ]
        );

        // Also create/update the Subscription model so tier display works
        Subscription::updateOrCreate(
            [
                'user_id' => $userId,
                'stripe_subscription_id' => $subscriptionId,
            ],
            [
                'plan' => $planName,
                'stripe_price_id' => $priceId,
                'status' => $subscription->status,
                'current_period_start' => now(),
                'current_period_end' => $expiresAt,
                'ends_at' => $expiresAt,
                'trial_ends_at' => $trialEndsAt,
                'cancel_at_period_end' => $subscription->cancel_at_period_end ?? false,
            ]
        );

        Log::info('Stripe subscription activated via checkout', [
            'user_id' => $userId,
            'subscription_id' => $subscriptionId,
            'price_id' => $priceId,
            'plan' => $planName,
        ]);
    }

    /**
     * Handle customer.subscription.created
     */
    private function handleSubscriptionCreated(\Stripe\Event $event): void
    {
        $subscription = $event->data->object;
        $customerId = $subscription->customer;

        // Find user by Stripe customer ID
        $user = \App\Models\User::where('stripe_id', $customerId)->first();
        if (!$user) {
            Log::warning('Subscription created but no user found', [
                'customer_id' => $customerId,
                'subscription_id' => $subscription->id,
            ]);
            return;
        }

        $priceId = $subscription->items->data[0]->price->id ?? null;
        $expiresAt = $subscription->current_period_end ? 
            now()->timestamp($subscription->current_period_end) : null;
        $trialEndsAt = $subscription->trial_end ?
            \Carbon\Carbon::createFromTimestamp($subscription->trial_end) : null;

        Entitlement::updateOrCreate(
            [
                'user_id' => $user->id,
                'source' => 'stripe',
                'stripe_subscription_id' => $subscription->id,
            ],
            [
                'entitlement_key' => $this->mapStripeProductToEntitlement($priceId),
                'product_id' => $priceId,
                'stripe_price_id' => $priceId,
                'status' => 'active',
                'starts_at' => now(),
                'expires_at' => $expiresAt,
                'next_billing_date' => $expiresAt,
            ]
        );

        Log::info('Stripe subscription created', [
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
        ]);
    }

    /**
     * Handle customer.subscription.updated
     * Handles upgrades, downgrades, billing cycle changes
     */
    private function handleSubscriptionUpdated(\Stripe\Event $event): void
    {
        $subscription = $event->data->object;
        $customerId = $subscription->customer;

        $user = \App\Models\User::where('stripe_id', $customerId)->first();
        if (!$user) {
            return;
        }

        $priceId = $subscription->items->data[0]->price->id ?? null;
        $expiresAt = $subscription->current_period_end ? 
            \Carbon\Carbon::createFromTimestamp($subscription->current_period_end) : null;
        $trialEndsAt = $subscription->trial_end ?
            \Carbon\Carbon::createFromTimestamp($subscription->trial_end) : null;

        $planName = $this->mapStripePriceToPlan($priceId);

        // Update entitlement
        $entitlement = Entitlement::where('user_id', $user->id)
            ->where('source', 'stripe')
            ->where('stripe_subscription_id', $subscription->id)
            ->first();

        if ($entitlement) {
            $entitlement->update([
                'entitlement_key' => $this->mapStripeProductToEntitlement($priceId),
                'product_id' => $priceId,
                'stripe_price_id' => $priceId,
                'status' => in_array($subscription->status, ['active', 'trialing']) ? 'active' : 'inactive',
                'expires_at' => $expiresAt,
                'next_billing_date' => $expiresAt,
                'last_validated_at' => now(),
            ]);
        }

        // Also update the Subscription model
        $localSubscription = Subscription::where('user_id', $user->id)
            ->where('stripe_subscription_id', $subscription->id)
            ->first();

        if ($localSubscription) {
            $localSubscription->update([
                'plan' => $planName,
                'stripe_price_id' => $priceId,
                'status' => $subscription->status,
                'current_period_start' => \Carbon\Carbon::createFromTimestamp($subscription->current_period_start),
                'current_period_end' => $expiresAt,
                'ends_at' => $expiresAt,
                'trial_ends_at' => $trialEndsAt,
                'cancelled_at' => $subscription->canceled_at ? \Carbon\Carbon::createFromTimestamp($subscription->canceled_at) : null,
                'cancel_at_period_end' => $subscription->cancel_at_period_end,
            ]);
        }

        Log::info('Stripe subscription updated', [
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'status' => $subscription->status,
            'plan' => $planName,
        ]);
    }

    /**
     * Handle customer.subscription.deleted
     * Subscription was cancelled
     */
    private function handleSubscriptionDeleted(\Stripe\Event $event): void
    {
        $subscription = $event->data->object;
        $customerId = $subscription->customer;

        $user = \App\Models\User::where('stripe_id', $customerId)->first();
        if (!$user) {
            return;
        }

        $entitlement = Entitlement::where('user_id', $user->id)
            ->where('source', 'stripe')
            ->where('stripe_subscription_id', $subscription->id)
            ->first();

        if ($entitlement) {
            $this->entitlementService->deactivate($entitlement, 'Stripe subscription deleted');
        }

        Log::info('Stripe subscription cancelled', [
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
        ]);
    }

    /**
     * Handle invoice.payment_succeeded
     */
    private function handlePaymentSucceeded(\Stripe\Event $event): void
    {
        $invoice = $event->data->object;
        $subscriptionId = $invoice->subscription;

        if (!$subscriptionId) {
            return;
        }

        $entitlement = Entitlement::where('stripe_subscription_id', $subscriptionId)->first();
        if ($entitlement) {
            $entitlement->update([
                'status' => 'active',
                'last_validation_result' => 'payment_succeeded',
                'last_validated_at' => now(),
            ]);

            Log::info('Stripe payment succeeded', [
                'user_id' => $entitlement->user_id,
                'subscription_id' => $subscriptionId,
            ]);
        }
    }

    /**
     * Handle invoice.payment_failed
     */
    private function handlePaymentFailed(\Stripe\Event $event): void
    {
        $invoice = $event->data->object;
        $subscriptionId = $invoice->subscription;

        if (!$subscriptionId) {
            return;
        }

        $entitlement = Entitlement::where('stripe_subscription_id', $subscriptionId)->first();
        if ($entitlement) {
            $entitlement->update([
                'status' => 'grace', // Grace period before cancellation
                'last_validation_result' => 'payment_failed',
                'last_validated_at' => now(),
            ]);

            Log::warning('Stripe payment failed', [
                'user_id' => $entitlement->user_id,
                'subscription_id' => $subscriptionId,
            ]);
        }
    }

    /**
     * Map Stripe price_id to entitlement key
     */
    private function mapStripeProductToEntitlement(?string $priceId): string
    {
        if (!$priceId) {
            return 'premium';
        }

        $mapping = config('billing.stripe.price_to_entitlement_mapping', []);
        return $mapping[$priceId] ?? 'premium';
    }

    /**
     * Map Stripe price_id to subscription plan name
     */
    private function mapStripePriceToPlan(?string $priceId): string
    {
        if (!$priceId) {
            return 'free';
        }

        // Map Stripe price IDs to plan names
        $priceToPlanMapping = [
            env('STRIPE_PRICE_PRO_MONTHLY') => 'pro',
            env('STRIPE_PRICE_PRO_YEARLY') => 'pro',
            env('STRIPE_PRICE_PREMIUM_MONTHLY') => 'premium',
            env('STRIPE_PRICE_PREMIUM_YEARLY') => 'premium',
        ];

        return $priceToPlanMapping[$priceId] ?? 'premium';
    }
}
