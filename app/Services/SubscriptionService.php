<?php

namespace App\Services;

use App\Models\User;
use App\Models\RouteUsage;
use App\Models\Subscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SubscriptionService
{
    public const PREMIUM_TRIAL_DAYS = 7;

    /**
     * Determine if a user can start a Premium trial.
     */
    public function canStartPremiumTrial(User $user): bool
    {
        if ($user->hasActiveSubscription()) {
            return false;
        }

        $hasPriorPremiumOrPro = Subscription::where('user_id', $user->id)
            ->whereIn('plan', ['premium', 'pro'])
            ->exists();

        if ($hasPriorPremiumOrPro) {
            return false;
        }

        return true;
    }
    /**
     * Check if user can calculate more routes
     * Free tier has unlimited routes (feature-based limits only)
     */
    public function canCalculateRoute(User $user): array
    {
        // All tiers have unlimited route calculations
        // Limits are feature-based, not route count-based
        return [
            'allowed' => true,
            'remaining' => PHP_INT_MAX,
            'limit' => PHP_INT_MAX,
        ];
    }
    
    /**
     * Record route usage
     */
    public function recordRouteUsage(User $user, array $data): RouteUsage
    {
        return RouteUsage::create([
            'user_id' => $user->id,
            'saved_road_id' => $data['saved_road_id'] ?? null,
            'route_type' => $data['route_type'] ?? 'graphhopper',
            'curvature_level' => $data['curvature_level'] ?? null,
            'waypoints_count' => $data['waypoints_count'] ?? 2,
            'distance_km' => $data['distance_km'] ?? null,
            'used_at' => now(),
        ]);
    }
    
    /**
     * Check if user has access to feature
     * Based on PRICING_COMPARISON_AND_RECOMMENDATIONS.md
     */
    public function hasFeatureAccess(User $user, string $feature): bool
    {
        $tier = $user->getSubscriptionTier();
        
        $featureAccess = [
            // Premium route calculation features (paid)
            'extra_curvy' => ['premium', 'pro'],
            'round_trip_unlimited' => ['premium', 'pro'],
            'route_alternatives' => ['premium', 'pro'],
            'segment_curvature' => ['premium', 'pro'],
            
            // Android app features (paid) - navigation & execution
            'offline_maps' => ['premium', 'pro'], // Android only
            'ride_recording' => ['premium', 'pro'], // Android only
            'turn_by_turn' => ['premium', 'pro'], // Android only
            
            // Website premium features (optional, future)
            'gpx_export_unlimited' => ['premium', 'pro'], // Free tier has daily limit
            'private_roads' => ['premium', 'pro'], // Future website feature
            'api_access' => ['pro'], // Future website feature
            'unlimited_offline_maps' => ['pro'], // Android only
        ];
        
        $requiredTiers = $featureAccess[$feature] ?? [];
        // If feature not in list, it's available to all tiers
        if (empty($requiredTiers)) {
            return true;
        }
        return in_array($tier, $requiredTiers);
    }
    
    /**
     * Check if user can use a specific curvature level
     * Extra curvy requires Premium/Pro subscription
     */
    public function canUseCurvatureLevel(User $user, string $curvatureLevel): bool
    {
        $tier = $user->getSubscriptionTier();
        
        // Extra curvy requires Premium/Pro
        if ($curvatureLevel === 'extra_curvy') {
            return in_array($tier, ['premium', 'pro']);
        }
        
        // All other curvature levels available to all tiers
        return in_array($curvatureLevel, ['straightest', 'balanced', 'curvy', 'fastest', 'fast_and_curvy']);
    }
    
    /**
     * Check if user can use round trip with specified distance
     * Free tier: max 300km, Premium/Pro: unlimited
     */
    public function canUseRoundTrip(User $user, float $distanceKm): array
    {
        $tier = $user->getSubscriptionTier();
        
        // Premium/Pro: unlimited round trips
        if (in_array($tier, ['premium', 'pro'])) {
            return [
                'allowed' => true,
                'max_distance' => PHP_INT_MAX,
                'tier' => $tier,
            ];
        }
        
        // Free tier: 300km limit
        $maxDistance = 300;
        $isAllowed = $distanceKm <= $maxDistance;
        
        return [
            'allowed' => $isAllowed,
            'max_distance' => $maxDistance,
            'tier' => 'free',
            'message' => $distanceKm > $maxDistance 
                ? "Round trips are limited to {$maxDistance}km. Upgrade to Premium for unlimited round trips."
                : null,
        ];
    }
    
    /**
     * Get usage statistics
     */
    public function getUsageStats(User $user, string $period = 'month'): array
    {
        $startDate = match($period) {
            'day' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };
        
        $usages = RouteUsage::where('user_id', $user->id)
            ->where('used_at', '>=', $startDate)
            ->get();
        
        return [
            'total' => $usages->count(),
            'by_type' => $usages->groupBy('route_type')->map(function ($group) { return $group->count(); })->toArray(),
            'by_curvature' => $usages->whereNotNull('curvature_level')
                ->groupBy('curvature_level')
                ->map(function ($group) { return $group->count(); })
                ->toArray(),
            'total_distance_km' => $usages->sum('distance_km') ?? 0,
            'period' => $period,
            'start_date' => $startDate->toIso8601String(),
        ];
    }
    
    /**
     * Get subscription limits
     */
    public function getLimits(string $tier): array
    {
        return match($tier) {
            'free' => [
                'routes_per_day' => PHP_INT_MAX, // Unlimited routes (competitive advantage)
                'saved_roads' => PHP_INT_MAX, // Unlimited saved roads (no limit - competitive advantage)
                'offline_map_regions' => 0,
                'offline_map_storage_mb' => 0,
            ],
            'premium' => [
                'routes_per_day' => PHP_INT_MAX,
                'saved_roads' => PHP_INT_MAX,
                // Region limit removed - only storage limit applies
                'offline_map_storage_mb' => 500,
                'offline_map_storage_mb' => 500,
            ],
            'pro' => [
                'routes_per_day' => PHP_INT_MAX,
                'saved_roads' => PHP_INT_MAX,
                'offline_map_regions' => PHP_INT_MAX,
                'offline_map_storage_mb' => PHP_INT_MAX,
            ],
            default => [],
        };
    }
}

