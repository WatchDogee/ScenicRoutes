<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GraphHopperApiTracker
{
    const DAILY_LIMIT = 500;
    const WARNING_THRESHOLD = 450; // Warn at 90% of limit
    const CACHE_KEY = 'graphhopper_api_calls_daily';
    const CACHE_KEY_WARNING = 'graphhopper_api_warning_shown';

    /**
     * Increment API call count for today
     * 
     * @return array ['count' => int, 'remaining' => int, 'limit' => int, 'warning' => bool]
     */
    public function increment(): array
    {
        $today = Carbon::today()->toDateString();
        $cacheKey = self::CACHE_KEY . ':' . $today;
        
        // Get current count
        $count = Cache::get($cacheKey, 0);
        $count++;
        
        // Store with expiration at end of day
        $secondsUntilMidnight = Carbon::now()->diffInSeconds(Carbon::today()->addDay());
        Cache::put($cacheKey, $count, $secondsUntilMidnight);
        
        $remaining = max(0, self::DAILY_LIMIT - $count);
        $warning = $count >= self::WARNING_THRESHOLD && $count < self::DAILY_LIMIT;
        
        // Log if approaching limit
        if ($warning) {
            Log::warning('GraphHopper API approaching daily limit', [
                'count' => $count,
                'remaining' => $remaining,
                'limit' => self::DAILY_LIMIT
            ]);
        }
        
        if ($count >= self::DAILY_LIMIT) {
            Log::error('GraphHopper API daily limit reached', [
                'count' => $count,
                'limit' => self::DAILY_LIMIT,
                'date' => $today
            ]);
        }
        
        return [
            'count' => $count,
            'remaining' => $remaining,
            'limit' => self::DAILY_LIMIT,
            'warning' => $warning,
            'limit_reached' => $count >= self::DAILY_LIMIT
        ];
    }

    /**
     * Get current API call statistics for today
     * 
     * @return array
     */
    public function getStats(): array
    {
        $today = Carbon::today()->toDateString();
        $cacheKey = self::CACHE_KEY . ':' . $today;
        
        $count = Cache::get($cacheKey, 0);
        $remaining = max(0, self::DAILY_LIMIT - $count);
        $warning = $count >= self::WARNING_THRESHOLD && $count < self::DAILY_LIMIT;
        
        return [
            'count' => $count,
            'remaining' => $remaining,
            'limit' => self::DAILY_LIMIT,
            'warning' => $warning,
            'limit_reached' => $count >= self::DAILY_LIMIT,
            'percentage' => round(($count / self::DAILY_LIMIT) * 100, 1),
            'date' => $today
        ];
    }

    /**
     * Check if API calls are allowed
     * 
     * @return bool
     */
    public function canMakeCall(): bool
    {
        $stats = $this->getStats();
        return !$stats['limit_reached'];
    }

    /**
     * Check if warning should be shown (only once per threshold)
     * 
     * @return bool
     */
    public function shouldShowWarning(): bool
    {
        $stats = $this->getStats();
        
        if (!$stats['warning']) {
            return false;
        }
        
        // Check if warning already shown for this threshold
        $today = Carbon::today()->toDateString();
        $warningKey = self::CACHE_KEY_WARNING . ':' . $today;
        $warningShown = Cache::get($warningKey, false);
        
        if (!$warningShown) {
            // Mark warning as shown for today
            $secondsUntilMidnight = Carbon::now()->diffInSeconds(Carbon::today()->addDay());
            Cache::put($warningKey, true, $secondsUntilMidnight);
            return true;
        }
        
        return false;
    }

    /**
     * Reset daily count (for testing/admin)
     */
    public function reset(): void
    {
        $today = Carbon::today()->toDateString();
        $cacheKey = self::CACHE_KEY . ':' . $today;
        Cache::forget($cacheKey);
        Cache::forget(self::CACHE_KEY_WARNING . ':' . $today);
    }
}
