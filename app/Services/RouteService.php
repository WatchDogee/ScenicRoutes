<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Services\ElevationService;

class RouteService
{
    protected $elevationService;
    protected $osrmBaseUrl = 'http://router.project-osrm.org';

    public function __construct(ElevationService $elevationService)
    {
        $this->elevationService = $elevationService;
    }

    /**
     * Calculate route between two points
     */
    public function calculateRoute($startLat, $startLon, $endLat, $endLon, $preference = 'fastest')
    {
        if ($preference === 'curved') {
            return $this->findCurvedRoute($startLat, $startLon, $endLat, $endLon, 'moderate');
        }

        return $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon);
    }

    /**
     * Find straightest route using primary roads
     * @param array $waypoints Optional array of waypoints [[lat, lon], ...] between start and end
     */
    public function findStraightestRoute($startLat, $startLon, $endLat, $endLon, $waypoints = [])
    {
        try {
            // Generate cache key based on coordinates (rounded to 4 decimal places for cache hits)
            $waypointsKey = empty($waypoints) ? '' : '_' . md5(json_encode($waypoints));
            $cacheKey = 'straightest_route_' . round($startLat, 4) . '_' . round($startLon, 4) . '_' . round($endLat, 4) . '_' . round($endLon, 4) . $waypointsKey;
            
            // Check cache first (cache for 1 hour)
            if (Cache::has($cacheKey)) {
                return Cache::get($cacheKey);
            }
            
            // Build waypoints string: start;waypoint1;waypoint2;...;end
            $allWaypoints = [[$startLat, $startLon]];
            if (!empty($waypoints) && is_array($waypoints)) {
                foreach ($waypoints as $wp) {
                    if (isset($wp['lat']) && isset($wp['lon'])) {
                        $allWaypoints[] = [$wp['lat'], $wp['lon']];
                    } elseif (is_array($wp) && count($wp) >= 2) {
                        $allWaypoints[] = [$wp[0], $wp[1]]; // [lat, lon] format
                    }
                }
            }
            $allWaypoints[] = [$endLat, $endLon];

            // Limit waypoints (OSRM has limits)
            if (count($allWaypoints) > 100) {
                $allWaypoints = $this->sampleWaypoints($allWaypoints, 100);
            }

            $waypointsString = implode(';', array_map(function($wp) {
                return $wp[1] . ',' . $wp[0]; // lon,lat format for OSRM
            }, $allWaypoints));

            // Build URL - OSRM will automatically snap waypoints to nearest road
            // The approaches parameter helps ensure waypoints are properly handled
            // but may not be supported by all OSRM instances
            $baseUrl = sprintf(
                '%s/route/v1/driving/%s?overview=full&geometries=geojson&alternatives=false&steps=false',
                $this->osrmBaseUrl,
                $waypointsString
            );
            
            // Try with approaches parameter first (for better waypoint snapping)
            // If it fails, fall back to basic URL
            $url = $baseUrl . '&approaches=' . str_repeat('unrestricted;', count($allWaypoints) - 1) . 'unrestricted';
            $response = Http::timeout(30)->get($url);
            
            // If approaches parameter causes issues, try without it
            if (!$response->successful() && strpos($response->body(), 'approaches') !== false) {
                Log::info('OSRM approaches parameter not supported, falling back to basic routing');
                $response = Http::timeout(30)->get($baseUrl);
            }

            if (!$response->successful()) {
                Log::error('OSRM route request failed', [
                    'status' => $response->status(),
                    'url' => $url
                ]);
                return null;
            }

            $data = $response->json();

            if (!isset($data['routes']) || empty($data['routes'])) {
                return null;
            }

            $route = $data['routes'][0];
            $geometry = $route['geometry']['coordinates'];

            // Convert GeoJSON format [lon, lat] to [lat, lon]
            $coordinates = array_map(function($coord) {
                return [$coord[1], $coord[0]];
            }, $geometry);

            $distance = $route['distance']; // meters
            $duration = $route['duration']; // seconds

            // Validate that waypoints are actually on the route (within 200m)
            if (!empty($waypoints)) {
                $waypointErrors = [];
                foreach ($waypoints as $index => $wp) {
                    $wpLat = isset($wp['lat']) ? $wp['lat'] : $wp[0];
                    $wpLon = isset($wp['lon']) ? $wp['lon'] : $wp[1];
                    
                    $minDistance = PHP_INT_MAX;
                    foreach ($coordinates as $coord) {
                        $dist = $this->getDistance($wpLat, $wpLon, $coord[0], $coord[1]);
                        $minDistance = min($minDistance, $dist);
                    }
                    
                    // If waypoint is more than 200m from route, log a warning
                    if ($minDistance > 200) {
                        Log::warning('Waypoint not on route', [
                            'waypoint_index' => $index,
                            'waypoint' => [$wpLat, $wpLon],
                            'min_distance_to_route' => $minDistance
                        ]);
                        $waypointErrors[] = "Waypoint " . ($index + 1) . " is " . round($minDistance) . "m from route";
                    }
                }
                
                // If waypoints are too far from route, this might indicate a routing issue
                // But we still return the route as OSRM should handle waypoint snapping
                if (!empty($waypointErrors)) {
                    Log::info('Waypoint validation warnings', ['errors' => $waypointErrors]);
                }
            }

            // Calculate route statistics
            $stats = $this->calculateRouteStats($coordinates);

            $result = [
                'coordinates' => $coordinates,
                'distance' => $distance,
                'duration' => $duration,
                'type' => 'straightest',
                'curvature' => $stats['curvature'],
                'corner_count' => $stats['corner_count'],
                'elevation_gain' => $stats['elevation_gain'],
                'elevation_loss' => $stats['elevation_loss'],
                'max_elevation' => $stats['max_elevation'],
                'min_elevation' => $stats['min_elevation']
            ];
            
            // Cache the result for 1 hour
            Cache::put($cacheKey, $result, now()->addHour());
            
            return $result;
        } catch (\Exception $e) {
            Log::error('Error calculating straightest route', [
                'error' => $e->getMessage(),
                'start' => [$startLat, $startLon],
                'end' => [$endLat, $endLon],
                'waypoints' => $waypoints
            ]);
            return null;
        }
    }

    /**
     * Find curved route using OSRM with strategic waypoint placement
     * Uses OSRM alternatives and waypoints to generate routes with different curvature
     */
    public function findCurvedRoute($startLat, $startLon, $endLat, $endLon, $curvatureLevel = 'moderate', $waypoints = [])
    {
        $startTime = microtime(true);
        $timings = [];
        
        try {
            // If waypoints are provided, route through them with curvature applied between segments
            if (!empty($waypoints)) {
                Log::info('Route calculation started (with waypoints)', [
                    'curvature_level' => $curvatureLevel,
                    'waypoint_count' => count($waypoints)
                ]);
                $result = $this->findCurvedRouteWithWaypoints($startLat, $startLon, $endLat, $endLon, $waypoints, $curvatureLevel);
                $totalTime = microtime(true) - $startTime;
                Log::info('Route calculation completed (with waypoints)', [
                    'curvature_level' => $curvatureLevel,
                    'total_time_seconds' => round($totalTime, 2),
                    'waypoint_count' => count($waypoints)
                ]);
                return $result;
            }
            
            Log::info('Route calculation started (no waypoints)', [
                'curvature_level' => $curvatureLevel
            ]);
            
            // Get straightest route for comparison
            $straightStartTime = microtime(true);
            $straightRoute = $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon);
            $timings['straightest_route'] = round((microtime(true) - $straightStartTime) * 1000, 2);
            
            if (!$straightRoute) {
                return null;
            }

            // Generate multiple route candidates using OSRM + Overpass API strategies
            // Strategy priority: 1) OSRM alternatives, 2) Curved roads from OSM, 3) Intelligent waypoints
            // Pass straight route to avoid redundant API calls
            $candidatesStartTime = microtime(true);
            $routeCandidates = $this->generateOSRMRouteCandidates(
                $startLat,
                $startLon,
                $endLat,
                $endLon,
                $curvatureLevel,
                $straightRoute['distance'],
                $straightRoute // Pass straight route to avoid redundant calls
            );
            $timings['generate_candidates'] = round((microtime(true) - $candidatesStartTime) * 1000, 2);
            $timings['candidates_count'] = count($routeCandidates);
            
            if (empty($routeCandidates)) {
                Log::info('No route candidates generated, using straightest route', ['curvature_level' => $curvatureLevel]);
                // Return straightest route so all three options always appear
                return $straightRoute;
            }
            
            // Select the best route based on curvature level
            $selectStartTime = microtime(true);
            $bestRoute = $this->selectBestRouteByCurvature($routeCandidates, $curvatureLevel, $straightRoute);
            $timings['select_best_route'] = round((microtime(true) - $selectStartTime) * 1000, 2);
            
            if (!$bestRoute) {
                $totalTime = microtime(true) - $startTime;
                Log::info('No suitable curved route found after filtering, using straightest route', [
                    'curvature_level' => $curvatureLevel,
                    'total_time_seconds' => round($totalTime, 2),
                    'timings' => $timings
                ]);
                // Return straightest route so all three options always appear
                return $straightRoute;
            }
            
            // Kurviger-style: Allow MUCH longer routes for curved options
            // Kurviger routes can be 4.5-20x longer than straightest routes
            // Distance limits based on curvature level:
            // - mellow: up to 4.5x longer (longer and curvier - clearly distinct from straightest)
            // - very_curved: up to 20x longer (much longer and more curvy - match Kurviger extreme routes)
            $maxDistanceMultiplier = $curvatureLevel === 'mellow' ? 4.5 : 20.0;
            $maxDistance = $straightRoute['distance'] * $maxDistanceMultiplier;
            
            // Check progress score - allow even longer routes if progress is good
            $progressScore = $this->calculateRouteProgressScore($bestRoute['coordinates']);
            $effectiveMaxDistance = $maxDistance;
            
            // If route has good progress and good curvature, allow up to 50% more distance
            if ($progressScore >= 0.70 && ($bestRoute['curvature'] ?? 0) > ($straightRoute['curvature'] ?? 0) * 1.2) {
                $effectiveMaxDistance = $maxDistance * 1.5;
            }
            
            // Only reject if route is extremely long AND has very poor curvature
            $curvatureRatio = ($straightRoute['curvature'] ?? 0) > 0 
                ? (($bestRoute['curvature'] ?? 0) / ($straightRoute['curvature'] ?? 0))
                : 0;
            
            if ($bestRoute['distance'] > $effectiveMaxDistance && $curvatureRatio < 1.0) {
                $totalTime = microtime(true) - $startTime;
                Log::info('Curved route exceeds max distance with poor curvature, using straightest route', [
                    'curved_distance' => $bestRoute['distance'],
                    'max_distance' => $effectiveMaxDistance,
                    'curvature_ratio' => $curvatureRatio,
                    'progress_score' => $progressScore,
                    'curvature_level' => $curvatureLevel,
                    'total_time_seconds' => round($totalTime, 2),
                    'timings' => $timings
                ]);
                // Return straightest route so all three options always appear
                return $straightRoute;
            }
            
            // Always return the route, even if it's the same as straightest
            // This ensures all three options always appear in the UI
            
            $totalTime = microtime(true) - $startTime;
            Log::info('Curved route selected', [
                'curvature_level' => $curvatureLevel,
                'straight_distance' => $straightRoute['distance'],
                'curved_distance' => $bestRoute['distance'],
                'straight_curvature' => $straightRoute['curvature'] ?? 0,
                'curved_curvature' => $bestRoute['curvature'] ?? 0,
                'candidates_tested' => count($routeCandidates),
                'total_time_seconds' => round($totalTime, 2),
                'timings_ms' => $timings
            ]);
            
            return $bestRoute;
        } catch (\Exception $e) {
            Log::error('Error calculating curved route', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'start' => [$startLat, $startLon],
                'end' => [$endLat, $endLon],
                'curvature_level' => $curvatureLevel ?? 'unknown'
            ]);
            return null;
        }
    }

    /**
     * Find curved route through waypoints by applying curvature logic between segments
     * Kurviger-style: Apply curvature BETWEEN waypoints, not by adding curved waypoints globally
     */
    private function findCurvedRouteWithWaypoints($startLat, $startLon, $endLat, $endLon, $waypoints, $curvatureLevel)
    {
        try {
            // Build list of all mandatory waypoints: start -> user waypoints -> end
            $allMandatoryPoints = [[$startLat, $startLon]];
            foreach ($waypoints as $wp) {
                $wpLat = isset($wp['lat']) ? $wp['lat'] : $wp[0];
                $wpLon = isset($wp['lon']) ? $wp['lon'] : $wp[1];
                $allMandatoryPoints[] = [$wpLat, $wpLon];
            }
            $allMandatoryPoints[] = [$endLat, $endLon];
            
            // If only start and end (no waypoints), use regular curved route logic
            if (count($allMandatoryPoints) == 2) {
                return $this->findCurvedRoute($startLat, $startLon, $endLat, $endLon, $curvatureLevel, []);
            }
            
            // Kurviger approach: Calculate curved route for each segment between waypoints
            // Then combine segments into one route with intermediate shaping points for detail
            $allRouteSegments = [];
            $totalDistance = 0;
            $totalDuration = 0;
            
            // Build waypoint list with intermediate shaping points for more detailed routing
            // This ensures OSRM generates more detailed geometry
            $waypointsForRouting = [];
            $waypointsForRouting[] = [$allMandatoryPoints[0][0], $allMandatoryPoints[0][1]]; // Start
            
            // Add intermediate shaping points between user waypoints for smoother, more detailed routes
            for ($i = 0; $i < count($allMandatoryPoints) - 1; $i++) {
                $segmentStart = $allMandatoryPoints[$i];
                $segmentEnd = $allMandatoryPoints[$i + 1];
                
                // Calculate segment distance
                $segmentDist = $this->getDistance($segmentStart[0], $segmentStart[1], $segmentEnd[0], $segmentEnd[1]);
                
                // Add intermediate shaping points for longer segments to ensure route detail
                // More points for very curved routes, but limit to avoid performance issues
                $numShapingPoints = 0;
                if ($segmentDist > 80000) { // > 80km - very long segments
                    $numShapingPoints = $curvatureLevel === 'very_curved' ? 2 : 1;
                } elseif ($segmentDist > 50000) { // > 50km
                    $numShapingPoints = $curvatureLevel === 'very_curved' ? 1 : 0;
                }
                // Skip shaping points for straightest routes to improve performance
                if ($curvatureLevel === 'straightest' || $curvatureLevel === 'fastest') {
                    $numShapingPoints = 0;
                }
                
                // Add intermediate shaping points along the direct path
                for ($j = 1; $j <= $numShapingPoints; $j++) {
                    $ratio = $j / ($numShapingPoints + 1);
                    $shapingLat = $segmentStart[0] + ($segmentEnd[0] - $segmentStart[0]) * $ratio;
                    $shapingLon = $segmentStart[1] + ($segmentEnd[1] - $segmentStart[1]) * $ratio;
                    $waypointsForRouting[] = [$shapingLat, $shapingLon];
                }
                
                // Add the end waypoint of this segment
                if ($i < count($allMandatoryPoints) - 1) {
                    $waypointsForRouting[] = [$segmentEnd[0], $segmentEnd[1]];
                }
            }
            
            // Kurviger approach: Calculate route through all waypoints (including shaping points) segment by segment
            // This ensures each segment gets proper curvature treatment while maintaining route detail
            for ($i = 0; $i < count($waypointsForRouting) - 1; $i++) {
                $segmentStart = $waypointsForRouting[$i];
                $segmentEnd = $waypointsForRouting[$i + 1];
                
                // For each segment, calculate a curved route based on curvature level
                $segmentRoute = $this->findCurvedRouteSegment(
                    $segmentStart[0], $segmentStart[1],
                    $segmentEnd[0], $segmentEnd[1],
                    $curvatureLevel
                );
                
                if (!$segmentRoute) {
                    // EXTREME: For mellow/very_curved, don't fallback to straightest - try harder
                    if ($curvatureLevel === 'mellow' || $curvatureLevel === 'very_curved') {
                        // Try one more time with more aggressive parameters
                        Log::warning('Segment route returned null for curved route, retrying with more aggressive parameters', [
                            'curvature_level' => $curvatureLevel,
                            'segment' => $i
                        ]);
                        // Force regeneration by clearing any potential cache
                        $segmentRoute = $this->findCurvedRouteSegment(
                            $segmentStart[0], $segmentStart[1],
                            $segmentEnd[0], $segmentEnd[1],
                            $curvatureLevel
                        );
                    }
                    
                    // Only fallback to straightest if still null AND it's not a curved route
                    if (!$segmentRoute && ($curvatureLevel === 'straightest' || $curvatureLevel === 'fastest')) {
                        $segmentRoute = $this->findStraightestRoute(
                            $segmentStart[0], $segmentStart[1],
                            $segmentEnd[0], $segmentEnd[1]
                        );
                    }
                }
                
                // EXTREME: For mellow/very_curved, validate segment meets minimum requirements before adding
                if ($segmentRoute) {
                    $shouldAddSegment = true;
                    
                    if ($curvatureLevel === 'mellow' || $curvatureLevel === 'very_curved') {
                        // Get straightest for this segment to validate
                        $segmentStraight = $this->findStraightestRoute(
                            $segmentStart[0], $segmentStart[1],
                            $segmentEnd[0], $segmentEnd[1]
                        );
                        if ($segmentStraight) {
                            $segmentCurvature = $segmentRoute['curvature'] ?? 0;
                            $segmentStraightCurvature = $segmentStraight['curvature'] ?? 0;
                            $segmentCurvatureRatio = $segmentStraightCurvature > 0 ? ($segmentCurvature / $segmentStraightCurvature) : 0;
                            
                            // Kurviger-style: Validate segment meets minimum requirements (relaxed for route diversity)
                            if ($curvatureLevel === 'mellow' && $segmentCurvatureRatio < 1.5) {
                                Log::warning('Segment does not meet mellow 1.5x requirement, retrying', [
                                    'segment' => $i,
                                    'curvature_ratio' => $segmentCurvatureRatio
                                ]);
                                $shouldAddSegment = false;
                                // Try one more time
                                $segmentRoute = $this->findCurvedRouteSegment(
                                    $segmentStart[0], $segmentStart[1],
                                    $segmentEnd[0], $segmentEnd[1],
                                    $curvatureLevel
                                );
                                if ($segmentRoute) {
                                    $segmentCurvature = $segmentRoute['curvature'] ?? 0;
                                    $segmentCurvatureRatio = $segmentStraightCurvature > 0 ? ($segmentCurvature / $segmentStraightCurvature) : 0;
                                    if ($segmentCurvatureRatio >= 1.5) {
                                        $shouldAddSegment = true;
                                    }
                                }
                            } elseif ($curvatureLevel === 'very_curved') {
                                $minCurvature = max(0.004, ($segmentStraightCurvature * 3.0));
                                if ($segmentCurvature < $minCurvature) {
                                    Log::warning('Segment does not meet very_curved requirement, retrying', [
                                        'segment' => $i,
                                        'curvature' => $segmentCurvature,
                                        'min_required' => $minCurvature
                                    ]);
                                    $shouldAddSegment = false;
                                }
                            }
                        }
                    }
                    
                    if ($shouldAddSegment) {
                        // Add segment coordinates (skip first point if not first segment to avoid duplicates)
                        $segmentCoords = $segmentRoute['coordinates'];
                        if ($i > 0 && count($segmentCoords) > 0) {
                            // Skip first point to avoid duplicate
                            $segmentCoords = array_slice($segmentCoords, 1);
                        }
                        $allRouteSegments = array_merge($allRouteSegments, $segmentCoords);
                        $totalDistance += $segmentRoute['distance'];
                        $totalDuration += $segmentRoute['duration'];
                    } else {
                        // CRITICAL FIX: Accept segment even if it doesn't meet strict requirements
                        // This ensures route completeness - better to have a route than no route
                        Log::warning('Segment does not meet strict curvature requirements, but accepting to ensure route completeness', [
                            'segment' => $i,
                            'curvature_level' => $curvatureLevel,
                            'segment_curvature' => $segmentRoute['curvature'] ?? 0,
                            'straight_curvature' => $segmentStraight['curvature'] ?? 0
                        ]);
                        // Add segment anyway to ensure route is complete
                        $segmentCoords = $segmentRoute['coordinates'];
                        if ($i > 0 && count($segmentCoords) > 0) {
                            $segmentCoords = array_slice($segmentCoords, 1);
                        }
                        $allRouteSegments = array_merge($allRouteSegments, $segmentCoords);
                        $totalDistance += $segmentRoute['distance'];
                        $totalDuration += $segmentRoute['duration'];
                    }
                }
            }
            
            // CRITICAL FIX: If no segments were added, we need a fallback strategy
            // For mellow/very_curved, don't just fall back to straightest - that makes all routes identical
            if (empty($allRouteSegments)) {
                if ($curvatureLevel === 'mellow' || $curvatureLevel === 'very_curved') {
                    // For curved routes, try one more time with relaxed requirements
                    Log::warning('No segments added for curved route, trying with relaxed requirements', [
                        'curvature_level' => $curvatureLevel
                    ]);
                    // Try to build route segment by segment with relaxed validation
                    for ($i = 0; $i < count($waypointsForRouting) - 1; $i++) {
                        $segmentStart = $waypointsForRouting[$i];
                        $segmentEnd = $waypointsForRouting[$i + 1];
                        $segmentRoute = $this->findCurvedRouteSegment(
                            $segmentStart[0], $segmentStart[1],
                            $segmentEnd[0], $segmentEnd[1],
                            $curvatureLevel
                        );
                        // Accept segment even if it doesn't meet strict requirements (better than nothing)
                        if ($segmentRoute) {
                            $segmentCoords = $segmentRoute['coordinates'];
                            if ($i > 0 && count($segmentCoords) > 0) {
                                $segmentCoords = array_slice($segmentCoords, 1);
                            }
                            $allRouteSegments = array_merge($allRouteSegments, $segmentCoords);
                            $totalDistance += $segmentRoute['distance'];
                            $totalDuration += $segmentRoute['duration'];
                        }
                    }
                }
                
                // If still empty, only then fall back to straightest
                if (empty($allRouteSegments)) {
                    Log::warning('All segments failed, falling back to straightest route', [
                        'curvature_level' => $curvatureLevel
                    ]);
                    return $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon, $waypoints);
                }
            }
            
            // Calculate route statistics
            $stats = $this->calculateRouteStats($allRouteSegments);
            
            // Kurviger-style: Validate final combined route (relaxed validation - log but don't reject)
            if ($curvatureLevel === 'mellow' || $curvatureLevel === 'very_curved') {
                // Get straightest route for comparison
                $straightRoute = $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon, $waypoints);
                if ($straightRoute) {
                    $straightCurvature = $straightRoute['curvature'] ?? 0;
                    $finalCurvature = $stats['curvature'] ?? 0;
                    $curvatureRatio = $straightCurvature > 0 ? ($finalCurvature / $straightCurvature) : 0;
                    
                    // Log if doesn't meet minimum requirements, but don't reject (better than identical routes)
                    if ($curvatureLevel === 'mellow' && $curvatureRatio < 1.5) {
                        Log::warning('Combined mellow route does not meet 1.5x minimum, but accepting to ensure route diversity', [
                            'curvature_ratio' => $curvatureRatio,
                            'final_curvature' => $finalCurvature,
                            'straight_curvature' => $straightCurvature
                        ]);
                    } elseif ($curvatureLevel === 'very_curved') {
                        $minCurvature = max(0.004, ($straightCurvature * 3.0));
                        if ($finalCurvature < $minCurvature) {
                            Log::warning('Combined very curved route does not meet minimum, but accepting to ensure route diversity', [
                                'final_curvature' => $finalCurvature,
                                'min_required' => $minCurvature
                            ]);
                        }
                    }
                }
            }
            
            Log::info('Curved route with waypoints (Kurviger-style)', [
                'curvature_level' => $curvatureLevel,
                'distance' => $totalDistance,
                'duration' => $totalDuration,
                'waypoint_count' => count($waypoints),
                'segment_count' => count($allMandatoryPoints) - 1,
                'curvature' => $stats['curvature']
            ]);
            
            return [
                'coordinates' => $allRouteSegments,
                'distance' => $totalDistance,
                'duration' => $totalDuration,
                'type' => 'curved_with_waypoints',
                'curvature' => $stats['curvature'],
                'corner_count' => $stats['corner_count'],
                'elevation_gain' => $stats['elevation_gain'],
                'elevation_loss' => $stats['elevation_loss'],
                'max_elevation' => $stats['max_elevation'],
                'min_elevation' => $stats['min_elevation']
            ];
        } catch (\Exception $e) {
            Log::error('Error calculating curved route with waypoints', [
                'error' => $e->getMessage(),
                'start' => [$startLat, $startLon],
                'end' => [$endLat, $endLon],
                'waypoints' => $waypoints
            ]);
            // Fallback to straightest route through waypoints
            return $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon, $waypoints);
        }
    }
    
    /**
     * Find curved route for a single segment between two waypoints
     * Kurviger-style: Get OSRM alternatives and select based on curvature preference
     */
    private function findCurvedRouteSegment($startLat, $startLon, $endLat, $endLon, $curvatureLevel)
    {
        try {
            // Get straightest route first for comparison
            $straightRoute = $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon);
            if (!$straightRoute) {
                return null;
            }
            
            // For straightest: just return straightest route
            if ($curvatureLevel === 'straightest' || $curvatureLevel === 'fastest') {
                return $straightRoute;
            }
            
            // Get OSRM alternatives - these are different route options
            $alternatives = $this->getOSRMAlternatives($startLat, $startLon, $endLat, $endLon, $curvatureLevel);
            
            // CRITICAL FIX: For different curvature levels, generate DIFFERENT route candidates
            // OSRM alternatives alone may be identical for short segments, so we need to ensure diversity
            // Generate additional routes using intelligent waypoint placement for more diversity
            // This ensures we have different route options to choose from
            // Limit intelligent routes to avoid performance issues
            $intelligentRoutes = [];
            try {
                // For mellow and very_curved, use different waypoint strategies to ensure route diversity
                if ($curvatureLevel === 'mellow') {
                    // Mellow: Use optimized waypoints (moderate curvature, distance-neutral)
                    $intelligentRoutes = $this->generateRoutesWithOptimizedWaypoints(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        $curvatureLevel,
                        $straightRoute['distance'],
                        $straightRoute,
                        5 // Generate 5 candidates for mellow
                    );
                } elseif ($curvatureLevel === 'very_curved') {
                    // Very curved: Use aggressive waypoint generation for maximum curvature
                    $intelligentRoutes = $this->generateRoutesWithOptimizedWaypoints(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        $curvatureLevel,
                        $straightRoute['distance'],
                        $straightRoute,
                        8 // Generate 8 candidates for very curved
                    );
                } else {
                    // For other levels, use intelligent waypoints
                    $intelligentRoutes = $this->generateRoutesWithIntelligentWaypoints(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        $curvatureLevel,
                        $straightRoute['distance'],
                        $straightRoute
                    );
                }
            } catch (\Exception $e) {
                Log::warning('Error generating intelligent waypoints, continuing with alternatives', [
                    'error' => $e->getMessage()
                ]);
            }
            $alternatives = array_merge($alternatives, $intelligentRoutes);
            
            // DO NOT include straightest route for mellow/very curved - we want DIFFERENT routes
            // Only include straightest for straightest/fastest routes
            if ($curvatureLevel === 'straightest' || $curvatureLevel === 'fastest') {
                $alternatives[] = $straightRoute;
            }
        
        if (empty($alternatives)) {
            return $straightRoute;
        }
        
        // Score each alternative based on curvature level
        $scoredRoutes = [];
        $isVeryCurved = ($curvatureLevel === 'very_curved');
        
        foreach ($alternatives as $route) {
            // Kurviger-style: Calculate full stats only if route passes initial filters
            // This saves significant time by avoiding expensive calculations for rejected routes
            if (!($route['_stats_calculated'] ?? false)) {
                $stats = $this->calculateRouteStats($route['coordinates']);
                $route['curvature'] = $stats['curvature'];
                $route['corner_count'] = $stats['corner_count'];
                $route['elevation_gain'] = $stats['elevation_gain'];
                $route['elevation_loss'] = $stats['elevation_loss'];
                $route['max_elevation'] = $stats['max_elevation'];
                $route['min_elevation'] = $stats['min_elevation'];
                $route['_stats_calculated'] = true;
            }
            
            // Kurviger-style: STRICT progress filtering - only accept routes with excellent forward progress
            // This is the key difference - Kurviger prioritizes routes that consistently move toward destination
            $progressScore = $this->calculateRouteProgressScore($route['coordinates']);
            
            // Calculate route metrics
            $distanceRatio = $route['distance'] / $straightRoute['distance'];
            $routeCurvature = $route['curvature'] ?? 0;
            $straightCurvature = $straightRoute['curvature'] ?? 0;
            
            // Kurviger-style: Progress requirement - prioritize routes with good forward progress
            // RELAXED threshold to ensure route diversity (was 0.75, now 0.65)
            if ($progressScore < 0.65) {
                continue; // Reject routes with very poor forward progress
            }
            
            // Kurviger-style: Check for backtracking - reject if significant backtracking detected
            // Even with good progress, reject routes with significant backtracking
            $hasSignificantBacktrack = $this->hasLoopOrBacktrack($route['coordinates'], $straightRoute['distance'], $isVeryCurved);
            
            if ($hasSignificantBacktrack) {
                // Exception: Only allow if progress is reasonable (0.7+) AND route has reasonable curvature
                // RELAXED to ensure route diversity (was 0.8, now 0.7)
                if ($progressScore < 0.7 || ($isVeryCurved && $routeCurvature < 0.002)) {
                    continue; // Reject routes with backtracking unless they have reasonable progress/curvature
                }
            }
            
            // Kurviger-style: Allow longer routes if they have high curvature AND excellent progress
            // Kurviger-style: Mellow should be distance-neutral (1.1-1.4x), very curved can be longer (up to 2.5x)
            // This matches Kurviger's quality where curvy routes maintain length, extra curvy can be longer
            $maxDistanceRatio = $isVeryCurved ? 2.5 : 1.4; // Mellow: 1.4x max, Very curved: 2.5x max
            
            // Skip routes that are way too long (unless they have good progress + high curvature)
            if ($distanceRatio > $maxDistanceRatio) {
                // Exception: Allow if route has GOOD progress (0.8+) AND reasonable curvature
                // RELAXED to ensure route diversity (was 0.9, now 0.8)
                if ($progressScore < 0.8 || ($isVeryCurved && $routeCurvature < 0.003)) {
                    continue;
                }
            }
            
            // Kurviger-style: Mellow routes should be distance-neutral to moderately longer (1.1-1.4x)
            // with clear curvature increase (1.5-2.5x) - matching Kurviger's "curvy" quality
            if ($curvatureLevel === 'mellow') {
                // Calculate curvature ratio first (using fast estimate if full stats not calculated)
                $curvatureRatio = $straightCurvature > 0 ? ($routeCurvature / $straightCurvature) : 0;
                
                // Kurviger quality: Require MINIMUM 1.5x curvature to ensure clear differentiation from straightest
                // This matches Kurviger's curvy routes which are noticeably more curved
                if ($curvatureRatio < 1.5) {
                    continue; // Reject routes that are too similar to straightest
                }
                
                // Kurviger-style: Prefer distance-neutral to moderately longer routes (1.1-1.4x)
                // This matches Kurviger's approach where curvy routes maintain similar length
                // RELAXED: Allow up to 1.6x distance to ensure route diversity
                if ($distanceRatio > 1.6) {
                    // Exception: Only allow longer routes if they have good curvature (2.0x+) AND progress
                    // RELAXED thresholds (was 2.5x/0.90, now 2.0x/0.80)
                    if ($curvatureRatio < 2.0 || $progressScore < 0.80) {
                        continue; // Reject routes that are too long without sufficient curvature
                    }
                }
                
                // RELAXED: Reject routes where distance increases significantly but curvature doesn't
                // If distance increases more than 30% but curvature is less than 1.5x, it's not a good mellow route
                // RELAXED (was 20%/1.8x, now 30%/1.5x)
                if ($distanceRatio > 1.30 && $curvatureRatio < 1.5) {
                    continue; // Distance increased but curvature didn't - reject
                }
            } elseif ($isVeryCurved) {
                // Kurviger-style: Very curved routes should have significant curvature
                // Require minimum 0.004 curvature (or 3x straightest, whichever is higher)
                $minCurvature = max(0.004, ($straightCurvature * 3.0));
                if ($routeCurvature < $minCurvature) {
                    continue; // Reject routes that aren't curved enough
                }
            }
            
            // Calculate score based on curvature level
            // Kurviger-style: Progress score heavily influences final score
            $baseScore = $this->scoreRouteForCurvature($route, $straightRoute, $curvatureLevel);
            
            // STRONG boost for routes with excellent progress (Kurviger prioritizes this)
            // Routes with 0.9+ progress get significant boost, routes with 0.85-0.9 get moderate boost
            $progressMultiplier = $progressScore >= 0.95 ? 2.0 : ($progressScore >= 0.9 ? 1.5 : ($progressScore >= 0.85 ? 1.2 : 1.0));
            $finalScore = $baseScore * $progressMultiplier;
            
            $scoredRoutes[] = [
                'route' => $route,
                'score' => $finalScore,
                'distance_ratio' => $distanceRatio,
                'curvature' => $routeCurvature,
                'progress_score' => $progressScore
            ];
        }
        
        // CRITICAL FIX: If no valid alternatives, we need to ensure route diversity
        // For mellow/very_curved, don't return null or straightest - try to use best available alternative
        if (empty($scoredRoutes)) {
            if ($curvatureLevel === 'mellow' || $curvatureLevel === 'very_curved') {
                Log::warning('No valid alternatives found for curved route after filtering, using best available alternative', [
                    'curvature_level' => $curvatureLevel,
                    'alternatives_count' => count($alternatives)
                ]);
                // CRITICAL: Don't return null or straightest - use the best alternative even if it doesn't meet strict requirements
                // This ensures routes are different, which is more important than perfect filtering
                if (!empty($alternatives)) {
                    // Use the first alternative (best we have) - better than identical routes
                    $bestAvailable = $alternatives[0];
                    // Calculate stats if not already calculated
                    if (!($bestAvailable['_stats_calculated'] ?? false)) {
                        $stats = $this->calculateRouteStats($bestAvailable['coordinates']);
                        $bestAvailable['curvature'] = $stats['curvature'];
                        $bestAvailable['corner_count'] = $stats['corner_count'];
                    }
                    Log::info('Using best available alternative to ensure route diversity', [
                        'curvature' => $bestAvailable['curvature'] ?? 0,
                        'distance' => $bestAvailable['distance'] ?? 0
                    ]);
                    return $bestAvailable;
                }
                // Only return null if absolutely no alternatives exist
                return null;
            }
            return $straightRoute;
        }
        
        // Sort by score (higher is better)
        usort($scoredRoutes, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        // Select best route
        $bestScored = $scoredRoutes[0];
        $bestRoute = $bestScored['route'];
        
        // EXTREME CHANGE: For mellow, ALWAYS use very curved candidates and score them for mellow
        // This ensures mellow is ALWAYS different from straightest
        if ($curvatureLevel === 'mellow') {
            $finalCurvatureRatio = $straightCurvature > 0 ? ($bestScored['curvature'] / $straightCurvature) : 0;
            
            // EXTREME: ALWAYS use very curved candidates for mellow to ensure diversity
            // Don't check threshold - always try to get better candidates
            // EXTREME: Increased minimum threshold check to 2.5x
            if ($finalCurvatureRatio < 2.5 || count($scoredRoutes) < 2) {
                Log::info('Mellow route: Using very curved candidates to ensure diversity', [
                    'curvature_ratio' => $finalCurvatureRatio,
                    'alternatives_count' => count($scoredRoutes)
                ]);
                
                // ALWAYS get very curved candidates for mellow
                try {
                    $veryCurvedAlternatives = $this->getOSRMAlternatives($startLat, $startLon, $endLat, $endLon, 'very_curved');
                    $veryCurvedIntelligentRoutes = [];
                    try {
                        $veryCurvedIntelligentRoutes = $this->generateRoutesWithOptimizedWaypoints(
                            $startLat,
                            $startLon,
                            $endLat,
                            $endLon,
                            'very_curved',
                            $straightRoute['distance'],
                            $straightRoute,
                            10 // EXTREME: Get many more candidates to ensure we find a good mellow route
                        );
                    } catch (\Exception $e) {
                        // Ignore errors
                    }
                    $veryCurvedCandidates = array_merge($veryCurvedAlternatives, $veryCurvedIntelligentRoutes);
                    
                    // Score very curved candidates using mellow scoring (prefers moderate curvature 1.5x-3x)
                    $mellowScoredRoutes = [];
                    foreach ($veryCurvedCandidates as $route) {
                        if (!($route['_stats_calculated'] ?? false)) {
                            $stats = $this->calculateRouteStats($route['coordinates']);
                            $route['curvature'] = $stats['curvature'];
                            $route['corner_count'] = $stats['corner_count'];
                            $route['elevation_gain'] = $stats['elevation_gain'];
                            $route['elevation_loss'] = $stats['elevation_loss'];
                            $route['max_elevation'] = $stats['max_elevation'];
                            $route['min_elevation'] = $stats['min_elevation'];
                            $route['_stats_calculated'] = true;
                        }
                        
                        $progressScore = $this->calculateRouteProgressScore($route['coordinates']);
                        if ($progressScore < 0.70) { // More lenient for mellow
                            continue;
                        }
                        
                        $distanceRatio = $route['distance'] / $straightRoute['distance'];
                        $routeCurvature = $route['curvature'] ?? 0;
                        $curvatureRatio = $straightCurvature > 0 ? ($routeCurvature / $straightCurvature) : 0;
                        
                        // EXTREME: For mellow, prefer routes with 2.5x-4.5x curvature (moderate, not extreme)
                        if ($curvatureRatio < 2.5) {
                            continue; // Skip too similar
                        }
                        
                        // Score using mellow scoring (prefers moderate curvature)
                        $baseScore = $this->scoreRouteForCurvature($route, $straightRoute, 'mellow');
                        $progressMultiplier = $progressScore >= 0.95 ? 2.0 : ($progressScore >= 0.9 ? 1.5 : ($progressScore >= 0.85 ? 1.2 : 1.0));
                        $finalScore = $baseScore * $progressMultiplier;
                        
                        $mellowScoredRoutes[] = [
                            'route' => $route,
                            'score' => $finalScore,
                            'distance_ratio' => $distanceRatio,
                            'curvature' => $routeCurvature,
                            'progress_score' => $progressScore
                        ];
                    }
                    
                    // Merge with existing scored routes and re-sort
                    $allScoredRoutes = array_merge($scoredRoutes, $mellowScoredRoutes);
                    usort($allScoredRoutes, function($a, $b) {
                        return $b['score'] <=> $a['score'];
                    });
                    
                    if (!empty($allScoredRoutes)) {
                        $bestMellow = $allScoredRoutes[0];
                        $mellowCurvatureRatio = $straightCurvature > 0 ? ($bestMellow['curvature'] / $straightCurvature) : 0;
                        
                        if ($mellowCurvatureRatio >= 2.5) {
                            Log::info('Mellow route selected from very curved candidates', [
                                'curvature_ratio' => $mellowCurvatureRatio,
                                'selected_curvature' => $bestMellow['curvature'],
                                'total_candidates' => count($allScoredRoutes)
                            ]);
                            $bestScored = $bestMellow;
                            $bestRoute = $bestMellow['route'];
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Mellow very curved candidate generation failed', ['error' => $e->getMessage()]);
                }
            }
            
            // EXTREME: Final check - REJECT if still too similar (don't return bad routes)
            $finalCurvatureRatio = $straightCurvature > 0 ? ($bestScored['curvature'] / $straightCurvature) : 0;
            if ($finalCurvatureRatio < 2.5) {
                Log::warning('Mellow route still too similar - rejecting and trying to generate more candidates', [
                    'curvature_ratio' => $finalCurvatureRatio
                ]);
                // EXTREME: Don't return routes that don't meet minimum criteria
                // Try one more time with even more aggressive waypoint generation
                try {
                    $moreRoutes = $this->generateRoutesWithOptimizedWaypoints(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        'very_curved',
                        $straightRoute['distance'],
                        $straightRoute,
                        15 // Even more candidates
                    );
                    foreach ($moreRoutes as $route) {
                        $stats = $this->calculateRouteStats($route['coordinates']);
                        $route['curvature'] = $stats['curvature'];
                        $routeCurvature = $stats['curvature'];
                        $curvatureRatio = $straightCurvature > 0 ? ($routeCurvature / $straightCurvature) : 0;
                        if ($curvatureRatio >= 2.0) {
                            $progressScore = $this->calculateRouteProgressScore($route['coordinates']);
                            if ($progressScore >= 0.70) {
                                $baseScore = $this->scoreRouteForCurvature($route, $straightRoute, 'mellow');
                                $progressMultiplier = $progressScore >= 0.95 ? 2.0 : ($progressScore >= 0.9 ? 1.5 : ($progressScore >= 0.85 ? 1.2 : 1.0));
                                $finalScore = $baseScore * $progressMultiplier;
                                if ($finalScore > ($bestScored['score'] ?? 0)) {
                                    $bestScored = [
                                        'route' => $route,
                                        'score' => $finalScore,
                                        'curvature' => $routeCurvature
                                    ];
                                    $bestRoute = $route;
                                    Log::info('Found better mellow route from additional generation', [
                                        'curvature_ratio' => $curvatureRatio
                                    ]);
                                    break;
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to generate additional mellow candidates', ['error' => $e->getMessage()]);
                }
                
                // If still no good route, return the best we have (but log it)
                $finalCurvatureRatio = $straightCurvature > 0 ? ($bestScored['curvature'] / $straightCurvature) : 0;
                if ($finalCurvatureRatio < 2.5) {
                    Log::error('Mellow route does not meet minimum 2.5x curvature requirement', [
                        'curvature_ratio' => $finalCurvatureRatio,
                        'returning_anyway' => true
                    ]);
                }
            }
        }
        
        Log::info('Selected route for segment', [
            'curvature_level' => $curvatureLevel,
            'selected_score' => $bestScored['score'],
            'selected_distance' => $bestRoute['distance'],
            'straight_distance' => $straightRoute['distance'],
            'distance_ratio' => $bestScored['distance_ratio'],
            'selected_curvature' => $bestScored['curvature'],
            'curvature_ratio' => $curvatureLevel === 'mellow' ? ($straightCurvature > 0 ? ($bestScored['curvature'] / $straightCurvature) : 0) : null,
            'alternatives_count' => count($scoredRoutes)
        ]);
        
        return $bestRoute;
        } catch (\Exception $e) {
            Log::error('Error in findCurvedRouteSegment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'start' => [$startLat, $startLon],
                'end' => [$endLat, $endLon],
                'curvature_level' => $curvatureLevel
            ]);
            // Fallback to straightest route
            return $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon);
        }
    }
    
    /**
     * Score a route based on curvature level preference
     * Higher score = better match for the curvature level
     */
    private function scoreRouteForCurvature($route, $straightRoute, $curvatureLevel)
    {
        $distanceRatio = $route['distance'] / $straightRoute['distance'];
        $curvature = $route['curvature'] ?? 0;
        $cornerCount = $route['corner_count'] ?? 0;
        
        $score = 0;
        
        if ($curvatureLevel === 'mellow') {
            // Mellow: prefer routes with moderate curvature, but not too far from straightest
            // Balance between distance and curvature
            // IMPORTANT: Mellow must be more curved than straightest but less curved than very curved
            
            $straightCurvature = $straightRoute['curvature'] ?? 0;
            
            // Kurviger-style: Mellow routes should differ from straightest in BOTH distance and curvature
            // Allow moderate distance increase (15-350%) to find naturally curved roads
            // Kurviger-style: Prefer distance-neutral to longer routes (1.1-4.5x)
            // This matches Kurviger's curvy routes which can be longer and curvier (clearly distinct from straightest)
            $distanceScore = 0;
            if ($distanceRatio >= 1.10 && $distanceRatio <= 1.20) {
                $distanceScore = 5000; // Excellent range - minimal increase (Kurviger quality)
            } elseif ($distanceRatio >= 1.05 && $distanceRatio < 1.10) {
                $distanceScore = 4000; // Very good - almost distance-neutral
            } elseif ($distanceRatio >= 1.20 && $distanceRatio <= 1.30) {
                $distanceScore = 3500; // Good - moderate increase
            } elseif ($distanceRatio >= 1.30 && $distanceRatio <= 2.00) {
                $distanceScore = 2500 + min(1000, ($distanceRatio - 1.30) * 200); // Bonus for longer routes
            } elseif ($distanceRatio >= 2.00 && $distanceRatio <= 4.50) {
                $distanceScore = 3000 + min(800, ($distanceRatio - 2.00) * 150); // Bonus for even longer routes (clearly distinct)
            } elseif ($distanceRatio >= 1.00 && $distanceRatio < 1.05) {
                $distanceScore = 3000; // Distance-neutral, good
            } else {
                $distanceScore = max(0, 500 - abs($distanceRatio - 1.15) * 2000); // Low score for extremes
            }
            
            // Kurviger-style: Mellow routes should have 2.0x-4.0x curvature (longer and curvier)
            // Strongly prioritize routes with 2.2x-3.0x curvature for optimal Kurviger quality
            // Mellow should be longer and curvier (clearly distinct from straightest)
            $curvatureScore = 0;
            $curvatureRatio = $straightCurvature > 0 ? ($curvature / $straightCurvature) : 0;
            
            // Kurviger quality: Routes with 2.2x-3.0x curvature are ideal for mellow
            // This matches Kurviger's curvy routes which are noticeably curved but not extreme
            if ($curvatureRatio >= 2.5 && $curvatureRatio <= 3.0) {
                $curvatureScore = 42000 + ($curvature * 3200000); // Very strong preference - best range
            } elseif ($curvatureRatio >= 2.2 && $curvatureRatio < 2.5) {
                // Very good range
                $curvatureScore = 38000 + ($curvature * 2800000);
            } elseif ($curvatureRatio >= 2.0 && $curvatureRatio < 2.2) {
                // Good range, minimum acceptable
                $curvatureScore = 28000 + ($curvature * 2000000);
            } elseif ($curvatureRatio >= 3.0 && $curvatureRatio <= 4.0) {
                // Getting more curved, still excellent for mellow
                $curvatureScore = 35000 + ($curvature * 2500000);
            } else {
                // Too similar (< 2.0x) or too extreme (> 4.0x)
                $curvatureScore = max(0, 5000 + ($curvature * 500000)); // Lower score
            }
            
            // Kurviger-style: Strong bonus for distance-neutral routes with good curvature
            // Prefer routes where curvature increase is achieved with minimal distance increase
            if ($curvatureRatio >= 1.8 && $distanceRatio >= 1.05 && $distanceRatio <= 1.15) {
                // Excellent: Good curvature with minimal distance increase (Kurviger quality)
                $curvatureScore *= 3.0; // 3x bonus - this is the best case
            } elseif ($curvatureRatio >= 1.8 && $distanceRatio >= 1.15 && $distanceRatio <= 1.30) {
                // Very good: Good curvature with moderate distance increase
                $curvatureScore *= 2.0; // Double bonus
            } elseif ($curvatureRatio >= 1.5 && $distanceRatio >= 1.10 && $distanceRatio <= 1.20) {
                // Good: Acceptable curvature with reasonable distance
                $curvatureScore *= 1.5; // 50% bonus
            }
            
            // Kurviger-style: For mellow, balance curvature and distance (both important)
            // Curvature slightly more important, but distance matters for quality
            // Weight curvature 2x more than distance to prioritize curved routes while maintaining quality
            $score = ($curvatureScore * 2.0) + ($distanceScore * 1.0); // Balanced weighting
            
        } else {
            // Very curved: STRONGLY prefer routes with high curvature
            // Allow longer distances for more curves - this is key for differentiation
            
            $straightCurvature = $straightRoute['curvature'] ?? 0;
            
            // Kurviger-style: Very curved routes can be longer (1.2-20x) to achieve high curvature (match Kurviger)
            // This matches Kurviger's extra curvy routes which can be significantly longer
            $distanceScore = 0;
            if ($distanceRatio >= 1.20 && $distanceRatio <= 1.50) {
                $distanceScore = 3000; // Excellent range - moderate increase for curves
            } elseif ($distanceRatio >= 1.50 && $distanceRatio <= 2.00) {
                $distanceScore = 2500; // Very good - longer for more curves
            } elseif ($distanceRatio >= 1.10 && $distanceRatio < 1.20) {
                $distanceScore = 2000; // Good - minimal increase
            } elseif ($distanceRatio >= 2.00 && $distanceRatio <= 20.0) {
                $distanceScore = 2000 + min(2000, ($distanceRatio - 2.0) * 120); // Bonus for longer routes (match Kurviger)
            } elseif ($distanceRatio <= 1.10) {
                $distanceScore = 1000; // Distance-neutral, less preferred for very curved
            } else {
                $distanceScore = max(0, 500 - ($distanceRatio - 20.0) * 200); // Very low for excessive distance
            }
            
            // Kurviger-style: Very curved routes should have high curvature (3.0x+ straightest - match Kurviger)
            // This matches Kurviger's extra curvy routes which are significantly more curved
            $curvatureScore = 0;
            $curvatureRatio = $straightCurvature > 0 ? ($curvature / $straightCurvature) : 0;
            
            // Kurviger quality: Routes with 0.012+ curvature or 5x+ ratio are ideal for very curved (match Kurviger)
            if ($curvature >= 0.012 || $curvatureRatio >= 5.0) {
                $curvatureScore = 60000 + ($curvature * 8000000); // Extremely strong preference
            } elseif ($curvature >= 0.010 || $curvatureRatio >= 4.5) {
                $curvatureScore = 55000 + ($curvature * 7500000); // Very strong preference
            } elseif ($curvature >= 0.008 || $curvatureRatio >= 4.0) {
                $curvatureScore = 50000 + ($curvature * 7000000); // Strong preference
            } elseif ($curvature >= 0.006 || $curvatureRatio >= 3.5) {
                $curvatureScore = 40000 + ($curvature * 5500000); // Good preference
            } elseif ($curvature >= 0.004 || $curvatureRatio >= 3.0) {
                $curvatureScore = 30000 + ($curvature * 4000000); // Acceptable (minimum)
            } elseif ($curvature >= 0.003) {
                $curvatureScore = 15000 + ($curvature * 2000000); // Lower preference
            } else {
                $curvatureScore = max(0, 5000 + ($curvature * 500000)); // Very low score
            }
            
            // Kurviger-style: Bonus for very curved routes with good curvature-to-distance ratio
            // Prefer routes where high curvature is achieved efficiently
            if (($curvature >= 0.008 || $curvatureRatio >= 4.0) && $distanceRatio <= 1.8) {
                // Excellent: Very high curvature with reasonable distance
                $curvatureScore *= 2.5; // 2.5x bonus
            } elseif (($curvature >= 0.006 || $curvatureRatio >= 3.0) && $distanceRatio <= 2.0) {
                // Very good: High curvature with moderate distance
                $curvatureScore *= 2.0; // Double bonus
            } elseif ($curvature >= 0.004 && $distanceRatio <= 1.5) {
                // Good: Good curvature with minimal distance
                $curvatureScore *= 1.5; // 50% bonus
            }
            
            // Prefer routes with more corners (indicates more curves)
            $cornerScore = min($cornerCount * 25, 2500); // Increased weight for corners
            
            // Kurviger-style: For very curved, curvature is MUCH more important than distance
            // This ensures we select routes with actual curves, matching Kurviger's extra curvy quality
            $score = ($curvatureScore * 4.0) + ($cornerScore * 2.0) + ($distanceScore * 0.5);
        }
        
        return $score;
    }

    /**
     * Generate multiple route candidates using ONLY OSRM (no Overpass API)
     * Rewritten from ground up: OSRM-only approach with intelligent waypoint generation
     * Priority: 1) OSRM alternatives, 2) Strategic waypoint placement, 3) Geometric waypoints
     */
    private function generateOSRMRouteCandidates($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $straightDistance, $straightRoute = null)
    {
        $candidates = [];
        // Generate more candidates for better route diversity
        $maxCandidates = $curvatureLevel === 'mellow' ? 8 : 12;
        
        // Strategy 1: Get OSRM alternatives (fastest, single API call)
        // OSRM provides multiple route alternatives automatically
        $alternatives = $this->getOSRMAlternatives($startLat, $startLon, $endLat, $endLon, $curvatureLevel);
        foreach ($alternatives as $route) {
            if ($route && count($candidates) < $maxCandidates) {
                $candidates[] = $route;
            }
        }
        
        Log::info('OSRM alternatives generated', [
            'count' => count($alternatives),
            'curvature_level' => $curvatureLevel
        ]);
        
        // Strategy 2: Generate routes with strategic waypoint placement
        // This creates routes that intentionally take longer, more scenic paths
        if ($straightRoute && count($candidates) < $maxCandidates) {
            $waypointRoutes = $this->generateRoutesWithOptimizedWaypoints(
                $startLat,
                $startLon,
                $endLat,
                $endLon,
                $curvatureLevel,
                $straightDistance,
                $straightRoute,
                $maxCandidates - count($candidates)
            );
            foreach ($waypointRoutes as $route) {
                if ($route && count($candidates) < $maxCandidates) {
                    $candidates[] = $route;
                }
            }
        }
        
        // Strategy 3: Generate routes with geometric waypoint placement (perpendicular offsets)
        // Creates routes that deviate from the straight line in interesting ways
        if (count($candidates) < $maxCandidates) {
            $perpendicularRoutes = $this->generateRoutesWithPerpendicularWaypoints(
                $startLat,
                $startLon,
                $endLat,
                $endLon,
                $curvatureLevel
            );
            foreach ($perpendicularRoutes as $route) {
                if ($route && count($candidates) < $maxCandidates) {
                    $candidates[] = $route;
                    if (count($candidates) >= $maxCandidates) {
                        break;
                    }
                }
            }
        }
        
        Log::info('Total route candidates generated', [
            'count' => count($candidates),
            'curvature_level' => $curvatureLevel,
            'max_candidates' => $maxCandidates
        ]);
        
        return $candidates;
    }
    
    /**
     * Calculate bounding box around route coordinates with buffer
     */
    private function calculateRouteBoundingBox($coordinates, $bufferMeters = 5000)
    {
        if (empty($coordinates)) {
            return null;
        }
        
        $minLat = PHP_FLOAT_MAX;
        $maxLat = -PHP_FLOAT_MAX;
        $minLon = PHP_FLOAT_MAX;
        $maxLon = -PHP_FLOAT_MAX;
        
        foreach ($coordinates as $coord) {
            $minLat = min($minLat, $coord[0]);
            $maxLat = max($maxLat, $coord[0]);
            $minLon = min($minLon, $coord[1]);
            $maxLon = max($maxLon, $coord[1]);
        }
        
        // Add buffer (convert meters to degrees, approximate: 1 degree ≈ 111km)
        $bufferDegrees = $bufferMeters / 111000;
        
        return [
            'minLat' => $minLat - $bufferDegrees,
            'maxLat' => $maxLat + $bufferDegrees,
            'minLon' => $minLon - $bufferDegrees,
            'maxLon' => $maxLon + $bufferDegrees
        ];
    }
    
    /**
     * Generate routes using optimized waypoint placement (Kurviger-style)
     * Uses single best strategy instead of 4 redundant ones for 3-4x speed improvement
     * Optimized: accepts straight route to avoid redundant API call
     */
    private function generateRoutesWithOptimizedWaypoints($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $straightDistance, $straightRoute = null, $maxRoutes = 3)
    {
        $routes = [];
        
        try {
            // Use provided straight route or fetch if not provided
            if (!$straightRoute) {
                $straightRoute = $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon);
            }
            
            if (!$straightRoute || empty($straightRoute['coordinates'])) {
                return $routes;
            }
            
            $coordinates = $straightRoute['coordinates'];
            
            // Generate waypoints based on curvature level
            // More waypoints = more curved routes, but also longer routes
            // Kurviger-style: Allow more waypoints for very_curved to create extreme routes
            // Increased waypoints to create longer, more varied routes
            // - mellow: 12 waypoints (longer and curvier - clearly distinct from straightest)
            // - very_curved: 20 waypoints (much more extreme curves - match Kurviger)
            $numWaypoints = $curvatureLevel === 'mellow' ? 12 : 20;
            
            // Kurviger-style: Use best single strategy - curved segments + strategic placement
            // This combines the two best approaches into one optimized method
            $waypoints = $this->findOptimalWaypoints($coordinates, $numWaypoints, $curvatureLevel, $startLat, $startLon, $endLat, $endLon);
                
            if (empty($waypoints) || count($waypoints) < 1) {
                return $routes;
                }
                
                // Build route through waypoints (add start/end)
                $fullWaypoints = array_merge([[$startLat, $startLon]], $waypoints, [[$endLat, $endLon]]);
                $route = $this->buildRouteThroughWaypoints($fullWaypoints);
                
                if ($route) {
                // Kurviger-style: Validate route quality before adding
                    $distanceRatio = $route['distance'] / $straightDistance;
                // EXTREME: Allow much longer distances to find more curved routes
                // - mellow: up to 4.5x (longer and curvier - clearly distinct from straightest)
                // - very_curved: up to 20x (much longer and more curvy - match Kurviger)
                $maxRatio = $curvatureLevel === 'mellow' ? 4.5 : 20.0;
                    
                    $routeCurvature = $route['curvature'] ?? 0;
                    $straightCurvature = $straightRoute['curvature'] ?? 0;
                // Adjusted curvature requirements (relaxed to allow more candidates, scoring will favor better routes):
                // - mellow: at least 1.5x curvature (but strongly prefer 2.0x+)
                // - very_curved: at least 2.0x curvature (but strongly prefer 3.0x+)
                $minCurvatureRatio = $curvatureLevel === 'mellow' ? 1.5 : 2.0;
                    
                    if ($distanceRatio <= $maxRatio && $routeCurvature >= ($straightCurvature * $minCurvatureRatio)) {
                        $routes[] = $route;
                    // Early exit if we have enough routes
                    if (count($routes) >= $maxRoutes) {
                        return $routes;
                    }
                }
            }
            
            // Kurviger-style: Only try variations if we don't have enough routes
            // Early exit optimization - don't generate more if we have enough
            if (count($routes) < $maxRoutes && $numWaypoints >= 2) {
                // Try with one fewer waypoint (only if needed)
                $fewerWaypoints = $this->findOptimalWaypoints($coordinates, $numWaypoints - 1, $curvatureLevel, $startLat, $startLon, $endLat, $endLon);
                if (!empty($fewerWaypoints)) {
                    $fullWaypoints = array_merge([[$startLat, $startLon]], $fewerWaypoints, [[$endLat, $endLon]]);
                    $route = $this->buildRouteThroughWaypoints($fullWaypoints);
                    if ($route) {
                        // Fast validation before adding
                        $distanceRatio = $route['distance'] / $straightDistance;
                        $routeCurvature = $route['curvature'] ?? 0;
                        $straightCurvature = $straightRoute['curvature'] ?? 0;
                        // Kurviger-style: Allow much longer routes for curved options
                        // Distance limits: mellow up to 4.5x, very_curved up to 20x
                        $maxDistanceRatio = $curvatureLevel === 'mellow' ? 4.5 : 20.0;
                        // Curvature requirements (relaxed, scoring will favor better routes): mellow 1.5x, very_curved 2.0x
                        $minCurvatureRatio = $curvatureLevel === 'mellow' ? 1.5 : 2.0;
                        
                        if ($distanceRatio <= $maxDistanceRatio && 
                            $routeCurvature >= ($straightCurvature * $minCurvatureRatio)) {
                            $routes[] = $route;
                            // Early exit if we have enough
                            if (count($routes) >= $maxRoutes) {
                                return $routes;
                            }
                        }
                    }
                }
            }
        
        return $routes;
        } catch (\Exception $e) {
            Log::warning('Error in generateRoutesWithOptimizedWaypoints', [
                'error' => $e->getMessage()
            ]);
            return $routes;
        }
    }
    
    /**
     * Find optimal waypoints using Kurviger-style approach
     * Combines curved segment detection with strategic placement for best results
     */
    private function findOptimalWaypoints($coordinates, $numWaypoints, $curvatureLevel, $startLat, $startLon, $endLat, $endLon)
    {
        $waypoints = [];
        
        if (count($coordinates) < 3) {
            return $waypoints;
        }
        
        // Strategy: Find curved segments AND strategic points, then merge intelligently
        $curvedPoints = $this->findWaypointsNearCurvedSegments($coordinates, $numWaypoints * 2, $curvatureLevel);
        $strategicPoints = $this->findStrategicWaypointsOnRoute($coordinates, $numWaypoints, $curvatureLevel);
        
        // Merge and deduplicate, prioritizing curved points
        $allPoints = array_merge($curvedPoints, $strategicPoints);
        $uniquePoints = [];
        $seen = [];
        
        foreach ($allPoints as $point) {
            $key = round($point[0], 4) . '_' . round($point[1], 4);
            if (!isset($seen[$key])) {
                $uniquePoints[] = $point;
                $seen[$key] = true;
                if (count($uniquePoints) >= $numWaypoints) {
                    break;
                }
            }
        }
        
        return array_slice($uniquePoints, 0, $numWaypoints);
    }
    
    /**
     * Generate routes using intelligent waypoint placement based on route geometry
     * DEPRECATED: Use generateRoutesWithOptimizedWaypoints instead for better performance
     * Kept for backward compatibility
     */
    private function generateRoutesWithIntelligentWaypoints($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $straightDistance, $straightRoute = null)
    {
        // Redirect to optimized version
        return $this->generateRoutesWithOptimizedWaypoints($startLat, $startLon, $endLat, $endLon, $curvatureLevel, $straightDistance, $straightRoute, 3);
    }
    
    /**
     * Find waypoints near curved segments in the route
     * Kurviger-style: Analyze geometry to find where curves naturally occur
     */
    private function findWaypointsNearCurvedSegments($coordinates, $numWaypoints, $curvatureLevel)
    {
        $waypoints = [];
        
        if (count($coordinates) < 3) {
            return $waypoints;
        }
        
        // Calculate curvature for each segment
        $segmentCurvatures = [];
        for ($i = 1; $i < count($coordinates) - 1; $i++) {
            $prev = $coordinates[$i - 1];
            $curr = $coordinates[$i];
            $next = $coordinates[$i + 1];
            
            // Calculate angle change (curvature indicator)
            $bearing1 = $this->calculateBearing($prev[0], $prev[1], $curr[0], $curr[1]);
            $bearing2 = $this->calculateBearing($curr[0], $curr[1], $next[0], $next[1]);
            $angleChange = abs($bearing2 - $bearing1);
            if ($angleChange > 180) {
                $angleChange = 360 - $angleChange;
            }
            
            $segmentCurvatures[] = [
                'index' => $i,
                'curvature' => $angleChange,
                'point' => $curr
            ];
        }
        
        // Sort by curvature (highest first)
        usort($segmentCurvatures, function($a, $b) {
            return $b['curvature'] <=> $a['curvature'];
        });
        
        // Select top curved segments for waypoints
        // Lower threshold for mellow to get more waypoints
        $minCurvature = $curvatureLevel === 'mellow' ? 10 : 20; // Lowered from 15/25 to get more waypoints
        $selected = array_slice($segmentCurvatures, 0, min($numWaypoints * 2, count($segmentCurvatures))); // Select more candidates
        
        foreach ($selected as $segment) {
            if (count($waypoints) >= $numWaypoints) {
                break;
            }
            if ($segment['curvature'] >= $minCurvature) {
                $waypoints[] = $segment['point'];
            }
        }
        
        return $waypoints;
    }
    
    /**
     * Find strategic waypoints at route divisions (thirds, quarters, etc.)
     * Kurviger-style: Even distribution along route
     */
    private function findStrategicWaypointsOnRoute($coordinates, $numWaypoints, $curvatureLevel)
    {
        $waypoints = [];
        
        if (count($coordinates) < 2) {
            return $waypoints;
        }
        
        // Sample points evenly along route
        $sampledPoints = $this->sampleRoutePoints($coordinates, $numWaypoints + 2);
        
        // Skip first and last (start/end), use middle points
        for ($i = 1; $i < count($sampledPoints) - 1; $i++) {
            $waypoints[] = $sampledPoints[$i];
        }
        
        return $waypoints;
    }
    
    /**
     * Find perpendicular waypoints at high-curvature points
     * Kurviger-style: Offset waypoints at curves to force routing through twisty roads
     */
    private function findPerpendicularWaypointsAtCurves($coordinates, $numWaypoints, $curvatureLevel)
    {
        $waypoints = [];
        
        if (count($coordinates) < 3) {
            return $waypoints;
        }
        
        // Find curved segments
        $curvedSegments = [];
        for ($i = 1; $i < count($coordinates) - 1; $i++) {
            $prev = $coordinates[$i - 1];
            $curr = $coordinates[$i];
            $next = $coordinates[$i + 1];
            
            $bearing1 = $this->calculateBearing($prev[0], $prev[1], $curr[0], $curr[1]);
            $bearing2 = $this->calculateBearing($curr[0], $curr[1], $next[0], $next[1]);
            $angleChange = abs($bearing2 - $bearing1);
            if ($angleChange > 180) {
                $angleChange = 360 - $angleChange;
            }
            
            if ($angleChange > ($curvatureLevel === 'mellow' ? 8 : 15)) { // Lowered threshold to get more curved segments
                $curvedSegments[] = [
                    'point' => $curr,
                    'bearing' => $bearing1,
                    'curvature' => $angleChange
                ];
            }
        }
        
        // Sort by curvature and select top segments
        usort($curvedSegments, function($a, $b) {
            return $b['curvature'] <=> $a['curvature'];
        });
        
        $selected = array_slice($curvedSegments, 0, min($numWaypoints * 2, count($curvedSegments)));
        
        // Get end point for backtracking check
        $endPoint = $coordinates[count($coordinates) - 1];
        
        // Place perpendicular waypoints, but only if they don't cause backtracking
        // Kurviger-style: More aggressive offsets for mellow to ensure route diversity
        // EXTREME: Much more aggressive offsets to ensure routes are VERY different
        // Increased dramatically to force routes through completely different roads
        $offsetDistances = $curvatureLevel === 'mellow' ? [8000, 12000, 18000] : [12000, 18000, 25000]; // Much larger offsets
        
        foreach ($selected as $segment) {
            if (count($waypoints) >= $numWaypoints) {
                break;
            }
            
            $bearing = $segment['bearing'];
            $perpBearing1 = ($bearing + 90) % 360;
            $perpBearing2 = ($bearing - 90) % 360;
            
            // Try both perpendicular directions
            $bearingsToTry = [$perpBearing1, $perpBearing2];
            
            foreach ($bearingsToTry as $perpBearing) {
                if (count($waypoints) >= $numWaypoints) {
                    break 2;
                }
                
                foreach ($offsetDistances as $offsetMeters) {
                    $offsetKm = $offsetMeters / 1000;
                    $waypoint = $this->calculateDestination($segment['point'][0], $segment['point'][1], $perpBearing, $offsetKm);
                    
                    if ($waypoint) {
                        // Kurviger-style: Check if waypoint causes backtracking
                        // Calculate distance from waypoint to end vs from segment point to end
                        $waypointDistToEnd = $this->getDistance($waypoint[0], $waypoint[1], $endPoint[0], $endPoint[1]);
                        $segmentDistToEnd = $this->getDistance($segment['point'][0], $segment['point'][1], $endPoint[0], $endPoint[1]);
                        
                        // Only accept waypoint if it doesn't significantly increase distance to end
                        // This prevents backtracking/dead ends
                        // EXTREME: More lenient for very curved routes to allow more diverse routes
                        $maxBacktrack = $curvatureLevel === 'mellow' ? 2000 : 4000; // Allow much more backtrack for very curved
                        if ($waypointDistToEnd <= $segmentDistToEnd + $maxBacktrack) {
                            $waypoints[] = $waypoint;
                            break; // One waypoint per segment
                        }
                    }
                }
            }
        }
        
        return $waypoints;
    }
    
    /**
     * Find offset waypoints from direct path to force curved routing
     * Kurviger-style: Place waypoints offset from direct line to force routing through alternative paths
     */
    private function findOffsetWaypointsFromDirectPath($startLat, $startLon, $endLat, $endLon, $numWaypoints, $curvatureLevel)
    {
        $waypoints = [];
        
        // Calculate direct bearing
        $directBearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
        $perpendicularBearing1 = ($directBearing + 90) % 360;
        $perpendicularBearing2 = ($directBearing - 90) % 360;
        
        // Calculate direct distance
        $directDistance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
        
        // Generate waypoints at different positions along the route
        // EXTREME: More waypoints for very curved routes to ensure diversity
        $numPositions = $curvatureLevel === 'mellow' ? 4 : 6;
        
        // Offset distances - Kurviger-style: More aggressive offsets for mellow to ensure route diversity
        // Increased offsets to create more varied routes that differ from straightest
        // EXTREME: Much more aggressive offsets to ensure routes are VERY different
        // Increased offsets dramatically to force routing through different roads
        $offsetDistances = $curvatureLevel === 'mellow' ? [10000, 15000, 20000] : [15000, 22000, 30000]; // Much larger offsets
        
        for ($i = 1; $i <= $numPositions; $i++) {
            $ratio = $i / ($numPositions + 1);
            
            // Point along direct path
            $midLat = $startLat + ($endLat - $startLat) * $ratio;
            $midLon = $startLon + ($endLon - $startLon) * $ratio;
            
            // Try both perpendicular directions
            $bearingsToTry = [$perpendicularBearing1, $perpendicularBearing2];
            
            foreach ($bearingsToTry as $offsetBearing) {
                if (count($waypoints) >= $numWaypoints) {
                    break 2;
                }
                
                foreach ($offsetDistances as $offsetMeters) {
                    if (count($waypoints) >= $numWaypoints) {
                        break 2;
                    }
                    
                    $offsetKm = $offsetMeters / 1000;
                    $waypoint = $this->calculateDestination($midLat, $midLon, $offsetBearing, $offsetKm);
                    
                    if ($waypoint) {
                        // Check if waypoint doesn't cause excessive backtracking
                        $waypointDistToEnd = $this->getDistance($waypoint[0], $waypoint[1], $endLat, $endLon);
                        $midDistToEnd = $this->getDistance($midLat, $midLon, $endLat, $endLon);
                        
                        // More lenient backtrack check for very curved
                        $maxBacktrack = $curvatureLevel === 'mellow' ? 2000 : 5000;
                        if ($waypointDistToEnd <= $midDistToEnd + $maxBacktrack) {
                            // Check spacing from other waypoints
                            $tooClose = false;
                            foreach ($waypoints as $existingWp) {
                                $dist = $this->getDistance($waypoint[0], $waypoint[1], $existingWp[0], $existingWp[1]);
                                if ($dist < 1000) { // Minimum 1km spacing
                                    $tooClose = true;
                                    break;
                                }
                            }
                            
                            if (!$tooClose) {
                                $waypoints[] = $waypoint;
                                break; // One waypoint per position/direction
                            }
                        }
                    }
                }
            }
        }
        
        return $waypoints;
    }

    /**
     * Get alternative routes from OSRM
     * Request more alternatives for better route diversity
     * Kurviger-style: More alternatives for mellow to find distance-neutral curved routes
     */
    private function getOSRMAlternatives($startLat, $startLon, $endLat, $endLon, $curvatureLevel = 'mellow')
    {
        $routes = [];
        $startTime = microtime(true);
        
        try {
            // Generate cache key for alternatives
            $cacheKey = 'osrm_alternatives_' . round($startLat, 4) . '_' . round($startLon, 4) . '_' . round($endLat, 4) . '_' . round($endLon, 4);
            
            // Check cache first (cache for 30 minutes - alternatives can change)
            if (Cache::has($cacheKey)) {
                Log::debug('OSRM alternatives cache hit', ['curvature_level' => $curvatureLevel]);
                return Cache::get($cacheKey);
            }
            
            // EXTREME: Request more alternatives to ensure route diversity
            // OSRM is faster with fewer alternatives, but we need more options for diversity
            // Increased alternatives significantly to ensure we get more curvy routes
            $numAlternatives = $curvatureLevel === 'mellow' ? 8 : 10; // EXTREME: Much more alternatives
            $url = sprintf(
                '%s/route/v1/driving/%s,%s;%s,%s?overview=full&geometries=geojson&alternatives=true&number=%d',
                $this->osrmBaseUrl,
                $startLon,
                $startLat,
                $endLon,
                $endLat,
                $numAlternatives
            );

            $apiStartTime = microtime(true);
            $response = Http::timeout(10)->get($url); // Increased timeout for more alternatives
            $apiTime = round((microtime(true) - $apiStartTime) * 1000, 2);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['routes']) && !empty($data['routes'])) {
                    // Kurviger-style: Process routes with lazy stats calculation
                    // Only calculate full stats for routes that pass initial filters
                    // Early exit: Stop if we have enough good routes (3-5)
                    $maxRoutesToProcess = $curvatureLevel === 'mellow' ? 5 : 3;
                    $processedCount = 0;
                    
                    foreach ($data['routes'] as $route) {
                        if ($processedCount >= $maxRoutesToProcess) {
                            break; // Early exit - we have enough candidates
                        }
                        
                        $geometry = $route['geometry']['coordinates'];
                        
                        // Convert GeoJSON format [lon, lat] to [lat, lon]
                        $coordinates = array_map(function($coord) {
                            return [$coord[1], $coord[0]];
                        }, $geometry);
                        
                        // Fast curvature estimation (10-20x faster than full stats)
                        $fastCurvature = $this->estimateCurvatureFast($coordinates);
                        
                        $routes[] = [
                            'coordinates' => $coordinates,
                            'distance' => $route['distance'],
                            'duration' => $route['duration'],
                            'type' => 'alternative',
                            'curvature' => $fastCurvature, // Fast estimate for initial filtering
                            'corner_count' => 0, // Will be calculated later if needed
                            'elevation_gain' => 0,
                            'elevation_loss' => 0,
                            'max_elevation' => 0,
                            'min_elevation' => 0,
                            '_stats_calculated' => false // Flag to calculate full stats later if needed
                        ];
                        
                        $processedCount++;
                    }
                }
            }
            
            // Cache the alternatives for 30 minutes
            // Remove internal flags before caching
            if (!empty($routes)) {
                $cachedRoutes = array_map(function($route) {
                    unset($route['_stats_calculated']);
                    return $route;
                }, $routes);
                Cache::put($cacheKey, $cachedRoutes, now()->addMinutes(30));
            }
            
            $totalTime = round((microtime(true) - $startTime) * 1000, 2);
            Log::info('OSRM alternatives retrieved', [
                'curvature_level' => $curvatureLevel,
                'num_alternatives' => $numAlternatives,
                'routes_returned' => count($routes),
                'api_time_ms' => $apiTime,
                'total_time_ms' => $totalTime,
                'cached' => false
            ]);
        } catch (\Exception $e) {
            $totalTime = round((microtime(true) - $startTime) * 1000, 2);
            Log::error('Error getting OSRM alternatives', [
                'error' => $e->getMessage(),
                'total_time_ms' => $totalTime
            ]);
        }
        
        return $routes;
    }

    /**
     * Generate routes with waypoints placed perpendicular to direct path
     * Optimized: reduced attempts for faster response
     */
    private function generateRoutesWithPerpendicularWaypoints($startLat, $startLon, $endLat, $endLon, $curvatureLevel)
    {
        $routes = [];
        
        // Calculate direct bearing and perpendicular offsets
        $bearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
        $perpendicularBearing1 = ($bearing + 90) % 360;
        $perpendicularBearing2 = ($bearing - 90) % 360;
        
        // EXTREME: Much more aggressive offsets to ensure routes are VERY different
        // Increased dramatically to force routes through completely different roads
        $offsetDistances = $curvatureLevel === 'mellow' 
            ? [6000, 10000, 15000] // Much larger offsets for mellow
            : [10000, 18000, 25000]; // Much larger offsets for very curved
        
        // Kurviger-style: Use fewer waypoints for geometric waypoints
        // Increased waypoints for very curved to ensure more curvy routes
        // - mellow: 3 waypoints (longer and curvier - clearly distinct from straightest)
        // - very_curved: 6 waypoints (much more extreme - match Kurviger)
        $numWaypoints = $curvatureLevel === 'mellow' ? 3 : 6;
        $maxRoutes = $curvatureLevel === 'mellow' ? 2 : 3; // Limit total routes generated
        
        // Generate waypoints at different positions along the route
        for ($i = 1; $i <= $numWaypoints && count($routes) < $maxRoutes; $i++) {
            $ratio = $i / ($numWaypoints + 1);
            
            // Point along direct path
            $midLat = $startLat + ($endLat - $startLat) * $ratio;
            $midLon = $startLon + ($endLon - $startLon) * $ratio;
            
            // Kurviger-style: Try only best offset distance first, then others if needed
            $bestOffset = $curvatureLevel === 'mellow' ? 1500 : 4000;
            $offsetsToTry = [$bestOffset];
            if (count($routes) < $maxRoutes) {
                $offsetsToTry = array_merge($offsetsToTry, array_diff($offsetDistances, [$bestOffset]));
            }
            
            // For mellow, prefer waypoints that are closer to the direct path
            // and only try one side to avoid loops
            $bearingsToTry = $curvatureLevel === 'mellow' 
                ? [$perpendicularBearing1] // Only try one side for mellow
                : [$perpendicularBearing1, $perpendicularBearing2]; // Try both for very curved
            
            // Try different offset distances (prioritize best first)
            foreach ($offsetsToTry as $offsetMeters) {
                if (count($routes) >= $maxRoutes) break;
                
                // Calculate waypoint offset perpendicular to path
                $offsetKm = $offsetMeters / 1000;
                
                // Try selected bearings
                foreach ($bearingsToTry as $offsetBearing) {
                    if (count($routes) >= $maxRoutes) break;
                    
                    $waypoint = $this->calculateDestination($midLat, $midLon, $offsetBearing, $offsetKm);
                    
                    if ($waypoint) {
                        // For mellow, verify waypoint doesn't cause backtracking
                        if ($curvatureLevel === 'mellow') {
                            $waypointDistToEnd = $this->getDistance($waypoint[0], $waypoint[1], $endLat, $endLon);
                            $midDistToEnd = $this->getDistance($midLat, $midLon, $endLat, $endLon);
                            
                            // Skip if waypoint is further from end than midpoint (would cause backtracking)
                            if ($waypointDistToEnd > $midDistToEnd + 1000) {
                                continue;
                            }
                        }
                        
                        $route = $this->routeViaWaypoint($startLat, $startLon, $endLat, $endLon, $waypoint[0], $waypoint[1]);
                        if ($route) {
                            $routes[] = $route;
                            // Kurviger-style: Early exit when we have enough good routes
                            if (count($routes) >= $maxRoutes) {
                                return $routes;
                            }
                        }
                    }
                }
            }
        }
        
        return $routes;
    }

    /**
     * Generate routes via secondary roads by finding intermediate points on secondary roads
     */
    private function generateRoutesViaSecondaryRoads($startLat, $startLon, $endLat, $endLon, $curvatureLevel)
    {
        $routes = [];
        
        // Optimized for performance: Use fewer search points
        $numPoints = $curvatureLevel === 'mellow' ? 1 : 2; // Reduced from 2 to 1 for mellow
        
        for ($i = 1; $i <= $numPoints; $i++) {
            $ratio = $i / ($numPoints + 1);
            
            // Point along direct path
            $pointLat = $startLat + ($endLat - $startLat) * $ratio;
            $pointLon = $startLon + ($endLon - $startLon) * $ratio;
            
            // Search radius - reduced for performance
            $searchRadius = $curvatureLevel === 'mellow' ? 2000 : 4000; // Reduced from 3000/5000
            
            // Find secondary/tertiary roads near this point
            $secondaryRoads = $this->findSecondaryRoadsNearPoint($pointLat, $pointLon, $searchRadius);
            
            if (empty($secondaryRoads)) {
                continue;
            }
            
            // Limit attempts - optimized for performance
            if ($curvatureLevel === 'mellow') {
                $maxAttempts = 2; // Reduced from 3
                $maxRoutes = 2; // Reduced from 3
            } else {
                $maxAttempts = 3; // Reduced from 5
                $maxRoutes = 4; // Reduced from 10
            }
            $attempts = 0;
            
            foreach ($secondaryRoads as $road) {
                if ($attempts >= $maxAttempts || ($curvatureLevel === 'mellow' && count($routes) >= $maxRoutes)) {
                    break;
                }
                
                // For mellow, only use midpoint to reduce API calls
                // For very curved, use 2 points instead of 3 for performance
                if ($curvatureLevel === 'mellow') {
                    $roadPoints = [
                        $road['geometry'][floor(count($road['geometry']) * 0.5)]  // Only midpoint
                    ];
                } else {
                    // Reduced from 3 to 2 points for very curved
                    $roadPoints = [
                        $road['geometry'][floor(count($road['geometry']) * 0.33)],
                        $road['geometry'][floor(count($road['geometry']) * 0.67)]
                    ];
                }
                
                foreach ($roadPoints as $roadPoint) {
                    if ($attempts >= $maxAttempts || ($curvatureLevel === 'mellow' && count($routes) >= $maxRoutes)) {
                        break;
                    }
                    
                    // Relaxed validation for mellow routes to allow parallel roads
                    if ($curvatureLevel === 'mellow') {
                        $waypointDistToEnd = $this->getDistance($roadPoint['lat'], $roadPoint['lon'], $endLat, $endLon);
                        $pointDistToEnd = $this->getDistance($pointLat, $pointLon, $endLat, $endLon);
                        $waypointDistToStart = $this->getDistance($roadPoint['lat'], $roadPoint['lon'], $startLat, $startLon);
                        $pointDistToStart = $this->getDistance($pointLat, $pointLon, $startLat, $startLon);
                        
                        // Allow parallel roads (waypoint can be similar distance to end)
                        // Only reject if waypoint is significantly further from end (>5km) or closer to start
                        if ($waypointDistToEnd > $pointDistToEnd + 5000 || $waypointDistToStart < $pointDistToStart - 3000) {
                            continue; // Would cause significant backtracking
                        }
                    }
                    
                    $route = $this->routeViaWaypoint(
                        $startLat,
                        $startLon,
                        $endLat,
                        $endLon,
                        $roadPoint['lat'],
                        $roadPoint['lon']
                    );
                    
                    if ($route) {
                        $routes[] = $route;
                        $attempts++;
                        
                        // Early exit for mellow if we have enough routes
                        if ($curvatureLevel === 'mellow' && count($routes) >= $maxRoutes) {
                            break 2; // Break out of both loops
                        }
                    }
                }
            }
            
            // Early exit for mellow if we have enough routes
            if ($curvatureLevel === 'mellow' && count($routes) >= $maxRoutes) {
                break;
            }
        }
        
        return $routes;
    }

    /**
     * Route via a waypoint using OSRM
     */
    private function routeViaWaypoint($startLat, $startLon, $endLat, $endLon, $waypointLat, $waypointLon)
    {
        try {
            $url = sprintf(
                '%s/route/v1/driving/%s,%s;%s,%s;%s,%s?overview=full&geometries=geojson',
                $this->osrmBaseUrl,
                $startLon,
                $startLat,
                $waypointLon,
                $waypointLat,
                $endLon,
                $endLat
            );

            $response = Http::timeout(10)->get($url);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();

            if (!isset($data['routes']) || empty($data['routes'])) {
                return null;
            }

            $route = $data['routes'][0];
            $geometry = $route['geometry']['coordinates'];

            // Convert GeoJSON format [lon, lat] to [lat, lon]
            $coordinates = array_map(function($coord) {
                return [$coord[1], $coord[0]];
            }, $geometry);

            $stats = $this->calculateRouteStats($coordinates);

            return [
                'coordinates' => $coordinates,
                'distance' => $route['distance'],
                'duration' => $route['duration'],
                'type' => 'waypoint',
                'curvature' => $stats['curvature'],
                'corner_count' => $stats['corner_count'],
                'elevation_gain' => $stats['elevation_gain'],
                'elevation_loss' => $stats['elevation_loss'],
                'max_elevation' => $stats['max_elevation'],
                'min_elevation' => $stats['min_elevation']
            ];
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Select best route based on curvature level
     */
    private function selectBestRouteByCurvature($candidates, $curvatureLevel, $straightRoute)
    {
        if (empty($candidates)) {
            return null;
        }
        
        $straightCurvature = $straightRoute['curvature'] ?? 0;
        
        // Filter and score candidates
        $scoredCandidates = [];
        
        foreach ($candidates as $candidate) {
            $candidateCurvature = $candidate['curvature'] ?? 0;
            
            // Kurviger-style: Use progress score as primary quality indicator
            // Routes with good forward progress are preferred, even if slightly longer
            $progressScore = $this->calculateRouteProgressScore($candidate['coordinates']);
            
            // Calculate distance ratio
            $distanceRatio = $candidate['distance'] / $straightRoute['distance'];
            
            // Kurviger-style: Progress requirement - prioritize routes with good forward progress
            // Very lenient threshold to allow more route diversity and longer routes
            if ($progressScore < 0.65) {
                Log::info('Rejecting route candidate due to very poor progress', [
                    'curvature_level' => $curvatureLevel,
                    'progress_score' => $progressScore
                ]);
                continue; // Reject routes with very poor forward progress
            }
            
            // Kurviger-style: Check for backtracking - reject if significant backtracking detected
            // Even with good progress, reject routes with significant backtracking
            $isVeryCurved = ($curvatureLevel === 'very_curved' || $curvatureLevel === 'curvy');
            $hasSignificantBacktrack = $this->hasLoopOrBacktrack($candidate['coordinates'], $straightRoute['distance'], $isVeryCurved);
            
            if ($hasSignificantBacktrack) {
                // STRICT: Reject routes with significant backtracking - they look the same but are longer
                // No exceptions - backtracking means the route is inefficient and visually identical
                Log::info('Rejecting route candidate due to significant backtracking', [
                    'curvature_level' => $curvatureLevel,
                    'progress_score' => $progressScore,
                    'curvature' => $candidateCurvature
                ]);
                continue;
            }
            
            // Kurviger-style: Allow MUCH longer routes if they have good curvature
            // Kurviger routes can be substantially longer - this is expected and desired
            // - mellow: up to 4.5x (longer and curvier - clearly distinct from straightest)
            // - very_curved: up to 20x (much longer and more curvy - match Kurviger)
            $maxDistanceRatio = $curvatureLevel === 'mellow' ? 4.5 : 20.0;
            
            // Only reject if route is extremely long AND has very poor curvature/progress
            $curvatureRatio = $straightCurvature > 0 ? ($candidateCurvature / $straightCurvature) : 0;
            
            if ($distanceRatio > $maxDistanceRatio) {
                // Allow longer routes if they have reasonable progress AND some curvature
                if ($progressScore < 0.65 || $curvatureRatio < 1.0) {
                    Log::info('Rejecting route candidate - too long with poor quality', [
                        'distance_ratio' => $distanceRatio,
                        'progress_score' => $progressScore,
                        'curvature_ratio' => $curvatureRatio
                    ]);
                    continue;
                }
            }
            
            // Kurviger-style: Require minimum curvature difference (relaxed to allow more candidates)
            // Mellow: at least 1.5x curvature (but strongly prefer 2.0x+)
            // Very curved: at least 2.0x curvature (but strongly prefer 3.0x+)
            // We'll use scoring to strongly favor routes that meet higher targets
            if ($curvatureLevel === 'mellow') {
                if ($curvatureRatio < 1.5) {
                    Log::info('Rejecting mellow candidate - curvature ratio too low', [
                        'curvature_ratio' => $curvatureRatio,
                        'candidate_curvature' => $candidateCurvature,
                        'straight_curvature' => $straightCurvature
                    ]);
                    continue;
                }
            } elseif ($isVeryCurved) {
                // For very curved, require at least 2.0x curvature ratio OR reasonable absolute minimum
                if ($curvatureRatio < 2.0 && $candidateCurvature < 0.005) {
                    continue;
                }
            }
            
            // Check if route is actually different from straightest
            $distanceDiff = abs($candidate['distance'] - $straightRoute['distance']);
            $isSecondaryRoadRoute = ($candidate['type'] ?? '') === 'waypoint';
            
            // Score based on how well it matches the desired curvature level
            $score = 0;
            
            if ($curvatureLevel === 'mellow') {
                // Bonus for secondary road routes (they're different from straightest)
                if ($isSecondaryRoadRoute) {
                    $score = 2000; // Base score for using secondary roads
                }
                
                // Kurviger-style: STRONGLY prefer routes with good curvature (2.0x-4.0x)
                // Score based on curvature ratio - MUCH higher scores for routes meeting targets
                // Mellow should be longer and curvier (clearly distinct from straightest)
                if ($curvatureRatio >= 2.5 && $curvatureRatio <= 4.0) {
                    $score += 25000 + ($candidateCurvature * 2500000); // EXTREMELY strong preference
                } elseif ($curvatureRatio >= 2.2 && $curvatureRatio < 2.5) {
                    $score += 20000 + ($candidateCurvature * 2000000); // Very strong preference
                } elseif ($curvatureRatio >= 2.0 && $curvatureRatio < 2.2) {
                    $score += 15000 + ($candidateCurvature * 1500000); // Strong preference (target met)
                } elseif ($curvatureRatio >= 1.8 && $curvatureRatio < 2.0) {
                    $score += 8000 + ($candidateCurvature * 800000); // Good but below target
                } elseif ($curvatureRatio >= 1.5 && $curvatureRatio < 1.8) {
                    $score += 3000 + ($candidateCurvature * 300000); // Acceptable but not ideal
                } else {
                    $score += $candidateCurvature * 100000; // Low score
                }
                
                // Kurviger-style: Don't penalize longer routes - prefer them!
                // Longer routes are expected and desired for curved options
                // Actually give bonus for longer routes with good curvature
                if ($distanceRatio > 2.5 && $curvatureRatio >= 2.0) {
                    // Bonus for longer routes with good curvature (clearly distinct from straightest)
                    $bonusMultiplier = $progressScore > 0.7 ? 1.2 : 1.0;
                    $score *= $bonusMultiplier;
                } elseif ($distanceRatio > 4.5) {
                    // Only penalize if progress is very poor (allow up to 4.5x)
                    $penaltyMultiplier = $progressScore > 0.65 ? 0.9 : (4.5 / $distanceRatio);
                    $score *= $penaltyMultiplier;
                }
                
                // Kurviger-style: Progress score heavily influences final score
                // Routes with excellent progress get significant boost
                $progressMultiplier = $progressScore >= 0.95 ? 2.0 : ($progressScore >= 0.9 ? 1.5 : ($progressScore >= 0.85 ? 1.2 : max(0.7, $progressScore)));
                $score *= $progressMultiplier;
            } else {
                // EXTREME: For very curved, STRONGLY prefer VERY high curvature (match Kurviger)
                // MUCH higher scores for routes meeting 3.0x+ target
                // Very curved should be significantly more extreme than mellow
                if ($candidateCurvature >= 0.020 || $curvatureRatio >= 5.0) {
                    $score = 35000 + ($candidateCurvature * 3500000) + ($curvatureRatio * 5000); // EXTREMELY strong
                } elseif ($candidateCurvature >= 0.018 || $curvatureRatio >= 4.5) {
                    $score = 30000 + ($candidateCurvature * 3000000) + ($curvatureRatio * 4500); // Very strong
                } elseif ($candidateCurvature >= 0.015 || $curvatureRatio >= 4.0) {
                    $score = 25000 + ($candidateCurvature * 2500000) + ($curvatureRatio * 4000); // Strong
                } elseif ($candidateCurvature >= 0.012 || $curvatureRatio >= 3.5) {
                    $score = 20000 + ($candidateCurvature * 2000000) + ($curvatureRatio * 3000); // Very good
                } elseif ($candidateCurvature >= 0.010 || $curvatureRatio >= 3.0) {
                    $score = 18000 + ($candidateCurvature * 1800000) + ($curvatureRatio * 2500); // Strong preference (target met)
                } elseif ($candidateCurvature >= 0.008 || $curvatureRatio >= 2.5) {
                    $score = 12000 + ($candidateCurvature * 1200000) + ($curvatureRatio * 1500); // Good but below target
                } elseif ($candidateCurvature >= 0.006 || $curvatureRatio >= 2.0) {
                    $score = 6000 + ($candidateCurvature * 600000) + ($curvatureRatio * 800); // Acceptable but not ideal
                } else {
                    $score = $candidateCurvature * 100000; // Low score
                }
                // Kurviger-style: Allow much longer routes (up to 20x) - prefer them!
                // Very curved routes are expected to be longer - give bonus for long curvy routes (match Kurviger)
                if ($distanceRatio > 8.0 && $curvatureRatio >= 4.0) {
                    // Bonus for longer routes with high curvature (very extreme routes - match Kurviger)
                    $bonusMultiplier = $progressScore > 0.65 ? 1.5 : 1.0;
                    $score *= $bonusMultiplier;
                } elseif ($distanceRatio > 15.0) {
                    // Only penalize if progress is very poor (allow up to 20x)
                    $penaltyMultiplier = $progressScore > 0.60 ? 0.95 : (15.0 / $distanceRatio);
                    $score *= $penaltyMultiplier;
                }
                // Kurviger-style: Progress score heavily influences final score
                // Very curved routes with excellent progress get significant boost
                $progressMultiplier = $progressScore >= 0.95 ? 2.5 : ($progressScore >= 0.9 ? 1.8 : ($progressScore >= 0.85 ? 1.4 : max(0.6, $progressScore)));
                $score *= $progressMultiplier;
            }
            
            $scoredCandidates[] = [
                'route' => $candidate,
                'score' => $score,
                'progress_score' => $progressScore
            ];
        }
        
        if (empty($scoredCandidates)) {
            Log::info('No scored candidates after filtering', ['curvature_level' => $curvatureLevel]);
            return null;
        }
        
        // Sort by score descending
        usort($scoredCandidates, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        $selectedRoute = $scoredCandidates[0]['route'];
        
        // Log selection for debugging
        Log::info('Route selected', [
            'curvature_level' => $curvatureLevel,
            'route_type' => $selectedRoute['type'] ?? 'unknown',
            'curvature' => $selectedRoute['curvature'] ?? 0,
            'distance' => $selectedRoute['distance'] ?? 0,
            'straight_curvature' => $straightCurvature,
            'straight_distance' => $straightRoute['distance'],
            'total_candidates' => count($scoredCandidates)
        ]);
        
        return $selectedRoute;
    }

    /**
     * Detect if route has loops or significant backtracking
     * Checks for routes that double back on themselves or require backtracking on same road
     * @param bool $strictMode If true, uses stricter thresholds (for very curved routes to prevent dead ends)
     */
    private function hasLoopOrBacktrack($coordinates, $straightDistance, $strictMode = false)
    {
        if (count($coordinates) < 10) {
            return false;
        }
        
        $startPoint = $coordinates[0];
        $endPoint = $coordinates[count($coordinates) - 1];
        
        // More detailed sampling for better detection (even more samples in strict mode)
        $sampleSize = $strictMode ? min(50, max(25, floor(count($coordinates) / 10))) : min(30, max(15, floor(count($coordinates) / 15)));
        $step = max(1, floor(count($coordinates) / $sampleSize));
        $sampledPoints = [];
        
        for ($i = 0; $i < count($coordinates); $i += $step) {
            $sampledPoints[] = [
                'point' => $coordinates[$i],
                'index' => $i,
                'distToEnd' => $this->getDistance($coordinates[$i][0], $coordinates[$i][1], $endPoint[0], $endPoint[1]),
                'distToStart' => $this->getDistance($coordinates[$i][0], $coordinates[$i][1], $startPoint[0], $startPoint[1])
            ];
        }
        
        // MUCH stricter thresholds to prevent routes that look the same but are longer due to backtracking
        $spatialThreshold = $strictMode ? 150 : 200; // Closer points trigger detection
        $sequenceThreshold = $strictMode ? 1000 : 1500; // Shorter sequence distance triggers detection
        $backtrackThreshold = $strictMode ? 100 : 150; // Smaller backtrack triggers detection
        $maxBacktrackThreshold = $strictMode ? 3000 : 5000; // Max single backtrack allowed (5km max)
        $consecutiveBacktrackThreshold = $strictMode ? 2000 : 3000; // Max consecutive backtrack allowed (3km max)
        // Total backtrack threshold: reject if total backtrack > 5% of route distance
        // Calculate approximate route distance by summing distances between consecutive points
        $routeDistance = 0;
        for ($i = 0; $i < count($coordinates) - 1; $i++) {
            $routeDistance += $this->getDistance(
                $coordinates[$i][0], $coordinates[$i][1],
                $coordinates[$i + 1][0], $coordinates[$i + 1][1]
            );
        }
        $totalBacktrackThreshold = max(5000, $routeDistance * 0.05); // At least 5km or 5% of route, whichever is larger
        
        // Check 1: Look for points that are close together spatially but far apart in sequence
        // This detects loops where route comes back to same area (U-turns/dead ends)
        for ($i = 0; $i < count($sampledPoints) - 5; $i++) {
            $point1 = $sampledPoints[$i];
            
            for ($j = $i + 5; $j < count($sampledPoints); $j++) {
                $point2 = $sampledPoints[$j];
                
                $spatialDistance = $this->getDistance(
                    $point1['point'][0], $point1['point'][1],
                    $point2['point'][0], $point2['point'][1]
                );
                
                // If points are very close but sequence distance is significant, it's a loop/U-turn
                if ($spatialDistance < $spatialThreshold) {
                    $sequenceDistance = abs($point2['index'] - $point1['index']) * ($straightDistance / count($coordinates));
                    if ($sequenceDistance > $sequenceThreshold) {
                        // In strict mode, also check if this is a U-turn pattern (goes away then comes back)
                        if ($strictMode) {
                            // Check if route went away from destination then came back
                            $midIndex = floor(($i + $j) / 2);
                            if ($midIndex < count($sampledPoints)) {
                                $midPoint = $sampledPoints[$midIndex];
                                // If midpoint is further from end than both endpoints, it's a U-turn
                                if ($midPoint['distToEnd'] > $point1['distToEnd'] && $midPoint['distToEnd'] > $point2['distToEnd']) {
                                    return true; // U-turn/dead end detected
                                }
                            }
                        }
                        return true; // Loop detected - route comes back to same area
                    }
                }
            }
        }
        
        // Check 2: Look for significant backtracking (moving away from destination)
        // Improved detection: track consecutive backtracking and total backtrack distance
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
                        return true; // Dead end detected
                    }
                    $consecutiveBacktrack = 0;
                }
            }
            
            $previousDistToEnd = $currentDistToEnd;
        }
        
        // Reject if backtracking exceeds thresholds (stricter in strict mode)
        // Check max consecutive backtrack first (most important indicator of dead ends)
        if ($maxConsecutiveBacktrack > $consecutiveBacktrackThreshold) {
            return true; // Significant consecutive backtrack = dead end
        }
        if ($maxBacktrack > $maxBacktrackThreshold || $totalBacktrack > $totalBacktrackThreshold) {
            return true; // Dead end detected
        }
        // Allow some backtrack points but not too many (stricter limits)
        if ($backtrackCount > ($strictMode ? 2 : 3)) {
            return true; // Too many backtrack points
        }
        
        // Check 3: Look for routes that form inefficient loops (teardrop shapes/U-turns)
        // Check if route goes away from destination then comes back to a nearby point
        $loopProgressThreshold = $strictMode ? 1000 : 1500; // More sensitive threshold
        $loopSpatialThreshold = $strictMode ? 150 : 250; // Stricter spatial threshold
        
        for ($i = 0; $i < count($sampledPoints) - 10; $i++) {
            $point1 = $sampledPoints[$i];
            
            // Look ahead for a point that's close to point1 but far in sequence
            for ($j = $i + 10; $j < count($sampledPoints); $j++) {
                $point2 = $sampledPoints[$j];
                
                $spatialDist = $this->getDistance(
                    $point1['point'][0], $point1['point'][1],
                    $point2['point'][0], $point2['point'][1]
                );
                
                // If we come back to within threshold of a previous point after traveling significant distance
                if ($spatialDist < $loopSpatialThreshold) {
                    $sequenceDist = abs($point2['index'] - $point1['index']) * ($straightDistance / count($coordinates));
                    if ($sequenceDist > $sequenceThreshold) {
                        // Check if this loop actually progresses towards destination
                        // If point2 is not significantly closer to end than point1, it's inefficient
                        $progress = $point1['distToEnd'] - $point2['distToEnd'];
                        // Require significant progress for loops (stricter to avoid dead ends)
                        if ($progress < $loopProgressThreshold) {
                            // Loop doesn't make good progress - inefficient backtracking/dead end
                            return true;
                        }
                    }
                }
            }
        }
        
        // Check 3b: Detect branching patterns (route goes off main path and comes back)
        // This catches the pattern where route branches off like in the second image
        for ($i = 0; $i < count($sampledPoints) - 8; $i++) {
            $point1 = $sampledPoints[$i];
            
            // Look ahead for a point that's close spatially but far in sequence
            for ($j = $i + 8; $j < count($sampledPoints); $j++) {
                $point2 = $sampledPoints[$j];
                
                $spatialDist = $this->getDistance(
                    $point1['point'][0], $point1['point'][1],
                    $point2['point'][0], $point2['point'][1]
                );
                
                // If points are close (within 300m) but far in sequence
                if ($spatialDist < 300) {
                    $sequenceDist = abs($point2['index'] - $point1['index']) * ($straightDistance / count($coordinates));
                    
                    if ($sequenceDist > 800) { // Lower threshold for branch detection
                        // Check if route went away from destination
                        $midIndex = floor(($i + $j) / 2);
                        if ($midIndex < count($sampledPoints)) {
                            $midPoint = $sampledPoints[$midIndex];
                            $progress = $point1['distToEnd'] - $point2['distToEnd'];
                            
                            // If midpoint is significantly further from end, it's a branch/backtrack
                            if ($midPoint['distToEnd'] > $point1['distToEnd'] + 150 && 
                                $progress < 800) {
                                return true; // Branch backtrack detected
                            }
                        }
                    }
                }
            }
        }
        
        // Check 4: Detect routes that require driving same segment twice
        // Look for consecutive segments that are very close together (overlapping roads)
        for ($i = 0; $i < count($sampledPoints) - 3; $i++) {
            $seg1Start = $sampledPoints[$i];
            $seg1End = $sampledPoints[$i + 1];
            
            // Check if any later segment is very close to this segment
            for ($j = $i + 3; $j < count($sampledPoints) - 1; $j++) {
                $seg2Start = $sampledPoints[$j];
                $seg2End = $sampledPoints[$j + 1];
                
                // Check if segments are overlapping (very close to each other)
                $dist1 = $this->getDistance(
                    $seg1Start['point'][0], $seg1Start['point'][1],
                    $seg2Start['point'][0], $seg2Start['point'][1]
                );
                $dist2 = $this->getDistance(
                    $seg1End['point'][0], $seg1End['point'][1],
                    $seg2End['point'][0], $seg2End['point'][1]
                );
                
                // If both endpoints are very close, segments might overlap
                if ($dist1 < 100 && $dist2 < 100) {
                    // Check if they're going in opposite directions (backtracking)
                    $bearing1 = $this->calculateBearing(
                        $seg1Start['point'][0], $seg1Start['point'][1],
                        $seg1End['point'][0], $seg1End['point'][1]
                    );
                    $bearing2 = $this->calculateBearing(
                        $seg2Start['point'][0], $seg2Start['point'][1],
                        $seg2End['point'][0], $seg2End['point'][1]
                    );
                    
                    $bearingDiff = abs($bearing2 - $bearing1);
                    if ($bearingDiff > 180) {
                        $bearingDiff = 360 - $bearingDiff;
                    }
                    
                    // If bearings differ by >150 degrees, it's likely backtracking on same road
                    if ($bearingDiff > 150) {
                        return true; // Backtracking on same road segment
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * Calculate how well the route progresses towards destination
     * Kurviger-style: Returns a score between 0 and 1, where 1 is perfect forward progress
     * Improved to better detect routes that consistently move toward destination
     */
    private function calculateRouteProgressScore($coordinates)
    {
        if (count($coordinates) < 3) {
            return 1.0;
        }
        
        $startPoint = $coordinates[0];
        $endPoint = $coordinates[count($coordinates) - 1];
        $directDistance = $this->getDistance($startPoint[0], $startPoint[1], $endPoint[0], $endPoint[1]);
        
        if ($directDistance == 0) {
            return 1.0;
        }
        
        // Kurviger-style: More detailed sampling for better progress detection
        $sampleSize = min(30, max(15, floor(count($coordinates) / 10)));
        $step = max(1, floor(count($coordinates) / $sampleSize));
        
        $totalProgress = 0;
        $previousDistToEnd = $directDistance;
        $backtrackPenalty = 0;
        $progressSegments = 0;
        $backtrackSegments = 0;
        
        for ($i = $step; $i < count($coordinates); $i += $step) {
            $currentPoint = $coordinates[$i];
            $currentDistToEnd = $this->getDistance($currentPoint[0], $currentPoint[1], $endPoint[0], $endPoint[1]);
            
            // If we're getting closer to end, that's progress
            if ($currentDistToEnd < $previousDistToEnd) {
                $progress = ($previousDistToEnd - $currentDistToEnd) / $directDistance;
                $totalProgress += $progress;
                $progressSegments++;
            } else {
                // Backtracking - penalize but don't reject entirely
                $backtrack = ($currentDistToEnd - $previousDistToEnd) / $directDistance;
                $backtrackPenalty += $backtrack;
                $backtrackSegments++;
            }
            
            $previousDistToEnd = $currentDistToEnd;
        }
        
        // Kurviger-style: Calculate progress ratio
        // Routes with more progress segments than backtrack segments score higher
        $segmentRatio = $progressSegments > 0 ? ($progressSegments / ($progressSegments + $backtrackSegments)) : 0.5;
        
        // Normalize score: progress minus backtrack penalty, weighted by segment ratio
        $rawScore = ($totalProgress - ($backtrackPenalty * 2)) / max(1, $sampleSize);
        $normalizedScore = max(0.1, min(1.0, 0.5 + ($rawScore * 2)));
        
        // Boost score for routes with high progress segment ratio (Kurviger prioritizes this)
        $finalScore = $normalizedScore * (0.7 + ($segmentRatio * 0.3));
        
        return min(1.0, $finalScore);
    }

    /**
     * Calculate bearing between two points
     */
    private function calculateBearing($lat1, $lon1, $lat2, $lon2)
    {
        $dLon = deg2rad($lon2 - $lon1);
        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        
        $y = sin($dLon) * cos($lat2Rad);
        $x = cos($lat1Rad) * sin($lat2Rad) - sin($lat1Rad) * cos($lat2Rad) * cos($dLon);
        
        $bearing = atan2($y, $x);
        $bearing = rad2deg($bearing);
        $bearing = ($bearing + 360) % 360;
        
        return $bearing;
    }

    /**
     * Calculate destination point given start point, bearing and distance
     */
    private function calculateDestination($lat, $lon, $bearing, $distanceKm)
    {
        $earthRadius = 6371; // km
        $latRad = deg2rad($lat);
        $lonRad = deg2rad($lon);
        $bearingRad = deg2rad($bearing);
        
        $destLat = asin(
            sin($latRad) * cos($distanceKm / $earthRadius) +
            cos($latRad) * sin($distanceKm / $earthRadius) * cos($bearingRad)
        );
        
        $destLon = $lonRad + atan2(
            sin($bearingRad) * sin($distanceKm / $earthRadius) * cos($latRad),
            cos($distanceKm / $earthRadius) - sin($latRad) * sin($destLat)
        );
        
        return [rad2deg($destLat), rad2deg($destLon)];
    }

    /**
     * Find secondary roads near a point
     */
    private function findSecondaryRoadsNearPoint($lat, $lon, $radiusMeters)
    {
        $query = sprintf(
            "[out:json];way['highway'~'secondary|tertiary'](around:%d,%s,%s);out tags geom;",
            $radiusMeters,
            $lat,
            $lon
        );

        $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);

        try {
            // Increased timeout for Overpass API
            $response = Http::timeout(30)->get($url);

            if (!$response->successful()) {
                return [];
            }

            $data = $response->json();
            $roads = [];

            if (isset($data['elements'])) {
                foreach ($data['elements'] as $way) {
                    if (!isset($way['geometry'])) continue;

                    $geometry = $way['geometry'];
                    $length = $this->getRoadLength($geometry);

                    if ($length < 500) continue; // Minimum 500m

                    $roads[] = [
                        'id' => $way['id'],
                        'geometry' => $geometry,
                        'length' => $length
                    ];
                }
            }

            return $roads;
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Find curved roads in a bounding box
     * Kurviger-style: Queries OpenStreetMap for secondary/tertiary roads with high curvature
     */
    private function findCurvedRoadsInBoundingBox($minLat, $minLon, $maxLat, $maxLon, $minTwistiness, $maxTwistiness, $curvatureLevel)
    {
        // Overpass bounding box format: (south,west,north,east)
        // Query for secondary, tertiary, and unclassified roads (these are typically twisty)
        // Also include residential roads for very curved routes (they can be twisty too)
        $highwayTypes = $curvatureLevel === 'very_curved' 
            ? 'secondary|tertiary|unclassified|residential'
            : 'secondary|tertiary|unclassified';
            
        $query = sprintf(
            "[out:json];way['highway'~'%s'](%s,%s,%s,%s);out tags geom;",
            $highwayTypes,
            $minLat,
            $minLon,
            $maxLat,
            $maxLon
        );

        $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);

        try {
            // Reduced timeout to 15s for faster fallback if Overpass is slow
            $response = Http::timeout(15)->get($url);

            if (!$response->successful()) {
                Log::warning('Overpass API query failed', ['status' => $response->status()]);
                return [];
            }

            $data = $response->json();
            $curvedRoads = [];

            if (isset($data['elements'])) {
                foreach ($data['elements'] as $way) {
                    if (!isset($way['geometry'])) continue;

                    $geometry = $way['geometry'];
                    $length = $this->getRoadLength($geometry);

                    // Minimum length requirement (longer roads provide more curves)
                    $minLength = $curvatureLevel === 'mellow' ? 500 : 300; // Shorter min for very curved
                    if ($length < $minLength) continue;

                    $twistinessData = $this->calculateTwistiness($geometry);
                    
                    if ($twistinessData === 0) continue;
                    
                    $twistiness = $twistinessData['twistiness'];
                    
                    // Filter by twistiness range
                    if ($twistiness < $minTwistiness || $twistiness > $maxTwistiness) {
                        continue;
                    }

                    // Filter out urban roads (unless very curved and road is twisty enough)
                    $isUrban = isset($way['tags']) && (
                        ($way['tags']['highway'] ?? '') === 'residential' ||
                        ($way['tags']['highway'] ?? '') === 'living_street' ||
                        (isset($way['tags']['maxspeed']) && intval($way['tags']['maxspeed']) <= 50)
                    );

                    // Allow urban roads for very curved if they're twisty enough
                    if ($isUrban && $twistiness <= ($curvatureLevel === 'very_curved' ? 0.010 : 0.007)) {
                        continue;
                    }

                    $curvedRoads[] = [
                        'id' => $way['id'],
                        'name' => $way['tags']['name'] ?? 'Unnamed Road',
                        'geometry' => $geometry,
                        'twistiness' => $twistiness,
                        'corner_count' => $twistinessData['corner_count'],
                        'length' => $length,
                        'highway_type' => $way['tags']['highway'] ?? 'unknown'
                    ];
                }
            }

            // Sort by twistiness (highest first) - Kurviger prioritizes twisty roads
            usort($curvedRoads, function($a, $b) {
                return $b['twistiness'] <=> $a['twistiness'];
            });

            return $curvedRoads;
        } catch (\Exception $e) {
            Log::error('Error querying curved roads in bounding box', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Build route through curved roads by selecting strategic waypoints
     */
    private function buildRouteThroughCurvedRoads($curvedRoads, $startLat, $startLon, $endLat, $endLon, $straightDistance, $curvatureLevel)
    {
        if (empty($curvedRoads)) {
            return null;
        }
        
        // Select strategic waypoints on curved roads that form a path from start to end
        $waypoints = $this->selectStrategicWaypointsOnCurvedRoads(
            $curvedRoads,
            $startLat,
            $startLon,
            $endLat,
            $endLon,
            $curvatureLevel
        );
        
        if (count($waypoints) < 3) {
            return null;
        }
        
        // Route through waypoints using OSRM
        return $this->buildRouteThroughWaypoints($waypoints);
    }

    /**
     * Select strategic waypoints on curved roads that form a path from start to end
     * Kurviger-style: Prioritizes roads with higher twistiness and better connectivity
     */
    private function selectStrategicWaypointsOnCurvedRoads($curvedRoads, $startLat, $startLon, $endLat, $endLon, $curvatureLevel)
    {
        $waypoints = [[$startLat, $startLon]]; // Start point
        $usedRoadIds = [];
        $preferVeryCurved = ($curvatureLevel === 'curvy' || $curvatureLevel === 'very_curved');
        $maxWaypoints = $curvatureLevel === 'mellow' ? 8 : 12; // Increased for better route quality
        
        // Calculate direct distance
        $directDistance = $this->getDistance($startLat, $startLon, $endLat, $endLon);
        
        // Sort curved roads by twistiness (highest first) - Kurviger prioritizes twisty roads
        usort($curvedRoads, function($a, $b) use ($preferVeryCurved) {
            $scoreA = $a['twistiness'] * ($preferVeryCurved && $a['twistiness'] > 0.007 ? 1.5 : 1.0);
            $scoreB = $b['twistiness'] * ($preferVeryCurved && $b['twistiness'] > 0.007 ? 1.5 : 1.0);
            return $scoreB <=> $scoreA; // Descending order
        });
        
        // Divide the route into segments and find curved roads for each segment
        // More segments for very curved routes to capture more twisty roads
        $numSegments = $curvatureLevel === 'mellow' ? 5 : 8;
        
        for ($i = 1; $i < $numSegments && count($waypoints) < $maxWaypoints; $i++) {
            // Calculate a point along the direct line from start to end
            $ratio = $i / $numSegments;
            $segmentLat = $startLat + ($endLat - $startLat) * $ratio;
            $segmentLon = $startLon + ($endLon - $startLon) * $ratio;
            
            // Find best curved road near this segment point
            // Prioritize: 1) High twistiness, 2) Close to segment point, 3) Progresses toward end
            $bestWaypoint = $this->findBestWaypointOnCurvedRoads(
                $curvedRoads,
                $segmentLat,
                $segmentLon,
                $endLat,
                $endLon,
                $usedRoadIds,
                $preferVeryCurved,
                $curvatureLevel
            );
            
            if ($bestWaypoint) {
                $usedRoadIds[] = $bestWaypoint['roadId'];
                $waypoints[] = [$bestWaypoint['lat'], $bestWaypoint['lon']];
            }
        }
        
        $waypoints[] = [$endLat, $endLon]; // End point
        
        // Remove waypoints that are too close together (but preserve user waypoints)
        return $this->deduplicateWaypoints($waypoints, 300);
    }

    /**
     * Find best waypoint on curved roads near a segment point
     * Kurviger-style: Prioritizes roads with high twistiness that progress toward destination
     */
    private function findBestWaypointOnCurvedRoads($curvedRoads, $segmentLat, $segmentLon, $endLat, $endLon, $usedRoadIds, $preferVeryCurved, $curvatureLevel)
    {
        $bestWaypoint = null;
        $bestScore = -1;
        
        // Maximum distance from segment point (varies by curvature level)
        $maxDistanceFromSegment = $curvatureLevel === 'mellow' ? 3000 : 6000; // Increased for better coverage
        
        // Separate very curved roads if preferred (Kurviger prioritizes these)
        $veryCurvedRoads = [];
        $otherRoads = [];
        
        if ($preferVeryCurved) {
            foreach ($curvedRoads as $road) {
                if ($road['twistiness'] > 0.007) {
                    $veryCurvedRoads[] = $road;
                } else {
                    $otherRoads[] = $road;
                }
            }
            // Prioritize very curved roads
            $roadsToSearch = array_merge($veryCurvedRoads, $otherRoads);
        } else {
            $roadsToSearch = $curvedRoads;
        }
        
        foreach ($roadsToSearch as $road) {
            if (in_array($road['id'], $usedRoadIds)) {
                continue;
            }
            
            // Find closest point on this road to the segment point
            $closestPoint = $this->findClosestPointOnRoad($road['geometry'], $segmentLat, $segmentLon);
            
            if (!$closestPoint) {
                continue;
            }
            
            $distanceFromSegment = $this->getDistance(
                $segmentLat,
                $segmentLon,
                $closestPoint['lat'],
                $closestPoint['lon']
            );
            
            // Skip if too far from segment
            if ($distanceFromSegment > $maxDistanceFromSegment) {
                continue;
            }
            
            // Calculate distance to end (prefer roads that get us closer to end)
            $distToEnd = $this->getDistance(
                $closestPoint['lat'],
                $closestPoint['lon'],
                $endLat,
                $endLon
            );
            
            // Score: Higher twistiness = much better (Kurviger prioritizes this)
            // Also consider road length (longer curved roads are better)
            $twistinessScore = $road['twistiness'] * 20000; // Increased weight
            if ($preferVeryCurved && $road['twistiness'] > 0.007) {
                $twistinessScore *= 2.0; // Double bonus for very curved roads
            }
            
            // Length bonus (longer curved roads provide more curves)
            $lengthBonus = min($road['length'] / 1000, 5) * 500; // Up to 5km bonus
            
            // Distance penalties (but less important than twistiness)
            $distancePenalty = ($distanceFromSegment / 200) + ($distToEnd / 300);
            
            // Corner count bonus (more corners = more curves)
            $cornerBonus = ($road['corner_count'] ?? 0) * 100;
            
            $score = $twistinessScore + $lengthBonus + $cornerBonus - $distancePenalty;
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestWaypoint = [
                    'lat' => $closestPoint['lat'],
                    'lon' => $closestPoint['lon'],
                    'roadId' => $road['id']
                ];
            }
        }
        
        return $bestWaypoint;
    }

    /**
     * Find nearest curved road to a point
     */
    private function findNearestCurvedRoad($curvedRoads, $lat, $lon)
    {
        $nearest = null;
        $minDistance = PHP_FLOAT_MAX;
        
        foreach ($curvedRoads as $road) {
            foreach ($road['geometry'] as $point) {
                $distance = $this->getDistance($lat, $lon, $point['lat'], $point['lon']);
                if ($distance < $minDistance) {
                    $minDistance = $distance;
                    $nearest = $road;
                }
            }
        }
        
        return $nearest;
    }

    /**
     * Find path through connected curved roads using greedy approach
     */
    private function findPathThroughCurvedRoads($curvedRoads, $startRoad, $endRoad, $startLat, $startLon, $endLat, $endLon, $straightDistance, $curvatureLevel)
    {
        $path = [];
        $visited = [];
        $currentRoad = $startRoad;
        $maxRoads = $curvatureLevel === 'mellow' ? 8 : 15;
        $maxDistance = $straightDistance * ($curvatureLevel === 'mellow' ? 1.5 : 2.0);
        
        // Prefer very curved roads for very curved routes
        $preferVeryCurved = ($curvatureLevel === 'curvy' || $curvatureLevel === 'very_curved');
        
        while ($currentRoad && count($path) < $maxRoads) {
            $path[] = $currentRoad;
            $visited[$currentRoad['id']] = true;
            
            // If we've reached the end road, we're done
            if ($currentRoad['id'] === $endRoad['id']) {
                break;
            }
            
            // Find next connected curved road that gets us closer to end
            $nextRoad = $this->findNextCurvedRoad(
                $curvedRoads,
                $currentRoad,
                $endRoad,
                $endLat,
                $endLon,
                $visited,
                $preferVeryCurved
            );
            
            if (!$nextRoad) {
                // No connected road found, try to find any road closer to end
                $nextRoad = $this->findCloserCurvedRoad(
                    $curvedRoads,
                    $currentRoad,
                    $endLat,
                    $endLon,
                    $visited,
                    $preferVeryCurved
                );
            }
            
            if (!$nextRoad) {
                break; // Can't find next road
            }
            
            $currentRoad = $nextRoad;
        }
        
        // If we didn't reach the end road, add it
        if (!empty($path) && end($path)['id'] !== $endRoad['id']) {
            $path[] = $endRoad;
        }
        
        return $path;
    }

    /**
     * Find next connected curved road
     */
    private function findNextCurvedRoad($curvedRoads, $currentRoad, $endRoad, $endLat, $endLon, $visited, $preferVeryCurved)
    {
        $bestRoad = null;
        $bestScore = -1;
        
        $currentEnd = $currentRoad['geometry'][count($currentRoad['geometry']) - 1];
        
        foreach ($curvedRoads as $road) {
            if (isset($visited[$road['id']])) {
                continue;
            }
            
            // Check if roads are connected (within 100m)
            $roadStart = $road['geometry'][0];
            $roadEnd = $road['geometry'][count($road['geometry']) - 1];
            
            $dist1 = $this->getDistance($currentEnd['lat'], $currentEnd['lon'], $roadStart['lat'], $roadStart['lon']);
            $dist2 = $this->getDistance($currentEnd['lat'], $currentEnd['lon'], $roadEnd['lat'], $roadEnd['lon']);
            
            if ($dist1 > 100 && $dist2 > 100) {
                continue; // Not connected
            }
            
            // Calculate distance to end
            $distToEnd = min(
                $this->getDistance($roadStart['lat'], $roadStart['lon'], $endLat, $endLon),
                $this->getDistance($roadEnd['lat'], $roadEnd['lon'], $endLat, $endLon)
            );
            
            // Score: prefer roads closer to end, with higher twistiness
            $score = $road['twistiness'] * 10000 - ($distToEnd / 100);
            if ($preferVeryCurved && $road['twistiness'] > 0.007) {
                $score *= 1.5;
            }
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestRoad = $road;
            }
        }
        
        return $bestRoad;
    }

    /**
     * Find curved road closer to end point
     */
    private function findCloserCurvedRoad($curvedRoads, $currentRoad, $endLat, $endLon, $visited, $preferVeryCurved)
    {
        $currentEnd = $currentRoad['geometry'][count($currentRoad['geometry']) - 1];
        $currentDistToEnd = $this->getDistance($currentEnd['lat'], $currentEnd['lon'], $endLat, $endLon);
        
        $bestRoad = null;
        $bestScore = -1;
        
        foreach ($curvedRoads as $road) {
            if (isset($visited[$road['id']])) {
                continue;
            }
            
            $roadStart = $road['geometry'][0];
            $roadEnd = $road['geometry'][count($road['geometry']) - 1];
            
            $distToEnd = min(
                $this->getDistance($roadStart['lat'], $roadStart['lon'], $endLat, $endLon),
                $this->getDistance($roadEnd['lat'], $roadEnd['lon'], $endLat, $endLon)
            );
            
            // Only consider if closer to end
            if ($distToEnd >= $currentDistToEnd) {
                continue;
            }
            
            // Score: prefer closer roads with higher twistiness
            $score = $road['twistiness'] * 10000 - ($distToEnd / 100);
            if ($preferVeryCurved && $road['twistiness'] > 0.007) {
                $score *= 1.5;
            }
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestRoad = $road;
            }
        }
        
        return $bestRoad;
    }

    /**
     * Find strategic waypoints using OSRM-only strategy (no Overpass API)
     * Samples points from route and adds perpendicular waypoints to force curved routing
     */
    private function findStrategicWaypointsOSRMOnly($straightCoordinates, $curvatureLevel, $startLat, $startLon, $endLat, $endLon)
    {
        $waypoints = [];
        
        // Determine parameters based on curvature level
        $maxWaypoints = $curvatureLevel === 'mellow' ? 8 : 15; // More waypoints for very curved
        $numSamples = $curvatureLevel === 'mellow' ? 15 : 25; // Sample points along route
        
        // Sample points along the straight route
        $routePoints = $this->sampleRoutePoints($straightCoordinates, $numSamples);
        
        // Calculate overall bearing from start to end
        $bearing = $this->calculateBearing($startLat, $startLon, $endLat, $endLon);
        $perpendicularBearing1 = ($bearing + 90) % 360;
        $perpendicularBearing2 = ($bearing - 90) % 360;
        
        // EXTREME: Determine offset distances and bearings based on curvature level
        $offsetDistances = $curvatureLevel === 'mellow' 
            ? [8000, 12000] // EXTREME: Much larger offsets for mellow
            : [12000, 20000, 28000]; // EXTREME: Much larger offsets for very curved
        
        $bearingsToTry = $curvatureLevel === 'mellow' 
            ? [$perpendicularBearing1] // Only one side for mellow
            : [$perpendicularBearing1, $perpendicularBearing2]; // Both sides for very curved
        
        // For each segment of the route, calculate local bearing and add waypoints
        for ($i = 1; $i < count($routePoints) - 1 && count($waypoints) < $maxWaypoints; $i++) {
            $point1 = $routePoints[$i - 1];
            $point2 = $routePoints[$i];
            
            // Calculate local bearing for this segment
            $localBearing = $this->calculateBearing($point1[0], $point1[1], $point2[0], $point2[1]);
            $localPerp1 = ($localBearing + 90) % 360;
            $localPerp2 = ($localBearing - 90) % 360;
            
            // Try different offset distances
            foreach ($offsetDistances as $offsetMeters) {
                if (count($waypoints) >= $maxWaypoints) {
                    break;
                }
                
                // Try both perpendicular directions
                foreach ($bearingsToTry as $baseBearing) {
                    if (count($waypoints) >= $maxWaypoints) {
                        break;
                    }
                    
                    // Use local perpendicular bearing for more accurate waypoint placement
                    $useBearing = (abs($baseBearing - $localPerp1) < abs($baseBearing - $localPerp2)) 
                        ? $localPerp1 
                        : $localPerp2;
                    
                    // Calculate waypoint offset perpendicular to route segment
                    $offsetKm = $offsetMeters / 1000;
                    $waypoint = $this->calculateDestination($point2[0], $point2[1], $useBearing, $offsetKm);
                    
                    if ($waypoint) {
                        // Verify waypoint doesn't cause backtracking
                        $waypointDistToEnd = $this->getDistance($waypoint[0], $waypoint[1], $endLat, $endLon);
                        $pointDistToEnd = $this->getDistance($point2[0], $point2[1], $endLat, $endLon);
                        
                        // Skip if waypoint is significantly further from end
                        if ($waypointDistToEnd > $pointDistToEnd + ($curvatureLevel === 'mellow' ? 2000 : 5000)) {
                            continue;
                        }
                        
                        // Check if waypoint is too close to existing waypoints
                        $tooClose = false;
                        foreach ($waypoints as $existingWp) {
                            $dist = $this->getDistance($waypoint[0], $waypoint[1], $existingWp[0], $existingWp[1]);
                            if ($dist < 500) { // Minimum 500m spacing
                                $tooClose = true;
                                break;
                            }
                        }
                        
                        if (!$tooClose) {
                            $waypoints[] = $waypoint;
                        }
                    }
                }
            }
        }
        
        // Remove duplicates and ensure waypoints are reasonably spaced
        return $this->deduplicateWaypoints($waypoints, 500);
    }

    /**
     * Find strategic waypoints on curved roads (deprecated - keeping for reference)
     * This method uses Overpass API and is no longer used
     */
    private function findStrategicCurvedWaypoints($straightCoordinates, $curvatureLevel, $startLat, $startLon, $endLat, $endLon)
    {
        $waypoints = []; // Don't include start point here, it will be added separately
        $processedRoadIds = [];
        
        // Determine parameters based on curvature level - more aggressive for detailed routes
        $maxDeviationMeters = $curvatureLevel === 'mellow' ? 800 : 1500; // Increased max deviation
        $searchRadiusMeters = $curvatureLevel === 'mellow' ? 500 : 1000; // Increased search radius
        $minTwistiness = $curvatureLevel === 'mellow' ? 0.002 : 0.005; // Lower threshold to find more roads
        $maxTwistiness = $curvatureLevel === 'mellow' ? 0.005 : 0.025; // Higher max for very curved
        $maxWaypoints = $curvatureLevel === 'mellow' ? 12 : 20; // More waypoints for detailed routes
        
        // Sample more points along straight route to increase chances of finding curved roads
        // More samples = more opportunities to find curved roads
        $numSamples = $curvatureLevel === 'mellow' ? 20 : 30;
        $routePoints = $this->sampleRoutePoints($straightCoordinates, $numSamples);
        
        // For each sampled point, find nearby curved roads
        for ($i = 1; $i < count($routePoints) - 1 && count($waypoints) < $maxWaypoints; $i++) {
            $routePoint = $routePoints[$i];
            $routeLat = $routePoint[0];
            $routeLon = $routePoint[1];
            
            // Find curved roads near this point
            $nearbyRoads = $this->findCurvedRoadsNearPoint(
                $routeLat,
                $routeLon,
                $searchRadiusMeters / 111000, // Convert meters to degrees
                $minTwistiness,
                $maxTwistiness
            );
            
            if (empty($nearbyRoads)) {
                continue;
            }
            
            // Find the best waypoint on a curved road near this route point
            $bestWaypoint = $this->findBestCurvedWaypointForRoute(
                $nearbyRoads,
                $routeLat,
                $routeLon,
                $processedRoadIds,
                $maxDeviationMeters,
                $curvatureLevel
            );
            
            if ($bestWaypoint) {
                $processedRoadIds[] = $bestWaypoint['roadId'];
                $waypoints[] = [$bestWaypoint['lat'], $bestWaypoint['lon']];
            }
        }
        
        // Don't add end point here - it will be added by the caller
        // Remove waypoints that are too close together (minimum 300m apart for more waypoints)
        return $this->deduplicateWaypoints($waypoints, 300);
    }

    /**
     * Find the best waypoint on a curved road near a route point
     */
    private function findBestCurvedWaypointForRoute($roads, $routeLat, $routeLon, $processedRoadIds, $maxDeviationMeters, $curvatureLevel)
    {
        $bestWaypoint = null;
        $bestScore = -1;
        $preferVeryCurved = ($curvatureLevel === 'curvy' || $curvatureLevel === 'very_curved');
        
        // Separate very curved roads if preferred
        $veryCurvedRoads = [];
        $otherRoads = [];
        
        if ($preferVeryCurved) {
            foreach ($roads as $road) {
                if ($road['twistiness'] > 0.007) {
                    $veryCurvedRoads[] = $road;
                } else {
                    $otherRoads[] = $road;
                }
            }
            $roadsToSearch = array_merge($veryCurvedRoads, $otherRoads);
        } else {
            $roadsToSearch = $roads;
        }
        
        foreach ($roadsToSearch as $road) {
            if (in_array($road['id'], $processedRoadIds)) {
                continue;
            }
            
            // Find closest point on this road to the route point
            $closestPoint = $this->findClosestPointOnRoad($road['geometry'], $routeLat, $routeLon);
            
            if (!$closestPoint) {
                continue;
            }
            
            $distance = $this->getDistance(
                $routeLat,
                $routeLon,
                $closestPoint['lat'],
                $closestPoint['lon']
            );
            
            // Skip if too far from route
            if ($distance > $maxDeviationMeters) {
                continue;
            }
            
            // Score: higher twistiness is better, closer is better
            $twistinessScore = $road['twistiness'] * 10000;
            if ($preferVeryCurved && $road['twistiness'] > 0.007) {
                $twistinessScore *= 1.5; // Extra bonus for very curved
            }
            
            $distancePenalty = $distance / 10; // Penalty for distance
            $score = $twistinessScore - $distancePenalty;
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestWaypoint = [
                    'lat' => $closestPoint['lat'],
                    'lon' => $closestPoint['lon'],
                    'roadId' => $road['id']
                ];
            }
        }
        
        return $bestWaypoint;
    }

    /**
     * Find the closest point on a road to a given point
     */
    private function findClosestPointOnRoad($roadGeometry, $targetLat, $targetLon)
    {
        $closestPoint = null;
        $minDistance = PHP_FLOAT_MAX;
        
        foreach ($roadGeometry as $point) {
            $distance = $this->getDistance(
                $targetLat,
                $targetLon,
                $point['lat'],
                $point['lon']
            );
            
            if ($distance < $minDistance) {
                $minDistance = $distance;
                $closestPoint = $point;
            }
        }
        
        return $closestPoint;
    }

    /**
     * Remove duplicate waypoints that are too close together
     */
    private function deduplicateWaypoints($waypoints, $minDistanceMeters)
    {
        if (count($waypoints) < 2) {
            return $waypoints;
        }
        
        $result = [$waypoints[0]]; // Always keep first
        
        for ($i = 1; $i < count($waypoints) - 1; $i++) {
            $prevPoint = $result[count($result) - 1];
            $currentPoint = $waypoints[$i];
            
            $distance = $this->getDistance(
                $prevPoint[0],
                $prevPoint[1],
                $currentPoint[0],
                $currentPoint[1]
            );
            
            // Only add if far enough from previous point
            if ($distance >= $minDistanceMeters) {
                $result[] = $currentPoint;
            }
        }
        
        // Always keep last
        $result[] = $waypoints[count($waypoints) - 1];
        
        return $result;
    }

    /**
     * Remove duplicate waypoints that are too close together, but always preserve user waypoints
     */
    private function deduplicateWaypointsPreservingUser($waypoints, $minDistanceMeters, $userWaypointKeys = [])
    {
        if (count($waypoints) < 2) {
            return $waypoints;
        }
        
        $result = [$waypoints[0]]; // Always keep first (start point)
        
        for ($i = 1; $i < count($waypoints) - 1; $i++) {
            $currentPoint = $waypoints[$i];
            $currentKey = round($currentPoint[0], 5) . ',' . round($currentPoint[1], 5);
            
            // Always preserve user waypoints
            if (isset($userWaypointKeys[$currentKey])) {
                $result[] = $currentPoint;
                continue;
            }
            
            // For non-user waypoints, check distance from previous point
            $prevPoint = $result[count($result) - 1];
            $distance = $this->getDistance(
                $prevPoint[0],
                $prevPoint[1],
                $currentPoint[0],
                $currentPoint[1]
            );
            
            // Only add if far enough from previous point
            if ($distance >= $minDistanceMeters) {
                $result[] = $currentPoint;
            }
        }
        
        // Always keep last (end point)
        $result[] = $waypoints[count($waypoints) - 1];
        
        return $result;
    }

    /**
     * Find aggressive curved waypoints with wider search
     */
    private function findAggressiveCurvedWaypoints($straightCoordinates, $curvatureLevel, $startLat, $startLon, $endLat, $endLon)
    {
        $waypoints = [[$startLat, $startLon]]; // Start point
        $processedRoadIds = [];
        
        // More aggressive parameters
        $maxDeviationMeters = $curvatureLevel === 'mellow' ? 800 : 1500;
        $searchRadiusMeters = $curvatureLevel === 'mellow' ? 500 : 1000;
        $minTwistiness = $curvatureLevel === 'mellow' ? 0.0025 : 0.007;
        $maxTwistiness = $curvatureLevel === 'mellow' ? 0.0035 : 0.02;
        $maxWaypoints = $curvatureLevel === 'mellow' ? 8 : 12;
        
        // Sample more points
        $routePoints = $this->sampleRoutePoints($straightCoordinates, 15);
        
        // For each sampled point, find nearby curved roads
        for ($i = 1; $i < count($routePoints) - 1 && count($waypoints) < $maxWaypoints + 1; $i++) {
            $routePoint = $routePoints[$i];
            $routeLat = $routePoint[0];
            $routeLon = $routePoint[1];
            
            // Find curved roads near this point
            $nearbyRoads = $this->findCurvedRoadsNearPoint(
                $routeLat,
                $routeLon,
                $searchRadiusMeters / 111000,
                $minTwistiness,
                $maxTwistiness
            );
            
            if (empty($nearbyRoads)) {
                continue;
            }
            
            // Find the best waypoint
            $bestWaypoint = $this->findBestCurvedWaypointForRoute(
                $nearbyRoads,
                $routeLat,
                $routeLon,
                $processedRoadIds,
                $maxDeviationMeters,
                $curvatureLevel
            );
            
            if ($bestWaypoint) {
                $processedRoadIds[] = $bestWaypoint['roadId'];
                $waypoints[] = [$bestWaypoint['lat'], $bestWaypoint['lon']];
            }
        }
        
        // Add end point
        $waypoints[] = [$endLat, $endLon];
        
        // Remove waypoints that are too close together (minimum 300m apart for aggressive)
        return $this->deduplicateWaypoints($waypoints, 300);
    }

    /**
     * Sample points along a route
     */
    private function sampleRoutePoints($coordinates, $maxPoints)
    {
        $count = count($coordinates);
        if ($count <= $maxPoints || $maxPoints < 3) {
            return $coordinates;
        }

        $result = [$coordinates[0]]; // Always include start
        $step = max(1, floor($count / ($maxPoints - 2)));

        for ($i = $step; $i < $count - 1; $i += $step) {
            $result[] = $coordinates[$i];
        }

        $result[] = $coordinates[$count - 1]; // Always include end
        return $result;
    }

    /**
     * Find curved waypoints along the route path
     */
    private function findCurvedWaypointsAlongRoute($routePoints, $corridorWidth, $curvatureLevel, $startLat, $startLon, $endLat, $endLon)
    {
        $waypoints = [];
        $processedRoads = [];
        
        // Determine curvature thresholds
        $minTwistiness = 0.0025; // Minimum for mellow
        $maxTwistiness = 0.01; // Maximum to consider
        $preferVeryCurved = false;
        
        if ($curvatureLevel === 'mellow') {
            $minTwistiness = 0.0025;
            $maxTwistiness = 0.0035;
        } elseif ($curvatureLevel === 'curvy' || $curvatureLevel === 'very_curved') {
            // For very curved, allow both mellow and very curved, but prefer very curved
            $minTwistiness = 0.0025; // Allow mellow too
            $maxTwistiness = 0.02; // Allow very curved roads
            $preferVeryCurved = true;
        }

        // For each segment of the route, find curved roads nearby
        for ($i = 0; $i < count($routePoints) - 1; $i++) {
            $point1 = $routePoints[$i];
            $point2 = $routePoints[$i + 1];
            
            // Calculate midpoint and search radius
            $midLat = ($point1[0] + $point2[0]) / 2;
            $midLon = ($point1[1] + $point2[1]) / 2;
            
            // Find curved roads near this segment
            $nearbyRoads = $this->findCurvedRoadsNearPoint($midLat, $midLon, $corridorWidth, $minTwistiness, $maxTwistiness);
            
            // Find the best curved road segment that's roughly parallel to the route segment
            $bestRoad = $this->findBestRoadForSegment($nearbyRoads, $point1, $point2, $processedRoads, $preferVeryCurved);
            
            if ($bestRoad) {
                $processedRoads[] = $bestRoad['id'];
                // Add waypoints from this road
                $roadCoords = array_map(function($p) {
                    return [$p['lat'], $p['lon']];
                }, $bestRoad['geometry']);
                
                // Add start and end points of the road segment
                if (!empty($roadCoords)) {
                    $waypoints[] = $roadCoords[0];
                    if (count($roadCoords) > 1) {
                        $waypoints[] = $roadCoords[count($roadCoords) - 1];
                    }
                }
            } else {
                // No curved road found, use the route point
                $waypoints[] = $point2;
            }
        }

        // Remove duplicates and ensure start/end are included
        $uniqueWaypoints = [];
        $seen = [];
        foreach ($waypoints as $wp) {
            $key = round($wp[0], 5) . ',' . round($wp[1], 5);
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $uniqueWaypoints[] = $wp;
            }
        }

        // Ensure start and end are included
        $result = [[$startLat, $startLon]];
        foreach ($uniqueWaypoints as $wp) {
            $result[] = $wp;
        }
        $result[] = [$endLat, $endLon];

        return $result;
    }

    /**
     * Find curved roads near a specific point
     */
    private function findCurvedRoadsNearPoint($lat, $lon, $radiusDegrees, $minTwistiness, $maxTwistiness)
    {
        // Convert degrees to meters (approximate: 1 degree ≈ 111km)
        $radiusMeters = round($radiusDegrees * 111000);
        
        // Minimum 100m, maximum 2000m for Overpass API
        $radiusMeters = max(100, min(2000, $radiusMeters));
        
        $query = sprintf(
            "[out:json];way['highway'~'secondary|tertiary|unclassified'](around:%d,%s,%s);out tags geom;",
            $radiusMeters,
            $lat,
            $lon
        );

        $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);

        try {
            // Increased timeout for Overpass API
            $response = Http::timeout(30)->get($url);

            if (!$response->successful()) {
                return [];
            }

            $data = $response->json();
            $curvedRoads = [];

            if (isset($data['elements'])) {
                foreach ($data['elements'] as $way) {
                    if (!isset($way['geometry'])) continue;

                    $geometry = $way['geometry'];
                    $length = $this->getRoadLength($geometry);

                    if ($length < 500) continue; // Minimum 500m

                    $twistinessData = $this->calculateTwistiness($geometry);
                    
                    if ($twistinessData === 0) continue;
                    
                    $twistiness = $twistinessData['twistiness'];
                    
                    // Filter by twistiness range
                    if ($twistiness < $minTwistiness || $twistiness > $maxTwistiness) {
                        continue;
                    }

                    // Filter out urban roads
                    $isUrban = isset($way['tags']) && (
                        ($way['tags']['highway'] ?? '') === 'residential' ||
                        ($way['tags']['highway'] ?? '') === 'living_street' ||
                        (isset($way['tags']['maxspeed']) && intval($way['tags']['maxspeed']) <= 50)
                    );

                    if ($isUrban && $twistiness <= 0.007) continue;

                    $curvedRoads[] = [
                        'id' => $way['id'],
                        'name' => $way['tags']['name'] ?? 'Unnamed Road',
                        'geometry' => $geometry,
                        'twistiness' => $twistiness,
                        'corner_count' => $twistinessData['corner_count'],
                        'length' => $length
                    ];
                }
            }

            return $curvedRoads;
        } catch (\Exception $e) {
            Log::error('Error querying curved roads near point', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Find the best curved road segment for a route segment
     */
    private function findBestRoadForSegment($roads, $segmentStart, $segmentEnd, $processedRoads, $preferVeryCurved = false)
    {
        if (empty($roads)) {
            return null;
        }

        $bestRoad = null;
        $bestScore = -1;
        
        // Separate very curved roads if we prefer them
        $veryCurvedRoads = [];
        $otherRoads = [];
        
        if ($preferVeryCurved) {
            foreach ($roads as $road) {
                if ($road['twistiness'] > 0.007) {
                    $veryCurvedRoads[] = $road;
                } else {
                    $otherRoads[] = $road;
                }
            }
            // Search very curved roads first
            $roadsToSearch = array_merge($veryCurvedRoads, $otherRoads);
        } else {
            $roadsToSearch = $roads;
        }

        foreach ($roadsToSearch as $road) {
            // Skip if already processed
            if (in_array($road['id'], $processedRoads)) {
                continue;
            }

            // Calculate how well this road aligns with the segment
            $roadStart = $road['geometry'][0];
            $roadEnd = $road['geometry'][count($road['geometry']) - 1];
            
            // Calculate distances from road endpoints to segment endpoints
            $dist1 = $this->getDistance($segmentStart[0], $segmentStart[1], $roadStart['lat'], $roadStart['lon']);
            $dist2 = $this->getDistance($segmentEnd[0], $segmentEnd[1], $roadEnd['lat'], $roadEnd['lon']);
            $dist3 = $this->getDistance($segmentStart[0], $segmentStart[1], $roadEnd['lat'], $roadEnd['lon']);
            $dist4 = $this->getDistance($segmentEnd[0], $segmentEnd[1], $roadStart['lat'], $roadStart['lon']);
            
            $minDist = min($dist1 + $dist2, $dist3 + $dist4);
            
            // Score based on proximity and twistiness
            // Prefer roads that are close and have good twistiness
            $twistinessBonus = $road['twistiness'] * 1000;
            if ($preferVeryCurved && $road['twistiness'] > 0.007) {
                $twistinessBonus *= 1.5; // Extra bonus for very curved when preferred
            }
            $score = $twistinessBonus - ($minDist / 100); // Twistiness bonus, distance penalty
            
            // For mellow, prefer closer roads even if less curved
            if (!$preferVeryCurved && $road['twistiness'] <= 0.0035) {
                $score += 200; // Bonus for staying close to path
            }
            
            if ($score > $bestScore && $minDist < 1000) { // Within 1km
                $bestScore = $score;
                $bestRoad = $road;
            }
        }

        return $bestRoad;
    }

    /**
     * Build route through waypoints using OSRM
     */
    private function buildRouteThroughWaypoints($waypoints)
    {
        if (count($waypoints) < 2) {
            return null;
        }

        // Limit waypoints but keep enough to force routing through curved roads
        // OSRM can handle up to 100 waypoints, but we want to use waypoints strategically
        if (count($waypoints) > 25) {
            // For too many waypoints, sample but keep more for curved routes
            $waypoints = $this->sampleWaypoints($waypoints, 25);
        }

        $waypointsString = implode(';', array_map(function($wp) {
            return $wp[1] . ',' . $wp[0]; // lon,lat format for OSRM
        }, $waypoints));

        // Use alternatives=false and steps=false to get direct route through waypoints
        $url = sprintf(
            '%s/route/v1/driving/%s?overview=full&geometries=geojson&alternatives=false&steps=false',
            $this->osrmBaseUrl,
            $waypointsString
        );

        try {
            $response = Http::timeout(30)->get($url);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();

            if (!isset($data['routes']) || empty($data['routes'])) {
                return null;
            }

            $route = $data['routes'][0];
            $geometry = $route['geometry']['coordinates'];

            // Convert GeoJSON format [lon, lat] to [lat, lon]
            $coordinates = array_map(function($coord) {
                return [$coord[1], $coord[0]];
            }, $geometry);

            $distance = $route['distance'];
            $duration = $route['duration'];

            // Calculate route statistics
            $stats = $this->calculateRouteStats($coordinates);

            return [
                'coordinates' => $coordinates,
                'distance' => $distance,
                'duration' => $duration,
                'type' => 'curved',
                'curvature' => $stats['curvature'],
                'corner_count' => $stats['corner_count'],
                'elevation_gain' => $stats['elevation_gain'],
                'elevation_loss' => $stats['elevation_loss'],
                'max_elevation' => $stats['max_elevation'],
                'min_elevation' => $stats['min_elevation']
            ];
        } catch (\Exception $e) {
            Log::error('Error building route through waypoints', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Build hybrid route mixing straightest and curved segments
     */
    private function buildHybridRoute($straightRoute, $curvedRoute, $curvatureLevel)
    {
        // If curved route is too long, return mostly straightest with some curved segments
        // For now, just return straightest - can be enhanced later
        return $straightRoute;
    }

    /**
     * Find curved roads in a corridor (deprecated - keeping for reference)
     */
    private function findCurvedRoadsInCorridor($bbox, $curvatureLevel, $startLat, $startLon, $endLat, $endLon)
    {
        $minLat = $bbox['minLat'];
        $maxLat = $bbox['maxLat'];
        $minLon = $bbox['minLon'];
        $maxLon = $bbox['maxLon'];

        // Determine twistiness threshold based on curvature level
        $twistinessThreshold = 0.0035; // moderate default
        if ($curvatureLevel === 'curvy' || $curvatureLevel === 'very_curved') {
            $twistinessThreshold = 0.007;
        } elseif ($curvatureLevel === 'mellow') {
            $twistinessThreshold = 0.0025;
        }

        // Query Overpass for secondary/tertiary roads in the bounding box
        // Overpass bounding box format: (south,west,north,east)
        $query = sprintf(
            "[out:json];way['highway'~'secondary|tertiary|unclassified'](%s,%s,%s,%s);out tags geom;",
            $minLat,  // south
            $minLon,  // west
            $maxLat,  // north
            $maxLon   // east
        );

        $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);

        try {
            // Reduced timeout to 15s for faster fallback if Overpass is slow
            $response = Http::timeout(15)->get($url);

            if (!$response->successful()) {
                Log::warning('Overpass API query failed', ['status' => $response->status()]);
                return [];
            }

            $data = $response->json();
            $curvedRoads = [];

            if (isset($data['elements'])) {
                foreach ($data['elements'] as $way) {
                    if (!isset($way['geometry'])) continue;

                    $geometry = $way['geometry'];
                    $length = $this->getRoadLength($geometry);

                    if ($length < 1000) continue; // Minimum 1km

                    $twistinessData = $this->calculateTwistiness($geometry);
                    
                    if ($twistinessData === 0) continue;

                    // Filter by curvature level
                    if ($curvatureLevel === 'curvy' || $curvatureLevel === 'very_curved') {
                        if ($twistinessData['twistiness'] <= 0.007) continue;
                    } elseif ($curvatureLevel === 'moderate') {
                        if ($twistinessData['twistiness'] < 0.0035 || $twistinessData['twistiness'] > 0.007) continue;
                    } elseif ($curvatureLevel === 'mellow') {
                        if ($twistinessData['twistiness'] > 0.0035) continue;
                    }

                    // Filter out urban roads
                    $isUrban = isset($way['tags']) && (
                        ($way['tags']['highway'] ?? '') === 'residential' ||
                        ($way['tags']['highway'] ?? '') === 'living_street' ||
                        (isset($way['tags']['maxspeed']) && intval($way['tags']['maxspeed']) <= 50)
                    );

                    if ($isUrban && $twistinessData['twistiness'] <= 0.007) continue;

                    $curvedRoads[] = [
                        'id' => $way['id'],
                        'name' => $way['tags']['name'] ?? 'Unnamed Road',
                        'geometry' => $geometry,
                        'twistiness' => $twistinessData['twistiness'],
                        'corner_count' => $twistinessData['corner_count'],
                        'length' => $length
                    ];
                }
            }

            return $curvedRoads;
        } catch (\Exception $e) {
            Log::error('Error querying curved roads', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Build curved route connecting curved road segments
     */
    private function buildCurvedRoute($curvedRoads, $startLat, $startLon, $endLat, $endLon)
    {
        if (empty($curvedRoads)) {
            return null;
        }

        // Find curved roads near start and end points
        $startRoad = $this->findNearestRoad($curvedRoads, $startLat, $startLon);
        $endRoad = $this->findNearestRoad($curvedRoads, $endLat, $endLon);

        if (!$startRoad || !$endRoad) {
            return null;
        }

        // Build route using OSRM to connect segments
        $allCoordinates = [];
        
        // Add start point
        $allCoordinates[] = [$startLat, $startLon];

        // Add curved road segments
        foreach ($curvedRoads as $road) {
            $roadCoords = array_map(function($point) {
                return [$point['lat'], $point['lon']];
            }, $road['geometry']);
            
            $allCoordinates = array_merge($allCoordinates, $roadCoords);
        }

        // Add end point
        $allCoordinates[] = [$endLat, $endLon];

        // Use OSRM to create a proper route through these points
        $waypoints = array_map(function($coord) {
            return $coord[1] . ',' . $coord[0]; // lon,lat format for OSRM
        }, $allCoordinates);

        // Limit waypoints (OSRM has limits)
        if (count($waypoints) > 100) {
            $waypoints = $this->sampleWaypoints($waypoints, 100);
        }

        $waypointsString = implode(';', $waypoints);
        $url = sprintf(
            '%s/route/v1/driving/%s?overview=full&geometries=geojson',
            $this->osrmBaseUrl,
            $waypointsString
        );

        try {
            $response = Http::timeout(30)->get($url);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();

            if (!isset($data['routes']) || empty($data['routes'])) {
                return null;
            }

            $route = $data['routes'][0];
            $geometry = $route['geometry']['coordinates'];

            // Convert GeoJSON format [lon, lat] to [lat, lon]
            $coordinates = array_map(function($coord) {
                return [$coord[1], $coord[0]];
            }, $geometry);

            $distance = $route['distance'];
            $duration = $route['duration'];

            // Calculate route statistics
            $stats = $this->calculateRouteStats($coordinates);

            return [
                'coordinates' => $coordinates,
                'distance' => $distance,
                'duration' => $duration,
                'type' => 'curved',
                'curvature' => $stats['curvature'],
                'corner_count' => $stats['corner_count'],
                'elevation_gain' => $stats['elevation_gain'],
                'elevation_loss' => $stats['elevation_loss'],
                'max_elevation' => $stats['max_elevation'],
                'min_elevation' => $stats['min_elevation']
            ];
        } catch (\Exception $e) {
            Log::error('Error building curved route', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Calculate route statistics
     */
    private function calculateRouteStats($coordinates)
    {
        $curvature = $this->calculateRouteCurvature($coordinates);
        $cornerCount = $this->countCorners($coordinates);

        // Get elevation data
        $elevations = $this->elevationService->getElevations($coordinates);
        $elevationStats = [
            'elevation_gain' => null,
            'elevation_loss' => null,
            'max_elevation' => null,
            'min_elevation' => null
        ];

        if ($elevations) {
            $elevationStats = $this->elevationService->calculateElevationStats($elevations);
        }

        return array_merge([
            'curvature' => $curvature,
            'corner_count' => $cornerCount
        ], $elevationStats);
    }

    /**
     * Fast curvature estimation using sampling (10-20x faster than full calculation)
     * Used for initial filtering before expensive full stats calculation
     */
    private function estimateCurvatureFast($coordinates)
    {
        if (count($coordinates) < 3) {
            return 0;
        }

        // Sample every Nth point for fast estimation (10-20x faster)
        $sampleRate = max(1, floor(count($coordinates) / 50)); // Sample ~50 points max
        $sampled = [];
        for ($i = 0; $i < count($coordinates); $i += $sampleRate) {
            $sampled[] = $coordinates[$i];
        }
        // Always include last point
        if (end($sampled) !== end($coordinates)) {
            $sampled[] = end($coordinates);
        }

        if (count($sampled) < 3) {
            return 0;
        }

        $totalAngle = 0;
        $totalDistance = 0;

        for ($i = 1; $i < count($sampled) - 1; $i++) {
            $prev = $sampled[$i - 1];
            $curr = $sampled[$i];
            $next = $sampled[$i + 1];

            $segmentDistance = $this->getDistance($curr[0], $curr[1], $next[0], $next[1]);
            $totalDistance += $segmentDistance;

            $angle1 = atan2($curr[0] - $prev[0], $curr[1] - $prev[1]);
            $angle2 = atan2($next[0] - $curr[0], $next[1] - $curr[1]);
            $angle = abs($angle2 - $angle1);

            if ($angle > pi()) {
                $angle = 2 * pi() - $angle;
            }

            $totalAngle += $angle;
        }

        if ($totalDistance == 0) {
            return 0;
        }

        return $totalAngle / $totalDistance;
    }

    /**
     * Calculate route curvature (full calculation)
     */
    private function calculateRouteCurvature($coordinates)
    {
        if (count($coordinates) < 3) {
            return 0;
        }

        $totalAngle = 0;
        $totalDistance = 0;

        for ($i = 1; $i < count($coordinates) - 1; $i++) {
            $prev = $coordinates[$i - 1];
            $curr = $coordinates[$i];
            $next = $coordinates[$i + 1];

            $segmentDistance = $this->getDistance($curr[0], $curr[1], $next[0], $next[1]);
            $totalDistance += $segmentDistance;

            $angle1 = atan2($curr[0] - $prev[0], $curr[1] - $prev[1]);
            $angle2 = atan2($next[0] - $curr[0], $next[1] - $curr[1]);
            $angle = abs($angle2 - $angle1);

            if ($angle > pi()) {
                $angle = 2 * pi() - $angle;
            }

            $totalAngle += $angle;
        }

        if ($totalDistance == 0) {
            return 0;
        }

        return $totalAngle / $totalDistance;
    }

    /**
     * Count corners in route
     */
    private function countCorners($coordinates)
    {
        if (count($coordinates) < 3) {
            return 0;
        }

        $cornerCount = 0;

        for ($i = 1; $i < count($coordinates) - 1; $i++) {
            $prev = $coordinates[$i - 1];
            $curr = $coordinates[$i];
            $next = $coordinates[$i + 1];

            $angle1 = atan2($curr[0] - $prev[0], $curr[1] - $prev[1]);
            $angle2 = atan2($next[0] - $curr[0], $next[1] - $curr[1]);
            $angle = abs($angle2 - $angle1);

            if ($angle > pi()) {
                $angle = 2 * pi() - $angle;
            }

            if ($angle > 0.087) { // ~5 degrees
                $cornerCount++;
            }
        }

        return $cornerCount;
    }

    /**
     * Calculate bounding box with buffer
     */
    private function calculateBoundingBox($coordinates, $buffer)
    {
        $lats = array_column($coordinates, 0);
        $lons = array_column($coordinates, 1);

        return [
            'minLat' => min($lats) - $buffer,
            'maxLat' => max($lats) + $buffer,
            'minLon' => min($lons) - $buffer,
            'maxLon' => max($lons) + $buffer
        ];
    }

    /**
     * Find nearest road to a point
     */
    private function findNearestRoad($roads, $lat, $lon)
    {
        $nearest = null;
        $minDistance = PHP_FLOAT_MAX;

        foreach ($roads as $road) {
            foreach ($road['geometry'] as $point) {
                $distance = $this->getDistance($lat, $lon, $point['lat'], $point['lon']);
                if ($distance < $minDistance) {
                    $minDistance = $distance;
                    $nearest = $road;
                }
            }
        }

        return $nearest;
    }

    /**
     * Sample waypoints to reduce count
     */
    private function sampleWaypoints($waypoints, $maxCount)
    {
        $count = count($waypoints);
        if ($count <= $maxCount) {
            return $waypoints;
        }

        $result = [$waypoints[0]]; // Always include first
        $step = max(1, floor($count / ($maxCount - 2)));

        for ($i = $step; $i < $count - 1; $i += $step) {
            $result[] = $waypoints[$i];
        }

        $result[] = $waypoints[$count - 1]; // Always include last

        return $result;
    }

    /**
     * Sample waypoints down to maxCount, but always preserve user waypoints
     */
    private function sampleWaypointsPreservingUser($waypoints, $maxCount, $userWaypointKeys = [])
    {
        $count = count($waypoints);
        if ($count <= $maxCount) {
            return $waypoints;
        }

        // First, identify which indices are user waypoints
        $userWaypointIndices = [];
        for ($i = 0; $i < $count; $i++) {
            $key = round($waypoints[$i][0], 5) . ',' . round($waypoints[$i][1], 5);
            if (isset($userWaypointKeys[$key])) {
                $userWaypointIndices[$i] = true;
            }
        }

        // Always include first (start) and last (end)
        $result = [$waypoints[0]];
        $includedIndices = [0 => true];
        $includedIndices[$count - 1] = true;

        // Always include all user waypoints
        foreach ($userWaypointIndices as $idx => $_) {
            if ($idx !== 0 && $idx !== $count - 1) {
                $result[] = $waypoints[$idx];
                $includedIndices[$idx] = true;
            }
        }

        // Calculate remaining slots for curved waypoints
        $remainingSlots = $maxCount - count($result) - 1; // -1 for end point
        if ($remainingSlots <= 0) {
            // If user waypoints take up all slots, just add end and return
            $result[] = $waypoints[$count - 1];
            return $result;
        }

        // Sample curved waypoints (non-user waypoints) to fill remaining slots
        $curvedWaypointIndices = [];
        for ($i = 1; $i < $count - 1; $i++) {
            if (!isset($includedIndices[$i])) {
                $curvedWaypointIndices[] = $i;
            }
        }

        if (count($curvedWaypointIndices) > 0) {
            $step = max(1, floor(count($curvedWaypointIndices) / $remainingSlots));
            for ($i = 0; $i < count($curvedWaypointIndices) && count($result) < $maxCount - 1; $i += $step) {
                $idx = $curvedWaypointIndices[$i];
                $result[] = $waypoints[$idx];
            }
        }

        // Always include last (end point)
        $result[] = $waypoints[$count - 1];

        // Sort result by original order to maintain route sequence
        $indexedResult = [];
        foreach ($result as $wp) {
            // Find original index
            for ($i = 0; $i < $count; $i++) {
                if (abs($waypoints[$i][0] - $wp[0]) < 0.00001 && abs($waypoints[$i][1] - $wp[1]) < 0.00001) {
                    $indexedResult[$i] = $wp;
                    break;
                }
            }
        }
        ksort($indexedResult);

        return array_values($indexedResult);
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    private function getDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Calculate road length
     */
    private function getRoadLength($geometry)
    {
        $length = 0;
        for ($i = 1; $i < count($geometry); $i++) {
            $length += $this->getDistance(
                $geometry[$i - 1]['lat'],
                $geometry[$i - 1]['lon'],
                $geometry[$i]['lat'],
                $geometry[$i]['lon']
            );
        }
        return $length;
    }

    /**
     * Calculate twistiness
     */
    private function calculateTwistiness($geometry)
    {
        $totalAngle = 0;
        $totalDistance = 0;
        $cornerCount = 0;

        for ($i = 1; $i < count($geometry) - 1; $i++) {
            $prev = $geometry[$i - 1];
            $curr = $geometry[$i];
            $next = $geometry[$i + 1];

            $segmentDistance = $this->getDistance($curr['lat'], $curr['lon'], $next['lat'], $next['lon']);
            $totalDistance += $segmentDistance;

            $angle1 = atan2($curr['lat'] - $prev['lat'], $curr['lon'] - $prev['lon']);
            $angle2 = atan2($next['lat'] - $curr['lat'], $next['lon'] - $curr['lon']);
            $angle = abs($angle2 - $angle1);

            if ($angle > pi()) {
                $angle = 2 * pi() - $angle;
            }

            if ($angle > 0.087) {
                $cornerCount++;
            }

            $totalAngle += $angle;
        }

        if ($totalDistance == 0) {
            return 0;
        }

        $twistiness = $totalAngle / $totalDistance;
        if ($twistiness < 0.0025 && $cornerCount < 1) {
            return 0;
        }

        return ['twistiness' => $twistiness, 'corner_count' => $cornerCount];
    }

    /**
     * Strategy 1: Find routes using OSRM alternatives only
     * Returns best route from OSRM alternatives based on curvature level
     */
    public function findRouteStrategy1($startLat, $startLon, $endLat, $endLon, $curvatureLevel = 'mellow')
    {
        $startTime = microtime(true);
        $timings = [];
        
        try {
            // Get straightest route for comparison
            $straightStartTime = microtime(true);
            $straightRoute = $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon);
            $timings['straightest_route'] = round((microtime(true) - $straightStartTime) * 1000, 2);
            
            if (!$straightRoute) {
                return null;
            }
            
            // Get OSRM alternatives
            $alternativesStartTime = microtime(true);
            $alternatives = $this->getOSRMAlternatives($startLat, $startLon, $endLat, $endLon, $curvatureLevel);
            $timings['osrm_alternatives'] = round((microtime(true) - $alternativesStartTime) * 1000, 2);
            
            if (empty($alternatives)) {
                return null;
            }
            
            // Calculate full stats for all alternatives
            $statsStartTime = microtime(true);
            foreach ($alternatives as &$route) {
                if (!isset($route['_stats_calculated']) || !$route['_stats_calculated']) {
                    $stats = $this->calculateRouteStats($route['coordinates']);
                    $route['curvature'] = $stats['curvature'];
                    $route['corner_count'] = $stats['corner_count'];
                    $route['elevation_gain'] = $stats['elevation_gain'];
                    $route['elevation_loss'] = $stats['elevation_loss'];
                    $route['max_elevation'] = $stats['max_elevation'];
                    $route['min_elevation'] = $stats['min_elevation'];
                }
            }
            $timings['stats_calculation'] = round((microtime(true) - $statsStartTime) * 1000, 2);
            
            // Select best route - for Strategy 1, use lenient selection
            // OSRM alternatives may not have extreme curvature, so be more accepting
            $selectStartTime = microtime(true);
            $bestRoute = $this->selectBestRouteByCurvature($alternatives, $curvatureLevel, $straightRoute);
            
            // If no route selected due to strict filtering, use the first alternative with reasonable progress
            if (!$bestRoute && !empty($alternatives)) {
                Log::info('No route passed strict filtering in Strategy 1, using lenient selection', [
                    'alternatives_count' => count($alternatives)
                ]);
                
                // Find first alternative with reasonable progress (>= 0.5 instead of 0.65)
                foreach ($alternatives as $alt) {
                    $progressScore = $this->calculateRouteProgressScore($alt['coordinates']);
                    if ($progressScore >= 0.5) {
                        // Check for severe backtracking only
                        $hasSevereBacktrack = $this->hasLoopOrBacktrack($alt['coordinates'], $straightRoute['distance'], true);
                        if (!$hasSevereBacktrack) {
                            $bestRoute = $alt;
                            Log::info('Selected alternative with lenient criteria', [
                                'progress_score' => $progressScore,
                                'curvature' => $alt['curvature'] ?? 0
                            ]);
                            break;
                        }
                    }
                }
                
                // If still no route, just use the first alternative (better than nothing)
                if (!$bestRoute) {
                    $bestRoute = $alternatives[0];
                    Log::info('Using first alternative as fallback', [
                        'curvature' => $bestRoute['curvature'] ?? 0
                    ]);
                }
            }
            
            $timings['route_selection'] = round((microtime(true) - $selectStartTime) * 1000, 2);
            
            $totalTime = round((microtime(true) - $startTime) * 1000, 2);
            $timings['total'] = $totalTime;
            
            if ($bestRoute) {
                $bestRoute['_strategy'] = 'osrm_alternatives';
                $bestRoute['_timings'] = $timings;
                $bestRoute['_candidates_count'] = count($alternatives);
            }
            
            return $bestRoute;
        } catch (\Exception $e) {
            Log::error('Error in Strategy 1 (OSRM alternatives)', [
                'error' => $e->getMessage(),
                'start' => [$startLat, $startLon],
                'end' => [$endLat, $endLon]
            ]);
            return null;
        }
    }

    /**
     * Strategy 2: Find routes using Kurviger-style OSM curved roads
     * Queries OpenStreetMap for curved roads and builds route through them
     */
    public function findRouteStrategy2($startLat, $startLon, $endLat, $endLon, $curvatureLevel = 'mellow')
    {
        $startTime = microtime(true);
        $timings = [];
        
        try {
            // Get straightest route for comparison
            $straightStartTime = microtime(true);
            $straightRoute = $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon);
            $timings['straightest_route'] = round((microtime(true) - $straightStartTime) * 1000, 2);
            
            if (!$straightRoute) {
                return null;
            }
            
            // Calculate bounding box around route
            $bboxStartTime = microtime(true);
            $bbox = $this->calculateRouteBoundingBox($straightRoute['coordinates'], 5000);
            $timings['bounding_box'] = round((microtime(true) - $bboxStartTime) * 1000, 2);
            
            if (!$bbox) {
                return null;
            }
            
            // Query OSM for curved roads
            $osmQueryStartTime = microtime(true);
            $minTwistiness = $curvatureLevel === 'mellow' ? 0.003 : 0.005;
            $maxTwistiness = 0.05; // Upper limit to avoid too extreme roads
            $curvedRoads = $this->findCurvedRoadsInBoundingBox(
                $bbox['minLat'],
                $bbox['minLon'],
                $bbox['maxLat'],
                $bbox['maxLon'],
                $minTwistiness,
                $maxTwistiness,
                $curvatureLevel
            );
            $timings['osm_query'] = round((microtime(true) - $osmQueryStartTime) * 1000, 2);
            
            if (empty($curvedRoads)) {
                Log::info('No curved roads found in Strategy 2', [
                    'curvature_level' => $curvatureLevel,
                    'bbox' => $bbox
                ]);
                return null;
            }
            
            // Build route through curved roads
            $buildStartTime = microtime(true);
            $route = $this->buildRouteThroughCurvedRoads(
                $curvedRoads,
                $startLat,
                $startLon,
                $endLat,
                $endLon,
                $straightRoute['distance'],
                $curvatureLevel
            );
            $timings['route_building'] = round((microtime(true) - $buildStartTime) * 1000, 2);
            
            if (!$route) {
                return null;
            }
            
            // Calculate route stats
            $statsStartTime = microtime(true);
            $stats = $this->calculateRouteStats($route['coordinates']);
            $route['curvature'] = $stats['curvature'];
            $route['corner_count'] = $stats['corner_count'];
            $route['elevation_gain'] = $stats['elevation_gain'];
            $route['elevation_loss'] = $stats['elevation_loss'];
            $route['max_elevation'] = $stats['max_elevation'];
            $route['min_elevation'] = $stats['min_elevation'];
            $timings['stats_calculation'] = round((microtime(true) - $statsStartTime) * 1000, 2);
            
            $totalTime = round((microtime(true) - $startTime) * 1000, 2);
            $timings['total'] = $totalTime;
            
            $route['_strategy'] = 'osm_curved_roads';
            $route['_timings'] = $timings;
            $route['_curved_roads_found'] = count($curvedRoads);
            $route['_curved_roads_used'] = min(count($curvedRoads), $curvatureLevel === 'mellow' ? 8 : 12);
            
            return $route;
        } catch (\Exception $e) {
            Log::error('Error in Strategy 2 (OSM curved roads)', [
                'error' => $e->getMessage(),
                'start' => [$startLat, $startLon],
                'end' => [$endLat, $endLon]
            ]);
            return null;
        }
    }

    /**
     * Compare both strategies side-by-side
     * Returns detailed comparison with metrics and timings
     */
    public function compareStrategies($startLat, $startLon, $endLat, $endLon, $curvatureLevel = 'mellow')
    {
        $comparisonStartTime = microtime(true);
        
        // Get baseline straight route
        $straightRoute = $this->findStraightestRoute($startLat, $startLon, $endLat, $endLon);
        
        // Run both strategies in parallel (if possible) or sequentially
        $strategy1Start = microtime(true);
        $strategy1Result = $this->findRouteStrategy1($startLat, $startLon, $endLat, $endLon, $curvatureLevel);
        $strategy1Time = round((microtime(true) - $strategy1Start) * 1000, 2);
        
        $strategy2Start = microtime(true);
        $strategy2Result = $this->findRouteStrategy2($startLat, $startLon, $endLat, $endLon, $curvatureLevel);
        $strategy2Time = round((microtime(true) - $strategy2Start) * 1000, 2);
        
        // Calculate comparison metrics
        $comparison = [
            'straight_route' => $straightRoute,
            'strategy_1' => [
                'route' => $strategy1Result,
                'execution_time_ms' => $strategy1Time,
                'success' => $strategy1Result !== null,
                'metrics' => $strategy1Result ? $this->calculateRouteMetrics($strategy1Result, $straightRoute) : null
            ],
            'strategy_2' => [
                'route' => $strategy2Result,
                'execution_time_ms' => $strategy2Time,
                'success' => $strategy2Result !== null,
                'metrics' => $strategy2Result ? $this->calculateRouteMetrics($strategy2Result, $straightRoute) : null
            ],
            'comparison' => [
                'speed_winner' => $strategy1Time < $strategy2Time ? 'strategy_1' : 'strategy_2',
                'speed_difference_ms' => abs($strategy1Time - $strategy2Time),
                'curvature_winner' => null,
                'distance_winner' => null,
                'quality_score_winner' => null
            ],
            'total_time_ms' => round((microtime(true) - $comparisonStartTime) * 1000, 2)
        ];
        
        // Determine quality winners
        if ($strategy1Result && $strategy2Result) {
            $s1Metrics = $comparison['strategy_1']['metrics'];
            $s2Metrics = $comparison['strategy_2']['metrics'];
            
            // Curvature winner (higher is better)
            if ($s1Metrics['curvature_ratio'] > $s2Metrics['curvature_ratio']) {
                $comparison['comparison']['curvature_winner'] = 'strategy_1';
            } elseif ($s2Metrics['curvature_ratio'] > $s1Metrics['curvature_ratio']) {
                $comparison['comparison']['curvature_winner'] = 'strategy_2';
            }
            
            // Distance winner (closer to straight is better, but depends on curvature level)
            if ($s1Metrics['distance_ratio'] < $s2Metrics['distance_ratio']) {
                $comparison['comparison']['distance_winner'] = 'strategy_1';
            } elseif ($s2Metrics['distance_ratio'] < $s1Metrics['distance_ratio']) {
                $comparison['comparison']['distance_winner'] = 'strategy_2';
            }
            
            // Quality score winner (higher is better)
            if ($s1Metrics['quality_score'] > $s2Metrics['quality_score']) {
                $comparison['comparison']['quality_score_winner'] = 'strategy_1';
            } elseif ($s2Metrics['quality_score'] > $s1Metrics['quality_score']) {
                $comparison['comparison']['quality_score_winner'] = 'strategy_2';
            }
        }
        
        return $comparison;
    }

    /**
     * Calculate route metrics for comparison
     */
    private function calculateRouteMetrics($route, $straightRoute)
    {
        $straightDistance = $straightRoute['distance'];
        $straightCurvature = $straightRoute['curvature'] ?? 0;
        
        $routeDistance = $route['distance'];
        $routeCurvature = $route['curvature'] ?? 0;
        
        $distanceRatio = $straightDistance > 0 ? ($routeDistance / $straightDistance) : 1;
        $curvatureRatio = $straightCurvature > 0 ? ($routeCurvature / $straightCurvature) : 1;
        
        // Calculate progress score
        $progressScore = $this->calculateRouteProgressScore($route['coordinates']);
        
        // Check for backtracks
        $hasBacktrack = $this->hasLoopOrBacktrack($route['coordinates'], $straightDistance);
        
        // Quality score (0-100)
        // Factors: curvature ratio, progress score, no backtrack, distance efficiency
        $qualityScore = 0;
        
        // Curvature component (0-40 points)
        $qualityScore += min(40, $curvatureRatio * 10);
        
        // Progress component (0-30 points)
        $qualityScore += $progressScore * 30;
        
        // No backtrack bonus (0-20 points)
        if (!$hasBacktrack) {
            $qualityScore += 20;
        }
        
        // Distance efficiency (0-10 points) - penalize if too long
        if ($distanceRatio <= 1.5) {
            $qualityScore += 10;
        } elseif ($distanceRatio <= 2.0) {
            $qualityScore += 5;
        }
        
        return [
            'distance' => $routeDistance,
            'distance_ratio' => $distanceRatio,
            'curvature' => $routeCurvature,
            'curvature_ratio' => $curvatureRatio,
            'corner_count' => $route['corner_count'] ?? 0,
            'progress_score' => $progressScore,
            'has_backtrack' => $hasBacktrack,
            'quality_score' => min(100, $qualityScore)
        ];
    }
}

