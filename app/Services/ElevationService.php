<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ElevationService
{
public function getElevations(array $coordinates)
    {
        
        
        if (count($coordinates) > 100) {
            $coordinates = $this->sampleCoordinates($coordinates, 100);
        }

        
        $locations = collect($coordinates)
            ->map(fn($point) => $point[0] . ',' . $point[1])
            ->implode('|');

        
        $cacheKey = 'elevation_' . md5($locations);
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        try {
            
            Log::info('Fetching elevation data', [
                'coordinates_count' => count($coordinates),
                'sample_coordinates' => array_slice($coordinates, 0, 3)
            ]);

            
            $response = Http::withoutVerifying()
                ->withHeaders([
                    'Accept' => 'application/json',
                ])
                ->get('https://api.open-elevation.com/api/v1/lookup', [
                    'locations' => $locations
                ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Open-Elevation API response', [
                    'status' => $response->status(),
                    'sample_results' => array_slice($data['results'] ?? [], 0, 3)
                ]);

                $elevations = collect($data['results'])->pluck('elevation')->toArray();

                
                Cache::put($cacheKey, $elevations, 60 * 24 * 30);

                return $elevations;
            }

            Log::info('Open-Elevation API failed, trying OpenTopoData', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            
            $response = Http::get('https://api.opentopodata.org/v1/srtm30m', [
                'locations' => $locations
            ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('OpenTopoData API response', [
                    'status' => $response->status(),
                    'sample_results' => array_slice($data['results'] ?? [], 0, 3)
                ]);

                $elevations = collect($data['results'])->pluck('elevation')->toArray();

                
                Cache::put($cacheKey, $elevations, 60 * 24 * 30);

                return $elevations;
            }

            Log::error('Failed to fetch elevation data from both APIs', [
                'open_elevation_status' => $response->status(),
                'sample_coordinates' => array_slice($coordinates, 0, 3)
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Exception when fetching elevation data: ' . $e->getMessage());
            return null;
        }
    }
public function calculateElevationStats(array $elevations)
    {
        if (empty($elevations)) {
            return [
                'elevation_gain' => null,
                'elevation_loss' => null,
                'max_elevation' => null,
                'min_elevation' => null
            ];
        }

        $elevationGain = 0;
        $elevationLoss = 0;
        $maxElevation = max($elevations);
        $minElevation = min($elevations);

        
        for ($i = 1; $i < count($elevations); $i++) {
            $diff = $elevations[$i] - $elevations[$i - 1];
            if ($diff > 0) {
                $elevationGain += $diff;
            } else {
                $elevationLoss += abs($diff);
            }
        }

        return [
            'elevation_gain' => round($elevationGain, 2),
            'elevation_loss' => round($elevationLoss, 2),
            'max_elevation' => round($maxElevation, 2),
            'min_elevation' => round($minElevation, 2)
        ];
    }
private function sampleCoordinates(array $coordinates, int $maxPoints)
    {
        $count = count($coordinates);
        if ($count <= $maxPoints) {
            return $coordinates;
        }

        
        $result = [$coordinates[0]];

        
        $step = max(1, floor($count / ($maxPoints - 2)));

        
        for ($i = $step; $i < $count - 1; $i += $step) {
            $result[] = $coordinates[$i];
        }

        
        $result[] = $coordinates[$count - 1];

        return $result;
    }
}
