<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Services\ElevationService;
use GuzzleHttp\Client;
use GuzzleHttp\Promise\Utils as PromiseUtils;

class GraphHopperService
{
    protected $elevationService;
    protected $baseUrl;
    protected $profile;
    protected $apiKey;

    public function __construct(ElevationService $elevationService)
    {
        $this->elevationService = $elevationService;
        $this->apiKey = config('services.graphhopper.api_key', null);

        // Extra logging to verify API key wiring from .env -> config -> service
        // Use error log level so it appears even in production logs
        // Collect any env/server variables that mention GRAPHHOPPER to debug naming/spacing issues
        $rawEnv = [];
        foreach (array_merge($_ENV, $_SERVER) as $k => $v) {
            if (stripos($k, 'GRAPHHOPPER') !== false) {
                $rawEnv[$k] = $v;
            }
        }

        Log::error('GraphHopperService constructor config check', [
            'env_graphhopper_url' => env('GRAPHHOPPER_URL'),
            'env_graphhopper_profile' => env('GRAPHHOPPER_PROFILE'),
            'env_graphhopper_api_key_present' => !empty(env('GRAPHHOPPER_API_KEY')),
            'config_graphhopper' => config('services.graphhopper'),
            'api_key_present_in_service' => !empty($this->apiKey),
            'raw_graphhopper_env_keys' => array_keys($rawEnv),
        ]);
        
        // If API key is set but URL is still localhost, default to GraphHopper Cloud API
        $configuredUrl = config('services.graphhopper.url', null);
        if ($this->apiKey && (!$configuredUrl || $configuredUrl === 'http://localhost:8989')) {
            $this->baseUrl = 'https://graphhopper.com/api/1';
            Log::info('GraphHopperService: Using Cloud API URL due to API key presence', [
                'api_key_set' => !empty($this->apiKey),
                'configured_url' => $configuredUrl,
                'using_url' => $this->baseUrl
            ]);
        } else {
            $this->baseUrl = $configuredUrl ?? 'http://localhost:8989';
        }
        
        $this->profile = config('services.graphhopper.profile', 'car'); // Default to 'car' since that's what GraphHopper has configured
    }
    
    /**
     * Build URL with API key if needed
     * GraphHopper Cloud API requires API key as query parameter
     */
    protected function buildUrl($endpoint)
    {
        $url = $this->baseUrl . $endpoint;
        
        // Add API key as query parameter if using GraphHopper Cloud API
        if ($this->apiKey) {
            $separator = strpos($url, '?') !== false ? '&' : '?';
            $url .= $separator . 'key=' . urlencode($this->apiKey);
        }
        
        return $url;
    }

