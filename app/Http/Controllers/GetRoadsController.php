<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Services\ElevationService;
use Illuminate\Support\Facades\Log;

class GetRoadsController extends Controller
{
    /**
     * The elevation service instance.
     */
    protected $elevationService;

    /**
     * Create a new controller instance.
     *
     * @param  \App\Services\ElevationService  $elevationService
     * @return void
     */
    public function __construct(ElevationService $elevationService)
    {
        $this->elevationService = $elevationService;
    }
    public function search(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        $radius = $request->input('radius') * 1000; // Convert km to meters
        $type = $request->input('type');

        if (!$lat || !$lon || !$radius || !$type) {
            return response()->json(['error' => 'Missing parameters'], 400);
        }

        $roadTypes = [
            "all" => "motorway|primary|secondary|tertiary|unclassified",
            "primary" => "motorway|primary",
            "secondary" => "secondary|tertiary",
        ];

        $roadFilter = $roadTypes[$type] ?? $roadTypes['all'];
        $query = "[out:json];way['highway'~'$roadFilter'](around:$radius,$lat,$lon);out tags geom;";
        $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);

        $response = Http::get($url);
        if (!$response->successful()) {
            return response()->json(['error' => 'Overpass query failed'], 500);
        }

        $data = $response->json();
        $roads = [];

        if (isset($data['elements'])) {
            // First, collect all road segments
            $roadSegments = [];
            foreach ($data['elements'] as $way) {
                if (!isset($way['geometry'])) continue;

                $geometry = $way['geometry'];
                $length = $this->getRoadLength($geometry);

                // Increase minimum road length to 2km
                if ($length < 2000) continue;

                $twistinessData = $this->calculateTwistiness($geometry);
                if ($twistinessData === 0) continue;

                // Skip roads in urban areas unless they're very curvy
                $isUrban = isset($way['tags']) && (
                    ($way['tags']['highway'] ?? '') === 'residential' ||
                    ($way['tags']['highway'] ?? '') === 'living_street' ||
                    (isset($way['tags']['maxspeed']) && intval($way['tags']['maxspeed']) <= 50)
                );

                if ($isUrban && $twistinessData['twistiness'] <= 0.007) continue;

                $name = $way['tags']['name'] ?? 'Unnamed Road';

                $roadSegments[] = [
                    'id' => $way['id'],
                    'name' => $name,
                    'geometry' => $geometry,
                    'tags' => $way['tags'] ?? [],
                    'twistiness' => $twistinessData['twistiness'],
                    'corner_count' => $twistinessData['corner_count'],
                    'length' => $length
                ];
            }

            // Try to connect road segments
            $processedSegments = [];
            $connectedRoads = [];

            // First pass: try to connect segments
            foreach ($roadSegments as $i => $segment) {
                if (in_array($segment['id'], $processedSegments)) continue;

                $currentRoad = $segment;
                $hasConnected = true;

                // Keep trying to connect more segments as long as we find connections
                while ($hasConnected) {
                    $hasConnected = false;

                    foreach ($roadSegments as $j => $otherSegment) {
                        if ($i === $j || in_array($otherSegment['id'], $processedSegments)) continue;

                        // Check if roads can be connected
                        if ($this->canConnectRoads($currentRoad, $otherSegment)) {
                            $currentRoad = $this->connectRoads($currentRoad, $otherSegment);
                            $processedSegments[] = $otherSegment['id'];
                            $hasConnected = true;
                            break;
                        }
                    }
                }

                // Recalculate properties for the connected road
                $length = $this->getRoadLength($currentRoad['geometry']);
                $twistinessData = $this->calculateTwistiness($currentRoad['geometry']);

                // Add the connected road (or single segment if no connections found)
                $connectedRoads[] = [
                    'id' => $currentRoad['id'],
                    'name' => $currentRoad['name'],
                    'geometry' => $currentRoad['geometry'],
                    'tags' => $currentRoad['tags'],
                    'twistiness' => $twistinessData['twistiness'],
                    'corner_count' => $twistinessData['corner_count'],
                    'length' => $length,
                    'is_connected' => strpos($currentRoad['id'], '_') !== false
                ];

                $processedSegments[] = $segment['id'];
            }

            // Sort roads by length (longest first)
            usort($connectedRoads, function($a, $b) {
                return $b['length'] - $a['length'];
            });

            // Process roads for final output
            foreach ($connectedRoads as $road) {
                $coordinates = array_map(fn($p) => [$p['lat'], $p['lon']], $road['geometry']);

                $roadData = [
                    'id' => $road['id'],
                    'name' => $road['name'],
                    'coordinates' => $coordinates,
                    'twistiness' => $road['twistiness'],
                    'length' => $road['length'],
                    'corner_count' => $road['corner_count'],
                    'is_connected' => $road['is_connected'] ?? false
                ];

                // Get elevation data and calculate statistics
                try {
                    Log::info('Fetching elevation data for road', [
                        'road_id' => $road['id'],
                        'road_name' => $road['name'],
                        'coordinates_count' => count($coordinates)
                    ]);

                    $elevations = $this->elevationService->getElevations($coordinates);

                    if ($elevations) {
                        Log::info('Elevation data received for road', [
                            'road_id' => $road['id'],
                            'elevations_count' => count($elevations),
                            'sample_elevations' => array_slice($elevations, 0, 5)
                        ]);

                        $elevationStats = $this->elevationService->calculateElevationStats($elevations);
                        Log::info('Elevation statistics calculated for road', [
                            'road_id' => $road['id'],
                            'stats' => $elevationStats
                        ]);

                        $roadData = array_merge($roadData, $elevationStats);
                    } else {
                        Log::warning('No elevation data received for road', [
                            'road_id' => $road['id'],
                            'road_name' => $road['name']
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('Error getting elevation data for road ' . $road['id'] . ': ' . $e->getMessage(), [
                        'trace' => $e->getTraceAsString()
                    ]);
                    // Continue without elevation data if there's an error
                }

                $roads[] = $roadData;
            }
        }

        return response()->json($roads);
    }

    private function getDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }

    private function getRoadLength($geometry)
    {
        $length = 0;
        for ($i = 1; $i < count($geometry); $i++) {
            $length += $this->getDistance(
                $geometry[$i - 1]['lat'], $geometry[$i - 1]['lon'],
                $geometry[$i]['lat'], $geometry[$i]['lon']
            );
        }
        return $length;
    }

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

            if ($angle > pi()) $angle = 2 * pi() - $angle;
            if ($angle > 0.087) $cornerCount++;

            $totalAngle += $angle;
        }

