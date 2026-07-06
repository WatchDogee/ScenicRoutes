<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Google\Client as GoogleClient;

/**
 * Handle Google Play in-app purchase verification and subscription sync
 */
class GooglePlayController extends Controller
{
    /**
     * Verify a Google Play purchase
     * 
     * POST /api/google-play/verify
     * Body: { 
     *   "product_id": "premium_monthly", 
     *   "purchase_token": "...",
     *   "base_plan_id": "1" or "yearly" (optional, for extracting billing cycle)
     * }
     */
    public function verifyPurchase(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|string',
            'purchase_token' => 'required|string',
            'base_plan_id' => 'nullable|string',  // New: to determine billing cycle
        ]);

        $user = $request->user();
        $productId = $validated['product_id'];
        $purchaseToken = $validated['purchase_token'];
        $basePlanId = $validated['base_plan_id'] ?? null;

        try {
            // Verify purchase with Google Play API
            $verificationResult = $this->verifyWithGooglePlay($productId, $purchaseToken);

            if ($verificationResult['valid']) {
                // Create or update subscription
                $tier = $this->productIdToTier($productId);
                $billingCycle = $this->basePlanToBillingCycle($basePlanId, $productId);

                $subscription = $this->createOrUpdateSubscription($user, [
                    'tier' => $tier,
                    'billing_cycle' => $billingCycle,
                    'platform' => 'google_play',
                    'external_subscription_id' => $purchaseToken,
                    'purchase_token' => $purchaseToken,
                    'product_id' => $productId,
                    'base_plan_id' => $basePlanId,
                    'expiry_time' => $verificationResult['expiry_time'] ?? null,
                ]);

                return response()->json([
                    'valid' => true,
                    'subscription' => $subscription,
                    'tier' => $tier,
                ]);
            } else {
                return response()->json([
                    'valid' => false,
                    'message' => 'Purchase verification failed',
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('Google Play purchase verification failed', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'product_id' => $productId,
            ]);

            return response()->json([
                'valid' => false,
                'message' => 'Verification error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync Google Play subscription status
     * Called periodically or when app launches
     * 
     * POST /api/google-play/sync
     * Body: { 
     *   "product_id": "...", 
     *   "purchase_token": "...",
     *   "base_plan_id": "..." (optional)
     * }
     */
    public function syncSubscription(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|string',
            'purchase_token' => 'required|string',
            'base_plan_id' => 'nullable|string',
        ]);

        $user = $request->user();
        $productId = $validated['product_id'];
        $purchaseToken = $validated['purchase_token'];
        $basePlanId = $validated['base_plan_id'] ?? null;

        try {
            $verificationResult = $this->verifyWithGooglePlay($productId, $purchaseToken);

            if ($verificationResult['valid']) {
                $tier = $this->productIdToTier($productId);
                $billingCycle = $this->basePlanToBillingCycle($basePlanId, $productId);

                $subscription = $this->createOrUpdateSubscription($user, [
                    'tier' => $tier,
                    'billing_cycle' => $billingCycle,
                    'platform' => 'google_play',
                    'external_subscription_id' => $purchaseToken,
                    'purchase_token' => $purchaseToken,
                    'product_id' => $productId,
                    'base_plan_id' => $basePlanId,
                    'expiry_time' => $verificationResult['expiry_time'] ?? null,
                    'auto_renewing' => $verificationResult['auto_renewing'] ?? true,
                ]);

                return response()->json([
                    'success' => true,
                    'subscription' => $subscription,
                    'tier' => $tier,
                ]);
            } else {
                // Subscription invalid or expired - update status
                $this->handleExpiredSubscription($user, $purchaseToken);

                return response()->json([
                    'success' => true,
                    'subscription' => null,
                    'tier' => 'free',
                    'message' => 'Subscription expired or invalid',
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Google Play subscription sync failed', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sync error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Real-Time Developer Notifications (RTDN) webhook from Google Play
     * 
     * POST /api/google-play/webhook
     */
    public function handleWebhook(Request $request)
    {
        try {
            $message = $request->input('message');
            
            if (!$message) {
                return response()->json(['error' => 'No message'], 400);
            }

            // Decode the Pub/Sub message
            $data = json_decode(base64_decode($message['data']), true);

            if (!$data) {
                Log::error('Invalid Google Play webhook data');
                return response()->json(['error' => 'Invalid data'], 400);
            }

            $notificationType = $data['notificationType'] ?? null;
            $subscriptionNotification = $data['subscriptionNotification'] ?? null;

            if (!$subscriptionNotification) {
                return response()->json(['success' => true]); // Not a subscription event
            }

            $purchaseToken = $subscriptionNotification['purchaseToken'] ?? null;
            $notificationType = $subscriptionNotification['notificationType'] ?? null;

            if (!$purchaseToken) {
                return response()->json(['error' => 'No purchase token'], 400);
            }

            // Find subscription by purchase token
            $subscription = Subscription::where('purchase_token', $purchaseToken)
                ->where('platform', 'google_play')
                ->first();

            if (!$subscription) {
                Log::warning('No subscription found for purchase token', ['purchase_token' => $purchaseToken]);
                return response()->json(['success' => true]); // Not an error, might be new user
            }

            // Handle different notification types
            $this->handleNotificationType($subscription, $notificationType);

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            Log::error('Google Play webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Verify purchase with Google Play Developer API
     * 
     * NOTE: Requires Google Cloud service account setup
     */
    private function verifyWithGooglePlay(string $productId, string $purchaseToken): array
    {
        // TODO: Implement actual Google Play API verification
        // This requires:
        // 1. Google Cloud project with Google Play Developer API enabled
        // 2. Service account with proper permissions
        // 3. Service account JSON key stored securely

        // For now, return mock validation (REPLACE WITH REAL IMPLEMENTATION)
        // Real implementation should use Google\Service\AndroidPublisher
        
        /*
        Example real implementation:
        
        $client = new GoogleClient();
        $client->setAuthConfig(storage_path('app/google-play-service-account.json'));
        $client->addScope('https://www.googleapis.com/auth/androidpublisher');
        
        $service = new \Google\Service\AndroidPublisher($client);
        $packageName = config('services.google_play.package_name'); // e.g., 'com.scenicroutes.app'
        
        if (str_contains($productId, 'premium') || str_contains($productId, 'pro')) {
            // It's a subscription
            $purchase = $service->purchases_subscriptions->get($packageName, $productId, $purchaseToken);
            
            return [
                'valid' => $purchase->getPaymentState() == 1, // 1 = Paid
                'expiry_time' => $purchase->getExpiryTimeMillis(),
                'auto_renewing' => $purchase->getAutoRenewing(),
            ];
        }
        */

        Log::warning('Using mock Google Play verification - implement real verification before production!');
        
        return [
            'valid' => true,
            'expiry_time' => now()->addMonth()->timestamp * 1000,
            'auto_renewing' => true,
        ];
    }

    /**
     * Convert product ID to subscription tier
     * Now handles new format: premium_monthly, pro_monthly
     */
    private function productIdToTier(string $productId): string
    {
        if (str_contains($productId, 'premium')) {
            return 'premium';
        } elseif (str_contains($productId, 'pro')) {
            return 'pro';
        }
        return 'free';
    }

    /**
     * Convert base plan ID to billing cycle
     * Handles both product structures:
     * - premium_monthly with base plans: "1" (monthly) or "yearly"
     * - pro_monthly with base plans: "monthly" or "yearly"
     */
    private function basePlanToBillingCycle(?string $basePlanId, string $productId): string
    {
        // If base_plan_id is provided, use it
        if ($basePlanId) {
            // Handle premium_monthly base plans: "1" = monthly, "yearly" = yearly
            if ($basePlanId === '1' || $basePlanId === 'monthly') {
                return 'monthly';
            } elseif ($basePlanId === 'yearly') {
                return 'yearly';
            }
        }
        
        // Fallback: check if product ID contains "yearly"
        if (str_contains($productId, 'yearly')) {
            return 'yearly';
        }
        
        return 'monthly';
    }

    /**
     * Convert product ID to billing cycle (deprecated - use basePlanToBillingCycle)
     * Kept for backward compatibility
     */
    private function productIdToBillingCycle(string $productId): string
    {
        if (str_contains($productId, 'yearly')) {
            return 'yearly';
        }
        return 'monthly';
    }

    /**
     * Create or update subscription for user
     */
    private function createOrUpdateSubscription(User $user, array $data): Subscription
    {
        // Check for existing Google Play subscription
        $subscription = Subscription::where('user_id', $user->id)
            ->where('platform', 'google_play')
            ->first();

        if ($subscription) {
            // Update existing
            $subscription->update([
                'plan' => $data['tier'],
                'status' => 'active',
                'billing_cycle' => $data['billing_cycle'],
                'external_subscription_id' => $data['external_subscription_id'],
                'purchase_token' => $data['purchase_token'],
                'starts_at' => $subscription->starts_at ?? now(),
                'ends_at' => isset($data['expiry_time']) ? 
                    \Carbon\Carbon::createFromTimestampMs($data['expiry_time']) : null,
                'cancelled_at' => null,
            ]);
        } else {
            // Create new
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan' => $data['tier'],
                'status' => 'active',
                'platform' => 'google_play',
                'external_subscription_id' => $data['external_subscription_id'],
                'purchase_token' => $data['purchase_token'],
                'billing_cycle' => $data['billing_cycle'],
                'starts_at' => now(),
                'ends_at' => isset($data['expiry_time']) ? 
                    \Carbon\Carbon::createFromTimestampMs($data['expiry_time']) : null,
            ]);
        }

        return $subscription;
    }

    /**
     * Handle expired or cancelled subscription
     */
    private function handleExpiredSubscription(User $user, string $purchaseToken): void
    {
        Subscription::where('user_id', $user->id)
            ->where('purchase_token', $purchaseToken)
            ->update([
                'status' => 'expired',
                'ends_at' => now(),
            ]);
    }

    /**
     * Handle different Google Play notification types
     */
    private function handleNotificationType(Subscription $subscription, int $notificationType): void
    {
        // Notification types from Google Play:
        // 1 = SUBSCRIPTION_RECOVERED
        // 2 = SUBSCRIPTION_RENEWED
        // 3 = SUBSCRIPTION_CANCELED
        // 4 = SUBSCRIPTION_PURCHASED
        // 5 = SUBSCRIPTION_ON_HOLD
        // 6 = SUBSCRIPTION_IN_GRACE_PERIOD
        // 7 = SUBSCRIPTION_RESTARTED
        // 8 = SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
        // 9 = SUBSCRIPTION_DEFERRED
        // 10 = SUBSCRIPTION_PAUSED
        // 11 = SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
        // 12 = SUBSCRIPTION_REVOKED
        // 13 = SUBSCRIPTION_EXPIRED

        switch ($notificationType) {
            case 2: // RENEWED
            case 4: // PURCHASED
            case 1: // RECOVERED
            case 7: // RESTARTED
                $subscription->update([
                    'status' => 'active',
                    'cancelled_at' => null,
                ]);
                Log::info('Subscription activated/renewed', ['subscription_id' => $subscription->id]);
                break;

            case 3: // CANCELED
                $subscription->update([
                    'status' => 'active', // Still active until period ends
                    'cancelled_at' => now(),
                    'cancel_at_period_end' => true,
                ]);
                Log::info('Subscription cancelled', ['subscription_id' => $subscription->id]);
                break;

            case 13: // EXPIRED
            case 12: // REVOKED
                $subscription->update([
                    'status' => 'expired',
                    'ends_at' => now(),
                ]);
                Log::info('Subscription expired/revoked', ['subscription_id' => $subscription->id]);
                break;

            case 5: // ON_HOLD
            case 10: // PAUSED
                $subscription->update([
                    'status' => 'on_hold',
                ]);
                Log::info('Subscription on hold/paused', ['subscription_id' => $subscription->id]);
                break;

            case 6: // GRACE_PERIOD
                $subscription->update([
                    'status' => 'grace_period',
                ]);
                Log::info('Subscription in grace period', ['subscription_id' => $subscription->id]);
                break;

            default:
                Log::info('Unhandled notification type', [
                    'notification_type' => $notificationType,
                    'subscription_id' => $subscription->id,
                ]);
        }
    }
}
