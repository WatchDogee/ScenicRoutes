<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AccountDeletionService;
use Illuminate\Console\Command;

class PurgeDeletedAccounts extends Command
{
    protected $signature = 'accounts:purge-deletions {--dry-run : Show how many accounts would be deleted}';
    protected $description = 'Permanently delete accounts whose deletion grace period has expired';

    public function handle(AccountDeletionService $deletionService): int
    {
        $query = User::whereNotNull('deletion_requested_at')
            ->whereNotNull('deletion_scheduled_at')
            ->where('deletion_scheduled_at', '<=', now());

        $count = $query->count();

        if ($this->option('dry-run')) {
            $this->info("Accounts ready for deletion: {$count}");
            return Command::SUCCESS;
        }

        if ($count === 0) {
            $this->info('No accounts pending deletion.');
            return Command::SUCCESS;
        }

        $this->info("Deleting {$count} account(s)...");

        $query->chunkById(50, function ($users) use ($deletionService) {
            foreach ($users as $user) {
                $deletionService->deleteUserPermanently($user);
            }
        });

        $this->info('Account deletion purge complete.');

        return Command::SUCCESS;
    }
}
