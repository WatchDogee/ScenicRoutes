<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RouteService;
use App\Services\GraphHopperService;
use App\Services\SubscriptionService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class RouteController extends Controller
{
    protected $routeService;
    protected $graphHopperService;
    protected $subscriptionService;

    public function __construct(RouteService $routeService, GraphHopperService $graphHopperService, SubscriptionService $subscriptionService)
    {
        $this->routeService = $routeService;
        $this->graphHopperService = $graphHopperService;
        $this->subscriptionService = $subscriptionService;
    }

    /**
     * Find straightest route option
     */
    public function straightest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_lat' => 'required|numeric|between:-90,90',
            'start_lon' => 'required|numeric|between:-180,180',
            'end_lat' => 'required|numeric|between:-90,90',
            'end_lon' => 'required|numeric|between:-180,180',
            'waypoints' => 'nullable|array',
            'waypoints.*.lat' => 'required_with:waypoints|numeric|between:-90,90',
            'waypoints.*.lon' => 'required_with:waypoints|numeric|between:-180,180'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $startLat = $request->input('start_lat');
        $startLon = $request->input('start_lon');
        $endLat = $request->input('end_lat');
        $endLon = $request->input('end_lon');
        $waypoints = $request->input('waypoints', []);

        $route = $this->routeService->findStraightestRoute(
            $startLat,
            $startLon,
            $endLat,
            $endLon,
            $waypoints
        );

        if (!$route) {
            return response()->json(['error' => 'Could not calculate straightest route'], 404);
        }

        return response()->json($route);
    }

    /**
     * Compare Strategy 1 (OSRM alternatives) vs Strategy 2 (OSM curved roads)
     * Returns detailed comparison with metrics, timings, and quality scores
     */
    public function compareStrategies(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_lat' => 'required|numeric|between:-90,90',
            'start_lon' => 'required|numeric|between:-180,180',
            'end_lat' => 'required|numeric|between:-90,90',
            'end_lon' => 'required|numeric|between:-180,180',
            'curvature_level' => 'nullable|in:mellow,very_curved'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $startLat = $request->input('start_lat');
        $startLon = $request->input('start_lon');
        $endLat = $request->input('end_lat');
        $endLon = $request->input('end_lon');
        $curvatureLevel = $request->input('curvature_level', 'mellow');

        $comparison = $this->routeService->compareStrategies(
            $startLat,
            $startLon,
            $endLat,
            $endLon,
            $curvatureLevel
        );

        return response()->json($comparison);
    }

    /**
     * Calculate route using Strategy 1 (OSRM alternatives only)
     */
    public function strategy1(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_lat' => 'required|numeric|between:-90,90',
            'start_lon' => 'required|numeric|between:-180,180',
            'end_lat' => 'required|numeric|between:-90,90',
            'end_lon' => 'required|numeric|between:-180,180',
            'curvature_level' => 'nullable|in:mellow,very_curved'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $startLat = $request->input('start_lat');
        $startLon = $request->input('start_lon');
        $endLat = $request->input('end_lat');
        $endLon = $request->input('end_lon');
        $curvatureLevel = $request->input('curvature_level', 'mellow');

        try {
            $route = $this->routeService->findRouteStrategy1(
                $startLat,
                $startLon,
                $endLat,
                $endLon,
                $curvatureLevel
            );

            if (!$route) {
                return response()->json([
                    'error' => 'Could not calculate route with Strategy 1',
                    'message' => 'No suitable route found. This may be due to no OSRM alternatives available or all routes were filtered out.'
                ], 200); // Return 200 with error message instead of 404
            }

            return response()->json($route);
        } catch (\Exception $e) {
            \Log::error('Error in strategy1 endpoint', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate route using Strategy 2 (OSM curved roads)
     */
    public function strategy2(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_lat' => 'required|numeric|between:-90,90',
            'start_lon' => 'required|numeric|between:-180,180',
            'end_lat' => 'required|numeric|between:-90,90',
            'end_lon' => 'required|numeric|between:-180,180',
            'curvature_level' => 'nullable|in:mellow,very_curved'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $startLat = $request->input('start_lat');
        $startLon = $request->input('start_lon');
        $endLat = $request->input('end_lat');
        $endLon = $request->input('end_lon');
        $curvatureLevel = $request->input('curvature_level', 'mellow');

        try {
            $route = $this->routeService->findRouteStrategy2(
                $startLat,
                $startLon,
                $endLat,
                $endLon,
                $curvatureLevel
            );

            if (!$route) {
                return response()->json([
                    'error' => 'Could not calculate route with Strategy 2',
                    'message' => 'No suitable route found. This may be due to no curved roads found in the area or route building failed.'
                ], 200); // Return 200 with error message instead of 404
            }

            return response()->json($route);
        } catch (\Exception $e) {
            \Log::error('Error in strategy2 endpoint', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate route using GraphHopper (Kurviger-style)
     */
    public function graphhopper(Request $request)
    {
        // Allow optional authentication - works for debugging without auth, but uses auth when provided
        $user = $request->user(); // Will be null if not authenticated, which is fine for debug
        
        $validator = Validator::make($request->all(), [
            'start_lat' => 'required|numeric|between:-90,90',
            'start_lon' => 'required|numeric|between:-180,180',
            'end_lat' => 'required|numeric|between:-90,90',
            'end_lon' => 'required|numeric|between:-180,180',
            'curvature_level' => 'nullable|in:straightest,balanced,curvy,extra_curvy',
            'waypoints' => 'nullable|array',
            'waypoints.*.lat' => 'required_with:waypoints|numeric|between:-90,90',
            'waypoints.*.lon' => 'required_with:waypoints|numeric|between:-180,180',
            'saved_road_ids' => 'nullable|array',
            'saved_road_ids.*' => 'nullable|integer|exists:saved_roads,id',
            'avoid_options' => 'nullable|array',
            'avoid_options.*' => 'nullable|in:highways,tolls,ferries,unpaved',
            'alternative_routes' => 'nullable|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $startLat = $request->input('start_lat');
        $startLon = $request->input('start_lon');
        $endLat = $request->input('end_lat');
        $endLon = $request->input('end_lon');
        $curvatureLevel = $request->input('curvature_level', 'balanced');
        $waypoints = $request->input('waypoints', []);
        $savedRoadIds = $request->input('saved_road_ids', []);
        $avoidOptions = $request->input('avoid_options', []);
        $alternativeRoutes = $request->input('alternative_routes', false);
        
        // Convert string 'false' to boolean false (Laravel sometimes returns strings from JSON)
        if ($alternativeRoutes === 'false' || $alternativeRoutes === '0' || $alternativeRoutes === false || $alternativeRoutes === 0) {
            $alternativeRoutes = false;
        } else if ($alternativeRoutes === 'true' || $alternativeRoutes === '1' || $alternativeRoutes === true || $alternativeRoutes === 1) {
            $alternativeRoutes = true;
        }
        
        Log::info('RouteController: graphhopper request', [
            'alternative_routes_input' => $request->input('alternative_routes'),
            'alternative_routes_processed' => $alternativeRoutes,
            'alternative_routes_type' => gettype($alternativeRoutes),
            'avoid_options' => $avoidOptions,
            'avoid_options_count' => count($avoidOptions),
            'avoid_options_input' => $request->input('avoid_options'),
            'saved_road_ids_input' => $savedRoadIds,
            'saved_road_ids_count' => count($savedRoadIds)
        ]);

        // Check global API limit before making call
        // NOTE: We track calls but don't block - GraphHopper API will return 429 if limit is actually reached
        // This allows the actual API to be the source of truth for rate limits
        try {
            $apiTracker = app(\App\Services\GraphHopperApiTracker::class);
            $stats = $apiTracker->getStats();
            
            // Only warn if approaching limit, but don't block - let GraphHopper API decide
            if ($stats['limit_reached']) {
                Log::warning('Local API tracker shows limit reached, but allowing GraphHopper API to make final decision', [
                    'local_count' => $stats['count'],
                    'limit' => $stats['limit']
                ]);
                // Don't return error - let GraphHopper API return 429 if it's actually at limit
            }
        } catch (\Exception $e) {
            Log::warning('Failed to check API limit', ['error' => $e->getMessage()]);
            // Continue anyway - don't block if tracking fails
        }

        // Check if curvature level is allowed for user
        // Try multiple auth methods
        $user = null;
        $bearerToken = $request->bearerToken();
        
        // Method 1: Try to manually find token and get user (most reliable)
        if ($bearerToken) {
            try {
                $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($bearerToken);
                if ($tokenModel && $tokenModel->tokenable) {
                    $user = $tokenModel->tokenable;
                }
            } catch (\Exception $e) {
                // Token invalid or expired
            }
        }
        
        // Method 2: Try Sanctum guard explicitly
        if (!$user && $bearerToken) {
            $user = auth('sanctum')->user();
        }
        
        // Method 3: Try Sanctum's standard method
        if (!$user) {
            $user = $request->user();
        }
        
        // Method 4: Session auth (for web requests)
        if (!$user && auth()->check()) {
            $user = auth()->user();
        }
        
        // For extra_curvy, check subscription directly
        if ($curvatureLevel === 'extra_curvy') {
            if (!$user) {
                $tokenFound = false;
                $tokenValid = false;
                if ($bearerToken) {
                    try {
                        $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($bearerToken);
                        $tokenFound = $tokenModel ? true : false;
                        $tokenValid = $tokenModel && $tokenModel->tokenable ? true : false;
                    } catch (\Exception $e) {
                        // Token invalid
                    }
                }
                
                return response()->json([
                    'error' => 'Authentication required',
                    'message' => 'You must be logged in to use extra curvy routes.',
                    'debug' => [
                        'sanctum_user' => $request->user() ? 'present' : 'null',
                        'sanctum_guard_user' => auth('sanctum')->user() ? 'present' : 'null',
                        'session_check' => auth()->check() ? 'yes' : 'no',
                        'session_user' => auth()->user() ? 'present' : 'null',
                        'bearer_token' => $bearerToken ? 'present' : 'null',
                        'bearer_token_preview' => $bearerToken ? substr($bearerToken, 0, 20) . '...' : 'null',
                        'auth_header' => $request->header('Authorization') ? 'present' : 'null',
                        'cookie_present' => $request->hasCookie('laravel_session') ? 'yes' : 'no',
                        'token_found_in_db' => $tokenFound ? 'yes' : 'no',
                        'token_valid' => $tokenValid ? 'yes' : 'no',
                    ],
                ], 403);
            }
            
            // Query ALL subscriptions first to see what exists
            $allSubs = \App\Models\Subscription::where('user_id', $user->id)->get();
            
            // Then query active subscription
            $subscription = \App\Models\Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->latest('created_at')
                ->first();
            
            // If subscription has ends_at, check if it's still valid
            if ($subscription && $subscription->ends_at) {
                $isExpired = $subscription->ends_at <= now();
                if ($isExpired) {
                    $subscription = null; // Expired
                }
            }
            
            $tier = $subscription?->plan ?? 'free';
            $hasAccess = in_array($tier, ['premium', 'pro']);
            
            // Return detailed error with all debug info
            if (!$hasAccess) {
                return response()->json([
                    'error' => 'Curvature level not available',
                    'message' => 'The extra_curvy curvature level requires Premium or Pro subscription.',
                    'curvature_level' => $curvatureLevel,
                    'user_tier' => $tier,
                    'subscription_plan' => $subscription?->plan,
                    'subscription_status' => $subscription?->status,
                    'debug' => [
                        'user_id' => $user->id,
                        'user_email' => $user->email,
                        'subscription_found' => $subscription ? true : false,
                        'subscription_id' => $subscription?->id,
                        'subscription_ends_at' => $subscription?->ends_at?->toDateTimeString(),
                        'subscription_ends_at_raw' => $subscription?->ends_at?->format('Y-m-d H:i:s'),
                        'now' => now()->toDateTimeString(),
                        'now_raw' => now()->format('Y-m-d H:i:s'),
                        'is_expired' => $subscription && $subscription->ends_at ? ($subscription->ends_at <= now()) : null,
                        'all_subscriptions_count' => $allSubs->count(),
                        'all_subscriptions' => $allSubs->map(function($sub) {
                            return [
                                'id' => $sub->id,
                                'plan' => $sub->plan,
                                'status' => $sub->status,
                                'ends_at' => $sub->ends_at?->toDateTimeString(),
                                'ends_at_raw' => $sub->ends_at?->format('Y-m-d H:i:s'),
                                'created_at' => $sub->created_at?->toDateTimeString(),
                            ];
                        })->toArray(),
                    ],
                ], 403);
            }
        } elseif ($user && $curvatureLevel !== 'extra_curvy') {
            // For other curvature levels, use the service
            if (!$this->subscriptionService->canUseCurvatureLevel($user, $curvatureLevel)) {
                return response()->json([
                    'error' => 'Curvature level not available',
                    'message' => 'This curvature level is not available.',
                    'curvature_level' => $curvatureLevel,
                ], 403);
            }
        } elseif (!$user && $curvatureLevel === 'extra_curvy') {
            // Unauthenticated user trying to use extra_curvy
            return response()->json([
                'error' => 'Curvature level not available',
                'message' => 'The extra_curvy curvature level requires Premium or Pro subscription.',
                'curvature_level' => $curvatureLevel,
            ], 403);
        }
        
        // Check if route alternatives are allowed (Premium/Pro only)
        if ($user && $alternativeRoutes) {
            $subscription = \App\Models\Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->latest('created_at')
                ->first();
            
            if ($subscription && $subscription->ends_at && $subscription->ends_at <= now()) {
                $subscription = null;
            }
            
            $tier = $subscription?->plan ?? 'free';
            $hasAccess = in_array($tier, ['premium', 'pro']);
            
            if (!$hasAccess) {
                return response()->json([
                    'error' => 'Feature not available',
                    'message' => 'Route alternatives require Premium or Pro subscription.',
                    'user_tier' => $tier,
                ], 403);
            }
        } elseif (!$user && $alternativeRoutes) {
            return response()->json([
                'error' => 'Feature not available',
                'message' => 'Route alternatives require Premium or Pro subscription.',
            ], 403);
        }

        // Test GraphHopper connection first (skip for API URLs as /info endpoint may not be available)
        $graphHopperUrl = config('services.graphhopper.url', 'http://localhost:8989');
        $isApiUrl = strpos($graphHopperUrl, 'graphhopper.com') !== false || strpos($graphHopperUrl, 'api') !== false;
        
        if (!$isApiUrl) {
            // Only test connection for local/self-hosted instances
            $connectionTest = $this->graphHopperService->testConnection();
            if (!isset($connectionTest['connected']) || !$connectionTest['connected']) {
                Log::warning('GraphHopper connection test failed, but continuing anyway', [
                    'url' => $graphHopperUrl,
                    'connection_test' => $connectionTest
                ]);
                // Don't fail - let the actual route request determine if service is available
            }
        }

        try {
            // Load saved roads if provided
            $savedRoads = [];
            if (!empty($savedRoadIds) && is_array($savedRoadIds)) {
                // Validate that saved roads belong to the authenticated user (if authenticated)
                $user = $request->user();
                if ($user) {
                    $savedRoads = \App\Models\SavedRoad::whereIn('id', $savedRoadIds)
                        ->where(function($query) use ($user) {
                            $query->where('user_id', $user->id)
                                  ->orWhere('is_public', true);
                        })
                        ->get();
                } else {
                    // If not authenticated, only allow public saved roads
                    $savedRoads = \App\Models\SavedRoad::whereIn('id', $savedRoadIds)
                        ->where('is_public', true)
                        ->get();
                }
                
                // Validate all requested roads were found
                if (count($savedRoads) < count($savedRoadIds)) {
                    \Log::warning('Some saved roads not found or not accessible', [
                        'requested_ids' => $savedRoadIds,
                        'found_count' => count($savedRoads),
                        'found_ids' => $savedRoads->pluck('id')->toArray()
                    ]);
                }
                
                \Log::info('Loaded saved roads for route', [
                    'requested_count' => count($savedRoadIds),
                    'loaded_count' => count($savedRoads),
                    'saved_road_ids' => $savedRoads->pluck('id')->toArray(),
                    'saved_roads_with_coords' => $savedRoads->map(function($road) {
                        $hasCoords = !empty($road->road_coordinates);
                        $coordCount = 0;
                        if ($hasCoords) {
                            $coords = json_decode($road->road_coordinates, true);
                            $coordCount = is_array($coords) ? count($coords) : 0;
                        }
                        return [
                            'id' => $road->id,
                            'name' => $road->road_name ?? 'unnamed',
                            'has_coordinates' => $hasCoords,
                            'coordinate_count' => $coordCount
                        ];
                    })->toArray()
                ]);
            }

            // Generate cache key based on all route parameters
            // Round coordinates to 4 decimal places (~11m precision) for cache hits
            $cacheParams = [
                'start' => [round($startLat, 4), round($startLon, 4)],
                'end' => [round($endLat, 4), round($endLon, 4)],
                'curvature' => $curvatureLevel,
                'waypoints' => !empty($waypoints) ? array_map(function($wp) {
                    return [round($wp['lat'] ?? $wp[0], 4), round($wp['lon'] ?? $wp['lng'] ?? $wp[1], 4)];
                }, $waypoints) : [],
                'saved_roads' => !empty($savedRoads) ? $savedRoads->pluck('id')->sort()->values()->toArray() : [],
                'avoid' => $avoidOptions ?? [],
                'alternatives' => $alternativeRoutes ? 1 : 0
            ];
            
            $cacheKey = 'route_' . md5(json_encode($cacheParams));
            $cacheTTL = 3600; // Cache for 1 hour
            
            // Check cache first
            if (Cache::has($cacheKey)) {
                Log::info('Route cache hit', [
                    'cache_key' => $cacheKey,
                    'params' => $cacheParams
                ]);
                return response()->json(Cache::get($cacheKey));
            }
            
            Log::info('Route cache miss, calculating route', [
                'cache_key' => $cacheKey,
                'params' => $cacheParams
            ]);
            
            // If saved roads are provided, use the dedicated method
            // Note: Alternative routes may not work well with saved roads due to path constraints
            if (!empty($savedRoads) && count($savedRoads) > 0) {
                Log::info('Using saved roads for route calculation', [
                    'saved_road_count' => count($savedRoads),
                    'saved_road_ids' => $savedRoads->pluck('id')->toArray()
                ]);
                // Convert Collection to array to avoid issues
                $savedRoadsArray = is_array($savedRoads) ? $savedRoads : $savedRoads->all();
                
                // If alternative routes requested, try regular route first (saved roads may prevent alternatives)
                try {
                    if ($alternativeRoutes) {
                        Log::info('Alternative routes requested with saved roads - trying regular route calculation first');
                        $route = $this->graphHopperService->findCurvedRoute(
                            $startLat,
                            $startLon,
                            $endLat,
                            $endLon,
                            $curvatureLevel,
                            $waypoints,
                            $avoidOptions,
                            $alternativeRoutes
                        );
                        
                        // If we got alternatives, use them; otherwise fall back to saved roads method
                        if (is_array($route) && count($route) > 1) {
                            Log::info('Got alternative routes despite saved roads constraint');
                        } else {
                            Log::info('No alternatives found, falling back to saved roads method (single route)');
                            $route = $this->graphHopperService->findCurvedRouteWithSavedRoads(
                                $startLat,
                                $startLon,
                                $endLat,
                                $endLon,
                                $savedRoadsArray,
                                $curvatureLevel,
                                $waypoints,
                                $alternativeRoutes
                            );
                        }
                    } else {
                        $route = $this->graphHopperService->findCurvedRouteWithSavedRoads(
                            $startLat,
                            $startLon,
                            $endLat,
                            $endLon,
                            $savedRoadsArray,
                            $curvatureLevel,
                            $waypoints,
                            $alternativeRoutes
                        );
                    }
                } catch (\Exception $e) {
                    // Check if it's a rate limit error
                    if (stripos($e->getMessage(), 'rate limit') !== false) {
                        return response()->json([
                            'error' => 'GraphHopper API rate limit reached',
                            'message' => $e->getMessage(),
                        ], 429);
                    }
                    // Re-throw other exceptions
                    throw $e;
                }
            } else {
                // Use regular route calculation
                try {
                    $route = $this->graphHopperService->findCurvedRoute(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        $curvatureLevel,
                        $waypoints,
                        $avoidOptions,
                        $alternativeRoutes
                    );
                } catch (\Exception $e) {
                    // Check if it's a rate limit error
                    if (stripos($e->getMessage(), 'rate limit') !== false) {
                        return response()->json([
                            'error' => 'GraphHopper API rate limit reached',
                            'message' => $e->getMessage(),
                        ], 429);
                    }
                    // Re-throw other exceptions
                    throw $e;
                }
            }
            
            // Cache successful route results (don't cache errors)
            if ($route && !isset($route['error'])) {
                Cache::put($cacheKey, $route, $cacheTTL);
                Log::info('Route cached', [
                    'cache_key' => $cacheKey,
                    'ttl_seconds' => $cacheTTL
                ]);
            }

            // Handle alternative routes (array) vs single route
            // Only wrap in alternative routes format if alternative routes were actually requested
            if ($alternativeRoutes && is_array($route)) {
                if (count($route) > 0) {
                    // Alternative routes returned as array
                    Log::info('RouteController: Returning alternative routes', ['count' => count($route)]);
                    return response()->json([
                        'routes' => $route,
                        'alternative_routes' => true
                    ]);
                } else {
                    // Empty array - no valid routes after filtering
                    Log::warning('RouteController: Alternative routes requested but empty array returned (all routes filtered out)');
                    return response()->json([
                        'error' => 'Could not calculate alternative routes',
                        'message' => 'No valid alternative routes found. All routes were filtered out due to backtracking or missing coordinates.',
                        'routes' => [],
                        'alternative_routes' => true,
                        'single_route' => false
                    ], 200);
                }
            }
            
            // If alternative routes were requested but only one returned, still wrap it in routes array
            if ($alternativeRoutes && !is_array($route) && $route) {
                Log::info('RouteController: Alternative routes requested but only one route returned, wrapping in array');
                return response()->json([
                    'routes' => [$route],
                    'alternative_routes' => true,
                    'single_route' => true  // Flag to indicate only one route available
                ]);
            }
            
            // If alternative routes were NOT requested but route is an array, log warning and return first route
            // Also handle if route is an object (JSON can decode arrays as objects)
            if (!$alternativeRoutes && (is_array($route) || is_object($route))) {
                // Convert object to array if needed
                if (is_object($route)) {
                    $route = (array) $route;
                }
                
                // If array keys are not numeric, try to reindex
                $keys = array_keys($route);
                $hasNumericKeys = !empty($keys) && is_numeric($keys[0]);
                
                Log::warning('RouteController: Alternative routes NOT requested but array returned, searching for valid route', [
                    'route_count' => count($route),
                    'has_numeric_keys' => $hasNumericKeys,
                    'first_key' => !empty($keys) ? $keys[0] : 'none',
                    'first_element_type' => (count($route) > 0 && isset($route[$keys[0] ?? 0])) ? gettype($route[$keys[0] ?? 0]) : 'empty',
                    'first_element_is_array' => (count($route) > 0 && isset($route[$keys[0] ?? 0]) && is_array($route[$keys[0] ?? 0])),
                    'has_coordinates' => (count($route) > 0 && isset($route[$keys[0] ?? 0]) && isset($route[$keys[0] ?? 0]['coordinates'])) ? (is_array($route[$keys[0] ?? 0]['coordinates']) ? count($route[$keys[0] ?? 0]['coordinates']) : 'not array') : 0
                ]);
                
                if (count($route) === 0) {
                    // Empty array - no routes found
                    Log::error('RouteController: Empty array returned when alternative routes NOT requested');
                    return response()->json([
                        'error' => 'Could not calculate route',
                        'message' => 'No route found. This may be due to GraphHopper configuration or no route available.',
                    ], 200);
                }
                
                // Try to find a valid route in the array
                $validRoute = null;
                // Reindex array if keys are not numeric to ensure we can iterate properly
                if (!$hasNumericKeys) {
                    $route = array_values($route);
                }
                foreach ($route as $index => $routeItem) {
                    // Convert routeItem to array if it's an object
                    if (is_object($routeItem)) {
                        $routeItem = (array) $routeItem;
                    }
                    
                    // Check if routeItem is already a coordinate array (array of [lat, lon] pairs)
                    if (is_array($routeItem) && !empty($routeItem) && isset($routeItem[0]) && is_array($routeItem[0]) && count($routeItem[0]) >= 2 && is_numeric($routeItem[0][0]) && is_numeric($routeItem[0][1])) {
                        // This is a coordinate array, wrap it in a route object and calculate statistics
                        $coordinatesArray = $routeItem;
                        
                        // Calculate distance from coordinates using GraphHopperService's method
                        $totalDistance = 0;
                        for ($i = 0; $i < count($coordinatesArray) - 1; $i++) {
                            $lat1 = $coordinatesArray[$i][0];
                            $lon1 = $coordinatesArray[$i][1];
                            $lat2 = $coordinatesArray[$i + 1][0];
                            $lon2 = $coordinatesArray[$i + 1][1];
                            // Use reflection to call protected method, or calculate directly
                            $earthRadius = 6371000; // meters
                            $dLat = deg2rad($lat2 - $lat1);
                            $dLon = deg2rad($lon2 - $lon1);
                            $a = sin($dLat / 2) * sin($dLat / 2) +
                                 cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
                                 sin($dLon / 2) * sin($dLon / 2);
                            $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                            $totalDistance += $earthRadius * $c;
                        }
                        
                        // Calculate route statistics using GraphHopperService
                        try {
                            // Use reflection to access protected method
                            $reflection = new \ReflectionClass($this->graphHopperService);
                            $method = $reflection->getMethod('calculateRouteStats');
                            $method->setAccessible(true);
                            $stats = $method->invoke($this->graphHopperService, $coordinatesArray);
                        } catch (\Exception $e) {
                            Log::warning('RouteController: Error calculating route stats for coordinate array', [
                                'error' => $e->getMessage()
                            ]);
                            $stats = [
                                'curvature' => 0,
                                'corner_count' => 0,
                                'elevation_gain' => 0,
                                'elevation_loss' => 0,
                                'max_elevation' => 0,
                                'min_elevation' => 0
                            ];
                        }
                        
                        // Estimate duration (assuming average speed of 60 km/h)
                        $duration = ($totalDistance / 1000) / 60 * 3600; // Convert to seconds
                        
                        $validRoute = [
                            'coordinates' => $coordinatesArray,
                            'distance' => $totalDistance,
                            'duration' => $duration,
                            'distance_km' => round($totalDistance / 1000, 2),
                            'duration_min' => round($duration / 60, 2),
                            'curvature' => $stats['curvature'] ?? 0,
                            'corner_count' => $stats['corner_count'] ?? 0,
                            'elevation_gain' => $stats['elevation_gain'] ?? 0,
                            'elevation_loss' => $stats['elevation_loss'] ?? 0,
                            'max_elevation' => $stats['max_elevation'] ?? 0,
                            'min_elevation' => $stats['min_elevation'] ?? 0
                        ];
                        Log::info('RouteController: Found coordinate array at index ' . $index, [
                            'has_coordinates' => count($coordinatesArray),
                            'coordinates_type' => 'direct coordinate array',
                            'distance' => $totalDistance,
                            'curvature' => $stats['curvature'] ?? 0
                        ]);
                        break;
                    }
                    
                    if (is_array($routeItem) && isset($routeItem['coordinates'])) {
                        // Convert coordinates from object to array if needed (JSON can return objects with numeric keys)
                        $coordinates = $routeItem['coordinates'];
                        
                        // Handle object
                        if (is_object($coordinates)) {
                            $coordinates = (array) $coordinates;
                        }
                        
                        // Convert to indexed array if it's an associative array with numeric string keys
                        if (is_array($coordinates) && !empty($coordinates)) {
                            $coordinatesArray = array_values($coordinates); // Always convert to indexed array
                            
                            // Validate that first element is a coordinate pair [lat, lon] or [lon, lat]
                            if (!empty($coordinatesArray) && isset($coordinatesArray[0])) {
                                $firstCoord = $coordinatesArray[0];
                                if (is_array($firstCoord) && count($firstCoord) >= 2 && is_numeric($firstCoord[0]) && is_numeric($firstCoord[1])) {
                                    // Valid coordinates found
                                    $routeItem['coordinates'] = $coordinatesArray;
                                    
                                    // If route statistics are missing, calculate them
                                    if (!isset($routeItem['distance']) || $routeItem['distance'] == 0 || !isset($routeItem['curvature'])) {
                                        try {
                                            // Use reflection to access protected method
                                            $reflection = new \ReflectionClass($this->graphHopperService);
                                            $method = $reflection->getMethod('calculateRouteStats');
                                            $method->setAccessible(true);
                                            $stats = $method->invoke($this->graphHopperService, $coordinatesArray);
                                            
                                            // Calculate distance if missing
                                            if (!isset($routeItem['distance']) || $routeItem['distance'] == 0) {
                                                $totalDistance = 0;
                                                for ($i = 0; $i < count($coordinatesArray) - 1; $i++) {
                                                    $lat1 = $coordinatesArray[$i][0];
                                                    $lon1 = $coordinatesArray[$i][1];
                                                    $lat2 = $coordinatesArray[$i + 1][0];
                                                    $lon2 = $coordinatesArray[$i + 1][1];
                                                    $earthRadius = 6371000; // meters
                                                    $dLat = deg2rad($lat2 - $lat1);
                                                    $dLon = deg2rad($lon2 - $lon1);
                                                    $a = sin($dLat / 2) * sin($dLat / 2) +
                                                         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
                                                         sin($dLon / 2) * sin($dLon / 2);
                                                    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                                                    $totalDistance += $earthRadius * $c;
                                                }
                                                $routeItem['distance'] = $totalDistance;
                                                $routeItem['distance_km'] = round($totalDistance / 1000, 2);
                                                
                                                // Estimate duration (assuming average speed of 60 km/h)
                                                $duration = ($totalDistance / 1000) / 60 * 3600; // Convert to seconds
                                                $routeItem['duration'] = $duration;
                                                $routeItem['duration_min'] = round($duration / 60, 2);
                                            }
                                            
                                            // Add statistics
                                            $routeItem['curvature'] = $stats['curvature'] ?? 0;
                                            $routeItem['corner_count'] = $stats['corner_count'] ?? 0;
                                            $routeItem['elevation_gain'] = $stats['elevation_gain'] ?? 0;
                                            $routeItem['elevation_loss'] = $stats['elevation_loss'] ?? 0;
                                            $routeItem['max_elevation'] = $stats['max_elevation'] ?? 0;
                                            $routeItem['min_elevation'] = $stats['min_elevation'] ?? 0;
                                        } catch (\Exception $e) {
                                            Log::warning('RouteController: Error calculating route stats', [
                                                'error' => $e->getMessage()
                                            ]);
                                        }
                                    }
                                    
                                    $validRoute = $routeItem;
                                    Log::info('RouteController: Found valid route at index ' . $index, [
                                        'has_coordinates' => count($coordinatesArray),
                                        'coordinates_type' => 'converted from object/associative array',
                                        'first_coord' => $firstCoord,
                                        'has_distance' => isset($routeItem['distance']),
                                        'has_curvature' => isset($routeItem['curvature'])
                                    ]);
                                    break;
                                } else {
                                    Log::warning('RouteController: Invalid first coordinate format at index ' . $index, [
                                        'first_coord' => $firstCoord,
                                        'is_array' => is_array($firstCoord),
                                        'count' => is_array($firstCoord) ? count($firstCoord) : 'not array',
                                        'is_numeric_0' => isset($firstCoord[0]) ? is_numeric($firstCoord[0]) : false,
                                        'is_numeric_1' => isset($firstCoord[1]) ? is_numeric($firstCoord[1]) : false
                                    ]);
                                }
                            } else {
                                Log::warning('RouteController: Empty coordinates array or missing first element at index ' . $index, [
                                    'coordinates_count' => count($coordinatesArray),
                                    'has_first' => isset($coordinatesArray[0])
                                ]);
                            }
                        } else {
                            Log::warning('RouteController: Coordinates is not array or empty at index ' . $index, [
                                'coordinates_type' => gettype($coordinates),
                                'is_array' => is_array($coordinates),
                                'is_empty' => is_array($coordinates) ? empty($coordinates) : 'not array'
                            ]);
                        }
                    } else {
                        Log::warning('RouteController: RouteItem is not array or missing coordinates at index ' . $index, [
                            'is_array' => is_array($routeItem),
                            'has_coordinates' => isset($routeItem['coordinates']),
                            'routeItem_keys' => is_array($routeItem) ? array_keys($routeItem) : 'not array'
                        ]);
                    }
                }
                
                if ($validRoute) {
                    $route = $validRoute; // Use first valid route
                    Log::info('RouteController: Successfully extracted valid route from array', [
                        'has_coordinates' => count($route['coordinates'] ?? [])
                    ]);
                } else {
                    // No valid route found in array
                    Log::error('RouteController: Array returned but no valid route found', [
                        'route_count' => count($route),
                        'first_element_type' => (isset($route[0])) ? gettype($route[0]) : 'not set',
                        'first_element_keys' => (isset($route[0]) && is_array($route[0])) ? array_keys($route[0]) : 'not an array',
                        'sample_elements' => count($route) > 0 ? array_slice($route, 0, min(3, count($route))) : [] // Log first 3 elements for debugging
                    ]);
                    return response()->json([
                        'error' => 'Invalid route format',
                        'message' => 'Route calculation returned invalid format. GraphHopper may have returned unexpected data. Please try again.',
                    ], 200);
                }
            }
            
            // If alternative routes were requested but route is null, return error
            if ($alternativeRoutes && !$route) {
                Log::warning('RouteController: Alternative routes requested but no route returned');
                return response()->json([
                    'error' => 'Could not calculate alternative routes',
                    'message' => 'No route found. This may be due to GraphHopper configuration or no route available.',
                    'routes' => [],
                    'alternative_routes' => true,
                    'single_route' => false
                ], 200);
            }
            
            if (!$route) {
                // Get last error from logs or provide more details
                Log::error('RouteController: No route returned from GraphHopperService', [
                    'start' => [$startLat, $startLon],
                    'end' => [$endLat, $endLon],
                    'curvature_level' => $curvatureLevel,
                    'avoid_options' => $avoidOptions,
                    'avoid_options_count' => count($avoidOptions),
                    'waypoint_count' => count($waypoints),
                    'saved_road_count' => count($savedRoads),
                    'alternative_routes' => $alternativeRoutes
                ]);
                
                // Check if GraphHopper returned a 429 (rate limit) - this is the source of truth
                // Don't check logs, check the actual GraphHopper response
                $errorMessage = 'No suitable route found. This may be due to GraphHopper configuration or no route available.';
                
                return response()->json([
                    'error' => 'Could not calculate route with GraphHopper',
                    'message' => $errorMessage,
                    'debug' => [
                        'graphhopper_url' => config('services.graphhopper.url'),
                        'profile' => config('services.graphhopper.profile'),
                        'has_api_key' => !empty(config('services.graphhopper.api_key')),
                        'start' => [$startLat, $startLon],
                        'end' => [$endLat, $endLon],
                        'curvature_level' => $curvatureLevel,
                        'avoid_options' => $avoidOptions,
                        'avoid_options_count' => count($avoidOptions),
                        'saved_road_count' => count($savedRoads),
                        'waypoint_count' => count($waypoints)
                    ]
                ], 200);
            }

            // Track route usage for authenticated users
            $user = $request->user();
            if ($user) {
                try {
                    $this->subscriptionService->recordRouteUsage($user, [
                        'route_type' => 'graphhopper',
                        'curvature_level' => $curvatureLevel,
                        'waypoints_count' => count($waypoints) + 2, // start + end + waypoints
                        'distance_km' => isset($route['distance']) ? $route['distance'] / 1000 : null,
                    ]);
                } catch (\Exception $e) {
                    \Log::warning('Failed to record route usage', ['error' => $e->getMessage()]);
                }
            }

            // Track global API calls (for free tier limit monitoring)
            try {
                $apiTracker = app(\App\Services\GraphHopperApiTracker::class);
                $apiStats = $apiTracker->increment();
                
                // Add API stats to response for frontend warning
                $route['_api_stats'] = [
                    'count' => $apiStats['count'],
                    'remaining' => $apiStats['remaining'],
                    'limit' => $apiStats['limit'],
                    'warning' => $apiStats['warning'],
                    'limit_reached' => $apiStats['limit_reached']
                ];
            } catch (\Exception $e) {
                \Log::warning('Failed to track API calls', ['error' => $e->getMessage()]);
            }

            return response()->json($route);
        } catch (\Exception $e) {
            \Log::error('Error in graphhopper endpoint', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'url' => config('services.graphhopper.url'),
                'profile' => config('services.graphhopper.profile'),
                'start' => [$startLat, $startLon],
                'end' => [$endLat, $endLon],
                'curvature_level' => $curvatureLevel
            ]);
            
            // Provide more helpful error messages
            $errorMessage = $e->getMessage();
            if (strpos($errorMessage, 'Connection') !== false || strpos($errorMessage, 'timeout') !== false) {
                $errorMessage = 'Could not connect to GraphHopper API. Please check your GRAPHHOPPER_URL configuration.';
            } elseif (strpos($errorMessage, '404') !== false) {
                $errorMessage = 'GraphHopper endpoint not found. Please verify the API URL is correct.';
            } elseif (strpos($errorMessage, '401') !== false || strpos($errorMessage, '403') !== false) {
                $errorMessage = 'GraphHopper API authentication failed. Please check your API key.';
            }
            
            return response()->json([
                'error' => 'Route calculation failed',
                'message' => $errorMessage,
                'debug' => [
                    'graphhopper_url' => config('services.graphhopper.url'),
                    'profile' => config('services.graphhopper.profile')
                ]
            ], 500);
        }
    }

    /**
     * Calculate round trip route using GraphHopper
     * Returns to starting point after traveling specified distance
     */
    public function roundTrip(Request $request)
    {
        // Get authenticated user - should always be present due to auth:sanctum middleware
        $user = $request->user();
        
        // If no user, this is an error - should not happen with auth:sanctum middleware
        if (!$user) {
            return response()->json([
                'error' => 'Authentication required',
                'message' => 'You must be logged in to use round trip feature.',
            ], 401);
        }
        
        // Load subscription directly (bypass relationship constraints)
        $subscription = \App\Models\Subscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->where(function($query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->latest('created_at')
            ->first();
        
        // Set subscription on user model for access checks
        if ($subscription) {
            $user->setRelation('subscription', $subscription);
        }
        
        // Debug: Log all subscriptions for this user
        if ($user) {
            $allSubs = \App\Models\Subscription::where('user_id', $user->id)->get();
            \Log::info('RouteController::roundTrip - All subscriptions for user', [
                'user_id' => $user->id,
                'subscription_count' => $allSubs->count(),
                'subscriptions' => $allSubs->map(function($sub) {
                    return [
                        'id' => $sub->id,
                        'plan' => $sub->plan,
                        'status' => $sub->status,
                        'ends_at' => $sub->ends_at?->toDateTimeString(),
                        'starts_at' => $sub->starts_at?->toDateTimeString(),
                    ];
                })->toArray(),
            ]);
        }
        
        // Determine max distance based on subscription tier for validation
        $user = $request->user();
        $maxDistance = 2000; // Default high limit for premium/pro (effectively unlimited)
        if ($user) {
            // Refresh user model to ensure we have latest data
            $user->refresh();
            
            // Use SubscriptionService to get tier (most reliable method)
            // The subscription service will handle all the complex subscription detection
            $tier = $user->getSubscriptionTier();
            
            // Set max distance based on tier
            if (in_array($tier, ['premium', 'pro'])) {
                $maxDistance = 2000; // High limit for premium/pro
            } else {
                $maxDistance = 300; // Free tier limit
            }
            
            \Log::info('Round trip validation', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'tier' => $tier,
                'max_distance_set' => $maxDistance,
                'requested_distance' => $request->input('distance_km'),
            ]);
        } else {
            $maxDistance = 300; // Unauthenticated users get free tier limit
        }

        $validator = Validator::make($request->all(), [
            'start_lat' => 'required|numeric|between:-90,90',
            'start_lon' => 'required|numeric|between:-180,180',
            'distance_km' => 'required|numeric|min:50|max:2000', // Max 2000km for validation, actual limit checked by subscription service
            'curvature_level' => 'nullable|in:straightest,balanced,curvy,extra_curvy',
            'waypoints' => 'nullable|array',
            'waypoints.*.lat' => 'required_with:waypoints|numeric|between:-90,90',
            'waypoints.*.lon' => 'required_with:waypoints|numeric|between:-180,180',
            'saved_road_ids' => 'nullable|array',
            'saved_road_ids.*' => 'nullable|integer|exists:saved_roads,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $startLat = $request->input('start_lat');
        $startLon = $request->input('start_lon');
        $distanceKm = $request->input('distance_km');
        $curvatureLevel = $request->input('curvature_level', 'balanced');
        $waypoints = $request->input('waypoints', []);
        $savedRoadIds = $request->input('saved_road_ids', []);

        // Check subscription limits for round trip distance (double-check with subscription service)
        if ($user) {
            // Force refresh user model to ensure we have latest data
            $user->refresh();
            
            \Log::info('RouteController::roundTrip - Before subscription check', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_name' => $user->name,
                'requested_distance' => $distanceKm,
            ]);
            
            $roundTripCheck = $this->subscriptionService->canUseRoundTrip($user, $distanceKm);
            
            \Log::info('RouteController::roundTrip - After subscription check', [
                'user_id' => $user->id,
                'allowed' => $roundTripCheck['allowed'] ? 'yes' : 'no',
                'tier' => $roundTripCheck['tier'] ?? 'unknown',
                'max_distance' => $roundTripCheck['max_distance'],
                'message' => $roundTripCheck['message'] ?? null,
            ]);
            
            // Check if allowed - handle both boolean true and integer 1
            $isAllowed = $roundTripCheck['allowed'] === true || $roundTripCheck['allowed'] === 1 || $roundTripCheck['allowed'] === '1';
            
            if (!$isAllowed) {
                \Log::error('RouteController::roundTrip - Subscription check FAILED', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'user_name' => $user->name,
                    'tier_from_check' => $roundTripCheck['tier'] ?? 'unknown',
                    'tier_from_user' => $user->getSubscriptionTier(),
                    'requested_distance' => $distanceKm,
                    'max_distance' => $roundTripCheck['max_distance'],
                    'message' => $roundTripCheck['message'],
                    'check_result' => $roundTripCheck,
                    'allowed_value' => $roundTripCheck['allowed'],
                    'allowed_type' => gettype($roundTripCheck['allowed']),
                    'is_allowed_after_check' => $isAllowed,
                ]);
                
                return response()->json([
                    'error' => 'Round trip distance limit exceeded',
                    'message' => $roundTripCheck['message'],
                    'max_distance' => $roundTripCheck['max_distance'],
                    'requested_distance' => $distanceKm,
                    'user_tier' => $roundTripCheck['tier'] ?? $user->getSubscriptionTier(),
                    'debug' => [
                        'user_id' => $user->id,
                        'subscription_check_allowed' => $roundTripCheck['allowed'],
                        'subscription_check_tier' => $roundTripCheck['tier'] ?? 'unknown',
                    ],
                ], 403);
            }
            
            // Load subscription directly (bypass relationship constraints)
            $subscription = \App\Models\Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->where(function($query) {
                    $query->whereNull('ends_at')
                        ->orWhere('ends_at', '>', now());
                })
                ->latest('created_at')
                ->first();
            
            // Set subscription on user model for access checks
            if ($subscription) {
                $user->setRelation('subscription', $subscription);
            }
            
            // Check if curvature level is allowed
            if (!$this->subscriptionService->canUseCurvatureLevel($user, $curvatureLevel)) {
                return response()->json([
                    'error' => 'Curvature level not available',
                    'message' => 'The extra_curvy curvature level requires Premium or Pro subscription.',
                    'curvature_level' => $curvatureLevel,
                ], 403);
            }
        } else {
            // For unauthenticated users, apply free tier limits
            if ($distanceKm > 300) {
                return response()->json([
                    'error' => 'Round trip distance limit exceeded',
                    'message' => 'Round trips are limited to 300km. Sign up for free or upgrade to Premium for unlimited round trips.',
                    'max_distance' => 300,
                    'requested_distance' => $distanceKm,
                ], 403);
            }
            if ($curvatureLevel === 'extra_curvy') {
                return response()->json([
                    'error' => 'Curvature level not available',
                    'message' => 'The extra_curvy curvature level requires Premium or Pro subscription.',
                    'curvature_level' => $curvatureLevel,
                ], 403);
            }
        }

        // Test GraphHopper connection first
        $connectionTest = $this->graphHopperService->testConnection();
        if (!isset($connectionTest['connected']) || !$connectionTest['connected']) {
            return response()->json([
                'error' => 'GraphHopper service unavailable',
                'message' => 'GraphHopper server is not running. Please start it using the setup guide.',
                'connection_test' => $connectionTest
            ], 503);
        }

        try {
            // Load saved roads if provided
            $savedRoads = [];
            if (!empty($savedRoadIds) && is_array($savedRoadIds)) {
                // Validate that saved roads belong to the authenticated user (if authenticated)
                $user = $request->user();
                if ($user) {
                    $savedRoads = \App\Models\SavedRoad::whereIn('id', $savedRoadIds)
                        ->where(function($query) use ($user) {
                            $query->where('user_id', $user->id)
                                  ->orWhere('is_public', true);
                        })
                        ->get();
                } else {
                    // If not authenticated, only allow public saved roads
                    $savedRoads = \App\Models\SavedRoad::whereIn('id', $savedRoadIds)
                        ->where('is_public', true)
                        ->get();
                }
                
                // Validate all requested roads were found
                if (count($savedRoads) < count($savedRoadIds)) {
                    \Log::warning('Some saved roads not found or not accessible', [
                        'requested_ids' => $savedRoadIds,
                        'found_count' => count($savedRoads),
                        'found_ids' => $savedRoads->pluck('id')->toArray()
                    ]);
                }
                
                \Log::info('Loaded saved roads for round trip', [
                    'requested_count' => count($savedRoadIds),
                    'loaded_count' => count($savedRoads),
                    'saved_road_ids' => $savedRoads->pluck('id')->toArray()
                ]);
            }

            // Convert Collection to array to avoid issues
            $savedRoadsArray = is_array($savedRoads) ? $savedRoads : $savedRoads->all();
            
            // Generate cache key for round trip
            $roundTripCacheParams = [
                'type' => 'round_trip',
                'start' => [round($startLat, 4), round($startLon, 4)],
                'distance' => round($distanceKm, 1), // Round to 1 decimal for cache hits
                'curvature' => $curvatureLevel,
                'waypoints' => !empty($waypoints) ? array_map(function($wp) {
                    return [round($wp['lat'] ?? $wp[0], 4), round($wp['lon'] ?? $wp['lng'] ?? $wp[1], 4)];
                }, $waypoints) : [],
                'saved_roads' => !empty($savedRoads) ? $savedRoads->pluck('id')->sort()->values()->toArray() : []
            ];
            
            $roundTripCacheKey = 'round_trip_' . md5(json_encode($roundTripCacheParams));
            $roundTripCacheTTL = 3600; // Cache for 1 hour
            
            // Check cache first
            if (Cache::has($roundTripCacheKey)) {
                Log::info('Round trip cache hit', [
                    'cache_key' => $roundTripCacheKey,
                    'params' => $roundTripCacheParams
                ]);
                return response()->json(Cache::get($roundTripCacheKey));
            }
            
            Log::info('Round trip cache miss, calculating route', [
                'cache_key' => $roundTripCacheKey,
                'params' => $roundTripCacheParams
            ]);
            
            $route = $this->graphHopperService->findRoundTripRoute(
                $startLat,
                $startLon,
                $distanceKm,
                $curvatureLevel,
                $savedRoadsArray,
                $waypoints
            );
            
            if (!$route) {
                return response()->json([
                    'error' => 'Could not calculate round trip route',
                    'message' => 'No valid route found for the specified parameters. Try adjusting the distance or starting location.'
                ], 404);
            }
            
            // Cache successful round trip results
            Cache::put($roundTripCacheKey, $route, $roundTripCacheTTL);
            Log::info('Round trip cached', [
                'cache_key' => $roundTripCacheKey,
                'ttl_seconds' => $roundTripCacheTTL
            ]);

            // Track route usage for authenticated users
            $user = $request->user();
            if ($user) {
                try {
                    $this->subscriptionService->recordRouteUsage($user, [
                        'route_type' => 'round_trip',
                        'curvature_level' => $curvatureLevel,
                        'waypoints_count' => count($waypoints) + 1, // start point (round trip)
                        'distance_km' => isset($route['distance']) ? $route['distance'] / 1000 : $distanceKm,
                    ]);
                } catch (\Exception $e) {
                    \Log::warning('Failed to record route usage', ['error' => $e->getMessage()]);
                }
            }

            return response()->json($route);
        } catch (\Exception $e) {
            \Log::error('Error calculating round trip route', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'start' => [$startLat, $startLon],
                'distance_km' => $distanceKm,
                'curvature_level' => $curvatureLevel
            ]);
            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate route with segment-specific curvature levels
     * Each segment (between waypoints) can have a different curvature level
     */
    public function graphhopperSegmentCurvature(Request $request)
    {
        // GraphHopper feature is currently disabled
        return response()->json([
            'error' => true,
            'message' => 'GraphHopper service is not currently available. Please use the basic road search instead.',
        ], 503);
    }

    public function graphhopperTest()
    {
        try {
            $isConnected = $this->graphHopperService->testConnection();
            return response()->json([
                'connected' => $isConnected,
                'url' => config('services.graphhopper.url'),
                'profile' => config('services.graphhopper.profile')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'connected' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}