        if ($totalDistance == 0) return 0;

        $twistiness = $totalAngle / $totalDistance;
        if ($twistiness < 0.0025 && $cornerCount < 1) return 0;

        return ['twistiness' => $twistiness, 'corner_count' => $cornerCount];
    }

    /**
     * Check if two road segments can be connected
     *
     * @param array $road1 First road segment
     * @param array $road2 Second road segment
     * @return bool Whether the roads can be connected
     */
    private function canConnectRoads($road1, $road2)
    {
        // If roads have different names and both are named, they're probably different roads
        if (!empty($road1['name']) && !empty($road2['name']) &&
            $road1['name'] !== 'Unnamed Road' && $road2['name'] !== 'Unnamed Road' &&
            $road1['name'] !== $road2['name']) {
            return false;
        }

        // Get endpoints of both roads
        $road1Start = $road1['geometry'][0];
        $road1End = $road1['geometry'][count($road1['geometry']) - 1];
        $road2Start = $road2['geometry'][0];
        $road2End = $road2['geometry'][count($road2['geometry']) - 1];

        // Check if any endpoints are close enough to connect
        $connectionThreshold = 50; // 50 meters

        // Check all possible connections between endpoints
        $connections = [
            ['from' => $road1End, 'to' => $road2Start],
            ['from' => $road1Start, 'to' => $road2End],
            ['from' => $road1End, 'to' => $road2End],
            ['from' => $road1Start, 'to' => $road2Start]
        ];

        foreach ($connections as $conn) {
            $distance = $this->getDistance(
                $conn['from']['lat'], $conn['from']['lon'],
                $conn['to']['lat'], $conn['to']['lon']
            );

            if ($distance <= $connectionThreshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * Connect two road segments
     *
     * @param array $road1 First road segment
     * @param array $road2 Second road segment
     * @return array Connected road
     */
    private function connectRoads($road1, $road2)
    {
        // Get endpoints of both roads
        $road1Start = $road1['geometry'][0];
        $road1End = $road1['geometry'][count($road1['geometry']) - 1];
        $road2Start = $road2['geometry'][0];
        $road2End = $road2['geometry'][count($road2['geometry']) - 1];

        // Find which endpoints are closest
        $connections = [
            [
                'type' => 'end-start',
                'from' => $road1End,
                'to' => $road2Start,
                'distance' => $this->getDistance($road1End['lat'], $road1End['lon'], $road2Start['lat'], $road2Start['lon'])
            ],
            [
                'type' => 'start-end',
                'from' => $road1Start,
                'to' => $road2End,
                'distance' => $this->getDistance($road1Start['lat'], $road1Start['lon'], $road2End['lat'], $road2End['lon'])
            ],
            [
                'type' => 'end-end',
                'from' => $road1End,
                'to' => $road2End,
                'distance' => $this->getDistance($road1End['lat'], $road1End['lon'], $road2End['lat'], $road2End['lon'])
            ],
            [
                'type' => 'start-start',
                'from' => $road1Start,
                'to' => $road2Start,
                'distance' => $this->getDistance($road1Start['lat'], $road1Start['lon'], $road2Start['lat'], $road2Start['lon'])
            ]
        ];

        // Sort by distance and get the closest connection
        usort($connections, fn($a, $b) => $a['distance'] <=> $b['distance']);
        $closestConnection = $connections[0];

        // Create a new connected geometry based on the connection type
        $newGeometry = [];

        if ($closestConnection['type'] === 'end-start') {
            // road1 -> road2
            $newGeometry = array_merge($road1['geometry'], $road2['geometry']);
        } else if ($closestConnection['type'] === 'start-end') {
            // road2 -> road1
            $newGeometry = array_merge($road2['geometry'], $road1['geometry']);
        } else if ($closestConnection['type'] === 'end-end') {
            // road1 -> reverse(road2)
            $newGeometry = array_merge($road1['geometry'], array_reverse($road2['geometry']));
        } else if ($closestConnection['type'] === 'start-start') {
            // reverse(road1) -> road2
            $newGeometry = array_merge(array_reverse($road1['geometry']), $road2['geometry']);
        }

        // Create a new connected road
        $connectedRoad = [
            'id' => $road1['id'] . '_' . $road2['id'],
            'name' => $road1['name'] ?: $road2['name'] ?: 'Unnamed Road',
            'geometry' => $newGeometry,
            'tags' => array_merge($road1['tags'] ?? [], $road2['tags'] ?? [])
        ];

        return $connectedRoad;
    }
}