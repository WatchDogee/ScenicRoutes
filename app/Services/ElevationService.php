<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ElevationService
{
    /**
     * Fetch elevation data for a set of coordinates
     *
     * @param array $coordinates Array of [lat, lon] coordinates
     * @return array|null Array of elevations or null if request failed
     */
    public function getElevations(array $coordinates)
    {
        // Limit the number of coordinates to avoid overloading the API
        // If there are too many coordinates, sample them
        if (count($coordinates) > 100) {
            $coordinates = $this->sampleCoordinates($coordinates, 100);
        }

        // Format coordinates for the API request
        $locations = collect($coordinates)
            ->map(fn($point) => $point[0] . ',' . $point[1])
            ->implode('|');

        // Use cache to avoid repeated API calls for the same coordinates
        $cacheKey = 'elevation_' . md5($locations);
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        try {
            // Debug log
            Log::info('Fetching elevation data', [
                'coordinates_count' => count($coordinates),
                'sample_coordinates' => array_slice($coordinates, 0, 3)
            ]);

            // Try Open-Elevation API first
            $response = Http::get('https://api.open-elevation.com/api/v1/lookup', [
                'locations' => $locations
            ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Open-Elevation API response', [
                    'status' => $response->status(),
                    'sample_results' => array_slice($data['results'] ?? [], 0, 3)
                ]);

                $elevations = collect($data['results'])->pluck('elevation')->toArray();

                // Cache the results for 30 days
                Cache::put($cacheKey, $elevations, 60 * 24 * 30);

                return $elevations;
            }

            Log::info('Open-Elevation API failed, trying OpenTopoData', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            // Fallback to OpenTopoData API if Open-Elevation fails
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

                // Cache the results for 30 days
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

    /**
     * Calculate elevation statistics from elevation data
     *
     * @param array $elevations Array of elevation values
     * @return array Associative array with elevation statistics
     */
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

        // Calculate cumulative elevation gain and loss
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

    /**
     * Sample coordinates to reduce the number of API calls
     *
     * @param array $coordinates Array of [lat, lon] coordinates
     * @param int $maxPoints Maximum number of points to return
     * @return array Sampled coordinates
     */
    private function sampleCoordinates(array $coordinates, int $maxPoints)
    {
        $count = count($coordinates);
        if ($count <= $maxPoints) {
            return $coordinates;
        }

        // Always include first and last points
        $result = [$coordinates[0]];

        // Calculate step size to get approximately maxPoints
        $step = max(1, floor($count / ($maxPoints - 2)));

        // Add intermediate points
        for ($i = $step; $i < $count - 1; $i += $step) {
            $result[] = $coordinates[$i];
        }

        // Add last point
        $result[] = $coordinates[$count - 1];

        return $result;
    }
}
