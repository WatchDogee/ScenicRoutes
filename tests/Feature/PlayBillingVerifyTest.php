<?php

namespace Tests\Feature;

use App\Models\Entitlement;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Testing\Fluent\AssertableJson;

class PlayBillingVerifyTest extends TestCase
{
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /**
     * Test verifying a valid Play Store purchase token
     */
    public function test_verify_valid_play_purchase(): void
    {
        // Mock Play API response
        $this->mockPlayApiResponse([
            'obfuscatedAccountId' => $this->user->id,
            'obfuscatedProfileId' => 'profile_' . $this->user->id,
            'acknowledgementState' => 1,
            'purchaseState' => 0, // purchased
            'startTimeMillis' => now()->getTimestamp() * 1000,
            'expiryTimeMillis' => now()->addMonth()->getTimestamp() * 1000,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/billing/play/verify', [
                'product_id' => 'scenic_routes_premium_monthly',
                'purchase_token' => 'test_valid_token_xxx',
                'device_id' => 'device_abc123'
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'active',
                    'entitlement_key' => 'premium'
                ]
            ]);

        // Verify entitlement was created
        $this->assertDatabaseHas('entitlements', [
            'user_id' => $this->user->id,
            'entitlement_key' => 'premium',
            'source' => 'play',
            'status' => 'active',
            'product_id' => 'scenic_routes_premium_monthly',
            'purchase_token' => 'test_valid_token_xxx'
        ]);
    }

    /**
     * Test verifying an invalid Play Store token
     */
    public function test_verify_invalid_play_purchase(): void
    {
        // Mock Play API to return error
        $this->mockPlayApiError();

        $response = $this->actingAs($this->user)
            ->postJson('/api/billing/play/verify', [
                'product_id' => 'scenic_routes_premium_monthly',
                'purchase_token' => 'test_invalid_token_xxx'
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false
            ]);
    }

    /**
     * Test verifying purchase without authentication
     */
    public function test_verify_unauthenticated(): void
    {
        $response = $this->postJson('/api/billing/play/verify', [
            'product_id' => 'scenic_routes_premium_monthly',
            'purchase_token' => 'test_token_xxx'
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test restoring multiple purchases
     */
    public function test_restore_multiple_purchases(): void
    {
        // Mock Play API responses for multiple tokens
        $this->mockPlayApiResponse([
            'obfuscatedAccountId' => $this->user->id,
            'purchaseState' => 0,
            'expiryTimeMillis' => now()->addMonths(3)->getTimestamp() * 1000,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/billing/restore', [
                'purchases' => [
                    [
                        'product_id' => 'scenic_routes_premium_monthly',
                        'purchase_token' => 'token_1'
                    ],
                    [
                        'product_id' => 'scenic_routes_pro_monthly',
                        'purchase_token' => 'token_2'
                    ]
                ]
            ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify both entitlements created
        $this->assertDatabaseHas('entitlements', [
            'user_id' => $this->user->id,
            'product_id' => 'scenic_routes_premium_monthly'
        ]);
        $this->assertDatabaseHas('entitlements', [
            'user_id' => $this->user->id,
            'product_id' => 'scenic_routes_pro_monthly'
        ]);
    }

    /**
     * Test getting user's entitlements
     */
    public function test_get_entitlements(): void
    {
        // Create test entitlements
        Entitlement::factory()->create([
            'user_id' => $this->user->id,
            'entitlement_key' => 'premium',
            'status' => 'active',
            'source' => 'play',
            'expires_at' => now()->addMonth()
        ]);
        Entitlement::factory()->create([
            'user_id' => $this->user->id,
            'entitlement_key' => 'pro',
            'status' => 'inactive',
            'source' => 'stripe',
            'expires_at' => now()->subDays(5)
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/billing/entitlements');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'entitlements')
            ->assertJsonPath('entitlements.0.key', 'premium')
            ->assertJsonPath('entitlements.0.status', 'active')
            ->assertJsonPath('entitlements.1.key', 'pro')
            ->assertJsonPath('entitlements.1.status', 'inactive');
    }

    /**
     * Test checking specific entitlement
     */
    public function test_check_specific_entitlement(): void
    {
        Entitlement::factory()->create([
            'user_id' => $this->user->id,
            'entitlement_key' => 'premium',
            'status' => 'active',
            'expires_at' => now()->addMonth()
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/billing/entitlements/premium');

        $response->assertStatus(200)
            ->assertJson([
                'has_entitlement' => true
            ]);
    }

    /**
     * Test checking entitlement user doesn't have
     */
    public function test_check_missing_entitlement(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/billing/entitlements/premium');

        $response->assertStatus(200)
            ->assertJson([
                'has_entitlement' => false
            ]);
    }

    /**
     * Mock Play API success response
     */
    private function mockPlayApiResponse(array $data): void
    {
        // This would use Laravel's HTTP testing helpers
        // Assuming you're mocking with a dedicated HTTP client mock
        // Details depend on your actual implementation
    }

    /**
     * Mock Play API error response
     */
    private function mockPlayApiError(): void
    {
        // Mock error response
    }
}
