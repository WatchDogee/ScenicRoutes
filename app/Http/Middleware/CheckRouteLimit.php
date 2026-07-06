<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\SubscriptionService;
use Symfony\Component\HttpFoundation\Response;

class CheckRouteLimit
{
    protected $subscriptionService;
    
    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }
    
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        $check = $this->subscriptionService->canCalculateRoute($user);
        
        if (!$check['allowed']) {
            return response()->json([
                'error' => 'Route limit reached',
                'message' => "You've reached your daily limit of {$check['limit']} routes. Upgrade to Premium for unlimited routes.",
                'limit' => $check['limit'],
                'remaining' => $check['remaining'],
                'reset_at' => $check['reset_at'] ?? null,
            ], 403);
        }
        
        return $next($request);
    }
}