    /**
     * Find route using GraphHopper with Kurviger-style curvature levels
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param string $curvatureLevel 'balanced', 'curvy', 'extra_curvy'
     * @param array $waypoints Optional waypoints array [['lat' => x, 'lon' => y], ...]
     * @return array|null
     */
    public function findCurvedRoute($startLat, $startLon, $endLat, $endLon, $curvatureLevel = 'balanced', $waypoints = [], $avoidOptions = [], $alternativeRoutes = false)
    {
        $startTime = microtime(true);
        
        try {
            // If waypoints are provided, calculate route segment by segment
            // This ensures waypoints act as shaping points for curved routes, not mandatory stops
            if (!empty($waypoints) && is_array($waypoints)) {
                // Only pass the arguments that the method accepts (6 args)
                return $this->findCurvedRouteWithWaypoints($startLat, $startLon, $endLat, $endLon, $waypoints, $curvatureLevel);
            }
            
            // Map curvature level to GraphHopper custom model
            $customModel = $this->buildCustomModel($curvatureLevel, $avoidOptions);
            
            // Build points array: start -> end (no waypoints)
            $points = [
                [$startLon, $startLat],
                [$endLon, $endLat]
            ];
            
            // GraphHopper 8.0 requires POST request with custom model in body
            // GraphHopper Cloud API requires ch.disable: true when using custom_model
            // Build request payload
            $payload = [
                'points' => $points,
                'profile' => $this->profile,
                'points_encoded' => false,
                'instructions' => true,
                'calc_points' => true,
                // Prevent ferry routes which can cause dead ends
                'snap_preventions' => ['ferry'],
                'ch.disable' => true, // Required for custom_model to work
                'custom_model' => $customModel
            ];
            
            // Add alternative routes if requested
            if ($alternativeRoutes) {
                $payload['alternative_route'] = [
                    'max_paths' => 3,
                    'max_weight_factor' => 2.5,  // More lenient - allows routes up to 2.5x longer
                    'max_share_factor' => 0.9    // More lenient - allows up to 90% shared segments
                ];
                Log::info('GraphHopper alternative routes requested', [
                    'max_paths' => 3,
                    'max_weight_factor' => 2.5,
                    'max_share_factor' => 0.9
                ]);
            }
            
            Log::info('GraphHopper route request', [
                'curvature_level' => $curvatureLevel,
                'waypoint_count' => count($waypoints),
                'total_points' => count($points),
                'avoid_options' => $avoidOptions,
                'avoid_options_count' => count($avoidOptions),
                'custom_model_summary' => [
                    'speed_rules' => count($customModel['speed'] ?? []),
                    'priority_rules' => count($customModel['priority'] ?? [])
                ]
            ]);
            
            // Use POST request with custom model in body
            $url = $this->buildUrl('/route');
            
            Log::info('GraphHopper API request', [
                'url' => $url,
                'has_api_key' => !empty($this->apiKey),
                'profile' => $this->profile,
                'curvature_level' => $curvatureLevel
            ]);
            
            $response = Http::timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url, $payload);
            
            if (!$response->successful()) {
                $errorBody = $response->body();
                $errorData = null;
                try {
                    $errorData = json_decode($errorBody, true);
                } catch (\Exception $e) {
                    // Not JSON, use raw body
                }

                $messageText = is_array($errorData) && isset($errorData['message'])
                    ? $errorData['message']
                    : (is_string($errorBody) ? $errorBody : '');

                // Special case: GraphHopper free packages cannot use flexible mode (custom_model + ch.disable)
                // Check for various forms of this error message
                $isFreePlanError = is_string($messageText) && (
                    stripos($messageText, 'Free packages cannot use flexible mode') !== false ||
                    stripos($messageText, 'free packages cannot use flexible') !== false ||
                    stripos($messageText, 'flexible mode') !== false && stripos($messageText, 'free') !== false
                );

                if ($isFreePlanError && $response->status() === 400) {
                    Log::warning('GraphHopper free plan detected - retrying without custom_model / flexible mode', [
                        'status' => $response->status(),
                        'message' => $messageText,
                        'url' => $url,
                        'has_api_key' => !empty($this->apiKey),
                        'base_url' => $this->baseUrl,
                        'curvature_level' => $curvatureLevel,
                        'error_body' => substr($errorBody, 0, 200), // First 200 chars for debugging
                    ]);

                    // Retry once with basic routing (no custom_model, no ch.disable) which is allowed on free plans
                    return $this->callBasicRouteWithoutCustomModel(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        $points,
                        $curvatureLevel // Preserve requested curvature level in metadata
                    );
                }
                
                // Check for rate limit (429) - this is the source of truth
                $isRateLimit = $response->status() === 429 || (is_string($messageText) && stripos($messageText, 'rate limit') !== false || stripos($messageText, 'limit reached') !== false);
                
                Log::error('GraphHopper API error', [
                    'status' => $response->status(),
                    'body' => $errorBody,
                    'error_data' => $errorData,
                    'url' => $url,
                    'has_api_key' => !empty($this->apiKey),
                    'base_url' => $this->baseUrl,
                    'is_rate_limit' => $isRateLimit
                ]);
                
                // If it's a rate limit, throw exception so RouteController can handle it properly
                if ($isRateLimit) {
                    throw new \Exception('GraphHopper API rate limit reached. Please wait a moment and try again. Free plans have rate limits on requests per minute.');
                }
                
                // Fallback: try continuity-friendly model once on other API errors
                $fallbackPayload = $payload;
                $fallbackPayload['custom_model'] = $this->buildContinuityModel($curvatureLevel, $avoidOptions);
                Log::warning('Retrying with continuity-friendly model due to API error');
                $fallbackResp = Http::timeout(30)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($this->buildUrl('/route'), $fallbackPayload);
                if (!$fallbackResp->successful()) {
                    $fallbackErrorBody = $fallbackResp->body();
                    $fallbackErrorData = null;
                    try {
                        $fallbackErrorData = json_decode($fallbackErrorBody, true);
                    } catch (\Exception $e) {
                        // Not JSON
                    }
                    
                    Log::error('Fallback GraphHopper API error', [
                        'status' => $fallbackResp->status(),
                        'body' => $fallbackErrorBody,
                        'error_data' => $fallbackErrorData,
                        'url' => $this->buildUrl('/route')
                    ]);
                    return null;
                }
                $data = $fallbackResp->json();
            } else {
                $data = $response->json();
            }
            
            
            // Debug: Log raw response structure
            Log::info('GraphHopper raw response', [
                'has_paths' => isset($data['paths']),
                'paths_count' => isset($data['paths']) ? count($data['paths']) : 0,
                'first_path_keys' => isset($data['paths'][0]) ? array_keys($data['paths'][0]) : [],
                'alternative_routes_requested' => $alternativeRoutes,
                'response_keys' => array_keys($data ?? []),
                'full_response_structure' => [
                    'has_paths' => isset($data['paths']),
                    'paths_type' => isset($data['paths']) ? gettype($data['paths']) : 'not set',
                    'paths_is_array' => isset($data['paths']) ? is_array($data['paths']) : false,
                    'paths_count' => isset($data['paths']) ? count($data['paths']) : 0,
                    'all_path_distances' => isset($data['paths']) && is_array($data['paths']) 
                        ? array_map(function($path) { return $path['distance'] ?? 'N/A'; }, $data['paths'])
                        : []
                ]
            ]);
            
            if (!isset($data['paths']) || empty($data['paths'])) {
                Log::warning('GraphHopper returned no paths with custom_model', ['response' => $data, 'curvature_level' => $curvatureLevel]);
                // Fallback 1: retry with continuity-friendly model
                $fallbackPayload = $payload;
                $fallbackPayload['custom_model'] = $this->buildContinuityModel($curvatureLevel, $avoidOptions);
                Log::warning('No paths. Retrying with continuity-friendly model');
                $fallbackResp = Http::timeout(30)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($this->buildUrl('/route'), $fallbackPayload);
                if (!$fallbackResp->successful()) {
                    Log::error('Fallback continuity model API error', [
                        'status' => $fallbackResp->status(),
                        'body' => $fallbackResp->body()
                    ]);
                    // Continue to Fallback 2 (basic route without custom_model)
                } else {
                    $data = $fallbackResp->json();
                    if (isset($data['paths']) && !empty($data['paths'])) {
                        Log::info('Continuity model fallback succeeded');
                    } else {
                        Log::warning('Continuity model fallback also returned no paths, trying basic route');
                        // Continue to Fallback 2 (basic route without custom_model)
                    }
                }
                
                // Fallback 2: if both custom_model approaches failed, try basic route without custom_model
                if (!isset($data['paths']) || empty($data['paths'])) {
                    Log::warning('Custom model approaches failed, falling back to basic route without custom_model');
                    return $this->callBasicRouteWithoutCustomModel(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        $points,
                        $curvatureLevel
                    );
                }
            }
            
            // If alternative routes are requested, process all paths
            if ($alternativeRoutes && isset($data['paths']) && is_array($data['paths']) && count($data['paths']) > 1) {
                Log::info('Processing alternative routes', [
                    'paths_count' => count($data['paths']),
                    'paths_details' => array_map(function($path, $idx) {
                        return [
                            'index' => $idx,
                            'distance' => $path['distance'] ?? 'N/A',
                            'time' => $path['time'] ?? 'N/A',
                            'has_points' => isset($path['points']),
                            'points_type' => isset($path['points']) ? gettype($path['points']) : 'not set'
                        ];
                    }, $data['paths'], array_keys($data['paths']))
                ]);
                $routes = [];
                foreach ($data['paths'] as $index => $path) {
                    try {
                        $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                        
                        // Check if coordinates were extracted successfully
                        if (empty($route['coordinates']) || !is_array($route['coordinates']) || count($route['coordinates']) === 0) {
                            Log::warning("GraphHopper alternative route $index has no coordinates, skipping");
                            continue;
                        }
                        
                        // Check for backtracks (use lenient check for alternatives)
                        $hasBacktrack = $this->hasSignificantBacktrack($route['coordinates'], $startLat, $startLon, $endLat, $endLon, true);
                        if ($hasBacktrack) {
                            Log::warning("GraphHopper alternative route $index rejected due to backtracking");
                            continue;
                        }
                        
                        $totalTime = round((microtime(true) - $startTime) * 1000, 2);
                        $route['_timings'] = ['total' => $totalTime];
                        $route['_strategy'] = 'graphhopper';
                        $route['_curvature_level'] = $curvatureLevel;
                        $route['_alternative_index'] = $index;
                        
                        $routes[] = $route;
                    } catch (\Exception $e) {
                        Log::warning("Error formatting alternative route $index", [
                            'error' => $e->getMessage()
                        ]);
                        continue;
                    }
                }
                
                // Return array of routes if we have at least one valid route
                if (!empty($routes)) {
                    Log::info('GraphHopper alternative routes processed successfully', [
                        'total_paths' => count($data['paths']),
                        'valid_routes' => count($routes),
                        'rejected_count' => count($data['paths']) - count($routes)
                    ]);
                    return $routes;
                }
                // If alternative routes were requested but all were filtered out, return empty array
                // Don't fall through to single route - user requested alternatives, so return empty array
                if ($alternativeRoutes) {
                    Log::warning('GraphHopper alternative routes requested but no valid routes after processing', [
                        'total_paths' => count($data['paths']),
                        'valid_routes' => 0,
                        'reason' => 'All routes were filtered out (backtracking, missing coordinates, etc.)'
                    ]);
                    return []; // Return empty array to indicate alternatives were requested but none valid
                }
                // Fall through to single route processing if alternatives not requested
            } else if ($alternativeRoutes && isset($data['paths']) && is_array($data['paths']) && count($data['paths']) === 1) {
                Log::warning('GraphHopper alternative routes requested but only one path returned', [
                    'paths_count' => 1,
                    'path_distance' => $data['paths'][0]['distance'] ?? 'N/A',
                    'path_time' => $data['paths'][0]['time'] ?? 'N/A'
                ]);
                
                // Process the primary route first
                $primaryRoute = null;
                try {
                    $path = $data['paths'][0];
                    $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                    
                    if (!empty($route['coordinates']) && is_array($route['coordinates']) && count($route['coordinates']) > 0) {
                        $hasBacktrack = $this->hasSignificantBacktrack($route['coordinates'], $startLat, $startLon, $endLat, $endLon, true);
                        if (!$hasBacktrack) {
                            $totalTime = round((microtime(true) - $startTime) * 1000, 2);
                            $route['_timings'] = ['total' => $totalTime];
                            $route['_strategy'] = 'graphhopper';
                            $route['_curvature_level'] = $curvatureLevel;
                            $route['_alternative_index'] = 0;
                            $primaryRoute = $route;
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Error processing single path for alternative routes', ['error' => $e->getMessage()]);
                }
                
                // If we have a valid primary route, try to generate alternatives using offset waypoints
                if ($primaryRoute && !empty($primaryRoute['coordinates'])) {
                    Log::info('Attempting to generate alternative routes using offset waypoints');
                    $generatedAlternatives = $this->generateAlternativeRoutesWithOffsetWaypoints(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        $primaryRoute['coordinates'],
                        $curvatureLevel,
                        $avoidOptions
                    );
                    
                    if (!empty($generatedAlternatives) && count($generatedAlternatives) > 0) {
                        // Combine primary route with alternatives
                        $allRoutes = [$primaryRoute];
                        foreach ($generatedAlternatives as $index => $altRoute) {
                            $altRoute['_alternative_index'] = $index + 1;
                            $altRoute['_strategy'] = 'graphhopper_offset_waypoints';
                            $allRoutes[] = $altRoute;
                        }
                        Log::info('Generated alternative routes using offset waypoints', [
                            'primary_route' => 1,
                            'alternative_routes' => count($generatedAlternatives),
                            'total_routes' => count($allRoutes)
                        ]);
                        return $allRoutes;
                    }
                }
                
                // If we couldn't generate alternatives, return primary route as array
                if ($primaryRoute) {
                    return [$primaryRoute];
                }
                
                return []; // Return empty array if primary route also invalid
            }
            
            // Get the best path (first one) for single route
            $path = $data['paths'][0];
            
            // Debug: Log path structure and return early if coordinates exist
            $hasPoints = isset($path['points']);
            $hasCoordinates = isset($path['points']['coordinates']);
            $coordCount = $hasCoordinates ? count($path['points']['coordinates']) : 0;
            
            Log::info('GraphHopper path structure', [
                'has_points' => $hasPoints,
                'has_coordinates' => $hasCoordinates,
                'coordinates_count' => $coordCount,
                'distance' => $path['distance'] ?? null,
                'time' => $path['time'] ?? null,
                'points_type' => isset($path['points']) ? gettype($path['points']) : 'not set',
                'points_keys' => isset($path['points']) && is_array($path['points']) ? array_keys($path['points']) : []
            ]);
            
            // Format response to match our existing route format
            try {
                $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
            } catch (\Exception $e) {
                Log::error('Error formatting GraphHopper response', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return null;
            }
            
            // Check if coordinates were extracted successfully
            if (empty($route['coordinates']) || !is_array($route['coordinates']) || count($route['coordinates']) === 0) {
                Log::error('GraphHopper route has no coordinates after formatting', [
                    'path_keys' => array_keys($path),
                    'has_points' => isset($path['points']),
                    'points_type' => isset($path['points']) ? gettype($path['points']) : 'not set',
                    'points_structure' => isset($path['points']) && is_array($path['points']) ? array_keys($path['points']) : 'not array',
                    'route_keys' => array_keys($route),
                    'coordinates_count' => isset($route['coordinates']) ? count($route['coordinates']) : 'not set'
                ]);
                // Fallback: attempt with continuity-friendly model
                Log::warning('Route had no coordinates. Retrying with continuity-friendly model');
                $fallbackPayload = $payload;
                $fallbackPayload['custom_model'] = $this->buildContinuityModel($curvatureLevel, $avoidOptions);
                $fallbackResp = Http::timeout(30)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($this->buildUrl('/route'), $fallbackPayload);
                if (!$fallbackResp->successful()) {
                    Log::error('Fallback coordinates API error', [
                        'status' => $fallbackResp->status(),
                        'body' => $fallbackResp->body()
                    ]);
                    return null;
                }
                $fallbackData = $fallbackResp->json();
                if (!isset($fallbackData['paths']) || empty($fallbackData['paths'])) {
                    Log::warning('Fallback still produced no paths/coordinates');
                    return null;
                }
                $path = $fallbackData['paths'][0];
                try {
                    $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                } catch (\Exception $e) {
                    Log::error('Error formatting fallback response', [
                        'error' => $e->getMessage()
                    ]);
                    return null;
                }
                if (empty($route['coordinates']) || !is_array($route['coordinates']) || count($route['coordinates']) === 0) {
                    Log::warning('Fallback route still has no coordinates');
                    return null;
                }
            }
            
            // Check for backtracks before returning route
            // Only apply strict backtrack detection for extra_curvy routes
            // For other routes, use lenient check or skip entirely
            if ($curvatureLevel === 'extra_curvy') {
            if (empty($waypoints)) {
                $hasBacktrack = $this->hasSignificantBacktrack($route['coordinates'], $startLat, $startLon, $endLat, $endLon, false);
                if ($hasBacktrack) {
                        Log::warning('GraphHopper route rejected due to significant backtracking (extra_curvy)', [
                        'curvature_level' => $curvatureLevel,
                        'coordinate_count' => count($route['coordinates']),
                        'distance' => $route['distance'] ?? null
                    ]);
                    return null; // Reject routes with significant backtracks
                }
            } else {
                    // With waypoints, use lenient backtrack check for extra_curvy
                $hasBacktrack = $this->hasSignificantBacktrack($route['coordinates'], $startLat, $startLon, $endLat, $endLon, true);
                if ($hasBacktrack) {
                        Log::warning('GraphHopper route with waypoints rejected due to significant backtracking (extra_curvy)', [
                        'curvature_level' => $curvatureLevel,
                        'waypoint_count' => count($waypoints),
                        'coordinate_count' => count($route['coordinates']),
                        'distance' => $route['distance'] ?? null
                    ]);
                    return null; // Reject routes with significant backtracks even with waypoints
                }
            }
            }
            // For non-extra_curvy routes, skip backtrack check (can cause false positives)
            
            $totalTime = round((microtime(true) - $startTime) * 1000, 2);
            $route['_timings'] = ['total' => $totalTime];
            $route['_strategy'] = 'graphhopper';
            $route['_curvature_level'] = $curvatureLevel;
            
            return $route;
            
        } catch (\Exception $e) {
            Log::error('GraphHopper service error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Call GraphHopper route API without custom_model / flexible mode.
     * Used as a fallback for free plans which do not support flexible mode.
     *
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param array $points Array of [lon, lat] pairs
     * @param string $curvatureLevel Requested curvature level (for metadata, route will be basic)
     * @return array|null
     */
    protected function callBasicRouteWithoutCustomModel($startLat, $startLon, $endLat, $endLon, array $points, $curvatureLevel = 'straightest')
    {
        try {
            // For free plan, use alternative routes strategy to achieve different curvature levels
            // Request multiple alternative routes and select the one that best matches desired curvature
            $payload = [
                'points' => $points,
                'profile' => $this->profile,
                'points_encoded' => false,
                'instructions' => true,
                'calc_points' => true,
                // Prevent ferry routes which can cause dead ends
                'snap_preventions' => ['ferry'],
                // Request alternative routes to get route variations
                'alternative_route' => [
                    'max_paths' => 5, // Request up to 5 alternative routes
                    'max_weight_factor' => 3.0,  // Allow routes up to 3x longer (for curvy routes)
                    'max_share_factor' => 0.6    // Require at least 40% different segments
                ],
                // IMPORTANT: no 'ch.disable' and no 'custom_model' here (free plan limitation)
            ];

            $url = $this->buildUrl('/route');

            Log::info('GraphHopper basic route with alternatives (free plan curvature simulation)', [
                'url' => $url,
                'profile' => $this->profile,
                'points_count' => count($points),
                'curvature_level' => $curvatureLevel,
            ]);

            $response = Http::timeout(60) // Longer timeout for alternative routes
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url, $payload);

            if (!$response->successful()) {
                $errorBody = $response->body();
                $errorData = null;
                try {
                    $errorData = json_decode($errorBody, true);
                } catch (\Exception $e) {
                    // Not JSON
                }
                
                $messageText = is_array($errorData) && isset($errorData['message'])
                    ? $errorData['message']
                    : (is_string($errorBody) ? $errorBody : '');
                
                Log::error('GraphHopper basic route API error', [
                    'status' => $response->status(),
                    'body' => $errorBody,
                    'error_data' => $errorData,
                    'url' => $url,
                    'message' => $messageText,
                ]);
                
                // Rate limit errors should be handled gracefully
                $isRateLimit = $response->status() === 429 || (is_string($messageText) && (stripos($messageText, 'rate limit') !== false || stripos($messageText, 'limit reached') !== false));
                
                if ($isRateLimit) {
                    Log::warning('GraphHopper rate limit hit - user should wait before retrying', [
                        'status' => $response->status(),
                        'message' => $messageText
                    ]);
                    throw new \Exception('GraphHopper API rate limit reached. Please wait a moment and try again. Free plans have rate limits on requests per minute.');
                }
                
                return null;
            }

            $data = $response->json();
            if (!isset($data['paths']) || empty($data['paths'])) {
                Log::warning('GraphHopper basic route: no paths returned');
                return null;
            }

            // For free plan, ALWAYS use strategic waypoints for curvature differentiation (except straightest)
            // This ensures different routes for different curvature levels
            // GraphHopper alternatives are unreliable - they often return the same route
            if (count($points) == 2 && $curvatureLevel !== 'straightest') {
                Log::info('Using strategic waypoints for curvature differentiation', [
                    'curvature_level' => $curvatureLevel,
                    'alternative_paths_available' => count($data['paths']),
                    'note' => 'Strategic waypoints are primary method for free plan curvature differentiation'
                ]);
                
                $waypointRoute = $this->tryStrategicWaypoints($startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                if ($waypointRoute && !empty($waypointRoute['coordinates'])) {
                    Log::info('Strategic waypoints route selected (PRIMARY METHOD)', [
                        'curvature_level' => $curvatureLevel,
                        'waypoint_curvature' => $waypointRoute['curvature'] ?? 0,
                        'waypoint_count' => $waypointRoute['_strategic_waypoint_count'] ?? 0
                    ]);
                    return $waypointRoute;
                } else {
                    // If strategic waypoints fail, try again with slightly adjusted parameters
                    Log::warning('Strategic waypoints route failed or rejected, retrying with adjusted parameters', [
                        'curvature_level' => $curvatureLevel
                    ]);
                    
                    // Retry with slightly smaller offsets (might have been too aggressive)
                    $retryRoute = $this->tryStrategicWaypoints($startLat, $startLon, $endLat, $endLon, $curvatureLevel, true);
                    if ($retryRoute && !empty($retryRoute['coordinates'])) {
                        Log::info('Strategic waypoints route selected (RETRY)', [
                            'curvature_level' => $curvatureLevel
                        ]);
                        return $retryRoute;
                    }
                    
                    // Last resort: fall back to alternatives (but log warning)
                    Log::error('Strategic waypoints failed completely, falling back to alternatives (routes may be similar)', [
                        'curvature_level' => $curvatureLevel,
                        'warning' => 'This may result in same routes for different curvature levels'
                    ]);
                }
            }
            
            // For straightest or fallback: If we have multiple paths, select the one that best matches the desired curvature level
            if (count($data['paths']) > 1) {
                $selectedRoute = $this->selectBestCurvatureMatch($data['paths'], $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                if ($selectedRoute) {
                    Log::info('Alternative route selected (fallback method)', [
                        'curvature_level' => $curvatureLevel,
                        'note' => 'Strategic waypoints should be primary method - this is fallback'
                    ]);
                    return $selectedRoute;
                }
            }
            
            // For straightest with single path, use it directly (fastest route)
            if ($curvatureLevel === 'straightest') {
                $path = $data['paths'][0];
                $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                if ($route) {
                    $route['_free_plan_limitation'] = true;
                    $route['_curvature_simulation'] = 'direct_route'; // Direct route for straightest
                }
                return $route;
            }

            // Single path - use it directly (should not happen for balanced/curvy - they should use strategic waypoints)
            Log::warning('Using single path fallback (should not happen for balanced/curvy)', [
                'curvature_level' => $curvatureLevel,
                'note' => 'Strategic waypoints should have been used'
            ]);
            $path = $data['paths'][0];
            $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
            if ($route) {
                $route['_free_plan_limitation'] = true;
                $route['_curvature_simulation'] = 'single_route'; // Only one route available
            }
            return $route;
        } catch (\Exception $e) {
            Log::error('GraphHopper basic route exception', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Select the route that best matches the desired curvature level from multiple alternatives
     * 
     * @param array $paths Array of GraphHopper path objects
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param string $curvatureLevel Desired curvature level
     * @return array|null Best matching route
     */
    protected function selectBestCurvatureMatch($paths, $startLat, $startLon, $endLat, $endLon, $curvatureLevel)
    {
        $routes = [];
        
        // Format all routes and calculate their actual curvature
        foreach ($paths as $index => $path) {
            try {
                $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                if ($route && !empty($route['coordinates'])) {
                    // Check for backtracking (dead-end routes)
                    $hasBacktrack = $this->hasSignificantBacktrack($route['coordinates'], $startLat, $startLon, $endLat, $endLon, false);
                    if ($hasBacktrack) {
                        Log::warning("Alternative route $index rejected due to backtracking/dead-end", [
                            'index' => $index,
                            'coordinate_count' => count($route['coordinates'])
                        ]);
                        continue; // Skip routes with backtracking
                    }
                    
                    // Check if route actually reaches destination (dead-end detection)
                    $lastCoord = $route['coordinates'][count($route['coordinates']) - 1];
                    $distanceToEnd = $this->getDistance($lastCoord[0], $lastCoord[1], $endLat, $endLon);
                    if ($distanceToEnd > 1000) { // Route doesn't end within 1km of destination
                        Log::warning("Alternative route $index rejected - doesn't reach destination (dead-end)", [
                            'index' => $index,
                            'distance_to_end_m' => round($distanceToEnd),
                            'last_coord' => $lastCoord,
                            'target_end' => [$endLat, $endLon]
                        ]);
                        continue; // Skip dead-end routes
                    }
                    
                    // Calculate actual curvature metrics
                    $stats = $this->calculateRouteStats($route['coordinates']);
                    $route['curvature'] = $stats['curvature'] ?? 0;
                    $route['corner_count'] = $stats['corner_count'] ?? 0;
                    $route['_alternative_index'] = $index;
                    $routes[] = $route;
                }
            } catch (\Exception $e) {
                Log::warning("Error processing alternative route $index", ['error' => $e->getMessage()]);
                continue;
            }
        }
        
        if (empty($routes)) {
            Log::warning('No valid routes found in alternatives');
            return null;
        }
        
        $target = $this->getTargetCurvatureForLevel($curvatureLevel);
        
        // Score each route based on how well it matches the target curvature
        $scoredRoutes = [];
        foreach ($routes as $route) {
            $curvature = $route['curvature'] ?? 0;
            $cornerCount = $route['corner_count'] ?? 0;
            $distance = $route['distance'] ?? 0;
            
            // Calculate score: how close is curvature to ideal, with bonus for corner count
            $curvatureDistance = abs($curvature - $target['ideal']);
            $score = 100 - $curvatureDistance; // Closer to ideal = higher score
            
            // Bonus for corner count (more corners = more curvy, which is good for curvy routes)
            if ($curvatureLevel === 'curvy' || $curvatureLevel === 'extra_curvy') {
                $score += min($cornerCount / 10, 20); // Up to 20 point bonus for more corners
            } elseif ($curvatureLevel === 'straightest') {
                $score -= min($cornerCount / 10, 20); // Penalty for too many corners
            }
            
            // Prefer routes within target range
            if ($curvature >= $target['min'] && $curvature <= $target['max']) {
                $score += 30; // Bonus for being in range
            }
            
            $scoredRoutes[] = [
                'route' => $route,
                'score' => $score,
                'curvature' => $curvature,
                'corner_count' => $cornerCount,
                'distance' => $distance
            ];
        }
        
        // Sort by score (highest first)
        usort($scoredRoutes, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        $bestRoute = $scoredRoutes[0]['route'];
        $bestScore = $scoredRoutes[0]['score'];
        $bestCurvature = $scoredRoutes[0]['curvature'];
        
        Log::info('Selected best curvature match from alternatives', [
            'curvature_level' => $curvatureLevel,
            'target_ideal' => $target['ideal'],
            'selected_curvature' => $bestCurvature,
            'selected_score' => round($bestScore, 2),
            'selected_index' => $bestRoute['_alternative_index'] ?? 0,
            'total_alternatives' => count($routes),
            'all_scores' => array_map(function($r) { return round($r['score'], 2); }, $scoredRoutes)
        ]);
        
        // Add metadata
        $bestRoute['_free_plan_limitation'] = true;
        $bestRoute['_curvature_simulation'] = 'alternative_selection';
        $bestRoute['_curvature_match_score'] = round($bestScore, 2);
        $bestRoute['_alternatives_considered'] = count($routes);
        
        return $bestRoute;
    }

    /**
     * Build GraphHopper 8.0 custom model based on curvature level
     * Custom models use priority multipliers to prefer certain road types
     * 
     * @param string $curvatureLevel
     * @param array $avoidOptions Options to avoid: ['highways', 'tolls', 'ferries', 'unpaved']
     */
    protected function buildCustomModel($curvatureLevel, $avoidOptions = [], $continuityBias = false)
    {
        // Base model with speed limits (same for all levels)
        $model = [
            'speed' => [
                ['if' => 'road_class == MOTORWAY', 'limit_to' => 130],
                ['if' => 'road_class == TRUNK', 'limit_to' => 110],
                ['if' => 'road_class == PRIMARY', 'limit_to' => 90],
                ['if' => 'road_class == SECONDARY', 'limit_to' => 70],
                ['if' => 'road_class == TERTIARY', 'limit_to' => 50],
                ['if' => 'road_class == UNCLASSIFIED', 'limit_to' => 40],
                ['if' => 'road_class == RESIDENTIAL', 'limit_to' => 30],
                ['if' => 'road_class == SERVICE', 'limit_to' => 20]
            ],
            'priority' => [
                ['if' => 'road_access == DESTINATION', 'multiply_by' => 0]
            ]
        ];
        
        // Add curvature-specific priority adjustments
        switch ($curvatureLevel) {
            case 'straightest':
            case 'fastest': // Legacy support
                // Strong preference for highways and major roads - straightest route
                $model['priority'][] = ['if' => 'road_class == MOTORWAY', 'multiply_by' => 1.5];
                $model['priority'][] = ['if' => 'road_class == TRUNK', 'multiply_by' => 1.3];
                $model['priority'][] = ['if' => 'road_class == PRIMARY', 'multiply_by' => 1.2];
                $model['priority'][] = ['if' => 'road_class == SECONDARY', 'multiply_by' => 0.8];
                $model['priority'][] = ['if' => 'road_class == TERTIARY', 'multiply_by' => 0.6];
                $model['priority'][] = ['if' => 'road_class == UNCLASSIFIED', 'multiply_by' => 0.4];
                $model['priority'][] = ['if' => 'road_class == RESIDENTIAL', 'multiply_by' => 0.3];
                break;
                
            case 'balanced':
            case 'fast_and_curvy': // Legacy support
                // Slight preference for secondary/tertiary, avoid motorways
                $model['priority'][] = ['if' => 'road_class == SECONDARY', 'multiply_by' => 1.2];
                $model['priority'][] = ['if' => 'road_class == TERTIARY', 'multiply_by' => 1.1];
                $model['priority'][] = ['if' => 'road_class == PRIMARY', 'multiply_by' => 0.9];
                $model['priority'][] = ['if' => 'road_class == MOTORWAY', 'multiply_by' => 0.3];
                $model['priority'][] = ['if' => 'road_class == TRUNK', 'multiply_by' => 0.5];
                break;
                
            case 'curvy':
                // Moderate preference for secondary/tertiary, moderate avoidance of highways
                // Allow routes up to 25% longer than straightest
                $model['priority'][] = ['if' => 'road_class == SECONDARY', 'multiply_by' => 1.4];
                $model['priority'][] = ['if' => 'road_class == TERTIARY', 'multiply_by' => 1.3];
                $model['priority'][] = ['if' => 'road_class == UNCLASSIFIED', 'multiply_by' => 1.2];
                $model['priority'][] = ['if' => 'road_class == RESIDENTIAL', 'multiply_by' => 1.05];
                $model['priority'][] = ['if' => 'road_class == PRIMARY', 'multiply_by' => $continuityBias ? 0.9 : 0.7];
                $model['priority'][] = ['if' => 'road_class == MOTORWAY', 'multiply_by' => 0.15];
                $model['priority'][] = ['if' => 'road_class == TRUNK', 'multiply_by' => $continuityBias ? 0.7 : 0.4];
                break;
                
            case 'extra_curvy':
                // Very strong preference for secondary/tertiary, very strong avoidance of highways
                // Allow routes up to 60% longer than straightest - prioritize maximum curviness
                $model['priority'][] = ['if' => 'road_class == SECONDARY', 'multiply_by' => 3.0];
                $model['priority'][] = ['if' => 'road_class == TERTIARY', 'multiply_by' => 2.8];
                $model['priority'][] = ['if' => 'road_class == UNCLASSIFIED', 'multiply_by' => 2.5];
                $model['priority'][] = ['if' => 'road_class == RESIDENTIAL', 'multiply_by' => 1.5];
                $model['priority'][] = ['if' => 'road_class == PRIMARY', 'multiply_by' => $continuityBias ? 0.6 : 0.2];
                $model['priority'][] = ['if' => 'road_class == MOTORWAY', 'multiply_by' => 0.005];
                $model['priority'][] = ['if' => 'road_class == TRUNK', 'multiply_by' => $continuityBias ? 0.4 : 0.05];
                break;
        }
        
        // Apply avoidance options
        if (!empty($avoidOptions)) {
            if (in_array('highways', $avoidOptions)) {
                $model['priority'][] = ['if' => 'road_class == MOTORWAY', 'multiply_by' => 0.01];
                $model['priority'][] = ['if' => 'road_class == TRUNK', 'multiply_by' => 0.1];
            }
            if (in_array('tolls', $avoidOptions)) {
                $model['priority'][] = ['if' => 'toll == true', 'multiply_by' => 0.01];
            }
            if (in_array('ferries', $avoidOptions)) {
                $model['priority'][] = ['if' => 'ferry == true', 'multiply_by' => 0.01];
            }
            if (in_array('unpaved', $avoidOptions)) {
                $model['priority'][] = ['if' => 'surface == UNPAVED', 'multiply_by' => 0.1];
                $model['priority'][] = ['if' => 'surface == GRAVEL', 'multiply_by' => 0.2];
                $model['priority'][] = ['if' => 'surface == DIRT', 'multiply_by' => 0.05];
            }
        }
        
        return $model;
    }

    /**
     * Build a continuity-friendly custom model that keeps primary/trunk roads viable
     * while still preferring curvy segments. Used as a fallback when routes are fragmented.
     */
    protected function buildContinuityModel($curvatureLevel, $avoidOptions = [])
    {
        return $this->buildCustomModel($curvatureLevel, $avoidOptions, true);
    }
    
    /**
     * Check if route has significant backtracking
     * Detects routes that double back on themselves or move away from destination
     * 
     * @param array $coordinates Route coordinates [[lat, lon], ...]
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param bool $lenient If true, uses more lenient thresholds (for routes with waypoints)
     * @return bool True if significant backtrack detected
     */
    protected function hasSignificantBacktrack($coordinates, $startLat, $startLon, $endLat, $endLon, $lenient = false, $veryLenient = false)
    {
        if (count($coordinates) < 10) {
            return false; // Too few points to detect backtrack
        }
        
        // Calculate straight-line distance for thresholds
        $straightDistance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
        
        // Sample points for performance (check every Nth point)
        $sampleInterval = max(1, floor(count($coordinates) / 100)); // Sample ~100 points
        $sampledPoints = [];
        
        for ($i = 0; $i < count($coordinates); $i += $sampleInterval) {
            $coord = $coordinates[$i];
            $lat = is_array($coord) ? $coord[0] : $coord['lat'];
            $lon = is_array($coord) ? $coord[1] : $coord['lon'];
            
            $distToEnd = $this->getDistance($lat, $lon, $endLat, $endLon);
            $sampledPoints[] = [
                'point' => [$lat, $lon],
                'index' => $i,
                'distToEnd' => $distToEnd
            ];
        }
        
        // Thresholds for backtrack detection
        // $veryLenient is for user-added waypoints (POIs) - only reject extreme backtracks
        if ($veryLenient) {
            $backtrackThreshold = 500; // 500m minimum backtrack to trigger
            $maxBacktrackThreshold = 5000; // 5km max single backtrack
            $consecutiveBacktrackThreshold = 4000; // 4km max consecutive backtrack
            $totalBacktrackThreshold = max(5000, $straightDistance * 0.20); // 20% of route - very lenient for user waypoints
        } else {
            $backtrackThreshold = $lenient ? 300 : 150; // 300m (lenient) or 150m (strict) minimum backtrack to trigger
            $maxBacktrackThreshold = $lenient ? 3000 : 2000; // 3km (lenient) or 2km (strict) max single backtrack
            $consecutiveBacktrackThreshold = $lenient ? 2500 : 1500; // 2.5km (lenient) or 1.5km (strict) max consecutive backtrack
            $totalBacktrackThreshold = $lenient ? max(3000, $straightDistance * 0.08) : max(2000, $straightDistance * 0.04); // 8% (lenient) or 4% (strict) of route
        }
        
        // Check 1: Look for significant backtracking (moving away from destination)
        $backtrackCount = 0;
        $maxBacktrack = 0;
        $totalBacktrack = 0;
        $consecutiveBacktrack = 0;
        $maxConsecutiveBacktrack = 0;
        $previousDistToEnd = $sampledPoints[0]['distToEnd'];
        
        for ($i = 1; $i < count($sampledPoints); $i++) {
            $currentDistToEnd = $sampledPoints[$i]['distToEnd'];
            
            // If we're moving further from destination
            if ($currentDistToEnd > $previousDistToEnd) {
                $backtrackAmount = $currentDistToEnd - $previousDistToEnd;
                $maxBacktrack = max($maxBacktrack, $backtrackAmount);
                $consecutiveBacktrack += $backtrackAmount;
                $maxConsecutiveBacktrack = max($maxConsecutiveBacktrack, $consecutiveBacktrack);
                $totalBacktrack += $backtrackAmount;
                
                // If backtracking more than threshold, count it
                if ($backtrackAmount > $backtrackThreshold) {
                    $backtrackCount++;
                }
            } else {
                // Reset consecutive backtrack counter when moving forward
                if ($consecutiveBacktrack > 0) {
                    // If we had significant consecutive backtracking, reject
                    if ($consecutiveBacktrack > $consecutiveBacktrackThreshold) {
                        return true; // Significant consecutive backtrack = dead end
                    }
                    $consecutiveBacktrack = 0;
                }
            }
            
            $previousDistToEnd = $currentDistToEnd;
        }
        
        // Reject if backtracking exceeds thresholds
        if ($maxConsecutiveBacktrack > $consecutiveBacktrackThreshold) {
            return true; // Significant consecutive backtrack
        }
        if ($maxBacktrack > $maxBacktrackThreshold || $totalBacktrack > $totalBacktrackThreshold) {
            return true; // Too much backtrack
        }
        // For very lenient mode (user waypoints), allow more backtrack points
        $maxBacktrackCount = $veryLenient ? 10 : ($lenient ? 4 : 2);
        if ($backtrackCount > $maxBacktrackCount) {
            return true; // Too many backtrack points
        }
        
        // Check 2: Look for loops (U-turns) - points that are close spatially but far in sequence
        $spatialThreshold = 150; // 150m (stricter - catch smaller loops)
        $sequenceThreshold = $lenient ? 4000 : 3000; // 4km (lenient) or 3km (strict) of route distance
        
        for ($i = 0; $i < count($sampledPoints) - 5; $i++) {
            $point1 = $sampledPoints[$i];
            
            for ($j = $i + 5; $j < count($sampledPoints); $j++) {
                $point2 = $sampledPoints[$j];
                
                $spatialDistance = $this->getDistance(
                    $point1['point'][0], $point1['point'][1],
                    $point2['point'][0], $point2['point'][1]
                );
                
                // If points are very close but sequence distance is significant, it's a loop
                if ($spatialDistance < $spatialThreshold) {
                    $sequenceDistance = abs($point2['index'] - $point1['index']) * ($straightDistance / count($coordinates));
                    if ($sequenceDistance > $sequenceThreshold) {
                        // Check if midpoint is further from end (U-turn pattern)
                        $midIndex = floor(($i + $j) / 2);
                        if ($midIndex < count($sampledPoints)) {
                            $midPoint = $sampledPoints[$midIndex];
                            if ($midPoint['distToEnd'] > $point1['distToEnd'] && $midPoint['distToEnd'] > $point2['distToEnd']) {
                                return true; // U-turn detected
                            }
                        }
                    }
                }
            }
        }
        
        return false; // No significant backtrack detected
    }
    
    /**
     * Calculate distance between two points (Haversine formula)
     * 
     * @param float $lat1
     * @param float $lon1
     * @param float $lat2
     * @param float $lon2
     * @return float Distance in meters
     */
    protected function getDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // meters
        
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $earthRadius * $c;
    }
    
    /**
     * Find route with segment-specific curvature levels
     * Each segment (between waypoints) can have a different curvature level
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param array $waypoints Array of waypoints [['lat' => x, 'lon' => y], ...]
     * @param array $segmentCurvature Array of curvature levels per segment ['straightest', 'balanced', 'curvy', ...]
     * @param array $avoidOptions Optional avoidance options
     * @return array|null
     */
    public function findCurvedRouteWithSegmentCurvature($startLat, $startLon, $endLat, $endLon, $waypoints, $segmentCurvature, $avoidOptions = [])
    {
        $startTime = microtime(true);
        
        try {
            // Build list of all points: start -> waypoints -> end
            $allPoints = [[$startLat, $startLon]];
            foreach ($waypoints as $wp) {
                $wpLat = isset($wp['lat']) ? $wp['lat'] : (is_array($wp) ? $wp[0] : null);
                $wpLon = isset($wp['lon']) ? $wp['lon'] : (is_array($wp) ? $wp[1] : null);
                if ($wpLat !== null && $wpLon !== null) {
                    $allPoints[] = [$wpLat, $wpLon];
                }
            }
            $allPoints[] = [$endLat, $endLon];
            
            // Number of segments = number of points - 1
            $numSegments = count($allPoints) - 1;
            
            // Ensure segmentCurvature array matches number of segments
            if (count($segmentCurvature) < $numSegments) {
                // Fill missing segments with last curvature level or default
                $defaultCurvature = !empty($segmentCurvature) ? end($segmentCurvature) : 'balanced';
                $segmentCurvature = array_pad($segmentCurvature, $numSegments, $defaultCurvature);
            }
            
            // OPTIMIZED: Calculate all segments in parallel using async requests
            $segmentRoutes = $this->calculateSegmentsInParallel($allPoints, $segmentCurvature, $avoidOptions);
            
            if (!$segmentRoutes || count($segmentRoutes) !== $numSegments) {
                Log::warning('Segment-specific curvature: Failed to calculate some segments', [
                    'expected_segments' => $numSegments,
                    'calculated_segments' => $segmentRoutes ? count($segmentRoutes) : 0
                ]);
                return null;
            }
            
            // Merge all segment routes
            $allCoordinates = [];
            $allInstructions = [];
            $totalDistance = 0;
            $totalTime = 0;
            
            foreach ($segmentRoutes as $index => $segmentRoute) {
                if (!$segmentRoute || empty($segmentRoute['coordinates'])) {
                    Log::warning('Segment-specific curvature: Empty segment route', [
                        'segment_index' => $index
                    ]);
                    return null;
                }
                
                // Merge coordinates (skip first point of subsequent segments to avoid duplicates)
                if ($index === 0) {
                    $allCoordinates = array_merge($allCoordinates, $segmentRoute['coordinates']);
                } else {
                    // Skip first coordinate to avoid duplicate waypoint
                    $allCoordinates = array_merge($allCoordinates, array_slice($segmentRoute['coordinates'], 1));
                }
                
                // Merge instructions
                if (isset($segmentRoute['instructions'])) {
                    $allInstructions = array_merge($allInstructions, $segmentRoute['instructions']);
                }
                
                // Accumulate distance and time
                $totalDistance += $segmentRoute['distance'] ?? 0;
                $totalTime += $segmentRoute['time'] ?? 0;
            }
            
            // Calculate overall route statistics
            $stats = $this->calculateRouteStats($allCoordinates);
            
            // Build merged route response
            $mergedRoute = [
                'coordinates' => $allCoordinates,
                'distance' => $totalDistance,
                'time' => $totalTime,
                'instructions' => $allInstructions,
                'curvature' => $stats['curvature'] ?? 0,
                'corner_count' => $stats['corner_count'] ?? 0,
                'elevation_gain' => $stats['elevation_gain'] ?? 0,
                'elevation_loss' => $stats['elevation_loss'] ?? 0,
                'max_elevation' => $stats['max_elevation'] ?? 0,
                'min_elevation' => $stats['min_elevation'] ?? 0,
                '_timings' => ['total' => round((microtime(true) - $startTime) * 1000, 2)],
                '_strategy' => 'graphhopper_segment_curvature_parallel',
                '_segment_curvature' => $segmentCurvature,
                '_curvature_level' => 'segment_specific'
            ];
            
            Log::info('Segment-specific curvature route calculated (parallel)', [
                'num_segments' => $numSegments,
                'segment_curvature' => $segmentCurvature,
                'total_distance' => $totalDistance,
                'total_time' => $totalTime,
                'coordinate_count' => count($allCoordinates),
                'calculation_time_ms' => round((microtime(true) - $startTime) * 1000, 2)
            ]);
            
            return $mergedRoute;
        } catch (\Exception $e) {
            Log::error('Error calculating segment-specific curvature route', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }
    
    /**
     * Calculate all route segments in parallel using async HTTP requests
     * This significantly improves performance for multi-segment routes
     * 
     * @param array $allPoints Array of [lat, lon] points
     * @param array $segmentCurvature Array of curvature levels for each segment
     * @param array $avoidOptions Options to avoid
     * @return array|null Array of segment routes in order, or null on failure
     */
    protected function calculateSegmentsInParallel($allPoints, $segmentCurvature, $avoidOptions = [])
    {
        $numSegments = count($allPoints) - 1;
        $client = new Client(['timeout' => 60]);
        $promises = [];
        
        // Create async promises for all segments
        for ($i = 0; $i < $numSegments; $i++) {
            $segmentStart = $allPoints[$i];
            $segmentEnd = $allPoints[$i + 1];
            $segmentCurvatureLevel = $segmentCurvature[$i] ?? 'balanced';
            
            // Build custom model for this segment's curvature
            $customModel = $this->buildCustomModel($segmentCurvatureLevel, $avoidOptions);
            
            // Build GraphHopper request payload
            $payload = [
                'points' => [
                    [$segmentStart[1], $segmentStart[0]], // [lon, lat]
                    [$segmentEnd[1], $segmentEnd[0]]
                ],
                'profile' => $this->profile,
                'points_encoded' => false,
                'instructions' => true,
                'calc_points' => true,
                'ch.disable' => true, // Required for custom_model
                'custom_model' => $customModel
            ];
            
            // Create async promise
            $promises[$i] = $client->postAsync($this->buildUrl('/route'), [
                'json' => $payload,
                'headers' => ['Content-Type' => 'application/json']
            ]);
        }
        
        // Wait for all promises to resolve
        $responses = PromiseUtils::settle($promises)->wait();
        
        // Process responses in order
        $segmentRoutes = [];
        for ($i = 0; $i < $numSegments; $i++) {
            $response = $responses[$i];
            
            if ($response['state'] !== 'fulfilled') {
                Log::warning('Segment-specific curvature: Failed async request', [
                    'segment_index' => $i,
                    'error' => $response['reason'] ?? 'Unknown error'
                ]);
                return null;
            }
            
            $httpResponse = $response['value'];
            $statusCode = $httpResponse->getStatusCode();
            $bodyContent = $httpResponse->getBody()->getContents();
            
            if ($statusCode !== 200) {
                Log::warning('Segment-specific curvature: HTTP error', [
                    'segment_index' => $i,
                    'status_code' => $statusCode,
                    'body' => $bodyContent
                ]);
                return null;
            }
            
            $data = json_decode($bodyContent, true);
            
            if (!isset($data['paths']) || empty($data['paths'])) {
                Log::warning('Segment-specific curvature: No paths in response', [
                    'segment_index' => $i
                ]);
                return null;
            }
            
            $path = $data['paths'][0];
            $segmentStart = $allPoints[$i];
            $segmentEnd = $allPoints[$i + 1];
            $segmentCurvatureLevel = $segmentCurvature[$i] ?? 'balanced';
            
            // Format route response
            $segmentRoute = $this->formatRouteResponse(
                $path,
                $segmentStart[0],
                $segmentStart[1],
                $segmentEnd[0],
                $segmentEnd[1],
                $segmentCurvatureLevel
            );
            
            if (empty($segmentRoute['coordinates'])) {
                Log::warning('Segment-specific curvature: Empty coordinates', [
                    'segment_index' => $i
                ]);
                return null;
            }
            
            $segmentRoutes[$i] = $segmentRoute;
        }
        
        return $segmentRoutes;
    }

    /**
     * Find curved route through waypoints by calculating each segment separately
     * This ensures waypoints act as shaping points for curved routes, not mandatory stops
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param array $waypoints
     * @param string $curvatureLevel
     * @return array|null
     */
    protected function findCurvedRouteWithWaypoints($startLat, $startLon, $endLat, $endLon, $waypoints, $curvatureLevel)
    {
        $startTime = microtime(true);
        
        try {
            // Build list of all points: start -> waypoints -> end
            // CRITICAL: GraphHopper expects [lon, lat] format for points array
            $allPoints = [[$startLon, $startLat]];
            foreach ($waypoints as $wp) {
                $wpLat = isset($wp['lat']) ? $wp['lat'] : null;
                $wpLon = isset($wp['lon']) ? $wp['lon'] : null;
                
                // Handle array format [lat, lon] or [lon, lat]
                if ($wpLat === null && is_array($wp) && count($wp) >= 2) {
                    // Check if first value is in lat range (-90 to 90)
                    if ($wp[0] >= -90 && $wp[0] <= 90) {
                        $wpLat = $wp[0];
                        $wpLon = $wp[1];
                    } else {
                        // Assume [lon, lat] format
                        $wpLon = $wp[0];
                        $wpLat = $wp[1];
                    }
                }
                
                if ($wpLat !== null && $wpLon !== null) {
                    // GraphHopper expects [lon, lat] format
                    $allPoints[] = [$wpLon, $wpLat];
                }
            }
            $allPoints[] = [$endLon, $endLat];
            
            // Build custom model and calculate route with waypoints
            // Waypoints in the points array are MANDATORY - GraphHopper will route through them
                $avoidOptions = [];
                $customModel = $this->buildCustomModel($curvatureLevel, $avoidOptions);
            
            // Use allPoints directly - it already has [lon, lat] format: [start, waypoints..., end]
                $payload = [
                'points' => $allPoints, // All points including waypoints - waypoints are MANDATORY
                    'profile' => $this->profile,
                    'points_encoded' => false,
                    'instructions' => true,
                    'calc_points' => true,
                    // Prevent ferry routes which can cause dead ends
                    'snap_preventions' => ['ferry'],
                    'ch.disable' => true, // Required for custom_model
                    'custom_model' => $customModel
                ];
            
            Log::info('Routing with waypoints as mandatory points', [
                'point_count' => count($allPoints),
                'waypoint_count' => count($allPoints) - 2,
                'points_sample' => array_slice($allPoints, 0, min(3, count($allPoints)))
            ]);
            
            // If only start and end (no waypoints), use regular route logic
            if (count($allPoints) == 2) {
                // No waypoints - use simple route
                
                // Add alternative routes if requested
                $alternativeRoutes = false;
                if ($alternativeRoutes) {
                    $payload['alternative_route'] = [
                        'max_paths' => 3,
                        'max_weight_factor' => 2.5,  // More lenient - allows routes up to 2.5x longer
                        'max_share_factor' => 0.9    // More lenient - allows up to 90% shared segments
                    ];
                    Log::info('GraphHopper alternative routes requested (with waypoints)', [
                        'max_paths' => 3,
                        'max_weight_factor' => 2.5,
                        'max_share_factor' => 0.9,
                        'waypoint_count' => count($allPoints) - 2
                    ]);
                }
                
                $response = Http::timeout(30)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($this->buildUrl('/route'), $payload);
                
                if (!$response->successful()) {
                    $errorBody = $response->body();
                    $errorData = null;
                    try {
                        $errorData = json_decode($errorBody, true);
                    } catch (\Exception $e) {
                        // Not JSON
                    }
                    
                    $messageText = is_array($errorData) && isset($errorData['message'])
                        ? $errorData['message']
                        : (is_string($errorBody) ? $errorBody : '');
                    
                    // Special case: GraphHopper free packages cannot use flexible mode
                    $isFreePlanError = is_string($messageText) && (
                        stripos($messageText, 'Free packages cannot use flexible mode') !== false ||
                        stripos($messageText, 'free packages cannot use flexible') !== false ||
                        stripos($messageText, 'flexible mode') !== false && stripos($messageText, 'free') !== false
                    );
                    
                    if ($isFreePlanError && $response->status() === 400) {
                        Log::warning('GraphHopper free plan detected (no waypoints) - retrying without custom_model');
                        // Retry with basic routing
                        return $this->callBasicRouteWithoutCustomModel(
                            $startLat,
                            $startLon,
                            $endLat,
                            $endLon,
                            [[$startLon, $startLat], [$endLon, $endLat]],
                            $curvatureLevel // Preserve requested curvature level
                        );
                    }
                    
                    return null;
                }
                
                $data = $response->json();
                if (!isset($data['paths']) || empty($data['paths'])) {
                    Log::warning('No paths returned for route (no waypoints), falling back to basic route', [
                        'start' => [$startLat, $startLon],
                        'end' => [$endLat, $endLon]
                    ]);
                    // Fallback to basic route without custom_model
                    return $this->callBasicRouteWithoutCustomModel(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        [[$startLon, $startLat], [$endLon, $endLat]],
                        $curvatureLevel
                    );
                }
                
                $path = $data['paths'][0];
                $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                
                if (empty($route['coordinates'])) {
                    Log::warning('No coordinates in formatted route (no waypoints), falling back to basic route');
                    return $this->callBasicRouteWithoutCustomModel(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        [[$startLon, $startLat], [$endLon, $endLat]],
                        $curvatureLevel
                    );
                }
                
                // Calculate route statistics
                $stats = $this->calculateRouteStats($route['coordinates']);
                $route['curvature'] = $stats['curvature'] ?? 0;
                $route['corner_count'] = $stats['corner_count'] ?? 0;
                $route['elevation_gain'] = $stats['elevation_gain'] ?? 0;
                $route['elevation_loss'] = $stats['elevation_loss'] ?? 0;
                $route['max_elevation'] = $stats['max_elevation'] ?? 0;
                $route['min_elevation'] = $stats['min_elevation'] ?? 0;
                $route['_timings'] = ['total' => (microtime(true) - $startTime) * 1000];
                $route['_strategy'] = 'graphhopper';
                $route['_curvature_level'] = $curvatureLevel;
                
                return $route;
            }
            
            // BYPASS 5-POINT LIMIT: Use multiple API calls to calculate segments separately
            // This allows unlimited waypoints while preserving full curviness
            $userWaypointCount = count($waypoints);
            
            // FIX: For balanced/curvy routes with user waypoints, don't use multi-segment routing with strategic waypoints
            // This was causing 10,000km detours. Instead, route directly through user waypoints with custom model.
            if (in_array($curvatureLevel, ['balanced', 'curvy']) && $userWaypointCount > 0) {
                // For balanced/curvy with user waypoints: use direct routing through waypoints
                Log::info('Using direct multi-segment routing for user waypoints (no strategic WPs)', [
                    'user_waypoint_count' => $userWaypointCount,
                    'curvature_level' => $curvatureLevel,
                    'strategy' => 'direct_user_waypoints_only'
                ]);
                
                // Route each segment directly: start->wp1, wp1->wp2, ..., wpN->end
                // WITHOUT adding strategic waypoints
                $segmentRoutes = [];
                
                for ($i = 0; $i < count($allPoints) - 1; $i++) {
                    $segmentStart = $allPoints[$i];
                    $segmentEnd = $allPoints[$i + 1];
                    
                    $segmentStartLon = $segmentStart[0];
                    $segmentStartLat = $segmentStart[1];
                    $segmentEndLon = $segmentEnd[0];
                    $segmentEndLat = $segmentEnd[1];
                    
                    // Calculate direct route (no waypoints or strategic offsets)
                    // Just use the custom model for curvature preference
                    $customModel = $this->buildCustomModel($curvatureLevel, []);
                    $payload = [
                        'points' => [[$segmentStartLon, $segmentStartLat], [$segmentEndLon, $segmentEndLat]],
                        'profile' => $this->profile,
                        'points_encoded' => false,
                        'instructions' => true,
                        'calc_points' => true,
                        'snap_preventions' => ['ferry'],
                        'ch.disable' => true,
                        'custom_model' => $customModel
                    ];
                    
                    $response = Http::timeout(30)
                        ->withHeaders(['Content-Type' => 'application/json'])
                        ->post($this->buildUrl('/route'), $payload);
                    
                    if (!$response->successful()) {
                        Log::warning('Failed to calculate user waypoint segment, falling back to basic route', [
                            'segment_index' => $i,
                            'start' => [$segmentStartLat, $segmentStartLon],
                            'end' => [$segmentEndLat, $segmentEndLon],
                            'error' => $response->body()
                        ]);
                        // Fallback to basic route without custom_model
                        $basicSegment = $this->callBasicRouteWithoutCustomModel(
                            $segmentStartLat,
                            $segmentStartLon,
                            $segmentEndLat,
                            $segmentEndLon,
                            [[$segmentStartLon, $segmentStartLat], [$segmentEndLon, $segmentEndLat]],
                            $curvatureLevel
                        );
                        if (!$basicSegment || empty($basicSegment['coordinates'])) {
                            return null;
                        }
                        $segmentRoutes[] = $basicSegment;
                        continue; // Skip to next segment
                    }
                    
                    $data = $response->json();
                    if (!isset($data['paths']) || empty($data['paths'])) {
                        Log::warning('No paths returned for user waypoint segment, falling back to basic route', [
                            'segment_index' => $i,
                            'start' => [$segmentStartLat, $segmentStartLon],
                            'end' => [$segmentEndLat, $segmentEndLon]
                        ]);
                        // Fallback to basic route without custom_model
                        $basicSegment = $this->callBasicRouteWithoutCustomModel(
                            $segmentStartLat,
                            $segmentStartLon,
                            $segmentEndLat,
                            $segmentEndLon,
                            [[$segmentStartLon, $segmentStartLat], [$segmentEndLon, $segmentEndLat]],
                            $curvatureLevel
                        );
                        if (!$basicSegment || empty($basicSegment['coordinates'])) {
                            return null;
                        }
                        $segmentRoutes[] = $basicSegment;
                    } else {
                        $path = $data['paths'][0];
                        $segmentRoute = $this->formatRouteResponse(
                            $path,
                            $segmentStartLat,
                            $segmentStartLon,
                            $segmentEndLat,
                            $segmentEndLon,
                            $curvatureLevel
                        );
                        
                        if (empty($segmentRoute['coordinates'])) {
                            return null;
                        }
                        
                        $segmentRoutes[] = $segmentRoute;
                    }
                }
                
                // Combine segments
                $combinedCoordinates = [];
                $totalDistance = 0;
                $totalTime = 0;
                
                foreach ($segmentRoutes as $index => $segmentRoute) {
                    // Add all coordinates except the last one (to avoid duplicate at waypoint)
                    $coords = $segmentRoute['coordinates'];
                    if ($index > 0) {
                        // Skip first coordinate for non-first segments (already added as last of prev segment)
                        array_shift($coords);
                    }
                    $combinedCoordinates = array_merge($combinedCoordinates, $coords);
                    $totalDistance += $segmentRoute['distance'] ?? 0;
                    $totalTime += $segmentRoute['time'] ?? 0;
                }
                
                // Calculate combined route stats
                $stats = $this->calculateRouteStats($combinedCoordinates);
                
                return [
                    'coordinates' => $combinedCoordinates,
                    'distance' => $totalDistance,
                    'time' => $totalTime,
                    'curvature' => $stats['curvature'] ?? 0,
                    'corner_count' => $stats['corner_count'] ?? 0,
                    'elevation_gain' => $stats['elevation_gain'] ?? 0,
                    'elevation_loss' => $stats['elevation_loss'] ?? 0,
                    'max_elevation' => $stats['max_elevation'] ?? 0,
                    'min_elevation' => $stats['min_elevation'] ?? 0,
                    '_strategy' => 'direct_user_waypoints',
                    '_curvature_level' => $curvatureLevel
                ];
            }
            
            // If we have 3+ waypoints or would exceed 5 points, use multi-segment approach
            $wouldExceedLimit = false;
            if ($curvatureLevel !== 'straightest') {
                $strategicWpsNeeded = ($curvatureLevel === 'balanced') ? 1 : (($curvatureLevel === 'curvy') ? 2 : 3);
                $totalPointsNeeded = 2 + $userWaypointCount + $strategicWpsNeeded; // start + end + user WPs + strategic WPs
                $wouldExceedLimit = $totalPointsNeeded > 5;
            }
            
            if ($userWaypointCount >= 2 || $wouldExceedLimit) {
                // Use multi-segment approach: calculate each segment separately with full strategic waypoints
                Log::info('Using multi-segment routing to bypass 5-point limit', [
                    'user_waypoint_count' => $userWaypointCount,
                    'curvature_level' => $curvatureLevel,
                    'strategy' => 'multiple_api_calls'
                ]);
                
                $segmentRoutes = [];
                
                // Calculate each segment: start->wp1, wp1->wp2, ..., wpN->end
                // Note: allPoints are in [lon, lat] format
                for ($i = 0; $i < count($allPoints) - 1; $i++) {
                    $segmentStart = $allPoints[$i];
                    $segmentEnd = $allPoints[$i + 1];
                    
                    // Extract [lon, lat] format
                    $segmentStartLon = $segmentStart[0];
                    $segmentStartLat = $segmentStart[1];
                    $segmentEndLon = $segmentEnd[0];
                    $segmentEndLat = $segmentEnd[1];
                    
                    // Calculate segment distance
                    $segmentDist = $this->getDistance($segmentStartLat, $segmentStartLon, $segmentEndLat, $segmentEndLon);
                    $segmentDistKm = $segmentDist / 1000;
                    
                    // For each segment, use strategic waypoints approach (no user waypoints in segment)
                    // This gives us full curviness for each segment
                    if ($curvatureLevel === 'straightest') {
                        // Direct route for straightest
                        $segmentRoute = $this->callBasicRouteWithoutCustomModel(
                            $segmentStartLat, $segmentStartLon,
                            $segmentEndLat, $segmentEndLon,
                            [[$segmentStartLon, $segmentStartLat], [$segmentEndLon, $segmentEndLat]],
                            $curvatureLevel
                        );
                    } else {
                        // Use strategic waypoints for this segment
                        $segmentRoute = $this->tryStrategicWaypoints(
                            $segmentStartLat, $segmentStartLon,
                            $segmentEndLat, $segmentEndLon,
                            $curvatureLevel,
                            false // Don't retry with smaller offsets
                        );
                        
                        // If strategic waypoints fail, fall back to basic route
                        if (!$segmentRoute || empty($segmentRoute['coordinates'])) {
                            Log::warning('Strategic waypoints failed for segment, using basic route', [
                                'segment_index' => $i,
                                'curvature_level' => $curvatureLevel
                            ]);
                            $segmentRoute = $this->callBasicRouteWithoutCustomModel(
                                $segmentStartLat, $segmentStartLon,
                                $segmentEndLat, $segmentEndLon,
                                [[$segmentStartLon, $segmentStartLat], [$segmentEndLon, $segmentEndLat]],
                                $curvatureLevel
                            );
                        }
                    }
                    
                    if (!$segmentRoute || empty($segmentRoute['coordinates'])) {
                        Log::error('Failed to calculate segment route', [
                            'segment_index' => $i,
                            'start' => [$segmentStartLat, $segmentStartLon],
                            'end' => [$segmentEndLat, $segmentEndLon]
                        ]);
                        return null;
                    }
                    
                    // Validate segment doesn't have dead ends
                    $lastCoord = $segmentRoute['coordinates'][count($segmentRoute['coordinates']) - 1];
                    $distanceToEnd = $this->getDistance($lastCoord[0], $lastCoord[1], $segmentEndLat, $segmentEndLon);
                    
                    if ($distanceToEnd > 2000) { // More than 2km from destination = dead end
                        Log::warning('Segment route rejected - dead end detected', [
                            'segment_index' => $i,
                            'distance_to_end_m' => round($distanceToEnd),
                            'curvature_level' => $curvatureLevel
                        ]);
                        
                        // Retry with smaller offsets if this was a strategic waypoint route
                        if ($curvatureLevel !== 'straightest') {
                            $retryRoute = $this->tryStrategicWaypoints(
                                $segmentStartLat, $segmentStartLon,
                                $segmentEndLat, $segmentEndLon,
                                $curvatureLevel,
                                true // Retry with smaller offsets
                            );
                            
                            if ($retryRoute && !empty($retryRoute['coordinates'])) {
                                $lastCoordRetry = $retryRoute['coordinates'][count($retryRoute['coordinates']) - 1];
                                $distanceToEndRetry = $this->getDistance($lastCoordRetry[0], $lastCoordRetry[1], $segmentEndLat, $segmentEndLon);
                                
                                if ($distanceToEndRetry <= 2000) {
                                    Log::info('Segment route retry successful', [
                                        'segment_index' => $i,
                                        'distance_to_end_m' => round($distanceToEndRetry)
                                    ]);
                                    $segmentRoute = $retryRoute;
                                } else {
                                    Log::error('Segment route retry also failed - dead end', [
                                        'segment_index' => $i,
                                        'distance_to_end_m' => round($distanceToEndRetry)
                                    ]);
                                    return null;
                                }
                            } else {
                                Log::error('Segment route retry returned null', [
                                    'segment_index' => $i
                                ]);
                                return null;
                            }
                        } else {
                            return null; // Straightest shouldn't have dead ends
                        }
                    }
                    
                    $segmentRoutes[] = $segmentRoute;
                }
                
                // Combine all segment routes into one continuous route
                $allCoordinates = [];
                $allInstructions = [];
                $totalDistance = 0;
                $totalTime = 0;
                
                foreach ($segmentRoutes as $index => $segmentRoute) {
                    if (empty($segmentRoute['coordinates'])) {
                        Log::error('Empty segment route', ['segment_index' => $index]);
                        return null;
                    }
                    
                    // Merge coordinates (skip first point of subsequent segments to avoid duplicates)
                    if ($index === 0) {
                        $allCoordinates = array_merge($allCoordinates, $segmentRoute['coordinates']);
                    } else {
                        // Skip first coordinate to avoid duplicate waypoint
                        $allCoordinates = array_merge($allCoordinates, array_slice($segmentRoute['coordinates'], 1));
                    }
                    
                    // Merge instructions if available
                    if (isset($segmentRoute['instructions'])) {
                        $allInstructions = array_merge($allInstructions, $segmentRoute['instructions']);
                    }
                    
                    // Accumulate distance and time
                    $totalDistance += $segmentRoute['distance'] ?? 0;
                    $totalTime += $segmentRoute['time'] ?? 0;
                }
                
                // Calculate overall route statistics
                $stats = $this->calculateRouteStats($allCoordinates);
                
                // Build combined route response
                $combinedRoute = [
                    'coordinates' => $allCoordinates,
                    'distance' => $totalDistance,
                    'time' => $totalTime,
                    'curvature' => $stats['curvature'] ?? 0,
                    'corner_count' => $stats['corner_count'] ?? 0,
                    'elevation_gain' => $stats['elevation_gain'] ?? 0,
                    'elevation_loss' => $stats['elevation_loss'] ?? 0,
                    'max_elevation' => $stats['max_elevation'] ?? 0,
                    'min_elevation' => $stats['min_elevation'] ?? 0,
                    'instructions' => $allInstructions,
                    '_timings' => ['total' => (microtime(true) - $startTime) * 1000],
                    '_strategy' => 'multi_segment_with_strategic_waypoints',
                    '_curvature_level' => $curvatureLevel,
                    '_waypoint_count' => $userWaypointCount,
                    '_segment_count' => count($segmentRoutes),
                    '_multi_segment' => true
                ];
                
                Log::info('Multi-segment route combined successfully', [
                    'total_segments' => count($segmentRoutes),
                    'total_coordinates' => count($allCoordinates),
                    'total_distance' => $totalDistance,
                    'curvature_level' => $curvatureLevel,
                    'user_waypoint_count' => $userWaypointCount
                ]);
                
                return $combinedRoute;
            }
            
            // For 0-1 waypoints with balanced/curvy: DON'T use strategic waypoints
            // They were causing massive detours. Just use the custom model directly.
            if (in_array($curvatureLevel, ['balanced', 'curvy']) && $userWaypointCount <= 1) {
                Log::info('Using custom model directly for balanced/curvy (no strategic waypoints)', [
                    'curvature_level' => $curvatureLevel,
                    'user_waypoint_count' => $userWaypointCount
                ]);
                
                // Build custom model
                $customModel = $this->buildCustomModel($curvatureLevel, []);
                
                // Build final points: start -> user waypoints -> end
                $finalPoints = [[$startLon, $startLat]];
                foreach ($waypoints as $wp) {
                    $wpLat = isset($wp['lat']) ? $wp['lat'] : (is_array($wp) && isset($wp[0]) ? $wp[0] : null);
                    $wpLon = isset($wp['lon']) ? $wp['lon'] : (is_array($wp) && isset($wp[1]) ? $wp[1] : null);
                    if ($wpLat !== null && $wpLon !== null) {
                        $finalPoints[] = [$wpLon, $wpLat];
                    }
                }
                $finalPoints[] = [$endLon, $endLat];
                
                // Make API request with custom model
                $payload = [
                    'points' => $finalPoints,
                    'profile' => $this->profile,
                    'points_encoded' => false,
                    'instructions' => true,
                    'calc_points' => true,
                    'snap_preventions' => ['ferry'],
                    'ch.disable' => true,
                    'custom_model' => $customModel
                ];
                
                $response = Http::timeout(60)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($this->buildUrl('/route'), $payload);
                
                if (!$response->successful()) {
                    Log::error('GraphHopper custom model route failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                        'curvature_level' => $curvatureLevel,
                        'waypoint_count' => $userWaypointCount
                    ]);
                    return null;
                }
                
                $data = $response->json();
                if (!isset($data['paths']) || empty($data['paths'])) {
                    return null;
                }
                
                $path = $data['paths'][0];
                $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                
                if (empty($route['coordinates'])) {
                    return null;
                }
                
                // Calculate route statistics
                $stats = $this->calculateRouteStats($route['coordinates']);
                $route['curvature'] = $stats['curvature'] ?? 0;
                $route['corner_count'] = $stats['corner_count'] ?? 0;
                $route['elevation_gain'] = $stats['elevation_gain'] ?? 0;
                $route['elevation_loss'] = $stats['elevation_loss'] ?? 0;
                $route['max_elevation'] = $stats['max_elevation'] ?? 0;
                $route['min_elevation'] = $stats['min_elevation'] ?? 0;
                $route['_timings'] = ['total' => (microtime(true) - $startTime) * 1000];
                $route['_strategy'] = 'custom_model_direct';
                $route['_curvature_level'] = $curvatureLevel;
                
                return $route;
            }
            
            // For 0-1 waypoints, use single API call with strategic waypoints (existing logic)
            $finalPoints = [];
            $finalPoints[] = [$startLon, $startLat]; // Start point (1)
            
            $maxStrategicWaypoints = max(0, 5 - 2 - $userWaypointCount); // 5 total - start - end - user waypoints
            
            // For straightest, don't add strategic waypoints - use direct route through user waypoints
            if ($curvatureLevel === 'straightest' || $maxStrategicWaypoints <= 0) {
                // Just add user waypoints directly
                foreach ($waypoints as $wp) {
                    $wpLat = isset($wp['lat']) ? $wp['lat'] : (is_array($wp) ? $wp[0] : null);
                    $wpLon = isset($wp['lon']) ? $wp['lon'] : (is_array($wp) ? $wp[1] : null);
                    if ($wpLat !== null && $wpLon !== null) {
                        $finalPoints[] = [$wpLon, $wpLat];
                    }
                }
            } else {
                // For other curvature levels, add strategic waypoints between segments
                // Process segments in order: start->wp1, wp1->wp2, ..., wpN->end
                $strategicWpsRemaining = $maxStrategicWaypoints;
                
                for ($i = 0; $i < count($allPoints) - 1 && $strategicWpsRemaining > 0; $i++) {
                    $segmentStart = $allPoints[$i];
                    $segmentEnd = $allPoints[$i + 1];
                    
                    // Calculate segment distance
                    $segmentDist = $this->getDistance($segmentStart[0], $segmentStart[1], $segmentEnd[0], $segmentEnd[1]);
                    $segmentDistKm = $segmentDist / 1000;
                    
                    // Generate strategic waypoints for this segment
                    $strategicWps = $this->generateStrategicWaypointsForSegment(
                        $segmentStart[0], $segmentStart[1],
                        $segmentEnd[0], $segmentEnd[1],
                        $curvatureLevel,
                        $segmentDistKm
                    );
                    
                    // Add strategic waypoints (limited by remaining space)
                    $wpsToAdd = min(count($strategicWps), $strategicWpsRemaining);
                    for ($j = 0; $j < $wpsToAdd; $j++) {
                        $finalPoints[] = [$strategicWps[$j][0], $strategicWps[$j][1]]; // [lon, lat]
                        $strategicWpsRemaining--;
                    }
                    
                    // Add the user waypoint (or end point) that ends this segment
                    if ($i < count($allPoints) - 2) { // Not the last segment
                        $finalPoints[] = [$segmentEnd[1], $segmentEnd[0]]; // User waypoint [lon, lat]
                    }
                }
                
                // If we still have user waypoints not added (because we ran out of strategic waypoint space)
                // Add remaining user waypoints
                $pointsAdded = count($finalPoints) - 1; // -1 for start point
                $userWpsAdded = $pointsAdded - ($maxStrategicWaypoints - $strategicWpsRemaining);
                if ($userWpsAdded < $userWaypointCount) {
                    for ($i = $userWpsAdded; $i < $userWaypointCount && count($finalPoints) < 4; $i++) {
                        $wp = $waypoints[$i];
                        $wpLat = isset($wp['lat']) ? $wp['lat'] : (is_array($wp) ? $wp[0] : null);
                        $wpLon = isset($wp['lon']) ? $wp['lon'] : (is_array($wp) ? $wp[1] : null);
                        if ($wpLat !== null && $wpLon !== null) {
                            $finalPoints[] = [$wpLon, $wpLat];
                        }
                    }
                }
            }
            
            $finalPoints[] = [$endLon, $endLat]; // End point
            
            // Final safety check: ensure we don't exceed 5 points
            if (count($finalPoints) > 5) {
                Log::warning('Too many points for free GraphHopper plan, limiting to 5', [
                    'total_points' => count($finalPoints),
                    'user_waypoints' => count($waypoints),
                    'curvature_level' => $curvatureLevel
                ]);
                // Keep start, end, and first 3 waypoints
                $finalPoints = [
                    $finalPoints[0], // Start
                    ...array_slice($finalPoints, 1, 3), // First 3 intermediate points
                    $finalPoints[count($finalPoints) - 1] // End
                ];
            }
            
            Log::info('GraphHopper waypoint route with strategic waypoints for curvature', [
                'total_points' => count($finalPoints),
                'user_waypoint_count' => count($waypoints),
                'strategic_waypoint_count' => count($finalPoints) - count($waypoints) - 2,
                'curvature_level' => $curvatureLevel,
                'free_plan_limit' => 5,
                'within_limit' => count($finalPoints) <= 5
            ]);
            
            // Use strategic waypoints approach - no alternative routes needed
            $payload = [
                'points' => $finalPoints,
                'profile' => $this->profile,
                'points_encoded' => false,
                'instructions' => true,
                'calc_points' => true,
                // Prevent ferry routes which can cause dead ends
                'snap_preventions' => ['ferry'],
                // No alternative_route - strategic waypoints provide curvature differentiation
            ];
            
            $response = Http::timeout(60)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->buildUrl('/route'), $payload);
            
            if (!$response->successful()) {
                $errorBody = $response->body();
                $errorData = null;
                try {
                    $errorData = json_decode($errorBody, true);
                } catch (\Exception $e) {
                    // Not JSON
                }
                
                $messageText = is_array($errorData) && isset($errorData['message'])
                    ? $errorData['message']
                    : (is_string($errorBody) ? $errorBody : '');
                
                Log::error('GraphHopper waypoint route failed', [
                    'status' => $response->status(),
                    'body' => $errorBody,
                    'error_data' => $errorData,
                    'waypoint_count' => count($waypoints)
                ]);
                return null;
            }
            
            $data = $response->json();
            
            if (!isset($data['paths']) || empty($data['paths'])) {
                Log::error('GraphHopper waypoint route returned no paths', [
                    'response' => $data
                ]);
                return null;
            }
            
            // If we have multiple paths, select the one that best matches the desired curvature level
            if (count($data['paths']) > 1) {
                Log::info('GraphHopper waypoint route: multiple paths available, selecting best curvature match', [
                    'total_paths' => count($data['paths']),
                    'curvature_level' => $curvatureLevel,
                    'waypoint_count' => count($waypoints)
                ]);
                
                $selectedRoute = $this->selectBestCurvatureMatch($data['paths'], $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
                
                if ($selectedRoute && !empty($selectedRoute['coordinates'])) {
                    // Check for backtracks
                    $hasBacktrack = $this->hasSignificantBacktrack($selectedRoute['coordinates'], $startLat, $startLon, $endLat, $endLon, true);
                    if ($hasBacktrack) {
                        Log::warning('GraphHopper waypoint route rejected due to backtracking');
                        // Try next best route or fall through to single route
                    } else {
                        // Check if route reaches destination
                        $lastCoord = $selectedRoute['coordinates'][count($selectedRoute['coordinates']) - 1];
                        $distanceToEnd = $this->getDistance($lastCoord[0], $lastCoord[1], $endLat, $endLon);
                        if ($distanceToEnd <= 1000) {
                            Log::info('GraphHopper waypoint route selected from alternatives', [
                                'curvature_level' => $curvatureLevel,
                                'selected_curvature' => $selectedRoute['curvature'] ?? 0,
                                'waypoint_count' => count($waypoints),
                                'alternatives_considered' => count($data['paths'])
                            ]);
                            return $selectedRoute;
                        } else {
                            Log::warning('GraphHopper waypoint route from alternatives doesn\'t reach destination', [
                                'distance_to_end_m' => round($distanceToEnd)
                            ]);
                        }
                    }
                } else {
                    Log::warning('GraphHopper waypoint route: selectBestCurvatureMatch returned null, falling back to first path');
                }
            }
            
            // Single path or fallback - use it directly
            // With strategic waypoints, we should get a route that respects curvature
            $path = $data['paths'][0];
            
            Log::info('GraphHopper waypoint route using path with strategic waypoints', [
                'curvature_level' => $curvatureLevel,
                'total_paths' => count($data['paths']),
                'waypoint_count' => count($waypoints),
                'strategic_waypoints_used' => true
            ]);
            
            // Format the complete route response
            $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
            
            if (empty($route['coordinates'])) {
                Log::error('GraphHopper waypoint route has no coordinates');
                return null;
            }
            
            // Enhanced dead-end detection - only strict for extra_curvy
                $lastCoord = $route['coordinates'][count($route['coordinates']) - 1];
                $distanceToEnd = $this->getDistance($lastCoord[0], $lastCoord[1], $endLat, $endLon);
                
            // Only apply strict validation for extra_curvy routes
            // For other routes (straightest, balanced, curvy), use lenient validation
            if ($curvatureLevel === 'extra_curvy') {
                $routeDistance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
                // Relaxed thresholds for extra_curvy to prevent rejecting valid routes
                if ($routeDistance < 50000) { // < 50km - relaxed for very short routes
                    $maxDistanceToEnd = 1000; // 1km for very short routes (was 300m - too strict)
                } elseif ($routeDistance < 100000) { // < 100km
                    $maxDistanceToEnd = 1500; // 1.5km for short routes (was 500m)
                } elseif ($routeDistance < 300000) { // < 300km
                    $maxDistanceToEnd = 2000; // 2km for medium routes (was 700m)
                } else {
                    $maxDistanceToEnd = 2500; // 2.5km for longer routes (was 800m)
                }
                
                if ($distanceToEnd > $maxDistanceToEnd) {
                    Log::warning('GraphHopper waypoint route rejected - dead-end route (extra_curvy)', [
                        'curvature_level' => $curvatureLevel,
                        'waypoint_count' => count($waypoints),
                        'distance_to_end_m' => round($distanceToEnd),
                        'max_allowed_m' => $maxDistanceToEnd,
                        'route_distance_km' => round($routeDistance / 1000, 2)
                    ]);
                    return null;
                }
                } else {
                // For non-extra_curvy routes, require route to actually reach destination
                // Tightened from 5km to 500m to prevent dead ends
                if ($distanceToEnd > 500) {
                    Log::warning('GraphHopper waypoint route rejected - dead end (doesn\'t reach destination)', [
                        'curvature_level' => $curvatureLevel,
                        'distance_to_end_m' => round($distanceToEnd),
                        'max_allowed_m' => 500
                    ]);
                    return null;
                }
            }
            
            // Check for backtracking - relaxed for extra_curvy
            // For other routes, allow more backtracking (waypoints can cause apparent backtracking)
            if ($curvatureLevel === 'extra_curvy') {
                $hasBacktrack = $this->hasSignificantBacktrack($route['coordinates'], $startLat, $startLon, $endLat, $endLon, true);
                if ($hasBacktrack) {
                    $routeDistance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
                    // Relaxed thresholds to prevent rejecting valid routes
                    if ($routeDistance < 50000) { // < 50km - relaxed
                        $backtrackThreshold = 1000; // 1km for very short routes (was 300m)
                    } elseif ($routeDistance < 100000) { // < 100km
                        $backtrackThreshold = 1500; // 1.5km for short routes (was 500m)
                    } elseif ($routeDistance < 300000) { // < 300km
                        $backtrackThreshold = 2000; // 2km for medium routes (was 700m)
            } else {
                        $backtrackThreshold = 2500; // 2.5km for longer routes (was 800m)
                    }
                    if ($distanceToEnd > $backtrackThreshold) {
                        Log::warning('GraphHopper waypoint route rejected - backtracking and dead-end (extra_curvy)', [
                            'curvature_level' => $curvatureLevel,
                            'distance_to_end_m' => round($distanceToEnd),
                            'backtrack_threshold_m' => $backtrackThreshold,
                            'route_distance_km' => round($routeDistance / 1000, 2)
                        ]);
                        return null;
                    }
                }
            }
            // For non-extra_curvy routes, skip backtracking check (waypoints can cause false positives)
            
            // Additional check: verify route progresses toward destination (not just loops)
            if ($curvatureLevel === 'extra_curvy') {
                $progressCheck = $this->checkRouteProgress($route['coordinates'], $startLat, $startLon, $endLat, $endLon);
                if (!$progressCheck) {
                    Log::warning('Extra curvy route rejected - insufficient progress toward destination', [
                        'curvature_level' => $curvatureLevel
                    ]);
                    return null;
                }
            }
            
            // Calculate route statistics
            $stats = $this->calculateRouteStats($route['coordinates']);
            $route['curvature'] = $stats['curvature'] ?? 0;
            $route['corner_count'] = $stats['corner_count'] ?? 0;
            $route['elevation_gain'] = $stats['elevation_gain'] ?? 0;
            $route['elevation_loss'] = $stats['elevation_loss'] ?? 0;
            $route['max_elevation'] = $stats['max_elevation'] ?? 0;
            $route['min_elevation'] = $stats['min_elevation'] ?? 0;
            
            // Add metadata
            $route['_timings'] = ['total' => (microtime(true) - $startTime) * 1000];
            $route['_strategy'] = 'graphhopper';
            $route['_curvature_level'] = $curvatureLevel;
            $route['_waypoint_count'] = count($waypoints);
            
            Log::info('GraphHopper waypoint route completed', [
                'curvature_level' => $curvatureLevel,
                'waypoint_count' => count($waypoints),
                'total_distance' => $route['distance'] ?? 0,
                'total_coordinates' => count($route['coordinates'])
            ]);
            
            return $route;
            
        } catch (\Exception $e) {
            Log::error('GraphHopper waypoint route error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Format GraphHopper response to match our route format
     */
    protected function formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel)
    {
        // Extract coordinates from GraphHopper path
        // GraphHopper returns GeoJSON format when points_encoded=false
        $coordinates = [];
        
        // Check if points exist and is an array (GeoJSON object)
        if (isset($path['points']) && is_array($path['points'])) {
            // GeoJSON format: points is an object with 'coordinates' key
            if (isset($path['points']['coordinates']) && is_array($path['points']['coordinates'])) {
                // coordinates is an array of [lon, lat] pairs
                foreach ($path['points']['coordinates'] as $coord) {
                    if (is_array($coord) && count($coord) >= 2) {
                        $coordinates[] = [$coord[1], $coord[0]]; // Convert [lon, lat] to [lat, lon]
                    }
                }
            }
        } elseif (isset($path['points']) && is_string($path['points'])) {
            // If points_encoded=true, points is an encoded polyline string
            // For now, we require points_encoded=false
            Log::warning('GraphHopper returned encoded points, but we expect decoded coordinates');
        }
        
        // Log if no coordinates were extracted - try alternative structure
        if (empty($coordinates)) {
            // Try alternative: maybe points is directly an array of coordinate arrays
            if (isset($path['points']) && is_array($path['points']) && !empty($path['points'])) {
                $firstItem = $path['points'][0];
                if (is_array($firstItem) && count($firstItem) >= 2 && is_numeric($firstItem[0])) {
                    // Points is directly an array of [lon, lat] pairs
                    foreach ($path['points'] as $coord) {
                        if (is_array($coord) && count($coord) >= 2) {
                            $coordinates[] = [$coord[1], $coord[0]]; // Convert [lon, lat] to [lat, lon]
                        }
                    }
                }
            }
            
            // Try GraphHopper API format: path may have 'geometry' or 'snapped_waypoints'
            if (empty($coordinates) && isset($path['geometry'])) {
                if (isset($path['geometry']['coordinates']) && is_array($path['geometry']['coordinates'])) {
                    foreach ($path['geometry']['coordinates'] as $coord) {
                        if (is_array($coord) && count($coord) >= 2) {
                            $coordinates[] = [$coord[1], $coord[0]]; // Convert [lon, lat] to [lat, lon]
                        }
                    }
                }
            }
            
            if (empty($coordinates)) {
                Log::error('Failed to extract coordinates from GraphHopper response', [
                    'has_points' => isset($path['points']),
                    'points_type' => isset($path['points']) ? gettype($path['points']) : 'not set',
                    'has_coordinates' => isset($path['points']['coordinates']),
                    'has_geometry' => isset($path['geometry']),
                    'path_keys' => array_keys($path),
                    'points_structure' => isset($path['points']) && is_array($path['points']) ? (isset($path['points']['coordinates']) ? 'has coordinates key' : 'no coordinates key, keys: ' . implode(', ', array_keys($path['points']))) : 'not array'
                ]);
            }
        }
        
        // Calculate distance (in meters)
        $distance = isset($path['distance']) ? $path['distance'] : 0;
        
        // Calculate duration (in seconds)
        $duration = isset($path['time']) ? $path['time'] / 1000 : 0; // GraphHopper uses milliseconds
        
        // Calculate route stats (with error handling)
        try {
            $stats = $this->calculateRouteStats($coordinates);
        } catch (\Exception $e) {
            Log::warning('Error calculating route stats', ['error' => $e->getMessage()]);
            $stats = [
                'curvature' => 0,
                'corner_count' => 0,
                'elevation_gain' => 0,
                'elevation_loss' => 0,
                'max_elevation' => 0,
                'min_elevation' => 0
            ];
        }
        
        // Simplify coordinates to reduce response size and prevent JSON truncation
        // This uses Douglas-Peucker algorithm to reduce points while maintaining route shape
        $simplifiedCoordinates = $this->simplifyCoordinates($coordinates, 0.00005); // ~5 meters tolerance

        Log::info('Route coordinates simplified', [
            'original_count' => count($coordinates),
            'simplified_count' => count($simplifiedCoordinates),
            'reduction_percent' => round((1 - count($simplifiedCoordinates) / count($coordinates)) * 100, 1)
        ]);

        // Build route response
        $route = [
            'coordinates' => $simplifiedCoordinates,
            'distance' => $distance,
            'duration' => $duration,
            'distance_km' => round($distance / 1000, 2),
            'duration_min' => round($duration / 60, 2),
            'curvature' => $stats['curvature'],
            'corner_count' => $stats['corner_count'],
            'elevation_gain' => $stats['elevation_gain'],
            'elevation_loss' => $stats['elevation_loss'],
            'max_elevation' => $stats['max_elevation'],
            'min_elevation' => $stats['min_elevation'],
            '_curvature_level' => $curvatureLevel, // Preserve requested curvature level in metadata
        ];

        // Add instructions if available
        if (isset($path['instructions'])) {
            $route['instructions'] = $this->formatInstructions($path['instructions']);
        }

        return $route;
    }

    /**
     * Simplify coordinates using Douglas-Peucker algorithm
     * Reduces the number of points while maintaining the route shape
     *
     * @param array $coordinates Array of [lat, lon] pairs
     * @param float $tolerance Tolerance in degrees (~0.00001 = 1 meter, 0.0001 = 10 meters)
     * @return array Simplified coordinates
     */
    protected function simplifyCoordinates($coordinates, $tolerance = 0.0001)
    {
        if (count($coordinates) < 3) {
            return $coordinates;
        }

        return $this->douglasPeucker($coordinates, $tolerance);
    }

    /**
     * Douglas-Peucker algorithm implementation
     * Recursively simplifies a polyline by removing points that deviate less than tolerance
     */
    protected function douglasPeucker($points, $tolerance)
    {
        if (count($points) < 3) {
            return $points;
        }

        // Find the point with the maximum distance from the line between first and last
        $maxDistance = 0;
        $index = 0;
        $end = count($points) - 1;

        for ($i = 1; $i < $end; $i++) {
            $distance = $this->perpendicularDistance(
                $points[$i],
                $points[0],
                $points[$end]
            );

            if ($distance > $maxDistance) {
                $maxDistance = $distance;
                $index = $i;
            }
        }

        // If max distance is greater than tolerance, recursively simplify
        if ($maxDistance > $tolerance) {
            // Recursive call on both sides
            $left = $this->douglasPeucker(array_slice($points, 0, $index + 1), $tolerance);
            $right = $this->douglasPeucker(array_slice($points, $index), $tolerance);

            // Merge results (remove duplicate middle point)
            array_pop($left);
            return array_merge($left, $right);
        } else {
            // All points between first and last can be removed
            return [$points[0], $points[$end]];
        }
    }

    /**
     * Calculate perpendicular distance from a point to a line
     *
     * @param array $point [lat, lon]
     * @param array $lineStart [lat, lon]
     * @param array $lineEnd [lat, lon]
     * @return float Distance in degrees
     */
    protected function perpendicularDistance($point, $lineStart, $lineEnd)
    {
        $lat = $point[0];
        $lon = $point[1];
        $lat1 = $lineStart[0];
        $lon1 = $lineStart[1];
        $lat2 = $lineEnd[0];
        $lon2 = $lineEnd[1];

        // If line start and end are the same, return distance to that point
        if ($lat1 == $lat2 && $lon1 == $lon2) {
            return sqrt(pow($lat - $lat1, 2) + pow($lon - $lon1, 2));
        }

        // Calculate perpendicular distance using cross product formula
        $numerator = abs(
            ($lon2 - $lon1) * ($lat1 - $lat) -
            ($lat2 - $lat1) * ($lon1 - $lon)
        );
        $denominator = sqrt(
            pow($lon2 - $lon1, 2) +
            pow($lat2 - $lat1, 2)
        );

        return $numerator / $denominator;
    }

    /**
     * Format turn-by-turn instructions
     */
    protected function formatInstructions($instructions)
    {
        $formatted = [];
        foreach ($instructions as $instruction) {
            $formatted[] = [
                'text' => $instruction['text'] ?? '',
                'distance' => $instruction['distance'] ?? 0,
                'time' => $instruction['time'] ?? 0,
                'sign' => $instruction['sign'] ?? 0
            ];
        }
        return $formatted;
    }

    /**
     * Get target curvature parameters for a given curvature level
     * 
     * @param string $curvatureLevel
     * @return array Target curvature range and ideal value
     */
    protected function getTargetCurvatureForLevel($curvatureLevel)
    {
        // Define target curvature ranges for each level (based on actual curvature metric)
        // Curvature metric: 0-100, where higher = more curvy
        // Adjusted: curvy is now less curvy, extra_curvy matches old curvy behavior
        $targetCurvature = [
            'straightest' => ['min' => 0, 'max' => 30, 'ideal' => 15],      // Prefer straighter routes
            'balanced' => ['min' => 30, 'max' => 60, 'ideal' => 45],        // Moderate curvature
            'curvy' => ['min' => 45, 'max' => 70, 'ideal' => 55],           // Moderate-high curvature (less curvy than before)
            'extra_curvy' => ['min' => 60, 'max' => 85, 'ideal' => 72],     // High curvature (matches old curvy)
            'very_curved' => ['min' => 70, 'max' => 100, 'ideal' => 85]      // Maximum curvature (for paid plans)
        ];
        
        return $targetCurvature[$curvatureLevel] ?? $targetCurvature['balanced'];
    }

    /**
     * Try using strategic waypoints to achieve desired curvature level
     * Adds intermediate waypoints that force routes through curvier/straighter roads
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param string $curvatureLevel
     * @return array|null Route with strategic waypoints
     */
    /**
     * Generate strategic waypoints for a single segment (between two points)
     * Used when user waypoints are present to maintain curvature differentiation
     */
    protected function generateStrategicWaypointsForSegment($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $distanceKm)
    {
        if ($curvatureLevel === 'straightest') {
            return []; // No strategic waypoints for straightest
        }
        
        $midLat = ($startLat + $endLat) / 2;
        $midLon = ($startLon + $endLon) / 2;
        $bearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
        
        $waypoints = [];
        $offsetMultiplier = 1.0;
        
        if ($curvatureLevel === 'balanced') {
            if ($distanceKm < 300) {
                $offsetDistance = $distanceKm * 0.15;
            } else {
                $offsetDistance = max($distanceKm * 0.12, 35);
            }
            $offsetDistance = min($offsetDistance, 100);
            $offset1 = $this->calculatePointAtBearing($midLat, $midLon, $offsetDistance, $bearing + 40);
            $waypoints = [[$offset1['lon'], $offset1['lat']]];
        } elseif ($curvatureLevel === 'curvy') {
            if ($distanceKm < 300) {
                $offsetDistance1 = $distanceKm * 0.25;
                $offsetDistance2 = $distanceKm * 0.22;
            } else {
                $offsetDistance1 = max($distanceKm * 0.18, 70);
                $offsetDistance2 = max($distanceKm * 0.16, 60);
            }
            $offsetDistance1 = min($offsetDistance1, 150);
            $offsetDistance2 = min($offsetDistance2, 130);
            
            $point1Lat = $startLat + ($endLat - $startLat) * 0.40;
            $point1Lon = $startLon + ($endLon - $startLon) * 0.40;
            $point2Lat = $startLat + ($endLat - $startLat) * 0.60;
            $point2Lon = $startLon + ($endLon - $startLon) * 0.60;
            
            $offset1 = $this->calculatePointAtBearing($point1Lat, $point1Lon, $offsetDistance1, $bearing + 55);
            $offset2 = $this->calculatePointAtBearing($point2Lat, $point2Lon, $offsetDistance2, $bearing - 55);
            $waypoints = [[$offset1['lon'], $offset1['lat']], [$offset2['lon'], $offset2['lat']]];
        } elseif ($curvatureLevel === 'extra_curvy' || $curvatureLevel === 'very_curved') {
            if ($distanceKm < 300) {
                $offsetDistance1 = $distanceKm * 0.30;
                $offsetDistance2 = $distanceKm * 0.28;
                $offsetDistance3 = $distanceKm * 0.25;
            } elseif ($distanceKm > 2000) {
                $offsetDistance1 = max($distanceKm * 0.12, 50);
                $offsetDistance2 = max($distanceKm * 0.10, 45);
                $offsetDistance3 = max($distanceKm * 0.08, 40);
                $offsetDistance1 = min($offsetDistance1, 100);
                $offsetDistance2 = min($offsetDistance2, 90);
                $offsetDistance3 = min($offsetDistance3, 80);
            } else {
                $offsetDistance1 = max($distanceKm * 0.22, 80);
                $offsetDistance2 = max($distanceKm * 0.20, 75);
                $offsetDistance3 = max($distanceKm * 0.18, 70);
                $offsetDistance1 = min($offsetDistance1, 180);
                $offsetDistance2 = min($offsetDistance2, 160);
                $offsetDistance3 = min($offsetDistance3, 150);
            }
            
            $point1Lat = $startLat + ($endLat - $startLat) * 0.30;
            $point1Lon = $startLon + ($endLon - $startLon) * 0.30;
            $point2Lat = $startLat + ($endLat - $startLat) * 0.50;
            $point2Lon = $startLon + ($endLon - $startLon) * 0.50;
            $point3Lat = $startLat + ($endLat - $startLat) * 0.70;
            $point3Lon = $startLon + ($endLon - $startLon) * 0.70;
            
            $baseBearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
            
            $offset1 = $this->calculatePointAtBearing($point1Lat, $point1Lon, $offsetDistance1, $baseBearing + 70);
            $offset2 = $this->calculatePointAtBearing($point2Lat, $point2Lon, $offsetDistance2, $baseBearing - 70);
            $offset3 = $this->calculatePointAtBearing($point3Lat, $point3Lon, $offsetDistance3, $baseBearing + 75);
            $waypoints = [[$offset1['lon'], $offset1['lat']], [$offset2['lon'], $offset2['lat']], [$offset3['lon'], $offset3['lat']]];
        }
        
        return $waypoints;
    }

    protected function tryStrategicWaypoints($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $retryWithSmallerOffsets = false)
    {
        // Calculate midpoint and generate waypoints based on curvature level
        $midLat = ($startLat + $endLat) / 2;
        $midLon = ($startLon + $endLon) / 2;
        
        // Calculate bearing from start to end
        $bearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
        $distance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
        $distanceKm = $distance / 1000; // Convert to km for calculatePointAtBearing
        
        // Generate waypoints based on curvature level
        // For straightest, don't use waypoints - return null to use direct route
        if ($curvatureLevel === 'straightest') {
            return null; // No waypoints for straightest - use direct route
        }
        
        $waypoints = [];
        
        // Scale waypoint offsets based on distance to ensure differentiation for ALL routes
        // Use more aggressive offsets to ensure routes are actually different
        // For short routes (<300km), use percentage-based offsets
        // For longer routes, use larger absolute offsets to ensure differentiation
        
        // If retry, use smaller offsets (might have been rejected for being too far)
        $offsetMultiplier = $retryWithSmallerOffsets ? 0.7 : 1.0;
        
        if ($curvatureLevel === 'balanced') {
            // For balanced, add 1 waypoint with small offset (slightly curvier than straightest)
            // Use moderate percentage for short routes, larger absolute for long routes
            if ($distanceKm < 300) {
                $offsetDistance = $distanceKm * 0.15 * $offsetMultiplier; // 15% for short routes (Balvi-Riga ~30km)
            } else {
                $offsetDistance = max($distanceKm * 0.12 * $offsetMultiplier, 35 * $offsetMultiplier); // 12% or 35km minimum for long routes
            }
            $offsetDistance = min($offsetDistance, 100); // Cap at 100km
            $offset1 = $this->calculatePointAtBearing($midLat, $midLon, $offsetDistance, $bearing + 40);
            $waypoints = [[$offset1['lon'], $offset1['lat']]];
        } elseif ($curvatureLevel === 'curvy') {
            // For curvy, add 2 waypoints with larger offsets to ensure clear differentiation
            // Use multiple waypoints to force more curved routes
            if ($distanceKm < 300) {
                // Short routes: use 2 waypoints at different positions with larger offsets
                $offsetDistance1 = $distanceKm * 0.25 * $offsetMultiplier; // 25% for first waypoint (Balvi-Riga ~50km)
                $offsetDistance2 = $distanceKm * 0.22 * $offsetMultiplier; // 22% for second waypoint (Balvi-Riga ~44km)
            } else {
                // Long routes: use larger absolute offsets
                $offsetDistance1 = max($distanceKm * 0.18 * $offsetMultiplier, 70 * $offsetMultiplier); // 18% or 70km minimum
                $offsetDistance2 = max($distanceKm * 0.16 * $offsetMultiplier, 60 * $offsetMultiplier); // 16% or 60km minimum
            }
            $offsetDistance1 = min($offsetDistance1, 150); // Cap at 150km
            $offsetDistance2 = min($offsetDistance2, 130); // Cap at 130km
            
            // Use different positions along the route for better variation
            $point1Lat = $startLat + ($endLat - $startLat) * 0.40; // 40% along route
            $point1Lon = $startLon + ($endLon - $startLon) * 0.40;
            $point2Lat = $startLat + ($endLat - $startLat) * 0.60; // 60% along route
            $point2Lon = $startLon + ($endLon - $startLon) * 0.60;
            
            $bearing1 = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
            $bearing2 = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
            
            $offset1 = $this->calculatePointAtBearing($point1Lat, $point1Lon, $offsetDistance1, $bearing1 + 55);
            $offset2 = $this->calculatePointAtBearing($point2Lat, $point2Lon, $offsetDistance2, $bearing2 - 55);
            $waypoints = [
                [$offset1['lon'], $offset1['lat']],
                [$offset2['lon'], $offset2['lat']]
            ];
        } elseif ($curvatureLevel === 'extra_curvy' || $curvatureLevel === 'very_curved') {
            // For extra curvy/very curved, add waypoints with offsets
            // For very short routes (<50km), use fewer waypoints and minimal offsets to prevent dead ends
            // For very long routes (>2000km), use smaller offsets to prevent dead ends
            if ($distanceKm < 50) {
                // Very short routes (<50km): use only 2 waypoints with moderate offsets
                // Similar to "curvy" but slightly smaller to prevent dead ends when there aren't many alternative roads
                // For 30km route: ~6km and ~5km offsets (vs curvy's ~7.5km and ~6.6km)
                $offsetDistance1 = $distanceKm * 0.20 * $offsetMultiplier; // 20% for first waypoint (vs curvy's 25%)
                $offsetDistance2 = $distanceKm * 0.18 * $offsetMultiplier; // 18% for second waypoint (vs curvy's 22%)
                // Cap at reasonable maximums for very short routes
                $offsetDistance1 = min($offsetDistance1, 6); // Cap at 6km for very short routes
                $offsetDistance2 = min($offsetDistance2, 5.5); // Cap at 5.5km
                
                // Use only 2 waypoints positioned closer to start/end
                $point1Lat = $startLat + ($endLat - $startLat) * 0.35; // 35% along route
                $point1Lon = $startLon + ($endLon - $startLon) * 0.35;
                $point2Lat = $startLat + ($endLat - $startLat) * 0.65; // 65% along route
                $point2Lon = $startLon + ($endLon - $startLon) * 0.65;
                
                $baseBearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
                
                $offset1 = $this->calculatePointAtBearing($point1Lat, $point1Lon, $offsetDistance1, $baseBearing + 60);
                $offset2 = $this->calculatePointAtBearing($point2Lat, $point2Lon, $offsetDistance2, $baseBearing - 60);
                $waypoints = [
                    [$offset1['lon'], $offset1['lat']],
                    [$offset2['lon'], $offset2['lat']]
                ];
            } elseif ($distanceKm < 100) {
                // Short routes (50-100km): use 3 waypoints with small offsets
                $offsetDistance1 = $distanceKm * 0.10 * $offsetMultiplier; // 10% for first waypoint
                $offsetDistance2 = $distanceKm * 0.08 * $offsetMultiplier; // 8% for second waypoint
                $offsetDistance3 = $distanceKm * 0.06 * $offsetMultiplier; // 6% for third waypoint
                // Cap at absolute maximums for short routes
                $offsetDistance1 = min($offsetDistance1, 6); // Cap at 6km for short routes
                $offsetDistance2 = min($offsetDistance2, 5); // Cap at 5km
                $offsetDistance3 = min($offsetDistance3, 4); // Cap at 4km
                
                // Use three waypoints
                $point1Lat = $startLat + ($endLat - $startLat) * 0.30; // 30% along route
                $point1Lon = $startLon + ($endLon - $startLon) * 0.30;
                $point2Lat = $startLat + ($endLat - $startLat) * 0.50; // 50% along route (midpoint)
                $point2Lon = $startLon + ($endLon - $startLon) * 0.50;
                $point3Lat = $startLat + ($endLat - $startLat) * 0.70; // 70% along route
                $point3Lon = $startLon + ($endLon - $startLon) * 0.70;
                
                $baseBearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
                
                $offset1 = $this->calculatePointAtBearing($point1Lat, $point1Lon, $offsetDistance1, $baseBearing + 70);
                $offset2 = $this->calculatePointAtBearing($point2Lat, $point2Lon, $offsetDistance2, $baseBearing - 70);
                $offset3 = $this->calculatePointAtBearing($point3Lat, $point3Lon, $offsetDistance3, $baseBearing + 75);
                $waypoints = [
                    [$offset1['lon'], $offset1['lat']],
                    [$offset2['lon'], $offset2['lat']],
                    [$offset3['lon'], $offset3['lat']]
                ];
            } elseif ($distanceKm < 300) {
                // Short routes (100-300km): use smaller offsets to avoid dead ends
                $offsetDistance1 = $distanceKm * 0.15 * $offsetMultiplier; // 15% for first waypoint (reduced from 20%)
                $offsetDistance2 = $distanceKm * 0.13 * $offsetMultiplier; // 13% for second waypoint (reduced from 18%)
                $offsetDistance3 = $distanceKm * 0.11 * $offsetMultiplier; // 11% for third waypoint (reduced from 15%)
                // Cap at reasonable maximums
                $offsetDistance1 = min($offsetDistance1, 30); // Cap at 30km for short routes
                $offsetDistance2 = min($offsetDistance2, 25); // Cap at 25km
                $offsetDistance3 = min($offsetDistance3, 20); // Cap at 20km
            } elseif ($distanceKm > 2000) {
                // Very long routes (Helsinki-Paris): use smaller absolute offsets to prevent dead ends
                $offsetDistance1 = max($distanceKm * 0.10 * $offsetMultiplier, 40 * $offsetMultiplier); // 10% or 40km minimum
                $offsetDistance2 = max($distanceKm * 0.08 * $offsetMultiplier, 35 * $offsetMultiplier); // 8% or 35km minimum
                $offsetDistance3 = max($distanceKm * 0.06 * $offsetMultiplier, 30 * $offsetMultiplier); // 6% or 30km minimum
                $offsetDistance1 = min($offsetDistance1, 80); // Cap at 80km for very long routes
                $offsetDistance2 = min($offsetDistance2, 70); // Cap at 70km
                $offsetDistance3 = min($offsetDistance3, 60); // Cap at 60km
            } else {
                // Medium routes: balanced offsets (reduced to prevent dead ends)
                $offsetDistance1 = max($distanceKm * 0.15 * $offsetMultiplier, 50 * $offsetMultiplier); // 15% or 50km minimum (reduced from 18%/60km)
                $offsetDistance2 = max($distanceKm * 0.13 * $offsetMultiplier, 45 * $offsetMultiplier); // 13% or 45km minimum (reduced from 20%/75km)
                $offsetDistance3 = max($distanceKm * 0.12 * $offsetMultiplier, 40 * $offsetMultiplier); // 12% or 40km minimum (reduced from 18%/70km)
                $offsetDistance1 = min($offsetDistance1, 120); // Cap at 120km (reduced from 180km)
                $offsetDistance2 = min($offsetDistance2, 110); // Cap at 110km (reduced from 160km)
                $offsetDistance3 = min($offsetDistance3, 100); // Cap at 100km (reduced from 150km)
            }
            
            // Use three different positions along the route
            $point1Lat = $startLat + ($endLat - $startLat) * 0.30; // 30% along route
            $point1Lon = $startLon + ($endLon - $startLon) * 0.30;
            $point2Lat = $startLat + ($endLat - $startLat) * 0.50; // 50% along route (midpoint)
            $point2Lon = $startLon + ($endLon - $startLon) * 0.50;
            $point3Lat = $startLat + ($endLat - $startLat) * 0.70; // 70% along route
            $point3Lon = $startLon + ($endLon - $startLon) * 0.70;
            
            $baseBearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
            
            $offset1 = $this->calculatePointAtBearing($point1Lat, $point1Lon, $offsetDistance1, $baseBearing + 70);
            $offset2 = $this->calculatePointAtBearing($point2Lat, $point2Lon, $offsetDistance2, $baseBearing - 70);
            $offset3 = $this->calculatePointAtBearing($point3Lat, $point3Lon, $offsetDistance3, $baseBearing + 75);
            $waypoints = [
                [$offset1['lon'], $offset1['lat']],
                [$offset2['lon'], $offset2['lat']],
                [$offset3['lon'], $offset3['lat']]
            ];
        }
        
        // For straightest routes, don't use waypoints - return null to fall back to basic route
        if ($curvatureLevel === 'straightest' || $curvatureLevel === 'fastest') {
            return null; // Let it fall back to basic route calculation without waypoints
        }
        
        if (empty($waypoints)) {
            return null;
        }
        
        // Build points array with waypoints
        $points = [[$startLon, $startLat]];
        foreach ($waypoints as $wp) {
            $points[] = $wp;
        }
        $points[] = [$endLon, $endLat];
        
        Log::info('Trying strategic waypoints for curvature simulation', [
            'curvature_level' => $curvatureLevel,
            'waypoint_count' => count($waypoints),
            'total_points' => count($points),
            'route_distance_km' => round($distanceKm, 2),
            'offset_distances_km' => array_map(function($wp) use ($midLat, $midLon) {
                $wpLat = is_array($wp) ? $wp[1] : $wp['lat'];
                $wpLon = is_array($wp) ? $wp[0] : $wp['lon'];
                return round($this->getDistance($midLat, $midLon, $wpLat, $wpLon) / 1000, 2);
            }, $waypoints)
        ]);
        
        // Request route with waypoints (without custom_model)
        // Don't request alternative routes here - the waypoints themselves create the route variation
        $payload = [
            'points' => $points,
            'profile' => $this->profile,
            'points_encoded' => false,
            'instructions' => true,
            'calc_points' => true,
            // Prevent ferry routes which can cause dead ends
            'snap_preventions' => ['ferry'],
            // No alternative_route here - waypoints are the differentiation mechanism
        ];
        
        Log::info('Strategic waypoints API request', [
            'curvature_level' => $curvatureLevel,
            'waypoint_count' => count($waypoints),
            'total_points' => count($points),
            'route_distance_km' => round($distanceKm, 2),
            'waypoint_positions' => array_map(function($wp) {
                return ['lon' => round($wp[0], 6), 'lat' => round($wp[1], 6)];
            }, array_slice($points, 1, -1)), // All points except start and end
            'retry_mode' => $retryWithSmallerOffsets ? 'retry_with_smaller_offsets' : 'normal'
        ]);
        
        try {
            $response = Http::timeout(60)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->buildUrl('/route'), $payload);
            
            if (!$response->successful()) {
                Log::warning('Strategic waypoints route failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 200)
                ]);
                return null;
            }
            
            $data = $response->json();
            if (!isset($data['paths']) || empty($data['paths'])) {
                return null;
            }
            
            $path = $data['paths'][0];
            $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
            
            if ($route && !empty($route['coordinates'])) {
                // Enhanced dead-end detection for extra curvy routes
                $lastCoord = $route['coordinates'][count($route['coordinates']) - 1];
                $distanceToEnd = $this->getDistance($lastCoord[0], $lastCoord[1], $endLat, $endLon);
                
                // Only apply strict validation for extra_curvy routes
                // For other routes, use lenient validation
                if ($curvatureLevel === 'extra_curvy') {
                    $routeDistance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
                    // Relaxed thresholds for extra_curvy to prevent rejecting valid routes
                    if ($routeDistance < 50000) { // < 50km - relaxed for very short routes
                        $maxDistanceToEnd = 1000; // 1km for very short routes (was 300m - too strict)
                    } elseif ($routeDistance < 100000) { // < 100km
                        $maxDistanceToEnd = 1500; // 1.5km for short routes (was 500m)
                    } elseif ($routeDistance < 300000) { // < 300km
                        $maxDistanceToEnd = 2000; // 2km for medium routes (was 800m)
                    } else {
                        $maxDistanceToEnd = 2500; // 2.5km for longer routes (was 1000m)
                    }
                    
                    if ($distanceToEnd > $maxDistanceToEnd) {
                        Log::warning('Strategic waypoints route rejected - dead-end route (extra_curvy)', [
                        'distance_to_end_m' => round($distanceToEnd),
                            'curvature_level' => $curvatureLevel,
                            'max_allowed_m' => $maxDistanceToEnd,
                            'route_distance_km' => round($routeDistance / 1000, 2)
                    ]);
                    return null;
                    }
                } else {
                    // For non-extra_curvy routes, require route to actually reach destination
                    // Tightened from 5km to 500m to prevent dead ends
                    if ($distanceToEnd > 500) {
                        Log::warning('Strategic waypoints route rejected - dead end (doesn\'t reach destination)', [
                            'distance_to_end_m' => round($distanceToEnd),
                            'curvature_level' => $curvatureLevel,
                            'max_allowed_m' => 500
                        ]);
                        return null;
                    }
                }
                
                // Check for backtracking - relaxed for extra_curvy
                // For other routes, allow more backtracking (waypoints can cause apparent backtracking)
                if ($curvatureLevel === 'extra_curvy') {
                $hasBacktrack = $this->hasSignificantBacktrack($route['coordinates'], $startLat, $startLon, $endLat, $endLon, true);
                    if ($hasBacktrack) {
                        $routeDistance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
                        // Relaxed thresholds to prevent rejecting valid routes
                        if ($routeDistance < 50000) { // < 50km - relaxed
                            $backtrackThreshold = 1000; // 1km for very short routes (was 300m)
                        } elseif ($routeDistance < 100000) { // < 100km
                            $backtrackThreshold = 1500; // 1.5km for short routes (was 500m)
                        } elseif ($routeDistance < 300000) { // < 300km
                            $backtrackThreshold = 2000; // 2km for medium routes (was 800m)
                        } else {
                            $backtrackThreshold = 2500; // 2.5km for longer routes (was 1000m)
                        }
                        
                        if ($distanceToEnd > $backtrackThreshold) {
                    // Only reject if both backtracking AND far from destination
                            Log::warning('Strategic waypoints route rejected due to severe backtracking and distance (extra_curvy)', [
                        'distance_to_end_m' => round($distanceToEnd),
                                'curvature_level' => $curvatureLevel,
                                'backtrack_threshold_m' => $backtrackThreshold,
                                'route_distance_km' => round($routeDistance / 1000, 2)
                            ]);
                            return null;
                        }
                    }
                }
                // For non-extra_curvy routes, skip backtracking check (waypoints can cause false positives)
                
                // Additional check: verify route progresses toward destination
                // Check if route makes progress toward end point (not just loops)
                if ($curvatureLevel === 'extra_curvy') {
                    $progressCheck = $this->checkRouteProgress($route['coordinates'], $startLat, $startLon, $endLat, $endLon);
                    if (!$progressCheck) {
                        Log::warning('Extra curvy route rejected - insufficient progress toward destination', [
                        'curvature_level' => $curvatureLevel
                    ]);
                    return null;
                    }
                }
                
                // Calculate actual curvature to verify it's different
                $stats = $this->calculateRouteStats($route['coordinates']);
                $route['curvature'] = $stats['curvature'] ?? 0;
                $route['corner_count'] = $stats['corner_count'] ?? 0;
                
                Log::info('Strategic waypoints route accepted', [
                    'curvature_level' => $curvatureLevel,
                    'calculated_curvature' => $route['curvature'],
                    'corner_count' => $route['corner_count'],
                    'waypoint_count' => count($waypoints),
                    'distance_to_end_m' => round($distanceToEnd)
                ]);
                
                $route['_free_plan_limitation'] = true;
                $route['_curvature_simulation'] = 'strategic_waypoints';
                $route['_strategic_waypoint_count'] = count($waypoints);
            }
            
            return $route;
        } catch (\Exception $e) {
            Log::warning('Strategic waypoints route exception', ['error' => $e->getMessage()]);
            return null;
        }
    }


    /**
     * Calculate route statistics (curvature, corners, elevation)
     */
    protected function calculateRouteStats($coordinates)
    {
        if (count($coordinates) < 3) {
            return [
                'curvature' => 0,
                'corner_count' => 0,
                'elevation_gain' => 0,
                'elevation_loss' => 0,
                'max_elevation' => 0,
                'min_elevation' => 0
            ];
        }
        
        $totalCurvature = 0;
        $cornerCount = 0;
        $elevations = [];
        
        // Calculate curvature and corners
        for ($i = 1; $i < count($coordinates) - 1; $i++) {
            $prev = $coordinates[$i - 1];
            $curr = $coordinates[$i];
            $next = $coordinates[$i + 1];
            
            // Calculate angle change
            $angle1 = atan2($curr[0] - $prev[0], $curr[1] - $prev[1]);
            $angle2 = atan2($next[0] - $curr[0], $next[1] - $curr[1]);
            $angleDiff = abs($angle2 - $angle1);
            
            if ($angleDiff > M_PI) {
                $angleDiff = 2 * M_PI - $angleDiff;
            }
            
            $totalCurvature += $angleDiff;
            
            // Count significant corners (> 15 degrees)
            if ($angleDiff > deg2rad(15)) {
                $cornerCount++;
            }
        }
        
        // Get elevations for all points (with error handling)
        $elevations = [];
        try {
            $elevations = $this->elevationService->getElevations($coordinates);
        } catch (\Exception $e) {
            Log::warning('Error getting elevation data', ['error' => $e->getMessage()]);
            // Continue without elevation data
        }
        
        if (!empty($elevations)) {
            $elevationGain = 0;
            $elevationLoss = 0;
            
            for ($i = 1; $i < count($elevations); $i++) {
                $diff = $elevations[$i] - $elevations[$i - 1];
                if ($diff > 0) {
                    $elevationGain += $diff;
                } else {
                    $elevationLoss += abs($diff);
                }
            }
        } else {
            $elevationGain = 0;
            $elevationLoss = 0;
        }
        
        return [
            'curvature' => round($totalCurvature, 4),
            'corner_count' => $cornerCount,
            'elevation_gain' => round($elevationGain, 2),
            'elevation_loss' => round($elevationLoss, 2),
            'max_elevation' => !empty($elevations) ? round(max($elevations), 2) : 0,
            'min_elevation' => !empty($elevations) ? round(min($elevations), 2) : 0
        ];
    }

    /**
     * Extract waypoints from saved roads
     * Converts saved road coordinates to waypoint format for GraphHopper
     * 
     * @param array $savedRoads Array of SavedRoad models
     * @return array Array of waypoints in format [['lat' => x, 'lon' => y], ...]
     */
    public function extractWaypointsFromSavedRoads($savedRoads)
    {
        $waypoints = [];
        
        // Convert Collection to array if needed
        $savedRoadsArray = is_array($savedRoads) ? $savedRoads : $savedRoads->all();
        
        foreach ($savedRoadsArray as $savedRoad) {
            if (empty($savedRoad->road_coordinates)) {
                Log::warning('Saved road has no coordinates', ['road_id' => $savedRoad->id]);
                continue;
            }
            
            // Parse coordinates from JSON string
            $coordinates = json_decode($savedRoad->road_coordinates, true);
            
            if (!is_array($coordinates) || empty($coordinates)) {
                Log::warning('Saved road coordinates invalid', ['road_id' => $savedRoad->id]);
                continue;
            }
            
            // GraphHopper has a limit on waypoints (typically 100)
            // For saved roads, we want to preserve the path, so we use as many waypoints as possible
            // If saved road has many points, sample strategically but use more points
            $maxWaypointsPerRoad = 95; // Use almost all available waypoints to preserve the road shape
            $coordinateCount = count($coordinates);
            
            Log::info('Processing saved road coordinates', [
                'road_id' => $savedRoad->id,
                'coordinate_count' => $coordinateCount,
                'max_waypoints' => $maxWaypointsPerRoad
            ]);
            
            if ($coordinateCount <= $maxWaypointsPerRoad) {
                // Use all coordinates to preserve the exact path
                // Saved roads store coordinates as [[lat, lon], [lat, lon], ...]
                // CRITICAL: Always include first and last coordinates
                $firstCoord = $this->convertCoordinateToWaypoint($coordinates[0]);
                $lastCoord = $this->convertCoordinateToWaypoint($coordinates[$coordinateCount - 1]);
                
                foreach ($coordinates as $idx => $coord) {
                    $waypoint = $this->convertCoordinateToWaypoint($coord);
                    if ($waypoint) {
                        // Ensure first and last are always added
                        if ($idx === 0 && $firstCoord) {
                            $waypoints[] = $firstCoord;
                        } elseif ($idx === $coordinateCount - 1 && $lastCoord) {
                            // Only add if not already added
                            $alreadyAdded = false;
                            foreach ($waypoints as $wp) {
                                if (abs($wp['lat'] - $lastCoord['lat']) < 0.0001 && abs($wp['lon'] - $lastCoord['lon']) < 0.0001) {
                                    $alreadyAdded = true;
                                    break;
                                }
                            }
                            if (!$alreadyAdded) {
                                $waypoints[] = $lastCoord;
                            }
                        } else {
                            $waypoints[] = $waypoint;
                        }
                    }
                }
                Log::info('Used all coordinates from saved road', [
                    'road_id' => $savedRoad->id,
                    'waypoint_count' => count($waypoints),
                    'first_coord' => $firstCoord,
                    'last_coord' => $lastCoord
                ]);
            } else {
                // Sample strategically: start, evenly distributed middle points, end
                // Always include first and last points
                $firstWaypoint = $this->convertCoordinateToWaypoint($coordinates[0]);
                if ($firstWaypoint) {
                    $waypoints[] = $firstWaypoint;
                }
                
                // Calculate step size for even distribution
                // Use more points to better preserve the road shape
                $step = max(1, floor($coordinateCount / ($maxWaypointsPerRoad - 1)));
                
                Log::info('Sampling saved road coordinates', [
                    'road_id' => $savedRoad->id,
                    'step_size' => $step,
                    'total_coords' => $coordinateCount
                ]);
                
                for ($i = $step; $i < $coordinateCount - 1; $i += $step) {
                    $waypoint = $this->convertCoordinateToWaypoint($coordinates[$i]);
                    if ($waypoint) {
                        $waypoints[] = $waypoint;
                    }
                }
                
                // Always include last point
                $lastWaypoint = $this->convertCoordinateToWaypoint($coordinates[$coordinateCount - 1]);
                if ($lastWaypoint) {
                    $waypoints[] = $lastWaypoint;
                }
                
                Log::info('Sampled saved road coordinates', [
                    'road_id' => $savedRoad->id,
                    'waypoint_count' => count($waypoints)
                ]);
            }
        }
        
        Log::info('Extracted waypoints from saved roads', [
            'saved_road_count' => count($savedRoadsArray),
            'waypoint_count' => count($waypoints),
            'first_waypoint' => $waypoints[0] ?? null,
            'last_waypoint' => $waypoints[count($waypoints) - 1] ?? null,
            'saved_road_ids' => array_map(function($road) { return $road->id; }, $savedRoadsArray)
        ]);
        
        return $waypoints;
    }
    
    /**
     * Find route with saved roads using waypoint enforcement (for straightest mode)
     * This prevents backtracking by forcing GraphHopper to go through saved road waypoints in order
     */
    protected function findRouteWithSavedRoadsViaWaypoints($startLat, $startLon, $endLat, $endLon, $savedRoadsArray, $curvatureLevel, $additionalWaypoints = [])
    {
        $startTime = microtime(true);
        
        Log::info('Using waypoint enforcement for straightest route with saved roads', [
            'saved_road_count' => count($savedRoadsArray),
            'saved_road_ids' => array_map(function($road) { return $road->id; }, $savedRoadsArray)
        ]);
        
        try {
            // Extract waypoints from saved roads (sampled if needed to stay within GraphHopper limits)
            $savedRoadWaypoints = $this->extractWaypointsFromSavedRoads($savedRoadsArray);
            
            if (empty($savedRoadWaypoints)) {
                Log::warning('No waypoints extracted from saved roads, falling back to regular route');
                return $this->findCurvedRoute($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $additionalWaypoints);
            }
            
            // Build points array: start -> saved road waypoints -> additional waypoints -> end
            // CRITICAL: Always include first and last saved road waypoints to ensure route goes through them
            $points = [[$startLon, $startLat]]; // Start point in [lon, lat] format
            
            // Get first and last saved road waypoints to ensure they're included
            $firstSavedRoadWp = $savedRoadWaypoints[0] ?? null;
            $lastSavedRoadWp = $savedRoadWaypoints[count($savedRoadWaypoints) - 1] ?? null;
            
            // Add saved road waypoints (convert from [lat, lon] to [lon, lat])
            // Ensure first and last are always included even if close to start/end
            foreach ($savedRoadWaypoints as $idx => $wp) {
                $wpPoint = [$wp['lon'], $wp['lat']];
                
                // Check if this is the first waypoint and if it's too close to start
                if ($idx === 0 && $firstSavedRoadWp) {
                    $distanceToStart = $this->getDistance($startLat, $startLon, $wp['lat'], $wp['lon']);
                    if ($distanceToStart < 100) {
                        // If very close to start, still include it but log
                        Log::info('First saved road waypoint is close to start, but including it', [
                            'distance_m' => round($distanceToStart),
                            'waypoint' => $wp
                        ]);
                    }
                }
                
                // Check if this is the last waypoint and if it's too close to end
                if ($idx === count($savedRoadWaypoints) - 1 && $lastSavedRoadWp) {
                    $distanceToEnd = $this->getDistance($endLat, $endLon, $wp['lat'], $wp['lon']);
                    if ($distanceToEnd < 100) {
                        // If very close to end, still include it but log
                        Log::info('Last saved road waypoint is close to end, but including it', [
                            'distance_m' => round($distanceToEnd),
                            'waypoint' => $wp
                        ]);
                    }
                }
                
                $points[] = $wpPoint;
            }
            
            // Add additional waypoints if any
            foreach ($additionalWaypoints as $wp) {
                $wpLat = isset($wp['lat']) ? $wp['lat'] : (is_array($wp) ? $wp[0] : null);
                $wpLon = isset($wp['lon']) ? $wp['lon'] : (is_array($wp) ? $wp[1] : null);
                if ($wpLat !== null && $wpLon !== null) {
                    $points[] = [$wpLon, $wpLat];
                }
            }
            
            $points[] = [$endLon, $endLat]; // End point
            
            // Verify first and last saved road waypoints are in the points array
            if ($firstSavedRoadWp) {
                $firstWpInPoints = false;
                foreach ($points as $pt) {
                    if (abs($pt[0] - $firstSavedRoadWp['lon']) < 0.0001 && abs($pt[1] - $firstSavedRoadWp['lat']) < 0.0001) {
                        $firstWpInPoints = true;
                        break;
                    }
                }
                if (!$firstWpInPoints) {
                    Log::warning('First saved road waypoint not found in points array, adding it explicitly');
                    // Insert after start point
                    array_splice($points, 1, 0, [[$firstSavedRoadWp['lon'], $firstSavedRoadWp['lat']]]);
                }
            }
            
            if ($lastSavedRoadWp) {
                $lastWpInPoints = false;
                foreach ($points as $pt) {
                    if (abs($pt[0] - $lastSavedRoadWp['lon']) < 0.0001 && abs($pt[1] - $lastSavedRoadWp['lat']) < 0.0001) {
                        $lastWpInPoints = true;
                        break;
                    }
                }
                if (!$lastWpInPoints) {
                    Log::warning('Last saved road waypoint not found in points array, adding it explicitly');
                    // Insert before end point
                    array_splice($points, -1, 0, [[$lastSavedRoadWp['lon'], $lastSavedRoadWp['lat']]]);
                }
            }
            
            Log::info('Built waypoint-enforced route', [
                'total_points' => count($points),
                'saved_road_waypoints' => count($savedRoadWaypoints),
                'additional_waypoints' => count($additionalWaypoints)
            ]);
            
            // Build custom model
            $customModel = $this->buildCustomModel($curvatureLevel);
            
            // Single GraphHopper request with all waypoints - this forces GraphHopper to go through them in order
            $payload = [
                'points' => $points,
                'profile' => $this->profile,
                'points_encoded' => false,
                'instructions' => false,
                'calc_points' => true,
                'ch.disable' => true, // Required for custom_model
                'custom_model' => $customModel
            ];
            
            $response = Http::timeout(60)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->buildUrl('/route'), $payload);
            
            if (!$response->successful()) {
                Log::error('GraphHopper waypoint-enforced route failed', [
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                return null;
            }
            
            $data = $response->json();
            if (!isset($data['paths']) || empty($data['paths'])) {
                Log::error('GraphHopper waypoint-enforced route has no paths');
                return null;
            }
            
            $path = $data['paths'][0];
            $route = $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, $curvatureLevel);
            
            if (empty($route['coordinates'])) {
                Log::error('GraphHopper waypoint-enforced route has no coordinates');
                return null;
            }
            
            // Verify route passes through first and last saved road waypoints
            if ($firstSavedRoadWp && $lastSavedRoadWp) {
                $firstWpFound = false;
                $lastWpFound = false;
                $firstWpDistance = null;
                $lastWpDistance = null;
                
                foreach ($route['coordinates'] as $coord) {
                    $lat = is_array($coord) ? $coord[0] : $coord['lat'];
                    $lon = is_array($coord) ? $coord[1] : $coord['lon'];
                    
                    // Check distance to first waypoint
                    $distToFirst = $this->getDistance($firstSavedRoadWp['lat'], $firstSavedRoadWp['lon'], $lat, $lon);
                    if ($distToFirst < 50) { // Within 50 meters
                        $firstWpFound = true;
                        if ($firstWpDistance === null || $distToFirst < $firstWpDistance) {
                            $firstWpDistance = $distToFirst;
                        }
                    }
                    
                    // Check distance to last waypoint
                    $distToLast = $this->getDistance($lastSavedRoadWp['lat'], $lastSavedRoadWp['lon'], $lat, $lon);
                    if ($distToLast < 50) { // Within 50 meters
                        $lastWpFound = true;
                        if ($lastWpDistance === null || $distToLast < $lastWpDistance) {
                            $lastWpDistance = $distToLast;
                        }
                    }
                }
                
                Log::info('Verified route passes through saved road waypoints', [
                    'first_waypoint_found' => $firstWpFound,
                    'first_waypoint_distance' => $firstWpDistance,
                    'last_waypoint_found' => $lastWpFound,
                    'last_waypoint_distance' => $lastWpDistance,
                    'first_waypoint' => $firstSavedRoadWp,
                    'last_waypoint' => $lastSavedRoadWp
                ]);
                
                // If waypoints not found, the route might have optimized them away
                // This is a warning but we still return the route
                if (!$firstWpFound || !$lastWpFound) {
                    Log::warning('Route may not pass through saved road start/end points', [
                        'first_found' => $firstWpFound,
                        'last_found' => $lastWpFound,
                        'route_coord_count' => count($route['coordinates'])
                    ]);
                }
            }
            
            // Calculate route statistics
            $stats = $this->calculateRouteStats($route['coordinates']);
            
            // Add metadata
            $route['curvature'] = $stats['curvature'] ?? 0;
            $route['corner_count'] = $stats['corner_count'] ?? 0;
            $route['elevation_gain'] = $stats['elevation_gain'] ?? 0;
            $route['elevation_loss'] = $stats['elevation_loss'] ?? 0;
            $route['max_elevation'] = $stats['max_elevation'] ?? 0;
            $route['min_elevation'] = $stats['min_elevation'] ?? 0;
            $route['_timings'] = ['total' => (microtime(true) - $startTime) * 1000];
            $route['_strategy'] = 'graphhopper_waypoint_enforced';
            $route['_curvature_level'] = $curvatureLevel;
            $route['_saved_road_count'] = count($savedRoadsArray);
            $route['_saved_road_waypoints_used'] = count($savedRoadWaypoints);
            
            Log::info('GraphHopper waypoint-enforced route completed', [
                'curvature_level' => $curvatureLevel,
                'saved_road_count' => count($savedRoadsArray),
                'total_distance' => $route['distance'] ?? 0,
                'total_coordinates' => count($route['coordinates']),
                'saved_road_waypoints_used' => count($savedRoadWaypoints)
            ]);
            
            return $route;
            
        } catch (\Exception $e) {
            Log::error('GraphHopper waypoint-enforced route error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->findCurvedRoute($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $additionalWaypoints);
        }
    }
    
    /**
     * Convert coordinate array to waypoint format
     * 
     * @param array $coord Coordinate array [lat, lon] or [lon, lat]
     * @return array|null Waypoint in format ['lat' => x, 'lon' => y] or null if invalid
     */
    protected function convertCoordinateToWaypoint($coord)
    {
        if (!is_array($coord) || count($coord) < 2) {
            return null;
        }
        
        // Try to determine format by checking if first value is in lat range
        $val1 = is_numeric($coord[0]) ? floatval($coord[0]) : null;
        $val2 = is_numeric($coord[1]) ? floatval($coord[1]) : null;
        
        if ($val1 === null || $val2 === null) {
            return null;
        }
        
        // If first value is in lat range (-90 to 90), assume [lat, lon]
        // Otherwise assume [lon, lat]
        if ($val1 >= -90 && $val1 <= 90) {
            $lat = $val1;
            $lon = $val2;
        } else {
            $lat = $val2;
            $lon = $val1;
        }
        
        // Validate ranges
        if ($lat >= -90 && $lat <= 90 && $lon >= -180 && $lon <= 180) {
            return ['lat' => $lat, 'lon' => $lon];
        }
        
        return null;
    }
    
    /**
     * Find curved route with saved roads
     * Routes through saved roads by calculating route segments to ensure the route follows the saved road path
     * Uses segmented routing to force GraphHopper to go through all saved road waypoints
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param array $savedRoads Array of SavedRoad models
     * @param string $curvatureLevel
     * @param array $additionalWaypoints Optional additional waypoints
     * @return array|null
     */
    public function findCurvedRouteWithSavedRoads($startLat, $startLon, $endLat, $endLon, $savedRoads, $curvatureLevel = 'balanced', $additionalWaypoints = [], $alternativeRoutes = false)
    {
        $startTime = microtime(true);
        
        // Convert Collection to array if needed
        $savedRoadsArray = is_array($savedRoads) ? $savedRoads : $savedRoads->all();
        
        Log::info('Finding route with saved roads (MULTI-SEGMENT strategy)', [
            'saved_road_count' => count($savedRoadsArray),
            'saved_road_ids' => array_map(function($road) { 
                return is_object($road) ? ($road->id ?? 'unknown') : ($road['id'] ?? 'unknown'); 
            }, $savedRoadsArray),
            'additional_waypoint_count' => count($additionalWaypoints),
            'curvature_level' => $curvatureLevel,
            'strategy' => 'multi_segment_with_saved_road_injection',
            'start' => [$startLat, $startLon],
            'end' => [$endLat, $endLon]
        ]);
        
        try {
            // SMART ORDERING ALGORITHM:
            // 1. Collect all waypoints and saved road entry points
            // 2. Calculate distance from current position to each
            // 3. Sort by distance (nearest first) - this ensures correct spatial order
            // 4. Route through them in sorted order
            // 5. When encountering a saved road, inject its coordinates directly
            
            $allCoordinates = [];
            $totalDistance = 0;
            $totalDuration = 0;
            
            $currentLat = $startLat;
            $currentLon = $startLon;
            
            // Always add start point first
            $allCoordinates[] = [$startLat, $startLon];
            
            // Build list of all intermediate points (waypoints + saved road entry points)
            $intermediatePoints = [];
            
            // Add waypoints
            foreach ($additionalWaypoints as $wp) {
                $wpLat = is_array($wp) ? ($wp['lat'] ?? $wp[0]) : $wp->lat;
                $wpLon = is_array($wp) ? ($wp['lon'] ?? $wp['lng'] ?? $wp[1]) : ($wp->lon ?? $wp->lng);
                $intermediatePoints[] = [
                    'type' => 'waypoint',
                    'lat' => $wpLat,
                    'lon' => $wpLon,
                    'data' => $wp
                ];
            }
            
            // Prepare saved roads and add their entry points
            $savedRoadsData = [];
            foreach ($savedRoadsArray as $savedRoad) {
                $roadId = is_object($savedRoad) ? ($savedRoad->id ?? 'unknown') : ($savedRoad['id'] ?? 'unknown');
                $roadName = is_object($savedRoad) ? ($savedRoad->road_name ?? $savedRoad->name ?? 'unnamed') : ($savedRoad['road_name'] ?? $savedRoad['name'] ?? 'unnamed');
                $roadCoords = is_object($savedRoad) ? ($savedRoad->road_coordinates ?? null) : ($savedRoad['road_coordinates'] ?? null);
                
                if (empty($roadCoords)) {
                    continue;
                }
                
                $savedRoadCoordinates = json_decode($roadCoords, true);
                if (!is_array($savedRoadCoordinates) || count($savedRoadCoordinates) < 2) {
                    continue;
                }
                
                // Normalize coordinates
                $normalizedRoadCoords = [];
                foreach ($savedRoadCoordinates as $coord) {
                $waypoint = $this->convertCoordinateToWaypoint($coord);
                if ($waypoint) {
                        $normalizedRoadCoords[] = [$waypoint['lat'], $waypoint['lon']];
                    }
                }
                
                if (count($normalizedRoadCoords) < 2) {
                    continue;
                }
                
                $firstCoord = $normalizedRoadCoords[0];
                $lastCoord = end($normalizedRoadCoords);
                
                // Determine entry point (closer to current position)
                $distToFirst = $this->getDistance($currentLat, $currentLon, $firstCoord[0], $firstCoord[1]);
                $distToLast = $this->getDistance($currentLat, $currentLon, $lastCoord[0], $lastCoord[1]);
                
                if ($distToFirst <= $distToLast) {
                    $entryPoint = $firstCoord;
                    $exitPoint = $lastCoord;
                    $roadCoordsOrdered = $normalizedRoadCoords;
            } else {
                    $entryPoint = $lastCoord;
                    $exitPoint = $firstCoord;
                    $roadCoordsOrdered = array_reverse($normalizedRoadCoords);
                }
                
                // Store saved road data
                $savedRoadsData[$roadId] = [
                    'entry' => $entryPoint,
                    'exit' => $exitPoint,
                    'coords' => $roadCoordsOrdered,
                    'name' => $roadName
                ];
                
                // Add entry point to intermediate points list
                $intermediatePoints[] = [
                    'type' => 'saved_road',
                    'lat' => $entryPoint[0],
                    'lon' => $entryPoint[1],
                    'road_id' => $roadId
                ];
            }
            
            // Sort intermediate points by distance from current position (nearest first)
            usort($intermediatePoints, function($a, $b) use ($currentLat, $currentLon) {
                $distA = $this->getDistance($currentLat, $currentLon, $a['lat'], $a['lon']);
                $distB = $this->getDistance($currentLat, $currentLon, $b['lat'], $b['lon']);
                return $distA <=> $distB;
            });
            
            Log::info('Intermediate points ordered by distance', [
                'point_count' => count($intermediatePoints),
                'order' => array_map(function($p) {
                    return ['type' => $p['type'], 'lat' => $p['lat'], 'lon' => $p['lon']];
                }, $intermediatePoints)
            ]);
            
            // Route through intermediate points in sorted order
            foreach ($intermediatePoints as $point) {
                if ($point['type'] === 'waypoint') {
                    // Route to waypoint
                    $segmentToWp = $this->findCurvedRoute($currentLat, $currentLon, $point['lat'], $point['lon'], $curvatureLevel, []);
                    
                    if ($segmentToWp && !empty($segmentToWp['coordinates'])) {
                        $segmentCoords = $segmentToWp['coordinates'];
                        // Remove last coord if too close to waypoint (avoid duplication)
                    if (count($segmentCoords) > 1) {
                            $lastCoordDist = $this->getDistance(
                                end($segmentCoords)[0], end($segmentCoords)[1],
                                $point['lat'], $point['lon']
                            );
                            if ($lastCoordDist < 50) {
                                array_pop($segmentCoords);
                            }
                        }
                        $allCoordinates = array_merge($allCoordinates, $segmentCoords);
                        $totalDistance += $segmentToWp['distance_km'] ?? 0;
                        $totalDuration += $segmentToWp['duration_minutes'] ?? 0;
                        
                        // Add waypoint itself
                        $allCoordinates[] = [$point['lat'], $point['lon']];
                        
                        // Update current position
                        $currentLat = $point['lat'];
                        $currentLon = $point['lon'];
                        
                        Log::info('Waypoint segment added', [
                            'waypoint' => [$point['lat'], $point['lon']],
                            'coord_count' => count($segmentCoords)
                    ]);
                } else {
                        // Fallback: direct route
                        $segmentToWp = $this->calculateBasicRoute($currentLat, $currentLon, $point['lat'], $point['lon']);
                        if ($segmentToWp && !empty($segmentToWp['coordinates'])) {
                            $allCoordinates = array_merge($allCoordinates, $segmentToWp['coordinates']);
                            $totalDistance += $segmentToWp['distance_km'] ?? 0;
                            $currentLat = $point['lat'];
                            $currentLon = $point['lon'];
                        }
                    }
                } elseif ($point['type'] === 'saved_road') {
                    // Route to saved road entry point, then inject saved road coordinates
                    $roadData = $savedRoadsData[$point['road_id']];
                    $entryPoint = $roadData['entry'];
                    $exitPoint = $roadData['exit'];
                    $roadCoordsOrdered = $roadData['coords'];
                    
                    // Route to entry point
                    $segmentToEntry = $this->findCurvedRoute($currentLat, $currentLon, $entryPoint[0], $entryPoint[1], $curvatureLevel, []);
                    
                    if ($segmentToEntry && !empty($segmentToEntry['coordinates'])) {
                        $lastSegmentCoord = end($segmentToEntry['coordinates']);
                        $distToEntry = $this->getDistance($lastSegmentCoord[0], $lastSegmentCoord[1], $entryPoint[0], $entryPoint[1]);
                        
                        if ($distToEntry > 500) {
                            Log::warning('Segment to saved road entry has dead end, retrying with basic route');
                            $segmentToEntry = $this->calculateBasicRoute($currentLat, $currentLon, $entryPoint[0], $entryPoint[1]);
                        }
                    }
                    
                    if ($segmentToEntry && !empty($segmentToEntry['coordinates'])) {
                        $segmentCoords = $segmentToEntry['coordinates'];
                        if (count($segmentCoords) > 1) {
                            $lastCoordDist = $this->getDistance(
                                end($segmentCoords)[0], end($segmentCoords)[1],
                                $entryPoint[0], $entryPoint[1]
                            );
                            if ($lastCoordDist < 50) {
                                array_pop($segmentCoords);
                            }
                        }
                        $allCoordinates = array_merge($allCoordinates, $segmentCoords);
                        $totalDistance += $segmentToEntry['distance_km'] ?? 0;
                        $totalDuration += $segmentToEntry['duration_minutes'] ?? 0;
                    } else {
                        // Fallback: direct API call
                        try {
                            $directResponse = Http::timeout(15)
                                ->withHeaders(['Content-Type' => 'application/json'])
                                ->post($this->buildUrl('/route'), [
                                    'points' => [[$currentLon, $currentLat], [$entryPoint[1], $entryPoint[0]]],
                                    'profile' => $this->profile,
                                    'points_encoded' => false,
                                    'calc_points' => true
                                ]);
                            
                            if ($directResponse->successful()) {
                                $data = $directResponse->json();
                                if (isset($data['paths'][0]['points']['coordinates'])) {
                                    $coords = array_map(fn($c) => [$c[1], $c[0]], $data['paths'][0]['points']['coordinates']);
                                    $allCoordinates = array_merge($allCoordinates, $coords);
                                    $totalDistance += ($data['paths'][0]['distance'] ?? 0) / 1000;
                                }
                            }
                        } catch (\Exception $e) {
                            Log::warning('Direct API to entry failed', ['error' => $e->getMessage()]);
                        }
                    }
                    
                    // Inject saved road coordinates directly
                    Log::info('Adding saved road coordinates directly', [
                        'road_id' => $point['road_id'],
                        'coord_count' => count($roadCoordsOrdered)
                    ]);
                    $allCoordinates = array_merge($allCoordinates, $roadCoordsOrdered);
                    
                    // Calculate saved road distance
            $savedRoadDistance = 0;
                    for ($i = 0; $i < count($roadCoordsOrdered) - 1; $i++) {
                $savedRoadDistance += $this->getDistance(
                            $roadCoordsOrdered[$i][0], $roadCoordsOrdered[$i][1],
                            $roadCoordsOrdered[$i + 1][0], $roadCoordsOrdered[$i + 1][1]
                        );
                    }
                    $totalDistance += $savedRoadDistance / 1000;
                    
                    // Update current position to exit point
                    $currentLat = $exitPoint[0];
                    $currentLon = $exitPoint[1];
                }
            }
            
            // FINAL SEGMENT: Route from last intermediate point to final destination WITH CURVATURE
            if (abs($currentLat - $endLat) > 0.0001 || abs($currentLon - $endLon) > 0.0001) {
                // Use findCurvedRoute which has proper fallbacks for free tier
                $segmentToEnd = $this->findCurvedRoute($currentLat, $currentLon, $endLat, $endLon, $curvatureLevel, []);
                
                if ($segmentToEnd && !empty($segmentToEnd['coordinates'])) {
                    // Validate segment reaches destination
                    $lastSegmentCoord = end($segmentToEnd['coordinates']);
                    $distToEnd = $this->getDistance($lastSegmentCoord[0], $lastSegmentCoord[1], $endLat, $endLon);
                    
                    if ($distToEnd > 500) {
                        Log::warning('Segment to destination has dead end, retrying with basic route', [
                            'distance_to_end_m' => round($distToEnd)
                        ]);
                        $segmentToEnd = $this->calculateBasicRoute($currentLat, $currentLon, $endLat, $endLon);
                    }
                }
                
                if ($segmentToEnd && !empty($segmentToEnd['coordinates'])) {
                    // Remove first coord if too close to current position (avoid duplication)
                    $segmentCoords = $segmentToEnd['coordinates'];
                    if (count($segmentCoords) > 1) {
                        $firstCoordDist = $this->getDistance(
                            $segmentCoords[0][0], $segmentCoords[0][1],
                            $currentLat, $currentLon
                        );
                        if ($firstCoordDist < 50) {
                            array_shift($segmentCoords);
                        }
                    }
                    $allCoordinates = array_merge($allCoordinates, $segmentCoords);
                    $totalDistance += $segmentToEnd['distance_km'] ?? 0;
                    $totalDuration += $segmentToEnd['duration_minutes'] ?? 0;
                    
                    Log::info('Segment to destination added with curvature', [
                    'curvature_level' => $curvatureLevel,
                        'coord_count' => count($segmentCoords),
                        'distance_km' => $segmentToEnd['distance_km'] ?? 0
                    ]);
                } else {
                    Log::warning('findCurvedRoute failed, trying direct API call', [
                        'from' => [$currentLat, $currentLon],
                        'to' => [$endLat, $endLon]
                    ]);
                    
                    // Last resort: direct GraphHopper API call without custom model
                    try {
                        $response = Http::timeout(15)
                            ->withHeaders(['Content-Type' => 'application/json'])
                            ->post($this->buildUrl('/route'), [
                                'points' => [[$currentLon, $currentLat], [$endLon, $endLat]],
                                'profile' => $this->profile,
                                'points_encoded' => false,
                                'calc_points' => true
                            ]);
                        
                        if ($response->successful()) {
                            $data = $response->json();
                            if (isset($data['paths'][0]['points']['coordinates'])) {
                                $coords = array_map(fn($c) => [$c[1], $c[0]], $data['paths'][0]['points']['coordinates']);
                                $allCoordinates = array_merge($allCoordinates, $coords);
                                $totalDistance += ($data['paths'][0]['distance'] ?? 0) / 1000;
                                Log::info('Direct API route succeeded for final segment', [
                                    'coord_count' => count($coords)
                                ]);
                            } else {
                                $allCoordinates[] = [$endLat, $endLon];
                                Log::warning('Direct API returned no coordinates, adding end point');
                            }
                        } else {
                            $allCoordinates[] = [$endLat, $endLon];
                            Log::warning('Direct API failed, adding end point', ['status' => $response->status()]);
                        }
                    } catch (\Exception $e) {
                        $allCoordinates[] = [$endLat, $endLon];
                        Log::warning('Direct API exception, adding end point', ['error' => $e->getMessage()]);
                    }
                }
            }
            
            if (empty($allCoordinates)) {
                Log::error('No coordinates generated for saved road route');
                // Fallback to regular route
                return $this->findCurvedRoute($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $additionalWaypoints, [], $alternativeRoutes);
            }
            
            // Calculate route stats
            $stats = $this->calculateRouteStats($allCoordinates);
            
            $route = [
                'coordinates' => $allCoordinates,
                'distance_km' => round($totalDistance, 2),
                'duration_minutes' => round($totalDuration, 1),
                'curvature' => $stats['curvature'] ?? 0,
                'corner_count' => $stats['corner_count'] ?? 0,
                'elevation_gain' => $stats['elevation_gain'] ?? 0,
                'elevation_loss' => $stats['elevation_loss'] ?? 0,
                '_strategy' => 'multi_segment_saved_road',
                '_saved_road_count' => count($savedRoadsArray)
            ];
            
            Log::info('Route with saved roads calculated - SUCCESS', [
                'coordinate_count' => count($allCoordinates),
                'distance_km' => $route['distance_km'],
                'saved_roads_used' => count($savedRoadsArray)
            ]);
            
            return $route;
            
        } catch (\Exception $e) {
            Log::error('GraphHopper saved road route error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'curvature_level' => $curvatureLevel,
                'saved_road_count' => is_array($savedRoads) ? count($savedRoads) : (is_object($savedRoads) ? count($savedRoads) : 0)
            ]);
            // Fall back to regular route
            return $this->findCurvedRoute($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $additionalWaypoints, [], $alternativeRoutes);
        }
    }
    
    /**
     * Calculate a simple route between two points (basic routing, no custom model)
     * This is compatible with GraphHopper free tier
     */
    protected function calculateSimpleRoute($startLat, $startLon, $endLat, $endLon, $curvatureLevel)
    {
        // For free tier compatibility, use basic routing without custom model
        // Custom models require paid plan (ch.disable + custom_model)
        return $this->calculateBasicRoute($startLat, $startLon, $endLat, $endLon);
    }
    
    /**
     * Calculate a basic route without custom model (most reliable)
     */
    protected function calculateBasicRoute($startLat, $startLon, $endLat, $endLon)
    {
        try {
            $payload = [
                'points' => [
                    [$startLon, $startLat],
                    [$endLon, $endLat]
                ],
                'profile' => $this->profile,
                'points_encoded' => false,
                'instructions' => false,
                'calc_points' => true
            ];
            
            $response = Http::timeout(15)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->buildUrl('/route'), $payload);
            
            if (!$response->successful()) {
                Log::warning('Basic route API failed', [
                    'status' => $response->status()
                ]);
                return null;
            }
            
            $data = $response->json();
            if (!isset($data['paths']) || empty($data['paths'])) {
                return null;
            }
            
            $path = $data['paths'][0];
            return $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, 'balanced');
            
        } catch (\Exception $e) {
            Log::warning('Basic route exception', ['error' => $e->getMessage()]);
            return null;
        }
    }
    
    /**
     * Calculate a route segment between two points
     */
    protected function calculateRouteSegment($startLat, $startLon, $endLat, $endLon, $customModel)
    {
        $payload = [
            'points' => [
                [$startLon, $startLat],
                [$endLon, $endLat]
            ],
            'profile' => $this->profile,
            'points_encoded' => false,
            'instructions' => false,
            'calc_points' => true,
            'ch.disable' => true, // Required for custom_model
            'custom_model' => $customModel
        ];
        
        $response = Http::timeout(30)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post($this->buildUrl('/route'), $payload);
        
        if (!$response->successful()) {
            return null;
        }
        
        $data = $response->json();
        if (!isset($data['paths']) || empty($data['paths'])) {
            return null;
        }
        
        $path = $data['paths'][0];
        return $this->formatRouteResponse($path, $startLat, $startLon, $endLat, $endLon, 'balanced');
    }
    
    /**
     * Calculate route through multiple points
     */
    protected function calculateRouteThroughPoints($points, $customModel)
    {
        if (count($points) < 2) {
            return null;
        }
        
        $payload = [
            'points' => $points,
            'profile' => $this->profile,
            'points_encoded' => false,
            'instructions' => false,
            'calc_points' => true,
            'ch.disable' => true, // Required for custom_model
            'custom_model' => $customModel
        ];
        
        $response = Http::timeout(60)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post($this->buildUrl('/route'), $payload);
        
        if (!$response->successful()) {
            return null;
        }
        
        $data = $response->json();
        if (!isset($data['paths']) || empty($data['paths'])) {
            return null;
        }
        
        $path = $data['paths'][0];
        $startPoint = $points[0];
        $endPoint = $points[count($points) - 1];
        return $this->formatRouteResponse($path, $startPoint[1], $startPoint[0], $endPoint[1], $endPoint[0], 'balanced');
    }
    
    /**
     * Find round trip route that returns to starting point
     * Uses radius-based approach: generates waypoints in a circle and selects best route
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $distanceKm Target distance for the round trip
     * @param string $curvatureLevel
     * @param array $savedRoads Array of SavedRoad models
     * @param array $additionalWaypoints Optional additional waypoints
     * @return array|null
     */
    public function findRoundTripRoute($startLat, $startLon, $distanceKm, $curvatureLevel = 'balanced', $savedRoads = [], $additionalWaypoints = [])
    {
        $startTime = microtime(true);
        
        Log::info('Finding round trip route', [
            'start' => [$startLat, $startLon],
            'target_distance_km' => $distanceKm,
            'curvature_level' => $curvatureLevel,
            'saved_road_count' => count($savedRoads),
            'additional_waypoint_count' => count($additionalWaypoints),
            'strategy' => 'simplified_chained_api_calls_with_saved_roads'
        ]);
        
        // SIMPLIFIED APPROACH: Chain multiple API calls in a loop pattern
        // This is more reliable than complex waypoint generation
        try {
            // Process saved roads - we'll inject their coordinates directly
            $savedRoadsArray = is_array($savedRoads) ? $savedRoads : (is_object($savedRoads) && method_exists($savedRoads, 'all') ? $savedRoads->all() : (array)$savedRoads);
            $savedRoadData = []; // Store processed saved road data for injection
            
            if (!empty($savedRoadsArray)) {
                Log::info('Processing saved roads for round trip (MULTI-SEGMENT)', [
                    'saved_road_count' => count($savedRoadsArray)
                ]);
                
                foreach ($savedRoadsArray as $savedRoad) {
                    $roadId = is_object($savedRoad) ? ($savedRoad->id ?? 'unknown') : ($savedRoad['id'] ?? 'unknown');
                    $roadName = is_object($savedRoad) ? ($savedRoad->road_name ?? $savedRoad->name ?? 'unnamed') : ($savedRoad['road_name'] ?? $savedRoad['name'] ?? 'unnamed');
                    $roadCoords = is_object($savedRoad) ? ($savedRoad->road_coordinates ?? null) : ($savedRoad['road_coordinates'] ?? null);
                    
                    if (empty($roadCoords)) {
                        continue;
                    }
                    
                    $coordinates = json_decode($roadCoords, true);
                    if (!is_array($coordinates) || count($coordinates) < 2) {
                        continue;
                    }
                    
                    // Normalize coordinates to [lat, lon] format
                    $normalizedCoords = [];
                    foreach ($coordinates as $coord) {
                        $waypoint = $this->convertCoordinateToWaypoint($coord);
                        if ($waypoint) {
                            $normalizedCoords[] = [$waypoint['lat'], $waypoint['lon']];
                        }
                    }
                    
                    if (count($normalizedCoords) >= 2) {
                        $savedRoadData[] = [
                            'id' => $roadId,
                            'name' => $roadName,
                            'coordinates' => $normalizedCoords,
                            'entry' => $normalizedCoords[0],
                            'exit' => end($normalizedCoords)
                        ];
                        Log::info('Prepared saved road for round trip injection', [
                            'road_id' => $roadId,
                            'coord_count' => count($normalizedCoords)
                        ]);
                    }
                }
            }
            
            // If we have saved roads, use multi-segment approach with direct injection
            if (!empty($savedRoadData)) {
                return $this->buildRoundTripWithSavedRoads($startLat, $startLon, $distanceKm, $curvatureLevel, $savedRoadData);
            }
            
            // SIMPLIFIED ROUND TRIP APPROACH (no saved roads):
            // Create a WIDE loop by placing waypoints at significant distance from start
            // Formula: each segment ≈ distance/3 to create a proper triangle loop
            
            $segmentDistance = $distanceKm / 3; // Each segment ~1/3 of total distance
            
            // Generate 2 waypoints to create a triangle:
            // Start -> WP1 (outbound) -> WP2 (far point) -> Start (return)
            // Using bearings 60° and 120° to create a WIDE loop that doesn't backtrack
            $waypoints = [];
            
            // Pick a random base bearing for variety
            $baseBearing = rand(0, 360);
            
            // First waypoint: distance away at base bearing
            $wp1 = $this->calculatePointAtBearing($startLat, $startLon, $segmentDistance * 0.6, $baseBearing);
            $waypoints[] = ['lat' => $wp1['lat'], 'lon' => $wp1['lon']];
            
            // Second waypoint: further out at 60-90 degrees offset (creates wide triangle)
            $wp2Bearing = ($baseBearing + 70) % 360;
            $wp2 = $this->calculatePointAtBearing($startLat, $startLon, $segmentDistance * 0.8, $wp2Bearing);
            $waypoints[] = ['lat' => $wp2['lat'], 'lon' => $wp2['lon']];
            
            Log::info('Round trip waypoints generated (WIDE TRIANGLE)', [
                'target_distance_km' => $distanceKm,
                'segment_distance_km' => $segmentDistance,
                'base_bearing' => $baseBearing,
                'waypoint_1' => $waypoints[0],
                'waypoint_2' => $waypoints[1]
            ]);
            
            // Merge with additional waypoints
            if (!empty($additionalWaypoints)) {
                foreach ($additionalWaypoints as $wp) {
                    $wpLat = isset($wp['lat']) ? $wp['lat'] : (is_array($wp) ? $wp[0] : null);
                    $wpLon = isset($wp['lon']) ? $wp['lon'] : (is_array($wp) ? $wp[1] : null);
                    if ($wpLat !== null && $wpLon !== null) {
                        $waypoints[] = ['lat' => $wpLat, 'lon' => $wpLon];
                    }
                }
            }
            
            Log::info('Round trip waypoints ready', [
                'waypoint_count' => count($waypoints),
                'waypoints' => $waypoints
            ]);
            
            if (count($waypoints) < 1) {
                Log::error('Failed to generate any waypoints for round trip');
                return null;
            }
            
            // Build route: start -> wp1 -> wp2 -> ... -> start
            $allSegments = [];
            $allCoordinates = [];
            $totalDistance = 0;
            $totalDuration = 0;
            $successfulSegments = 0;
            
            // Add start point
            $currentLat = $startLat;
            $currentLon = $startLon;
            $allCoordinates[] = [$startLat, $startLon];
            
            // Route through each waypoint
            foreach ($waypoints as $index => $wp) {
                // Handle waypoint format - could be ['lat' => x, 'lon' => y] or [x, y] array
                $wpLat = isset($wp['lat']) ? $wp['lat'] : null;
                $wpLon = isset($wp['lon']) ? $wp['lon'] : null;
                
                // If not in ['lat', 'lon'] format, try array format
                if ($wpLat === null && is_array($wp) && count($wp) >= 2) {
                    // Check if first value is in lat range (-90 to 90)
                    if ($wp[0] >= -90 && $wp[0] <= 90) {
                        $wpLat = $wp[0];
                        $wpLon = $wp[1];
                } else {
                        // Assume [lon, lat] format
                        $wpLon = $wp[0];
                        $wpLat = $wp[1];
                    }
                }
                
                if ($wpLat === null || $wpLon === null) {
                    Log::warning('Round trip waypoint has invalid format, skipping', [
                        'segment_index' => $index,
                        'waypoint' => $wp,
                        'waypoint_type' => gettype($wp)
                    ]);
                    continue;
                }
                
                // Use basic route for round trip segments to avoid rate limits
                // findCurvedRoute makes multiple API calls which hits rate limits
                $segment = $this->calculateBasicRoute($currentLat, $currentLon, $wpLat, $wpLon);
                
                if (!$segment || empty($segment['coordinates'])) {
                    Log::warning('Round trip segment failed, trying direct API', [
                        'segment_index' => $index,
                        'from' => [$currentLat, $currentLon],
                        'to' => [$wpLat, $wpLon]
                    ]);
                    
                    // Try direct API call
                    try {
                        $directResp = Http::timeout(15)
                            ->withHeaders(['Content-Type' => 'application/json'])
                            ->post($this->buildUrl('/route'), [
                                'points' => [[$currentLon, $currentLat], [$wpLon, $wpLat]],
                                'profile' => $this->profile,
                                'points_encoded' => false,
                                'calc_points' => true
                            ]);
                        
                        if ($directResp->successful()) {
                            $data = $directResp->json();
                            if (isset($data['paths'][0]['points']['coordinates'])) {
                                $coords = array_map(fn($c) => [$c[1], $c[0]], $data['paths'][0]['points']['coordinates']);
                                $segment = [
                                    'coordinates' => $coords,
                                    'distance' => $data['paths'][0]['distance'] ?? 0,
                                    'duration' => $data['paths'][0]['time'] ?? 0
                                ];
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('Direct API for round trip segment failed', ['error' => $e->getMessage()]);
                    }
                    
                    if (!$segment || empty($segment['coordinates'])) {
                        // Skip this waypoint but continue
                        continue;
                    }
                }
                
                $successfulSegments++;
                $allSegments[] = $segment;
                $coords = $segment['coordinates'];
                // Add all except first to avoid duplicates (first point is current position)
                if (count($coords) > 1) {
                    $allCoordinates = array_merge($allCoordinates, array_slice($coords, 1));
            } else {
                    $allCoordinates = array_merge($allCoordinates, $coords);
                }
                $totalDistance += $segment['distance'] ?? 0;
                $totalDuration += $segment['duration'] ?? 0;
                
                // Update current position to end of this segment
                $lastCoord = end($coords);
                $currentLat = $lastCoord[0];
                $currentLon = $lastCoord[1];
            }
            
            // Final segment: current position back to start
            // CRITICAL: This must succeed to close the loop properly
            Log::info('Calculating final segment back to start', [
                'from' => [$currentLat, $currentLon],
                'to' => [$startLat, $startLon],
                'distance_km' => round($this->getDistance($currentLat, $currentLon, $startLat, $startLon) / 1000, 2)
            ]);
            
            $finalSegmentSuccess = false;
            
            // Try 1: Use basic route (most reliable, avoids rate limits)
            $finalSegment = $this->calculateBasicRoute($currentLat, $currentLon, $startLat, $startLon);
            
            if ($finalSegment && !empty($finalSegment['coordinates']) && count($finalSegment['coordinates']) > 1) {
                $finalSegmentSuccess = true;
                Log::info('Final segment succeeded with basic route', [
                    'coordinates_count' => count($finalSegment['coordinates']),
                    'distance' => $finalSegment['distance'] ?? 0
                ]);
            }
            
            // Try 2: Use basic route without custom model (most reliable)
            if (!$finalSegmentSuccess) {
                Log::warning('Curved route failed for final segment, trying basic route');
                $finalSegment = $this->callBasicRouteWithoutCustomModel(
                    $currentLat,
                    $currentLon,
                    $startLat,
                    $startLon,
                    [[$currentLon, $currentLat], [$startLon, $startLat]],
                    'balanced'
                );
                
                if ($finalSegment && !empty($finalSegment['coordinates']) && count($finalSegment['coordinates']) > 1) {
                    $finalSegmentSuccess = true;
                    Log::info('Final segment succeeded with basic route', [
                        'coordinates_count' => count($finalSegment['coordinates'])
                    ]);
                }
            }
            
            // Try 3: Direct GraphHopper API call with minimal parameters (with rate limit retry)
            if (!$finalSegmentSuccess) {
                Log::warning('Basic route failed, trying direct API call with retry');
                
                // Wait a moment to avoid rate limits
                usleep(500000); // 0.5 second delay
                
                for ($retryAttempt = 0; $retryAttempt < 3 && !$finalSegmentSuccess; $retryAttempt++) {
                    try {
                        $response = Http::timeout(30)
                            ->withHeaders(['Content-Type' => 'application/json'])
                            ->post($this->buildUrl('/route'), [
                                'points' => [[$currentLon, $currentLat], [$startLon, $startLat]],
                                'profile' => $this->profile,
                                'points_encoded' => false,
                                'calc_points' => true
                            ]);
                        
                        if ($response->successful()) {
                            $data = $response->json();
                            if (isset($data['paths'][0]['points']['coordinates'])) {
                                $coords = $data['paths'][0]['points']['coordinates'];
                                // Convert from [lon, lat] to [lat, lon]
                                $convertedCoords = array_map(function($c) {
                                    return [$c[1], $c[0]];
                                }, $coords);
                                
                                $finalSegment = [
                                    'coordinates' => $convertedCoords,
                                    'distance' => $data['paths'][0]['distance'] ?? 0,
                                    'duration' => $data['paths'][0]['time'] ?? 0
                                ];
                                $finalSegmentSuccess = true;
                                Log::info('Final segment succeeded with direct API', [
                                    'coordinates_count' => count($convertedCoords),
                                    'retry_attempt' => $retryAttempt
                                ]);
                            }
                        } elseif ($response->status() === 429) {
                            // Rate limited - wait and retry
                            Log::warning('Rate limited on direct API, waiting before retry', ['attempt' => $retryAttempt]);
                            sleep(2); // Wait 2 seconds before retry
                        }
                    } catch (\Exception $e) {
                        Log::error('Direct API call failed for final segment', ['error' => $e->getMessage(), 'attempt' => $retryAttempt]);
                        sleep(1);
                    }
                }
            }
            
            // Add the final segment coordinates
            if ($finalSegmentSuccess && $finalSegment && !empty($finalSegment['coordinates'])) {
                $successfulSegments++;
                $coords = $finalSegment['coordinates'];
                // Add all except first to avoid duplicates
                if (count($coords) > 1) {
                    $allCoordinates = array_merge($allCoordinates, array_slice($coords, 1));
                } else {
                    $allCoordinates = array_merge($allCoordinates, $coords);
                }
                $totalDistance += $finalSegment['distance'] ?? 0;
                $totalDuration += $finalSegment['duration'] ?? 0;
            } else {
                // Last resort: at least ensure the route ends at start point
                Log::error('All final segment attempts failed - adding start point to close loop');
                $allCoordinates[] = [$startLat, $startLon];
            }
            
            // Validate we have enough segments and coordinates
            // Allow round trip with just 1 segment if it's a valid loop (start -> waypoint -> start)
            // If no segments succeeded, try a simple fallback: create a small loop from start point
            if ($successfulSegments < 1) {
                Log::warning('Round trip failed: no successful segments, trying fallback simple loop', [
                    'successful_segments' => $successfulSegments,
                    'total_waypoints' => count($waypoints),
                    'waypoint_sample' => array_slice($waypoints, 0, 2)
                ]);
                
                // Fallback: Create a simple square loop around start point
                $offsetKm = $distanceKm / 8; // Quarter of radius for a square
                $fallbackWaypoints = [];
                foreach ([0, 90, 180, 270] as $bearing) {
                    $point = $this->calculatePointAtBearing($startLat, $startLon, $offsetKm, $bearing);
                    $snapped = $this->snapPointToRoad($point['lat'], $point['lon'], 5000);
                    if ($snapped) {
                        $fallbackWaypoints[] = $snapped;
                    }
                }
                
                if (count($fallbackWaypoints) >= 2) {
                    Log::info('Using fallback waypoints for round trip', [
                        'fallback_waypoint_count' => count($fallbackWaypoints)
                    ]);
                    // Retry with fallback waypoints
                    $waypoints = $fallbackWaypoints;
                    $allCoordinates = [[$startLat, $startLon]];
                $totalDistance = 0;
                $totalDuration = 0;
                    $successfulSegments = 0;
                    $currentLat = $startLat;
                    $currentLon = $startLon;
                    
                    // Try again with fallback waypoints
                    foreach ($waypoints as $index => $wp) {
                        $wpLat = isset($wp['lat']) ? $wp['lat'] : $wp[0];
                        $wpLon = isset($wp['lon']) ? $wp['lon'] : $wp[1];
                        
                        $segment = $this->findCurvedRoute($currentLat, $currentLon, $wpLat, $wpLon, $curvatureLevel, []);
                        if ($segment && !empty($segment['coordinates'])) {
                            $successfulSegments++;
                            $coords = $segment['coordinates'];
                            if (count($coords) > 1) {
                                $allCoordinates = array_merge($allCoordinates, array_slice($coords, 1));
                            }
                            $totalDistance += $segment['distance'] ?? 0;
                            $totalDuration += $segment['duration'] ?? 0;
                            $lastCoord = end($coords);
                            $currentLat = $lastCoord[0];
                            $currentLon = $lastCoord[1];
                        }
                    }
                    
                    // Final segment back to start
                    $finalSegment = $this->findCurvedRoute($currentLat, $currentLon, $startLat, $startLon, $curvatureLevel, []);
                    if ($finalSegment && !empty($finalSegment['coordinates'])) {
                        $successfulSegments++;
                        $coords = $finalSegment['coordinates'];
                        if (count($coords) > 1) {
                            $allCoordinates = array_merge($allCoordinates, array_slice($coords, 1));
                        }
                        $totalDistance += $finalSegment['distance'] ?? 0;
                        $totalDuration += $finalSegment['duration'] ?? 0;
                    }
                }
                
                if ($successfulSegments < 1) {
                    Log::error('Round trip failed: no successful segments even with fallback', [
                        'successful_segments' => $successfulSegments,
                        'total_waypoints' => count($waypoints)
                    ]);
                    return null;
                }
            }
            
            // More lenient validation - allow round trips with at least 2 coordinates (start and one waypoint)
            if (empty($allCoordinates) || count($allCoordinates) < 2) {
                Log::error('Round trip has insufficient coordinates', [
                    'coordinate_count' => count($allCoordinates),
                    'successful_segments' => $successfulSegments,
                    'waypoint_count' => count($waypoints)
                ]);
                return null;
            }
            
            // If we only have 2 coordinates, try to create a simple loop
            if (count($allCoordinates) === 2) {
                // Create a small detour to make it a valid round trip
                $start = $allCoordinates[0];
                $end = $allCoordinates[1];
                $midLat = ($start[0] + $end[0]) / 2;
                $midLon = ($start[1] + $end[1]) / 2;
                
                // Add a small offset perpendicular to the line to create a loop
                $bearing = $this->calculateBearing($start[0], $start[1], $end[0], $end[1]);
                $perpendicularBearing = ($bearing + 90) % 360;
                $offsetPoint = $this->calculatePointAtBearing($midLat, $midLon, 0.5, $perpendicularBearing); // 500m offset
                
                // Try to snap to road
                $snapped = $this->snapPointToRoad($offsetPoint['lat'], $offsetPoint['lon'], 2000);
                if ($snapped) {
                    array_splice($allCoordinates, 1, 0, [[$snapped['lat'], $snapped['lon']]]);
                    Log::info('Added snapped midpoint to round trip with only 2 coordinates');
                } else {
                    array_splice($allCoordinates, 1, 0, [[$offsetPoint['lat'], $offsetPoint['lon']]]);
                    Log::info('Added calculated midpoint to round trip with only 2 coordinates');
                }
            }
            
            // Ensure route closes the loop - add start point at the end if not already there
            $lastCoord = end($allCoordinates);
            $distanceToStart = $this->getDistance($lastCoord[0], $lastCoord[1], $startLat, $startLon);
            if ($distanceToStart > 100) { // More than 100m away from start
                $allCoordinates[] = [$startLat, $startLon];
                Log::info('Added start point to close round trip loop', [
                    'distance_to_start_m' => round($distanceToStart)
                ]);
            }
            
            // Calculate stats
            $stats = $this->calculateRouteStats($allCoordinates);
            
            $route = [
                'coordinates' => $allCoordinates,
                'distance' => $totalDistance,
                'duration' => $totalDuration,
                'distance_km' => round($totalDistance / 1000, 2),
                'duration_min' => round($totalDuration / 60, 2),
                'curvature' => $stats['curvature'] ?? 0,
                'corner_count' => $stats['corner_count'] ?? 0,
                'elevation_gain' => $stats['elevation_gain'] ?? 0,
                'elevation_loss' => $stats['elevation_loss'] ?? 0,
                'max_elevation' => $stats['max_elevation'] ?? 0,
                'min_elevation' => $stats['min_elevation'] ?? 0,
                'is_round_trip' => true,
                'target_distance_km' => $distanceKm,
                'actual_distance_km' => round($totalDistance / 1000, 2)
            ];
            
            Log::info('Round trip route calculated successfully', [
                'target_distance_km' => $distanceKm,
                'actual_distance_km' => $route['actual_distance_km'],
                'waypoint_count' => count($waypoints),
                'coordinate_count' => count($allCoordinates)
            ]);
            
            return $route;
                } catch (\Exception $e) {
            Log::error('Error in simplified round trip', [
                        'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }
    
    /**
     * Build a round trip route with saved roads injected directly
     * Uses multi-segment approach: Start -> SavedRoad Entry -> SavedRoad (direct) -> SavedRoad Exit -> Additional Waypoints -> Start
     * Extends route to meet target distance by adding waypoints after saved road
     */
    protected function buildRoundTripWithSavedRoads($startLat, $startLon, $distanceKm, $curvatureLevel, $savedRoadData)
    {
        Log::info('Building round trip with saved roads (MULTI-SEGMENT + EXTENSION)', [
            'start' => [$startLat, $startLon],
            'target_distance_km' => $distanceKm,
            'saved_road_count' => count($savedRoadData),
            'curvature_level' => $curvatureLevel
        ]);
        
        $allCoordinates = [];
        $totalDistance = 0;
        $totalDuration = 0;
        
        $currentLat = $startLat;
        $currentLon = $startLon;
        $allCoordinates[] = [$startLat, $startLon];
        
        // Calculate total saved road distance first
        $savedRoadTotalDistance = 0;
        foreach ($savedRoadData as $road) {
            for ($i = 0; $i < count($road['coordinates']) - 1; $i++) {
                $savedRoadTotalDistance += $this->getDistance(
                    $road['coordinates'][$i][0], $road['coordinates'][$i][1],
                    $road['coordinates'][$i + 1][0], $road['coordinates'][$i + 1][1]
                );
            }
        }
        $savedRoadTotalDistanceKm = $savedRoadTotalDistance / 1000;
        
        // Calculate remaining distance needed after saved roads
        $remainingDistanceKm = max(0, $distanceKm - ($savedRoadTotalDistanceKm * 2)); // *2 for return journey estimate
        
        Log::info('Round trip distance calculation', [
            'target_km' => $distanceKm,
            'saved_road_km' => round($savedRoadTotalDistanceKm, 2),
            'remaining_to_extend_km' => round($remainingDistanceKm, 2)
        ]);
        
        foreach ($savedRoadData as $roadIndex => $road) {
            // Determine which end is closer to current position
            $distToEntry = $this->getDistance($currentLat, $currentLon, $road['entry'][0], $road['entry'][1]);
            $distToExit = $this->getDistance($currentLat, $currentLon, $road['exit'][0], $road['exit'][1]);
            
            if ($distToEntry <= $distToExit) {
                $entryPoint = $road['entry'];
                $exitPoint = $road['exit'];
                $roadCoords = $road['coordinates'];
                    } else {
                $entryPoint = $road['exit'];
                $exitPoint = $road['entry'];
                $roadCoords = array_reverse($road['coordinates']);
            }
            
            // SEGMENT A: Route from current position to saved road entry
            $segmentToEntry = $this->calculateSimpleRoute($currentLat, $currentLon, $entryPoint[0], $entryPoint[1], $curvatureLevel);
            
            if ($segmentToEntry && !empty($segmentToEntry['coordinates'])) {
                // Validate no dead end
                $lastCoord = end($segmentToEntry['coordinates']);
                $distToEntryActual = $this->getDistance($lastCoord[0], $lastCoord[1], $entryPoint[0], $entryPoint[1]);
                
                if ($distToEntryActual > 500) {
                    // Try basic route
                    $segmentToEntry = $this->calculateBasicRoute($currentLat, $currentLon, $entryPoint[0], $entryPoint[1]);
                }
                
                if ($segmentToEntry && !empty($segmentToEntry['coordinates'])) {
                    $coords = $segmentToEntry['coordinates'];
                    // Skip last coord if close to entry (avoid duplication)
                    if (count($coords) > 1) {
                        $lastDist = $this->getDistance(end($coords)[0], end($coords)[1], $entryPoint[0], $entryPoint[1]);
                        if ($lastDist < 100) array_pop($coords);
                    }
                    $allCoordinates = array_merge($allCoordinates, $coords);
                    $totalDistance += $segmentToEntry['distance_km'] ?? 0;
                    $totalDuration += $segmentToEntry['duration_minutes'] ?? 0;
                }
            }
            
            // SEGMENT B: Add saved road coordinates directly (the key feature!)
            Log::info('Injecting saved road coordinates for round trip', [
                'road_id' => $road['id'],
                'coord_count' => count($roadCoords)
            ]);
            $allCoordinates = array_merge($allCoordinates, $roadCoords);
            
            // Calculate saved road distance
            $savedRoadDistance = 0;
            for ($i = 0; $i < count($roadCoords) - 1; $i++) {
                $savedRoadDistance += $this->getDistance(
                    $roadCoords[$i][0], $roadCoords[$i][1],
                    $roadCoords[$i + 1][0], $roadCoords[$i + 1][1]
                );
            }
            $totalDistance += $savedRoadDistance / 1000;
            
            // Update current position
            $currentLat = $exitPoint[0];
            $currentLon = $exitPoint[1];
        }
        
        // EXTENSION SEGMENT: If we haven't reached target distance, add waypoints to extend the loop
        // KEY: Create a loop that curves back towards start, not away from it
        $currentDistanceKm = $totalDistance;
        $extensionWaypoints = [];
        
        // Calculate bearing FROM current position TO start (return direction)
        $bearingToStart = $this->calculateBearing($currentLat, $currentLon, $startLat, $startLon);
        
        // Get the exit direction from the last saved road
        $exitBearing = 0;
        if (!empty($savedRoadData)) {
            $lastRoad = end($savedRoadData);
            $roadCoords = $lastRoad['coordinates'];
            if (count($roadCoords) >= 2) {
                $secondLast = $roadCoords[count($roadCoords) - 2];
                $lastPoint = $roadCoords[count($roadCoords) - 1];
                $exitBearing = $this->calculateBearing($secondLast[0], $secondLast[1], $lastPoint[0], $lastPoint[1]);
            }
        }
        
        if ($remainingDistanceKm > 10) { // Only extend if we need more than 10km
            Log::info('Adding extension waypoints to meet target distance', [
                'current_distance_km' => round($currentDistanceKm, 2),
                'remaining_needed_km' => round($remainingDistanceKm, 2)
            ]);
            
            // Calculate extension distance - use less distance to avoid going too far
            $extensionDistanceKm = min($remainingDistanceKm / 4, 30); // Cap at 30km
            
            // CRITICAL: Calculate extension bearing to form a LOOP, not a dead end
            // The extension should go perpendicular to the return path, creating a wide arc
            // Choose the perpendicular direction that doesn't go backwards
            $perpendicular1 = ($bearingToStart + 90) % 360;
            $perpendicular2 = ($bearingToStart - 90 + 360) % 360;
            
            // Choose the perpendicular that's closer to our exit direction (more natural flow)
            $diff1 = abs($this->angleDifference($exitBearing, $perpendicular1));
            $diff2 = abs($this->angleDifference($exitBearing, $perpendicular2));
            
            $extensionBearing = ($diff1 < $diff2) ? $perpendicular1 : $perpendicular2;
            
            Log::info('Extension bearing calculation (LOOP FORMING)', [
                'saved_road_exit_bearing' => round($exitBearing, 1),
                'bearing_to_start' => round($bearingToStart, 1),
                'perpendicular_options' => [round($perpendicular1, 1), round($perpendicular2, 1)],
                'chosen_extension_bearing' => round($extensionBearing, 1),
                'distance_km' => round($extensionDistanceKm, 2)
            ]);
            
            // Generate extension waypoint - perpendicular to return path to form loop
            $wp1 = $this->calculatePointAtBearing($currentLat, $currentLon, $extensionDistanceKm, $extensionBearing);
            $extensionWaypoints[] = ['lat' => $wp1['lat'], 'lon' => $wp1['lon']];
            
            Log::info('Extension waypoint generated (CONTINUING EXIT DIRECTION)', [
                'waypoint' => $wp1,
                'saved_road_exit_bearing' => round($exitBearing, 1),
                'extension_bearing' => round($extensionBearing, 1),
                'distance_km' => round($extensionDistanceKm, 2)
            ]);
            
            // Route through extension waypoints with rate limit handling
            foreach ($extensionWaypoints as $extWp) {
                // Add delay to avoid rate limits
                usleep(300000); // 0.3 second delay
                
                $extSegment = $this->routeWithRateLimitRetry($currentLat, $currentLon, $extWp['lat'], $extWp['lon']);
                
                if ($extSegment && !empty($extSegment['coordinates'])) {
                    $coords = $extSegment['coordinates'];
                    // Skip first coord if close to current position
                    if (count($coords) > 1) {
                        $firstDist = $this->getDistance($coords[0][0], $coords[0][1], $currentLat, $currentLon);
                        if ($firstDist < 100) array_shift($coords);
                    }
                    $allCoordinates = array_merge($allCoordinates, $coords);
                    $totalDistance += $extSegment['distance_km'] ?? 0;
                    
                    // Update current position
                    $lastCoord = end($extSegment['coordinates']);
                    $currentLat = $lastCoord[0];
                    $currentLon = $lastCoord[1];
                    
                    Log::info('Extension segment added', [
                        'coord_count' => count($coords),
                        'distance_km' => $extSegment['distance_km'] ?? 0
                    ]);
                } else {
                    Log::warning('Extension segment failed, skipping');
                }
            }
        }
        
        // FINAL SEGMENT: Route back to start with rate limit handling
        Log::info('Calculating return segment for round trip', [
            'from' => [$currentLat, $currentLon],
            'to' => [$startLat, $startLon],
            'current_total_distance_km' => round($totalDistance, 2)
        ]);
        
        // Add longer delay before return segment to avoid rate limits
        sleep(2); // 2 second delay - critical for avoiding rate limits
        
        $returnSegment = null;
        $returnAttempts = 0;
        $maxReturnAttempts = 5;
        
        while (!$returnSegment && $returnAttempts < $maxReturnAttempts) {
            $returnAttempts++;
            Log::info('Attempting return segment', ['attempt' => $returnAttempts]);
            
            $returnSegment = $this->routeWithRateLimitRetry($currentLat, $currentLon, $startLat, $startLon);
            
            if ($returnSegment && !empty($returnSegment['coordinates'])) {
                // Validate no dead end
                $lastCoord = end($returnSegment['coordinates']);
                $distToStart = $this->getDistance($lastCoord[0], $lastCoord[1], $startLat, $startLon);
                
                if ($distToStart > 500) {
                    Log::warning('Return segment dead end', ['distance_to_start' => round($distToStart), 'attempt' => $returnAttempts]);
                    $returnSegment = null; // Try again
                }
            }
            
            if (!$returnSegment && $returnAttempts < $maxReturnAttempts) {
                // Wait progressively longer between attempts
                $waitTime = $returnAttempts * 2;
                Log::info('Waiting before return retry', ['wait_seconds' => $waitTime]);
                sleep($waitTime);
            }
        }
        
        if ($returnSegment && !empty($returnSegment['coordinates'])) {
            $coords = $returnSegment['coordinates'];
            // Skip first coord if close to current position
            if (count($coords) > 1) {
                $firstDist = $this->getDistance($coords[0][0], $coords[0][1], $currentLat, $currentLon);
                if ($firstDist < 100) array_shift($coords);
            }
            $allCoordinates = array_merge($allCoordinates, $coords);
            $totalDistance += $returnSegment['distance_km'] ?? 0;
            $totalDuration += $returnSegment['duration_minutes'] ?? 0;
            Log::info('Return segment added successfully', ['coord_count' => count($coords)]);
                        } else {
            // NEVER draw a straight line - throw exception to show proper error
            Log::error('All return segment attempts failed - rate limit exceeded');
            throw new \Exception('Route calculation temporarily unavailable due to rate limits. Please wait 1-2 minutes and try again.');
        }
        
        // Calculate stats
        $stats = $this->calculateRouteStats($allCoordinates);
        
        $route = [
            'coordinates' => $allCoordinates,
            'distance' => $totalDistance * 1000, // meters
            'duration' => $totalDuration * 60000, // milliseconds
            'distance_km' => round($totalDistance, 2),
            'duration_minutes' => round($totalDuration, 1),
            'curvature' => $stats['curvature'] ?? 0,
            'corner_count' => $stats['corner_count'] ?? 0,
            'elevation_gain' => $stats['elevation_gain'] ?? 0,
            'elevation_loss' => $stats['elevation_loss'] ?? 0,
            'is_round_trip' => true,
            'target_distance_km' => $distanceKm,
            'actual_distance_km' => round($totalDistance, 2),
            '_strategy' => 'round_trip_with_saved_road_injection',
            '_saved_road_count' => count($savedRoadData)
        ];
        
        Log::info('Round trip with saved roads completed', [
            'coordinate_count' => count($allCoordinates),
            'distance_km' => $route['distance_km'],
            'saved_roads' => count($savedRoadData)
        ]);
        
        return $route;
    }
    
    /**
     * Calculate the smallest difference between two angles (in degrees)
     * Returns value between -180 and 180
     */
    protected function angleDifference($angle1, $angle2)
    {
        $diff = $angle2 - $angle1;
        while ($diff > 180) $diff -= 360;
        while ($diff < -180) $diff += 360;
        return $diff;
    }
    
    /**
     * Route between two points with rate limit retry handling
     * Tries multiple times with delays when rate limited
     */
    protected function routeWithRateLimitRetry($startLat, $startLon, $endLat, $endLon, $maxRetries = 4)
    {
        for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
            try {
                $response = Http::timeout(30)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($this->buildUrl('/route'), [
                        'points' => [[$startLon, $startLat], [$endLon, $endLat]],
                        'profile' => $this->profile,
                        'points_encoded' => false,
                        'calc_points' => true
                    ]);
                
                if ($response->successful()) {
                    $data = $response->json();
                    if (isset($data['paths'][0]['points']['coordinates'])) {
                        $coords = array_map(fn($c) => [$c[1], $c[0]], $data['paths'][0]['points']['coordinates']);
                        return [
                            'coordinates' => $coords,
                            'distance_km' => ($data['paths'][0]['distance'] ?? 0) / 1000,
                            'duration_minutes' => ($data['paths'][0]['time'] ?? 0) / 60000
                        ];
                    }
                } elseif ($response->status() === 429) {
                    // Rate limited - wait progressively longer
                    $waitTime = 3 * ($attempt + 1); // 3s, 6s, 9s, 12s
                    Log::warning('Rate limited in routeWithRateLimitRetry', ['attempt' => $attempt + 1, 'wait_seconds' => $waitTime]);
                    sleep($waitTime);
                    continue;
                } else {
                    Log::warning('Route API failed', ['status' => $response->status(), 'attempt' => $attempt + 1]);
                    sleep(1);
                        }
                    } catch (\Exception $e) {
                Log::warning('Route exception', ['error' => $e->getMessage(), 'attempt' => $attempt + 1]);
                sleep(1);
            }
        }
        
                return null;
    }
    
    /**
     * Generate waypoints in a circle around a center point
     * 
     * @param float $centerLat
     * @param float $centerLon
     * @param float $radiusKm
     * @param int $count Number of waypoints to generate
     * @return array Array of waypoints with lat, lon, and bearing
     */
    protected function generateCircularWaypoints($centerLat, $centerLon, $radiusKm, $count = 12)
    {
        $waypoints = [];
        $bearingStep = 360 / $count;
        
        for ($i = 0; $i < $count; $i++) {
            $bearing = $i * $bearingStep;
            $point = $this->calculatePointAtBearing($centerLat, $centerLon, $radiusKm, $bearing);
            
            $waypoints[] = [
                'lat' => $point['lat'],
                'lon' => $point['lon'],
                'bearing' => $bearing
            ];
        }
        
        return $waypoints;
    }
    
    /**
     * Calculate bearing (direction) from one point to another
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @return float Bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
     */
    protected function calculateBearing($startLat, $startLon, $endLat, $endLon)
    {
        $startLatRad = deg2rad($startLat);
        $startLonRad = deg2rad($startLon);
        $endLatRad = deg2rad($endLat);
        $endLonRad = deg2rad($endLon);
        
        $dLon = $endLonRad - $startLonRad;
        
        $y = sin($dLon) * cos($endLatRad);
        $x = cos($startLatRad) * sin($endLatRad) - sin($startLatRad) * cos($endLatRad) * cos($dLon);
        
        $bearingRad = atan2($y, $x);
        $bearingDeg = rad2deg($bearingRad);
        
        // Normalize to 0-360
        return ($bearingDeg + 360) % 360;
    }
    
    /**
     * Calculate a point at a given distance and bearing from a start point
     * Uses Haversine formula
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $distanceKm
     * @param float $bearingDegrees Bearing in degrees (0 = North, 90 = East)
     * @return array ['lat' => float, 'lon' => float]
     */
    protected function calculatePointAtBearing($startLat, $startLon, $distanceKm, $bearingDegrees)
    {
        $earthRadiusKm = 6371.0;
        $distanceRad = $distanceKm / $earthRadiusKm;
        $bearingRad = deg2rad($bearingDegrees);
        $startLatRad = deg2rad($startLat);
        $startLonRad = deg2rad($startLon);
        
        $endLatRad = asin(
            sin($startLatRad) * cos($distanceRad) +
            cos($startLatRad) * sin($distanceRad) * cos($bearingRad)
        );
        
        $endLonRad = $startLonRad + atan2(
            sin($bearingRad) * sin($distanceRad) * cos($startLatRad),
            cos($distanceRad) - sin($startLatRad) * sin($endLatRad)
        );
        
        return [
            'lat' => rad2deg($endLatRad),
            'lon' => rad2deg($endLonRad)
        ];
    }
    
    /**
     * Snap a coordinate to the nearest routable road using GraphHopper's /nearest endpoint.
     *
     * @param float $lat
     * @param float $lon
     * @param int $searchRadiusMeters
     * @return array|null ['lat' => float, 'lon' => float] when snapped, null on failure
     */
    protected function snapPointToRoad($lat, $lon, $searchRadiusMeters = 2000)
    {
        try {
            $params = [
                'point' => $lat . ',' . $lon,
                'profile' => $this->profile,
                'radius' => $searchRadiusMeters
            ];
            
            // Add API key if available
            if ($this->apiKey) {
                $params['key'] = $this->apiKey;
            }
            
            $url = $this->baseUrl . '/nearest';
            // Add API key to URL if needed (for GET requests, params are in query string)
            if ($this->apiKey && !isset($params['key'])) {
                $url .= (strpos($url, '?') !== false ? '&' : '?') . 'key=' . urlencode($this->apiKey);
            }
            $response = Http::timeout(10)->get($url, $params);
            
            if (!$response->successful()) {
                Log::info('GraphHopper nearest request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return null;
            }
            
            $data = $response->json();
            
            // GraphHopper 8 can return either coordinates[] or hits[0].point
            if (isset($data['coordinates']) && count($data['coordinates']) >= 2) {
                return [
                    'lat' => $data['coordinates'][1],
                    'lon' => $data['coordinates'][0]
                ];
            }
            
            if (isset($data['hits'][0]['point'])) {
                $point = $data['hits'][0]['point'];
                if (isset($point['lat']) && isset($point['lng'])) {
                    return [
                        'lat' => $point['lat'],
                        'lon' => $point['lng']
                    ];
                }
            }
            
            Log::info('GraphHopper nearest response did not contain coordinates', [
                'response' => $data
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to snap point to road', [
                'error' => $e->getMessage(),
                'lat' => $lat,
                'lon' => $lon
            ]);
        }
        
        return null;
    }
    
    /**
     * Combine two route segments into one continuous route
     * Removes duplicate point at the junction
     * 
     * @param array $route1 First route segment
     * @param array $route2 Second route segment
     * @return array Combined route
     */
    protected function combineRoutes($route1, $route2)
    {
        if (empty($route1['coordinates']) || empty($route2['coordinates'])) {
            return null; // Return null instead of empty array for consistency
        }
        
        // Get coordinates from both routes
        $coords1 = $route1['coordinates'];
        $coords2 = $route2['coordinates'];
        
        // Remove last point of route1 and first point of route2 if they're the same (junction point)
        $lastCoord1 = end($coords1);
        $firstCoord2 = $coords2[0];
        
        // Check if junction points are the same (within small tolerance)
        $tolerance = 0.0001; // ~11 meters
        $isSame = false;
        if (is_array($lastCoord1) && is_array($firstCoord2)) {
            $lat1 = is_array($lastCoord1) ? $lastCoord1[0] : $lastCoord1['lat'];
            $lon1 = is_array($lastCoord1) ? $lastCoord1[1] : $lastCoord1['lon'];
            $lat2 = is_array($firstCoord2) ? $firstCoord2[0] : $firstCoord2['lat'];
            $lon2 = is_array($firstCoord2) ? $firstCoord2[1] : $firstCoord2['lon'];
            
            $isSame = abs($lat1 - $lat2) < $tolerance && abs($lon1 - $lon2) < $tolerance;
        }
        
        // Combine coordinates
        $combinedCoords = $coords1;
        if (!$isSame) {
            // Add first point of route2 if not duplicate
            $combinedCoords[] = $firstCoord2;
        }
        
        // Add rest of route2 coordinates (skip first if duplicate)
        $startIdx = $isSame ? 1 : 0;
        for ($i = $startIdx; $i < count($coords2); $i++) {
            $combinedCoords[] = $coords2[$i];
        }
        
        // Combine other route properties
        $combinedRoute = [
            'coordinates' => $combinedCoords,
            'distance' => ($route1['distance'] ?? 0) + ($route2['distance'] ?? 0),
            'duration' => ($route1['duration'] ?? 0) + ($route2['duration'] ?? 0),
            'curvature' => isset($route1['curvature']) && isset($route2['curvature']) 
                ? (($route1['curvature'] + $route2['curvature']) / 2) 
                : ($route1['curvature'] ?? $route2['curvature'] ?? null),
            'corner_count' => ($route1['corner_count'] ?? 0) + ($route2['corner_count'] ?? 0)
        ];
        
        return $combinedRoute;
    }
    
    /**
     * Score a round trip route based on how well it matches the target distance
     * Lower score is better
     * 
     * @param array $route
     * @param float $targetDistanceKm
     * @return float Score (lower is better)
     */
    protected function scoreRoundTripRoute($route, $targetDistanceKm)
    {
        $actualDistanceMeters = $route['distance'] ?? 0;
        $actualDistanceKm = $actualDistanceMeters / 1000;
        $distanceDiff = abs($actualDistanceKm - $targetDistanceKm);
        
        // Score based on distance difference (in km)
        // Prefer routes closer to target distance
        $score = $distanceDiff;
        
        // Heavily penalize routes that are significantly shorter than target
        // This ensures we prioritize routes that are closer to or exceed the target
        if ($actualDistanceKm < $targetDistanceKm * 0.8) {
            // If route is more than 20% shorter, add heavy penalty
            $shortage = $targetDistanceKm - $actualDistanceKm;
            $score += $shortage * 2; // Double penalty for being too short
        }
        
        // Bonus for routes that are close to target (±10% tolerance)
        $tolerance = $targetDistanceKm * 0.1;
        if ($distanceDiff <= $tolerance) {
            $score *= 0.3; // Strong preference for routes within tolerance
        } elseif ($distanceDiff <= $tolerance * 2) {
            $score *= 0.6; // Moderate preference for routes within 20% tolerance
        }
        
        // Penalize out-and-back routes that cover very little area (i.e. not circular)
        $loopPenalty = $this->calculateLoopShapePenalty(
            $route['coordinates'] ?? [],
            $targetDistanceKm,
            $actualDistanceKm
        );
        $score += $loopPenalty;
        
        return $score;
    }
    
    /**
     * Penalize routes that don't cover enough area to resemble a loop
     */
    protected function calculateLoopShapePenalty($coordinates, $targetDistanceKm, $actualDistanceKm)
    {
        $areaKm2 = $this->calculatePolygonAreaKm2($coordinates);
        if ($areaKm2 <= 0) {
            return $targetDistanceKm * 0.75;
        }
        
        // Ideal area for a loop with the same distance (treat distance as circumference)
        $idealRadiusKm = max(0.1, $actualDistanceKm / (2 * M_PI));
        $idealAreaKm2 = M_PI * pow($idealRadiusKm, 2);
        if ($idealAreaKm2 <= 0) {
            return 0;
        }
        
        $areaRatio = min(1, $areaKm2 / $idealAreaKm2);
        
        // If we cover at least 60% of the ideal area, treat it as a good loop
        if ($areaRatio >= 0.6) {
            return 0;
        }
        
        // Scale penalty so straight out-and-back routes get heavily penalized
        $penaltyFactor = (1 - $areaRatio);
        return $penaltyFactor * max($targetDistanceKm * 0.8, 5);
    }
    
    /**
     * Calculate polygon area (km^2) from route coordinates using a simple planar approximation
     */
    protected function calculatePolygonAreaKm2($coordinates)
    {
        if (count($coordinates) < 3) {
            return 0;
        }
        
        $points = [];
        $latSum = 0;
        $count = 0;
        
        foreach ($coordinates as $coord) {
            $lat = null;
            $lon = null;
            
            if (is_array($coord)) {
                if (isset($coord[0]) && isset($coord[1])) {
                    $lat = $coord[0];
                    $lon = $coord[1];
                } else {
                    $lat = $coord['lat'] ?? null;
                    $lon = $coord['lon'] ?? ($coord['lng'] ?? null);
                }
            }
            
            if ($lat === null || $lon === null) {
                continue;
            }
            
            $points[] = ['lat' => $lat, 'lon' => $lon];
            $latSum += $lat;
            $count++;
        }
        
        if ($count < 3) {
            return 0;
        }
        
        $meanLat = $latSum / $count;
        $metersPerDegreeLat = 111320;
        $metersPerDegreeLon = 111320 * cos(deg2rad($meanLat));
        
        $originLat = $points[0]['lat'];
        $originLon = $points[0]['lon'];
        
        $projected = [];
        foreach ($points as $point) {
            $x = ($point['lon'] - $originLon) * $metersPerDegreeLon / 1000; // km
            $y = ($point['lat'] - $originLat) * $metersPerDegreeLat / 1000; // km
            $projected[] = ['x' => $x, 'y' => $y];
        }
        
        // Ensure polygon is closed
        $projected[] = $projected[0];
        
        $area = 0;
        for ($i = 0; $i < count($projected) - 1; $i++) {
            $x1 = $projected[$i]['x'];
            $y1 = $projected[$i]['y'];
            $x2 = $projected[$i + 1]['x'];
            $y2 = $projected[$i + 1]['y'];
            $area += ($x1 * $y2) - ($x2 * $y1);
        }
        
        return abs($area) / 2;
    }
    
    /**
     * Build intermediate shaping waypoints to encourage curved segments
     */
    protected function buildCurvedSegmentWaypoints($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $segmentIndex = 0, $forcedDirection = null)
    {
        $midLat = ($startLat + $endLat) / 2;
        $midLon = ($startLon + $endLon) / 2;
        $segmentDist = $this->getDistance($startLat, $startLon, $endLat, $endLon);
        
        if ($segmentDist < 500) {
            return [];
        }
        
        $bearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
        $offsetDist = 0;
        $offsetDirection = $forcedDirection ?? (($segmentIndex % 2 === 0) ? 1 : -1);
        
        switch ($curvatureLevel) {
            case 'fastest':
                $offsetDist = max(1800, $segmentDist * 0.18); // Increased to prevent backtracking
                break;
            case 'balanced':
            case 'fast_and_curvy': // Legacy support
                $offsetDist = max(2000, $segmentDist * 0.2);
                break;
            case 'curvy':
                $offsetDist = max(3500, $segmentDist * 0.3); // Increased to prevent backtracking
                break;
            case 'extra_curvy':
                $offsetDist = max(4500, $segmentDist * 0.4); // Increased to prevent backtracking
                break;
            default:
                $offsetDist = max(1500, $segmentDist * 0.15);
                break;
        }
        
        $perpendicularBearing = ($bearing + (90 * $offsetDirection) + 360) % 360;
        $offsetPoint = $this->calculatePointAtBearing($midLat, $midLon, $offsetDist / 1000, $perpendicularBearing);
        
        if ($offsetPoint['lat'] < 55.0 || $offsetPoint['lat'] > 59.0 || $offsetPoint['lon'] < 20.0 || $offsetPoint['lon'] > 29.0) {
            return [];
        }
        
        $snapped = $this->snapPointToRoad($offsetPoint['lat'], $offsetPoint['lon'], 2500);
        if (!$snapped) {
            return [];
        }
        
        return [[
            'lat' => $snapped['lat'],
            'lon' => $snapped['lon']
        ]];
    }
    
    /**
     * Generate alternative routes by creating offset waypoints from the primary route
     * This is a fallback when GraphHopper only returns 1 path but alternatives are requested
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @param array $primaryRouteCoordinates Array of [lat, lon] coordinates from primary route
     * @param string $curvatureLevel
     * @param array $avoidOptions
     * @return array Array of alternative routes
     */
    protected function generateAlternativeRoutesWithOffsetWaypoints($startLat, $startLon, $endLat, $endLon, $primaryRouteCoordinates, $curvatureLevel, $avoidOptions = [])
    {
        $alternativeRoutes = [];
        $maxAlternatives = 2; // Generate up to 2 alternative routes
        
        if (empty($primaryRouteCoordinates) || count($primaryRouteCoordinates) < 10) {
            Log::warning('Cannot generate alternative routes: primary route has too few coordinates');
            return [];
        }
        
        // Calculate route distance to determine appropriate offset distances
        $routeDistance = 0;
        for ($i = 1; $i < count($primaryRouteCoordinates); $i++) {
            $prev = $primaryRouteCoordinates[$i - 1];
            $curr = $primaryRouteCoordinates[$i];
            $routeDistance += $this->getDistance($prev[0], $prev[1], $curr[0], $curr[1]);
        }
        
        // Determine offset distances based on route length (5-15% of route distance)
        $baseOffsetKm = max(5, min(15, $routeDistance / 1000 * 0.1)); // 10% of route distance, min 5km, max 15km
        $offsetDistances = [
            $baseOffsetKm * 0.7,  // Left offset
            $baseOffsetKm * 1.3   // Right offset (slightly larger for variation)
        ];
        
        // Select 2-3 points along the route to place waypoints (at 1/3 and 2/3 of the route)
        $numWaypointPositions = 2;
        $waypointIndices = [];
        for ($i = 1; $i <= $numWaypointPositions; $i++) {
            $ratio = $i / ($numWaypointPositions + 1);
            $index = (int)round($ratio * (count($primaryRouteCoordinates) - 1));
            if ($index > 0 && $index < count($primaryRouteCoordinates) - 1) {
                $waypointIndices[] = $index;
            }
        }
        
        // Try different combinations of offset waypoints
        $attempts = 0;
        $maxAttempts = 6; // Limit attempts to avoid too many API calls
        
        foreach ($waypointIndices as $wpIndex) {
            if (count($alternativeRoutes) >= $maxAlternatives || $attempts >= $maxAttempts) {
                break;
            }
            
            $routePoint = $primaryRouteCoordinates[$wpIndex];
            $pointLat = $routePoint[0];
            $pointLon = $routePoint[1];
            
            // Calculate local bearing at this point (average of previous and next segment)
            $prevIndex = max(0, $wpIndex - 5);
            $nextIndex = min(count($primaryRouteCoordinates) - 1, $wpIndex + 5);
            
            $prevPoint = $primaryRouteCoordinates[$prevIndex];
            $nextPoint = $primaryRouteCoordinates[$nextIndex];
            
            $localBearing = $this->calculateBearing($prevPoint[0], $prevPoint[1], $nextPoint[0], $nextPoint[1]);
            
            // Try both perpendicular directions (left and right)
            $perpendicularBearings = [
                ($localBearing + 90) % 360,  // Right side
                ($localBearing - 90 + 360) % 360  // Left side
            ];
            
            foreach ($perpendicularBearings as $perpBearing) {
                if (count($alternativeRoutes) >= $maxAlternatives || $attempts >= $maxAttempts) {
                    break 2;
                }
                
                foreach ($offsetDistances as $offsetKm) {
                    if (count($alternativeRoutes) >= $maxAlternatives || $attempts >= $maxAttempts) {
                        break 3;
                    }
                    
                    $attempts++;
                    
                    // Calculate offset waypoint
                    $offsetPoint = $this->calculatePointAtBearing($pointLat, $pointLon, $offsetKm, $perpBearing);
                    
                    // Check bounds
                    if ($offsetPoint['lat'] < 55.0 || $offsetPoint['lat'] > 59.0 || 
                        $offsetPoint['lon'] < 20.0 || $offsetPoint['lon'] > 29.0) {
                        continue;
                    }
                    
                    // Snap to nearest road
                    $snapped = $this->snapPointToRoad($offsetPoint['lat'], $offsetPoint['lon'], 3000);
                    if (!$snapped) {
                        continue;
                    }
                    
                    // Calculate route through this waypoint
                    try {
                        $waypoint = [['lat' => $snapped['lat'], 'lon' => $snapped['lon']]];
                        $altRoute = $this->findCurvedRouteWithWaypoints(
                            $startLat,
                            $startLon,
                            $endLat,
                            $endLon,
                            $waypoint,
                            $curvatureLevel
                        );
                        
                        if ($altRoute && !empty($altRoute['coordinates']) && is_array($altRoute['coordinates']) && count($altRoute['coordinates']) > 0) {
                            // Check that this route is different from primary route
                            $distanceDiff = abs(($altRoute['distance'] ?? 0) - ($routeDistance ?? 0));
                            $distanceDiffPercent = $routeDistance > 0 ? ($distanceDiff / $routeDistance) * 100 : 0;
                            
                            // Only accept if route is at least 5% different in distance
                            if ($distanceDiffPercent >= 5) {
                                // Check for backtracks
                                $hasBacktrack = $this->hasSignificantBacktrack($altRoute['coordinates'], $startLat, $startLon, $endLat, $endLon, true);
                                if (!$hasBacktrack) {
                                    $altRoute['_strategy'] = 'graphhopper_offset_waypoints';
                                    $altRoute['_curvature_level'] = $curvatureLevel;
                                    $alternativeRoutes[] = $altRoute;
                                    
                                    Log::info('Generated alternative route using offset waypoint', [
                                        'waypoint_index' => $wpIndex,
                                        'offset_km' => $offsetKm,
                                        'route_distance' => $altRoute['distance'] ?? 'N/A',
                                        'distance_diff_percent' => round($distanceDiffPercent, 2)
                                    ]);
                                    
                                    // Found a valid alternative, try next waypoint position
                                    break 2;
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('Error generating alternative route with offset waypoint', [
                            'error' => $e->getMessage(),
                            'waypoint_index' => $wpIndex
                        ]);
                        continue;
                    }
                }
            }
        }
        
        return $alternativeRoutes;
    }
    
    /**
     * Find a nearby road segment by calculating routes to nearby points
     * and extracting a curved segment from one of those routes
     * 
     * @param float $startLat
     * @param float $startLon
     * @param float $targetDistanceKm
     * @param string $curvatureLevel
     * @return array|null Segment with coordinates, distance, and metadata
     */
    protected function findNearbyRoadSegment($startLat, $startLon, $targetDistanceKm, $curvatureLevel)
    {
        Log::info('Finding nearby road segment for auto-selection', [
            'start' => [$startLat, $startLon],
            'target_distance_km' => $targetDistanceKm,
            'curvature_level' => $curvatureLevel
        ]);
        
        // Calculate search radius: use a portion of target distance (e.g., 30-40%)
        // This ensures we find roads that are part of a reasonable round trip
        $searchRadiusKm = min($targetDistanceKm * 0.35, 15); // Max 15km radius
        
        // Generate 8 candidate directions (every 45 degrees) to explore different roads
        $candidateBearings = [0, 45, 90, 135, 180, 225, 270, 315];
        $candidateSegments = [];
        
        foreach ($candidateBearings as $bearing) {
            // Calculate endpoint at search radius
            $endPoint = $this->calculatePointAtBearing($startLat, $startLon, $searchRadiusKm, $bearing);
            
            // Check bounds
            if ($endPoint['lat'] < 55.0 || $endPoint['lat'] > 59.0 || 
                $endPoint['lon'] < 20.0 || $endPoint['lon'] > 29.0) {
                continue;
            }
            
            // Calculate route to this point using the specified curvature level
            // This will give us actual road segments in that direction
            $route = $this->findCurvedRoute(
                $startLat,
                $startLon,
                $endPoint['lat'],
                $endPoint['lon'],
                $curvatureLevel,
                [] // No additional waypoints
            );
            
            if (!$route || empty($route['coordinates'])) {
                continue;
            }
            
            // Extract a segment from this route
            // We want a segment that's 20-40% of target distance, positioned somewhere in the middle
            // This gives us a good curved road segment without being too close to start or end
            $routeDistanceKm = $route['distance'] / 1000;
            $targetSegmentLengthKm = min($targetDistanceKm * 0.3, $routeDistanceKm * 0.6);
            
            if ($targetSegmentLengthKm < 3) {
                // Segment too short, skip
                continue;
            }
            
            // Find the best segment in this route
            $segment = $this->extractCurvedSegment(
                $route['coordinates'],
                $targetSegmentLengthKm,
                $curvatureLevel
            );
            
            if ($segment && !empty($segment['coordinates'])) {
                $segmentScore = $this->scoreRoadSegment($segment, $curvatureLevel);
                $candidateSegments[] = [
                    'segment' => $segment,
                    'score' => $segmentScore,
                    'bearing' => $bearing,
                    'route_distance_km' => $routeDistanceKm
                ];
                
                Log::info('Found candidate road segment', [
                    'bearing' => $bearing,
                    'segment_length_km' => round($segment['distance'] / 1000, 2),
                    'score' => round($segmentScore, 2),
                    'coordinate_count' => count($segment['coordinates'])
                ]);
            }
        }
        
        if (empty($candidateSegments)) {
            Log::warning('No suitable road segments found in any direction');
            return null;
        }
        
        // Sort by score (lower is better for some metrics, but we want higher curvature)
        // For curvy routes, prefer segments with higher curvature scores
        usort($candidateSegments, function($a, $b) use ($curvatureLevel) {
            // For curvy routes, prefer higher scores (more curvature)
            // For fastest, prefer moderate scores (not too curvy, not too straight)
            // For fast_and_curvy, prefer moderate-to-high scores (balanced curvature)
            if ($curvatureLevel === 'straightest' || $curvatureLevel === 'fastest') {
                // For straightest, prefer segments that are not too curvy (moderate score)
                $scoreA = abs($a['score'] - 50); // Distance from moderate score
                $scoreB = abs($b['score'] - 50);
                return $scoreA <=> $scoreB;
            } elseif ($curvatureLevel === 'balanced' || $curvatureLevel === 'fast_and_curvy') {
                // For balanced, prefer moderate-to-high curvature (target around 60-70)
                // This balances speed with some curves
                $targetScore = 65;
                $scoreA = abs($a['score'] - $targetScore);
                $scoreB = abs($b['score'] - $targetScore);
                // If both are close to target, prefer the higher one
                if (abs($scoreA - $scoreB) < 10) {
                    return $b['score'] <=> $a['score']; // Prefer higher if similar distance
                }
                return $scoreA <=> $scoreB;
            } else {
                // For curvy/extra_curvy routes, prefer higher scores
                return $b['score'] <=> $a['score'];
            }
        });
        
        $bestSegment = $candidateSegments[0]['segment'];
        
        Log::info('Selected best road segment', [
            'selected_bearing' => $candidateSegments[0]['bearing'],
            'segment_length_km' => round($bestSegment['distance'] / 1000, 2),
            'score' => round($candidateSegments[0]['score'], 2),
            'total_candidates' => count($candidateSegments)
        ]);
        
        return $bestSegment;
    }
    
    /**
     * Extract a curved segment from a route's coordinates
     * 
     * @param array $coordinates Full route coordinates
     * @param float $targetLengthKm Target segment length in km
     * @param string $curvatureLevel
     * @return array|null Segment with coordinates and distance
     */
    protected function extractCurvedSegment($coordinates, $targetLengthKm, $curvatureLevel)
    {
        if (count($coordinates) < 10) {
            return null; // Not enough points
        }
        
        $totalPoints = count($coordinates);
        $targetLengthMeters = $targetLengthKm * 1000;
        
        // Try different starting positions in the route (avoid very start and very end)
        // Start from 20% to 60% of the route
        $startPositions = [];
        for ($i = (int)($totalPoints * 0.2); $i < (int)($totalPoints * 0.6); $i += max(5, (int)($totalPoints * 0.1))) {
            $startPositions[] = $i;
        }
        
        $bestSegment = null;
        $bestCurvature = 0;
        
        foreach ($startPositions as $startIdx) {
            // Find end position that gives us approximately target length
            $currentLength = 0;
            $endIdx = $startIdx;
            
            for ($i = $startIdx; $i < $totalPoints - 1; $i++) {
                $segmentDist = $this->getDistance(
                    $coordinates[$i][0],
                    $coordinates[$i][1],
                    $coordinates[$i + 1][0],
                    $coordinates[$i + 1][1]
                );
                
                $currentLength += $segmentDist;
                
                // If we've reached target length (with some tolerance), stop
                if ($currentLength >= $targetLengthMeters * 0.9) {
                    $endIdx = $i + 1;
                    break;
                }
                
                // Don't go too far beyond target
                if ($currentLength > $targetLengthMeters * 1.5) {
                    break;
                }
            }
            
            if ($endIdx <= $startIdx + 5) {
                continue; // Segment too short
            }
            
            // Extract segment coordinates
            $segmentCoords = array_slice($coordinates, $startIdx, $endIdx - $startIdx + 1);
            
            // Calculate segment curvature
            $curvature = $this->calculateSegmentCurvature($segmentCoords);
            
            if ($curvature > $bestCurvature) {
                $bestCurvature = $curvature;
                $bestSegment = [
                    'coordinates' => $segmentCoords,
                    'distance' => $currentLength,
                    'curvature' => $curvature,
                    'start_index' => $startIdx,
                    'end_index' => $endIdx
                ];
            }
        }
        
        return $bestSegment;
    }
    
    /**
     * Calculate curvature score for a segment
     * Higher score = more curved
     * 
     * @param array $coordinates
     * @return float Curvature score
     */
    protected function calculateSegmentCurvature($coordinates)
    {
        if (count($coordinates) < 3) {
            return 0;
        }
        
        $totalAngleChange = 0;
        $segmentCount = 0;
        
        // Calculate angle changes between consecutive segments
        for ($i = 0; $i < count($coordinates) - 2; $i++) {
            $p1 = $coordinates[$i];
            $p2 = $coordinates[$i + 1];
            $p3 = $coordinates[$i + 2];
            
            $bearing1 = $this->calculateBearing($p1[0], $p1[1], $p2[0], $p2[1]);
            $bearing2 = $this->calculateBearing($p2[0], $p2[1], $p3[0], $p3[1]);
            
            $angleChange = abs($bearing2 - $bearing1);
            if ($angleChange > 180) {
                $angleChange = 360 - $angleChange;
            }
            
            $totalAngleChange += $angleChange;
            $segmentCount++;
        }
        
        if ($segmentCount === 0) {
            return 0;
        }
        
        $avgAngleChange = $totalAngleChange / $segmentCount;
        
        // Normalize to 0-100 scale (roughly)
        // Average angle change of 10-15 degrees per segment = good curvature
        $score = min(100, ($avgAngleChange / 15) * 100);
        
        return $score;
    }
    
    /**
     * Score a road segment for suitability in round trip
     * 
     * @param array $segment
     * @param string $curvatureLevel
     * @return float Score (higher is better for curvy routes)
     */
    protected function scoreRoadSegment($segment, $curvatureLevel)
    {
        $score = 0;
        
        // Base score from curvature
        $curvature = $segment['curvature'] ?? 0;
        $score += $curvature;
        
        // Prefer segments with good length (not too short, not too long)
        $lengthKm = ($segment['distance'] ?? 0) / 1000;
        if ($lengthKm >= 5 && $lengthKm <= 20) {
            $score += 20; // Bonus for good length
        } elseif ($lengthKm >= 3 && $lengthKm <= 30) {
            $score += 10;
        }
        
        // For curvy routes, heavily weight curvature
        if ($curvatureLevel === 'curvy' || $curvatureLevel === 'extra_curvy') {
            $score = $curvature * 1.5; // Emphasize curvature
        } elseif ($curvatureLevel === 'balanced' || $curvatureLevel === 'fast_and_curvy') {
            $score = $curvature * 1.2; // Moderate emphasis
        }
        
        return $score;
    }
    
    /**
     * Check if route makes progress toward destination (prevents dead-end loops)
     * 
     * @param array $coordinates Route coordinates
     * @param float $startLat
     * @param float $startLon
     * @param float $endLat
     * @param float $endLon
     * @return bool True if route progresses toward destination
     */
    protected function checkRouteProgress($coordinates, $startLat, $startLon, $endLat, $endLon)
    {
        if (empty($coordinates) || count($coordinates) < 10) {
            return true; // Too short to check
        }
        
        // Divide route into segments and check progress
        $segmentSize = max(10, intval(count($coordinates) / 5)); // 5 segments
        $initialDistance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
        
        $progressCount = 0;
        $regressCount = 0;
        
        for ($i = $segmentSize; $i < count($coordinates); $i += $segmentSize) {
            $coord = $coordinates[$i];
            $currentDistance = $this->getDistance($coord[0], $coord[1], $endLat, $endLon);
            
            // Check if we're getting closer to destination
            if ($currentDistance < $initialDistance * 0.9) {
                $progressCount++;
            } elseif ($currentDistance > $initialDistance * 1.1) {
                $regressCount++;
            }
        }
        
        // Check final point
        $lastCoord = $coordinates[count($coordinates) - 1];
        $finalDistance = $this->getDistance($lastCoord[0], $lastCoord[1], $endLat, $endLon);
        
        // Route must:
        // 1. End close to destination (< 1km)
        // 2. Have more progress than regression
        // 3. Final distance should be significantly less than initial distance
        $endsClose = $finalDistance < 1000;
        $hasProgress = $progressCount > $regressCount;
        $reducesDistance = $finalDistance < $initialDistance * 0.8;
        
        return $endsClose && ($hasProgress || $reducesDistance);
    }
    
    /**
     * Test GraphHopper connection
     * Note: For GraphHopper Cloud API, the /info endpoint may not be available
     */
    public function testConnection()
    {
        try {
            // Try /info endpoint first (for self-hosted instances)
            $response = Http::timeout(5)->get($this->buildUrl('/info'));
            if ($response->successful()) {
                return ['connected' => true, 'info' => $response->json()];
            }
            
            // If /info fails, try a simple route request to /route endpoint (for API)
            // This is a lightweight test that works for both self-hosted and API
            $testResponse = Http::timeout(5)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->buildUrl('/route'), [
                    'points' => [[13.388860, 52.517037], [13.397634, 52.529407]], // Berlin test points
                    'profile' => $this->profile,
                    'points_encoded' => false
                ]);
            
            if ($testResponse->successful() || $testResponse->status() === 400) {
                // 400 is OK - it means the API is reachable, just invalid request
                return ['connected' => true, 'note' => 'API endpoint reachable'];
            }
            
            return ['connected' => false, 'error' => 'Server responded with ' . $response->status()];
        } catch (\Exception $e) {
            // For API URLs, connection errors might be expected if /info doesn't exist
            // Return as "maybe connected" to let actual requests determine availability
            if (strpos($this->baseUrl, 'graphhopper.com') !== false || strpos($this->baseUrl, 'api') !== false) {
                return ['connected' => true, 'note' => 'Assuming API is available (connection test skipped)'];
            }
            return ['connected' => false, 'error' => $e->getMessage()];
        }
    }
}



