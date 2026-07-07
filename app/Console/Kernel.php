<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{

    protected $commands = [
        Commands\PopulateRoadLocations::class,
        Commands\PurgeDeletedAccounts::class,
    ];

    protected function schedule(Schedule $schedule): void
    {
        // Check subscription expiration daily at 9 AM
        $schedule->command('subscriptions:check-expiration')
            ->dailyAt('09:00')
            ->timezone('UTC');

        // Purge accounts after deletion grace period
        $schedule->command('accounts:purge-deletions')
            ->dailyAt('02:00')
            ->timezone('UTC');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
