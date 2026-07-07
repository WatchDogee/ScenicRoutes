<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Services\ElevationService;

class GetRoadsController extends Controller
{

    protected $elevationService;

    public function __construct(ElevationService $elevationService)
    {
        $this->elevationService = $elevationService;
    }

    public function search(Request $request)
    {
        try {
            $lat = $request->query('lat');
            $lon = $request->query('lon');
            $radius = $request->query('radius', 10); // km
            $type = $request->query('type', 'all');

            if (!$lat || !$lon) {
                return response()->json(['error' => 'Missing latitude or longitude'], 400);
            }

            // Road type filters
            $roadFilters = [
                "all" => "motorway|primary|secondary|tertiary|unclassified",
                "primary" => "motorway|primary",
                "secondary" => "secondary|tertiary"
            ];

            $selectedRoadFilter = $roadFilters[$type] ?? $roadFilters["all"];

            // Build Overpass query
            $radiusMeters = $radius * 1000;
            $query = "[out:json];way['highway'~'{$selectedRoadFilter}'](around:{$radiusMeters},{$lat},{$lon});out tags geom;";

            // Call Overpass API directly instead of through proxy to avoid URL generation issues
            $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);

            $response = Http::timeout(60)->get($url);

            if (!$response->successful()) {
                if ($response->status() === 504) {
                    return response()->json([
                        'error' => 'Overpass API is currently overloaded. Please try again in a few minutes or reduce the search radius.'
                    ], 504);
                } elseif ($response->status() === 429) {
                    return response()->json([
                        'error' => 'Too many requests. Please wait a moment before trying again.'
                    ], 429);
                } else {
                    return response()->json([
                        'error' => 'Failed to fetch road data: ' . $response->status()
                    ], $response->status());
                }
            }

            $data = $response->json();

            if (!isset($data['elements'])) {
                return response()->json(['error' => 'Invalid response format'], 500);
            }

            $roads = [];

            foreach ($data['elements'] as $way) {
                if (!isset($way['geometry'])) continue;

                // Validate and clean coordinates
                $validCoordinates = [];
                $hasInvalidCoords = false;
                
                foreach ($way['geometry'] as $point) {
                    // Validate that lat/lon exist and are valid numbers
                    if (!isset($point['lat']) || !isset($point['lon'])) {
                        $hasInvalidCoords = true;
                        break;
                    }
                    
                    $lat = is_numeric($point['lat']) ? (float)$point['lat'] : null;
                    $lon = is_numeric($point['lon']) ? (float)$point['lon'] : null;
                    
                    // Validate lat/lon ranges (Latvia is around 56-58°N, 21-28°E)
                    if ($lat === null || $lon === null || 
                        $lat < -90 || $lat > 90 || 
                        $lon < -180 || $lon > 180) {
                        $hasInvalidCoords = true;
                        break;
                    }
                    
                    $validCoordinates[] = [$lat, $lon];
                }
                
                // Skip roads with invalid coordinates or too few points
                if ($hasInvalidCoords || count($validCoordinates) < 2) {
                    continue;
                }

                // Calculate road length using validated coordinates
                $length = 0;
                for ($i = 0; $i < count($validCoordinates) - 1; $i++) {
                    $lat1 = deg2rad($validCoordinates[$i][0]);
                    $lon1 = deg2rad($validCoordinates[$i][1]);
                    $lat2 = deg2rad($validCoordinates[$i + 1][0]);
                    $lon2 = deg2rad($validCoordinates[$i + 1][1]);

                    $dlat = $lat2 - $lat1;
                    $dlon = $lon2 - $lon1;

                    $a = sin($dlat/2) * sin($dlat/2) + cos($lat1) * cos($lat2) * sin($dlon/2) * sin($dlon/2);
                    $c = 2 * atan2(sqrt($a), sqrt(1-$a));

                    $length += 6371000 * $c; // Earth radius in meters
                }

                // Skip very short roads
                if ($length < 2000) continue;

                $roads[] = [
                    'id' => $way['id'],
                    'name' => $way['tags']['name'] ?? 'Unnamed Road',
                    'coordinates' => $validCoordinates,
                    'length' => $length,
                    'tags' => $way['tags']
                ];
            }

            return response()->json($roads);

        } catch (\Exception $e) {
            \Log::error('GetRoadsController: Exception in search()', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Internal server error', 'details' => $e->getMessage()], 500);
        }
    }

    private function calculateRoadLength($geometry)
    {
        $length = 0;
        for ($i = 1; $i < count($geometry); $i++) {
            $prev = $geometry[$i - 1];
            $curr = $geometry[$i];

            // Haversine distance calculation
            $lat1 = deg2rad($prev['lat']);
            $lon1 = deg2rad($prev['lon']);
            $lat2 = deg2rad($curr['lat']);
            $lon2 = deg2rad($curr['lon']);

            $dlat = $lat2 - $lat1;
            $dlon = $lon2 - $lon1;

            $a = sin($dlat/2) * sin($dlat/2) + cos($lat1) * cos($lat2) * sin($dlon/2) * sin($dlon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));

            $length += 6371000 * $c; // Earth radius in meters
        }
        return $length;
    }
}