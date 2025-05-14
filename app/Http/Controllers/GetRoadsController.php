<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Services\ElevationService;
use Illuminate\Support\Facades\Log;

class GetRoadsController extends Controller
{
protected $elevationService;
public function __construct(ElevationService $elevationService)
    {
        $this->elevationService = $elevationService;
    }
    public function search(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        $radius = $request->input('radius') * 1000; 
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
            
            $roadSegments = [];
            foreach ($data['elements'] as $way) {
                if (!isset($way['geometry'])) continue;

                $geometry = $way['geometry'];
                $length = $this->getRoadLength($geometry);

                
                if ($length < 2000) continue;

                $twistinessData = $this->calculateTwistiness($geometry);
                if ($twistinessData === 0) continue;

                
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

            
            $processedSegments = [];
            $connectedRoads = [];

            
            foreach ($roadSegments as $i => $segment) {
                if (in_array($segment['id'], $processedSegments)) continue;

                $currentRoad = $segment;
                $hasConnected = true;

                
                while ($hasConnected) {
                    $hasConnected = false;

                    foreach ($roadSegments as $j => $otherSegment) {
                        if ($i === $j || in_array($otherSegment['id'], $processedSegments)) continue;

                        
                        if ($this->canConnectRoads($currentRoad, $otherSegment)) {
                            $currentRoad = $this->connectRoads($currentRoad, $otherSegment);
                            $processedSegments[] = $otherSegment['id'];
                            $hasConnected = true;
                            break;
                        }
                    }
                }

                
                $length = $this->getRoadLength($currentRoad['geometry']);
                $twistinessData = $this->calculateTwistiness($currentRoad['geometry']);

                
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

            
            usort($connectedRoads, function($a, $b) {
                return $b['length'] - $a['length'];
            });

            
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
                    
                }

                $roads[] = $roadData;
            }
        }

        return response()->json($roads);
    }

    private function getDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; 
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
private function canConnectRoads($road1, $road2)
    {
        
        if (!empty($road1['name']) && !empty($road2['name']) &&
            $road1['name'] !== 'Unnamed Road' && $road2['name'] !== 'Unnamed Road' &&
            $road1['name'] !== $road2['name']) {
            return false;
        }

        
        $road1Start = $road1['geometry'][0];
        $road1End = $road1['geometry'][count($road1['geometry']) - 1];
        $road2Start = $road2['geometry'][0];
        $road2End = $road2['geometry'][count($road2['geometry']) - 1];

        
        $connectionThreshold = 50; 

        
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
private function connectRoads($road1, $road2)
    {
        
        $road1Start = $road1['geometry'][0];
        $road1End = $road1['geometry'][count($road1['geometry']) - 1];
        $road2Start = $road2['geometry'][0];
        $road2End = $road2['geometry'][count($road2['geometry']) - 1];

        
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

        
        usort($connections, fn($a, $b) => $a['distance'] <=> $b['distance']);
        $closestConnection = $connections[0];

        
        $newGeometry = [];

        if ($closestConnection['type'] === 'end-start') {
            
            $newGeometry = array_merge($road1['geometry'], $road2['geometry']);
        } else if ($closestConnection['type'] === 'start-end') {
            
            $newGeometry = array_merge($road2['geometry'], $road1['geometry']);
        } else if ($closestConnection['type'] === 'end-end') {
            
            $newGeometry = array_merge($road1['geometry'], array_reverse($road2['geometry']));
        } else if ($closestConnection['type'] === 'start-start') {
            
            $newGeometry = array_merge(array_reverse($road1['geometry']), $road2['geometry']);
        }

        
        $connectedRoad = [
            'id' => $road1['id'] . '_' . $road2['id'],
            'name' => $road1['name'] ?: $road2['name'] ?: 'Unnamed Road',
            'geometry' => $newGeometry,
            'tags' => array_merge($road1['tags'] ?? [], $road2['tags'] ?? [])
        ];

        return $connectedRoad;
    }
}