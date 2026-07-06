<?php

namespace Tests\Feature;

use App\Models\Entitlement;
use App\Models\User;
use Stripe\Event;
use Stripe\Webhook;
use Tests\TestCase;

class StripeWebhookTest extends TestCase
{
    /**
     * Test checkout.session.completed webhook
     */
    public function test_checkout_session_completed_webhook(): void
    {
        $user = User::factory()->create();

        $payload = $this->getCheckoutSessionCompletedPayload($user->id);
        $signature = $this->getValidWebhookSignature($payload);

        $response = $this->postJson('/webhooks/stripe', $payload, [
            'stripe-signature' => $signature
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify entitlement created
        $this->assertDatabaseHas('entitlements', [
            'user_id' => $user->id,
            'source' => 'stripe',
            'status' => 'active'
        ]);
    }

    /**
     * Test customer.subscription.created webhook
     */
    public function test_subscription_created_webhook(): void
    {
        $user = User::factory()->create();

        $payload = $this->getSubscriptionCreatedPayload($user->id);
        $signature = $this->getValidWebhookSignature($payload);

        $response = $this->postJson('/webhooks/stripe', $payload, [
            'stripe-signature' => $signature
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('entitlements', [
            'user_id' => $user->id,
            'source' => 'stripe',
            'stripe_subscription_id' => 'sub_test123'
        ]);
    }

    /**
     * Test customer.subscription.updated webhook
     */
    public function test_subscription_updated_webhook(): void
    {
        $user = User::factory()->create();
        $entitlement = Entitlement::factory()->create([
            'user_id' => $user->id,
            'source' => 'stripe',
            'stripe_subscription_id' => 'sub_test123',
            'status' => 'active'
        ]);

        $payload = $this->getSubscriptionUpdatedPayload($user->id, 'past_due');
        $signature = $this->getValidWebhookSignature($payload);

        $response = $this->postJson('/webhooks/stripe', $payload, [
            'stripe-signature' => $signature
        ]);

        $response->assertStatus(200);

        // Subscription status changed, may affect entitlement
        $entitlement->refresh();
        // Status should reflect subscription state
    }

    /**
     * Test customer.subscription.deleted webhook
     */
    public function test_subscription_deleted_webhook(): void
    {
        $user = User::factory()->create();
        $entitlement = Entitlement::factory()->create([
            'user_id' => $user->id,
            'source' => 'stripe',
            'stripe_subscription_id' => 'sub_test123',
            'status' => 'active'
        ]);

        $payload = $this->getSubscriptionDeletedPayload($user->id);
        $signature = $this->getValidWebhookSignature($payload);

        $response = $this->postJson('/webhooks/stripe', $payload, [
            'stripe-signature' => $signature
        ]);

        $response->assertStatus(200);

        // Entitlement should be cancelled
        $entitlement->refresh();
        $this->assertEquals('cancelled', $entitlement->status);
    }

    /**
     * Test invoice.payment_succeeded webhook
     */
    public function test_payment_succeeded_webhook(): void
    {
        $user = User::factory()->create();
        $entitlement = Entitlement::factory()->create([
            'user_id' => $user->id,
            'source' => 'stripe',
            'stripe_subscription_id' => 'sub_test123',
            'status' => 'grace' // Was in grace period
        ]);

        $payload = $this->getPaymentSucceededPayload($user->id);
        $signature = $this->getValidWebhookSignature($payload);

        $response = $this->postJson('/webhooks/stripe', $payload, [
            'stripe-signature' => $signature
        ]);

        $response->assertStatus(200);

        // Entitlement should be reactivated
        $entitlement->refresh();
        $this->assertEquals('active', $entitlement->status);
    }

    /**
     * Test invoice.payment_failed webhook
     */
    public function test_payment_failed_webhook(): void
    {
        $user = User::factory()->create();
        $entitlement = Entitlement::factory()->create([
            'user_id' => $user->id,
            'source' => 'stripe',
            'stripe_subscription_id' => 'sub_test123',
            'status' => 'active'
        ]);

        $payload = $this->getPaymentFailedPayload($user->id);
        $signature = $this->getValidWebhookSignature($payload);

        $response = $this->postJson('/webhooks/stripe', $payload, [
            'stripe-signature' => $signature
        ]);

        $response->assertStatus(200);

        // Entitlement should be in grace period
        $entitlement->refresh();
        $this->assertEquals('grace', $entitlement->status);
    }

    /**
     * Test invalid webhook signature
     */
    public function test_invalid_webhook_signature(): void
    {
        $payload = $this->getCheckoutSessionCompletedPayload(1);

        $response = $this->postJson('/webhooks/stripe', $payload, [
            'stripe-signature' => 'invalid_signature'
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test missing webhook signature
     */
    public function test_missing_webhook_signature(): void
    {
        $payload = $this->getCheckoutSessionCompletedPayload(1);

        $response = $this->postJson('/webhooks/stripe', $payload);

        $response->assertStatus(403);
    }

    // Helper methods for generating test payloads

    private function getCheckoutSessionCompletedPayload(int $userId): array
    {
        return [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_123',
                    'metadata' => [
                        'user_id' => $userId
                    ],
                    'subscription' => 'sub_test123',
                    'payment_intent' => 'pi_test123'
                ]
            ]
        ];
    }

    private function getSubscriptionCreatedPayload(int $userId): array
    {
        return [
            'type' => 'customer.subscription.created',
            'data' => [
                'object' => [
                    'id' => 'sub_test123',
                    'status' => 'active',
                    'customer' => $this->getCustomerIdForUser($userId),
                    'items' => [
                        'data' => [
                            [
                                'price' => [
                                    'id' => 'price_premium_monthly'
                                ]
                            ]
                        ]
                    ],
                    'current_period_end' => now()->addMonth()->timestamp
                ]
            ]
        ];
    }

    private function getSubscriptionUpdatedPayload(int $userId, string $status): array
    {
        return [
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_test123',
                    'status' => $status,
                    'customer' => $this->getCustomerIdForUser($userId)
                ]
            ]
        ];
    }

    private function getSubscriptionDeletedPayload(int $userId): array
    {
        return [
            'type' => 'customer.subscription.deleted',
            'data' => [
                'object' => [
                    'id' => 'sub_test123',
                    'customer' => $this->getCustomerIdForUser($userId)
                ]
            ]
        ];
    }

    private function getPaymentSucceededPayload(int $userId): array
    {
        return [
            'type' => 'invoice.payment_succeeded',
            'data' => [
                'object' => [
                    'subscription' => 'sub_test123',
                    'customer' => $this->getCustomerIdForUser($userId),
                    'paid' => true
                ]
            ]
        ];
    }

    private function getPaymentFailedPayload(int $userId): array
    {
        return [
            'type' => 'invoice.payment_failed',
            'data' => [
                'object' => [
                    'subscription' => 'sub_test123',
                    'customer' => $this->getCustomerIdForUser($userId),
                    'paid' => false
                ]
            ]
        ];
    }

    private function getValidWebhookSignature(array $payload): string
    {
        $secret = config('app.stripe_webhook_secret');
        $timestamp = now()->timestamp;
        $signed = "{$timestamp}.{json_encode($payload)}";
        
        return hash_hmac('sha256', $signed, $secret);
    }

    private function getCustomerIdForUser(int $userId): string
    {
        $user = User::find($userId);
        return $user?->stripe_id ?? "cus_test_{$userId}";
    }
}
