<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\SubscriptionService;
use Symfony\Component\HttpFoundation\Response;

class CheckFeatureAccess
{
    protected $subscriptionService;
    
    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }
    
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        if (!$this->subscriptionService->hasFeatureAccess($user, $feature)) {
            $tier = $user->getSubscriptionTier();
            $requiredTier = $this->getRequiredTier($feature);
            
            return response()->json([
                'error' => 'Feature not available',
                'message' => "This feature requires a {$requiredTier} subscription. Upgrade to unlock it.",
                'feature' => $feature,
                'current_tier' => $tier,
                'required_tier' => $requiredTier,
            ], 403);
        }
        
        return $next($request);
    }
    
    protected function getRequiredTier(string $feature): string
    {
        $featureTiers = [
            'api_access' => 'Pro',
            'unlimited_offline_maps' => 'Pro',
        ];
        
        return $featureTiers[$feature] ?? 'Premium';
    }
}


