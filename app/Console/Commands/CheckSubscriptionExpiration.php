<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use App\Notifications\SubscriptionExpiring;
use App\Notifications\SubscriptionExpired;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckSubscriptionExpiration extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:check-expiration';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for expiring and expired subscriptions and send notifications';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $now = now();
        
        // Only check subscriptions that are actually ending (cancel_at_period_end = true)
        // Don't notify for auto-renewing subscriptions
        
        // Check subscriptions expiring in 7 days (only if actually ending)
        $expiringIn7Days = Subscription::where('status', 'active')
            ->where('cancel_at_period_end', true) // Only subscriptions that are actually ending
            ->whereNotNull('ends_at')
            ->whereBetween('ends_at', [$now->copy()->addDays(6)->startOfDay(), $now->copy()->addDays(7)->endOfDay()])
            ->with('user')
            ->get();
        
        foreach ($expiringIn7Days as $subscription) {
            $daysRemaining = $now->diffInDays($subscription->ends_at, false);
            if ($subscription->user) {
                $subscription->user->notify(new SubscriptionExpiring($subscription, $daysRemaining));
                $this->info("Sent expiring notification to {$subscription->user->email} ({$daysRemaining} days remaining)");
            }
        }
        
        // Check subscriptions expiring in 3 days (only if actually ending)
        $expiringIn3Days = Subscription::where('status', 'active')
            ->where('cancel_at_period_end', true) // Only subscriptions that are actually ending
            ->whereNotNull('ends_at')
            ->whereBetween('ends_at', [$now->copy()->addDays(2)->startOfDay(), $now->copy()->addDays(3)->endOfDay()])
            ->with('user')
            ->get();
        
        foreach ($expiringIn3Days as $subscription) {
            $daysRemaining = $now->diffInDays($subscription->ends_at, false);
            if ($subscription->user) {
                $subscription->user->notify(new SubscriptionExpiring($subscription, $daysRemaining));
                $this->info("Sent expiring notification to {$subscription->user->email} ({$daysRemaining} days remaining)");
            }
        }
        
        // Check subscriptions expiring tomorrow (only if actually ending)
        $expiringTomorrow = Subscription::where('status', 'active')
            ->where('cancel_at_period_end', true) // Only subscriptions that are actually ending
            ->whereNotNull('ends_at')
            ->whereBetween('ends_at', [$now->copy()->addDay()->startOfDay(), $now->copy()->addDay()->endOfDay()])
            ->with('user')
            ->get();
        
        foreach ($expiringTomorrow as $subscription) {
            if ($subscription->user) {
                $subscription->user->notify(new SubscriptionExpiring($subscription, 1));
                $this->info("Sent expiring notification to {$subscription->user->email} (1 day remaining)");
            }
        }
        
        // Check subscriptions expiring today (only if actually ending)
        $expiringToday = Subscription::where('status', 'active')
            ->where('cancel_at_period_end', true) // Only subscriptions that are actually ending
            ->whereNotNull('ends_at')
            ->whereBetween('ends_at', [$now->copy()->startOfDay(), $now->copy()->endOfDay()])
            ->with('user')
            ->get();
        
        foreach ($expiringToday as $subscription) {
            if ($subscription->user) {
                $subscription->user->notify(new SubscriptionExpiring($subscription, 0));
                $this->info("Sent expiring notification to {$subscription->user->email} (expires today)");
            }
        }
        
        // Check expired subscriptions (expired in last 24 hours, send once)
        // Only send notification if not already sent (check metadata)
        $recentlyExpired = Subscription::where('status', 'active')
            ->whereNotNull('ends_at')
            ->where('ends_at', '>=', $now->copy()->subDay())
            ->where('ends_at', '<', $now)
            ->with('user')
            ->get();
        
        foreach ($recentlyExpired as $subscription) {
            // Check if expiration notification has already been sent
            $metadata = $subscription->metadata ?? [];
            $expiredNotificationSent = $metadata['expired_notification_sent'] ?? false;
            
            if (!$expiredNotificationSent && $subscription->user) {
                // Update status to expired
                $subscription->update([
                    'status' => 'expired',
                    'metadata' => array_merge($metadata, [
                        'expired_notification_sent' => true,
                        'expired_notification_sent_at' => $now->toIso8601String(),
                    ]),
                ]);
                
                // Send email notification (only once)
                $subscription->user->notify(new SubscriptionExpired($subscription));
                $this->info("Sent expired notification to {$subscription->user->email}");
            }
        }
        
        $this->info('Subscription expiration check completed.');
        return 0;
    }
}

