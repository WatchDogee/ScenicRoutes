<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\EntitlementService;
use App\Services\PlayBillingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RevalidateEntitlements extends Command
{
    protected $signature = 'billing:revalidate-entitlements
                            {--dry-run : Show what would be revalidated without making changes}
                            {--user-id= : Revalidate specific user only}';

    protected $description = 'Revalidate Play Store entitlements; mark expired ones as inactive';

    public function __construct(
        private PlayBillingService $playBillingService,
        private EntitlementService $entitlementService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $userId = $this->option('user-id');

        if ($dryRun) {
            $this->line('🔍 DRY RUN MODE - No changes will be made');
        }

        // Get users to revalidate
        $query = User::query();
        if ($userId) {
            $query->where('id', $userId);
        }

        $users = $query->get();
        $this->line("📊 Revalidating entitlements for {$users->count()} user(s)...\n");

        $successCount = 0;
        $errorCount = 0;
        $expiredCount = 0;

        foreach ($users as $user) {
            try {
                if ($dryRun) {
                    $this->revalidateUserDryRun($user);
                } else {
                    $this->revalidateUser($user);
                    $successCount++;
                }
            } catch (\Throwable $e) {
                Log::error("Entitlement revalidation failed for user {$user->id}: {$e->getMessage()}");
                $this->error("❌ User {$user->id}: {$e->getMessage()}");
                $errorCount++;
            }
        }

        $this->newLine();
        $this->info("✅ Revalidation complete:");
        $this->line("   ✓ Processed: {$successCount}");
        $this->line("   ✗ Errors: {$errorCount}");

        return $errorCount > 0 ? 1 : 0;
    }

    /**
     * Revalidate user's entitlements with Play API
     */
    private function revalidateUser(User $user): void
    {
        try {
            $this->playBillingService->revalidateUserEntitlements($user->id);
            $this->line("✓ User {$user->id} ({$user->email})");
        } catch (\Throwable $e) {
            throw $e;
        }
    }

    /**
     * Dry run - show what would be revalidated
     */
    private function revalidateUserDryRun(User $user): void
    {
        $entitlements = $user->entitlements()
            ->where('source', 'play')
            ->where('status', '!=', 'cancelled')
            ->get();

        if ($entitlements->isEmpty()) {
            $this->line("  User {$user->id}: No Play entitlements to revalidate");
            return;
        }

        $this->line("  User {$user->id} ({$user->email}):");
        foreach ($entitlements as $entitlement) {
            $status = $entitlement->isActive() ? '✓ active' : '✗ inactive';
            $expiry = $entitlement->expires_at ? $entitlement->expires_at->format('Y-m-d H:i') : 'never';
            $this->line("    - {$entitlement->entitlement_key} ({$status}) expires: {$expiry}");
        }
    }
}
