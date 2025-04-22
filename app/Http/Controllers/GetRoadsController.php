<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GetRoadsController extends Controller
{
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
            foreach ($data['elements'] as $way) {
                if (!isset($way['geometry'])) continue;

                $geometry = $way['geometry'];
                $length = $this->getRoadLength($geometry);

                if ($length < 1750) continue;

                $twistinessData = $this->calculateTwistiness($geometry);
                if ($twistinessData === 0) continue;

                $coordinates = array_map(fn($p) => [$p['lat'], $p['lon']], $geometry);
                $name = $way['tags']['name'] ?? 'Unnamed Road';

                $roads[] = [
                    'id' => $way['id'],
                    'name' => $name,
                    'coordinates' => $coordinates,
                    'twistiness' => $twistinessData['twistiness'],
                    'length' => $length,
                    'corner_count' => $twistinessData['corner_count'],
                ];
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
}