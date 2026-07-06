<?php

namespace App\Services;

use App\Models\Entitlement;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Service for managing entitlements across all sources (Play, Stripe, manual)
 */
class EntitlementService
{
    /**
     * Get active entitlements for a user
     */
    public function getActiveEntitlements(User $user): array
    {
        $active = Entitlement::where('user_id', $user->id)
            ->active()
            ->get();

        return $active->map(fn ($e) => [
            'key' => $e->entitlement_key,
            'source' => $e->source,
            'expires_at' => $e->expires_at?->toIso8601String(),
            'product_id' => $e->product_id,
        ])->toArray();
    }

    /**
     * Check if user has active entitlement
     */
    public function hasEntitlement(User $user, string $key): bool
    {
        return Entitlement::where('user_id', $user->id)
            ->where('entitlement_key', $key)
            ->active()
            ->exists();
    }

    /**
     * Get the strongest (longest-lasting) entitlement for a given key
     * Useful when user has multiple sources (Play + Stripe)
     */
    public function getStrongestEntitlement(User $user, string $key): ?Entitlement
    {
        return Entitlement::where('user_id', $user->id)
            ->where('entitlement_key', $key)
            ->active()
            ->orderBy('expires_at', 'desc')
            ->first();
    }

    /**
     * Deactivate an entitlement
     */
    public function deactivate(Entitlement $entitlement, string $reason = ''): void
    {
        $entitlement->update([
            'status' => 'inactive',
            'last_validation_result' => 'deactivated',
            'notes' => ($entitlement->notes ?? '') . "\nDeactivated: $reason",
        ]);

        Log::info('Entitlement deactivated', [
            'entitlement_id' => $entitlement->id,
            'user_id' => $entitlement->user_id,
            'reason' => $reason,
        ]);
    }

    /**
     * Activate an entitlement
     */
    public function activate(Entitlement $entitlement, ?string $expiresAt = null): void
    {
        $entitlement->update([
            'status' => 'active',
            'starts_at' => now(),
            'expires_at' => $expiresAt ? now()->parse($expiresAt) : $entitlement->expires_at,
            'last_validated_at' => now(),
            'last_validation_result' => 'success',
        ]);

        Log::info('Entitlement activated', [
            'entitlement_id' => $entitlement->id,
            'user_id' => $entitlement->user_id,
        ]);
    }

    /**
     * Sync entitlements from Play and Stripe
     * Called periodically to ensure consistency
     */
    public function syncAll(): void
    {
        Log::info('Starting entitlement sync');

        // Find all users with entitlements
        $users = User::whereHas('entitlements')->get();

        foreach ($users as $user) {
            try {
                // Revalidate Play tokens
                $playService = app(PlayBillingService::class);
                $playService->revalidateUserEntitlements($user);

                // Stripe webhooks typically keep us up-to-date, but optionally verify
                // You could add a StripeService::revalidateUserEntitlements($user) here
            } catch (\Exception $e) {
                Log::error('Entitlement sync failed for user', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('Completed entitlement sync');
    }

    /**
     * Cancel all entitlements for a user (e.g., account deletion)
     */
    public function cancelAllForUser(User $user): void
    {
        Entitlement::where('user_id', $user->id)
            ->where('status', '!=', 'inactive')
            ->each(fn ($e) => $this->deactivate($e, 'User account action'));
    }

    /**
     * Get entitlement status for UI/API
     */
    public function getEntitlementStatus(User $user): array
    {
        $activeEntitlements = $this->getActiveEntitlements($user);
        $isPremium = $this->hasEntitlement($user, 'premium');
        
        return [
            'is_premium' => $isPremium,
            'entitlements' => $activeEntitlements,
            'expires_at' => $activeEntitlements[0]['expires_at'] ?? null,
        ];
    }
}
