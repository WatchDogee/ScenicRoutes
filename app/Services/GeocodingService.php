<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class GeocodingService
{
    /**
     * Reverse geocode coordinates to get country and region information
     *
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @return array|null Array with country and region information or null if geocoding fails
     */
    public function reverseGeocode($lat, $lon)
    {
        // Create a cache key based on the coordinates (rounded to 3 decimal places for better caching)
        $cacheKey = 'geocode_' . round($lat, 3) . '_' . round($lon, 3);

        // Check if we have this location cached
        if (Cache::has($cacheKey)) {
            Log::info('Using cached geocoding result', ['cache_key' => $cacheKey]);
            return Cache::get($cacheKey);
        }

        // Try Nominatim first
        $result = $this->reverseGeocodeWithNominatim($lat, $lon);

        // If Nominatim fails, try BigDataCloud as a fallback
        if (!$result) {
            Log::info('Nominatim geocoding failed, trying BigDataCloud fallback');
            $result = $this->reverseGeocodeWithBigDataCloud($lat, $lon);
        }

        // Cache the result if we got one
        if ($result) {
            Cache::put($cacheKey, $result, now()->addDays(30));
        }

        return $result;
    }

    /**
     * Reverse geocode using Nominatim
     *
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @return array|null Array with country and region information or null if geocoding fails
     */
    private function reverseGeocodeWithNominatim($lat, $lon)
    {

        try {
            // Add a user agent as required by Nominatim's usage policy
            $params = [
                'lat' => $lat,
                'lon' => $lon,
                'format' => 'json',
                'addressdetails' => 1,
                'zoom' => 10, // Higher zoom level for more detailed results
                'accept-language' => 'en'
            ];

            Log::info('Making geocoding request', [
                'url' => 'https://nominatim.openstreetmap.org/reverse',
                'params' => $params
            ]);

            // Use Nominatim for reverse geocoding
            $response = Http::withHeaders([
                'User-Agent' => 'ScenicRoutes/1.0 (https://scenic-routes.live; admin@scenic-routes.live)'
            ])->get('https://nominatim.openstreetmap.org/reverse', $params);

            Log::info('Geocoding response received', [
                'status' => $response->status(),
                'body_preview' => substr($response->body(), 0, 500)
            ]);

            if (!$response->successful()) {
                Log::error('Reverse geocoding failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'coordinates' => [$lat, $lon]
                ]);
                return null;
            }

            $data = $response->json();

            if (!isset($data['address'])) {
                Log::warning('No address found in geocoding response', [
                    'response' => $data,
                    'coordinates' => [$lat, $lon]
                ]);
                return null;
            }

            $address = $data['address'];

            // Extract country and region information
            $result = [
                'country' => $address['country'] ?? null,
                'country_code' => $address['country_code'] ?? null,
                'region' => $address['state'] ?? $address['county'] ?? $address['region'] ?? null
            ];

            return $result;
        } catch (\Exception $e) {
            Log::error('Error during reverse geocoding', [
                'message' => $e->getMessage(),
                'coordinates' => [$lat, $lon],
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Reverse geocode using BigDataCloud API
     *
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @return array|null Array with country and region information or null if geocoding fails
     */
    private function reverseGeocodeWithBigDataCloud($lat, $lon)
    {
        try {
            Log::info('Making BigDataCloud geocoding request', [
                'url' => 'https://api.bigdatacloud.net/data/reverse-geocode-client',
                'params' => ['latitude' => $lat, 'longitude' => $lon]
            ]);

            // Use BigDataCloud for reverse geocoding (free tier)
            $response = Http::get('https://api.bigdatacloud.net/data/reverse-geocode-client', [
                'latitude' => $lat,
                'longitude' => $lon,
                'localityLanguage' => 'en'
            ]);

            Log::info('BigDataCloud response received', [
                'status' => $response->status(),
                'body_preview' => substr($response->body(), 0, 500)
            ]);

            if (!$response->successful()) {
                Log::error('BigDataCloud reverse geocoding failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'coordinates' => [$lat, $lon]
                ]);
                return null;
            }

            $data = $response->json();

            if (!isset($data['countryName'])) {
                Log::warning('No country found in BigDataCloud response', [
                    'response' => $data,
                    'coordinates' => [$lat, $lon]
                ]);
                return null;
            }

            // Extract country and region information
            $result = [
                'country' => $data['countryName'] ?? null,
                'country_code' => $data['countryCode'] ?? null,
                'region' => $data['principalSubdivision'] ?? null
            ];

            return $result;
        } catch (\Exception $e) {
            Log::error('Error during BigDataCloud reverse geocoding', [
                'message' => $e->getMessage(),
                'coordinates' => [$lat, $lon],
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Determine the country and region for a road based on its coordinates
     *
     * @param array $coordinates Array of [lat, lon] coordinates
     * @return array|null Array with country and region information or null if geocoding fails
     */
    public function determineRoadLocation(array $coordinates)
    {
        if (empty($coordinates)) {
            Log::warning('Empty coordinates array provided to determineRoadLocation');
            return null;
        }

        Log::info('Determining road location', [
            'coordinates_count' => count($coordinates),
            'first_coordinate' => $coordinates[0] ?? null,
            'coordinate_type' => gettype($coordinates[0])
        ]);

        // Use the middle point of the road for geocoding
        $midpointIndex = intval(count($coordinates) / 2);
        $midpoint = $coordinates[$midpointIndex];

        // Handle different coordinate formats
        if (is_string($midpoint)) {
            // Try to parse string format
            Log::info('Coordinates are in string format, attempting to parse');
            $parts = explode(',', $midpoint);
            if (count($parts) >= 2) {
                $lat = (float) trim($parts[0]);
                $lon = (float) trim($parts[1]);
                Log::info('Parsed coordinates', ['lat' => $lat, 'lon' => $lon]);
                return $this->reverseGeocode($lat, $lon);
            }
            return null;
        } elseif (is_object($midpoint)) {
            // Try to handle object format
            Log::info('Coordinates are in object format', ['object_properties' => get_object_vars($midpoint)]);
            if (isset($midpoint->lat) && isset($midpoint->lon)) {
                return $this->reverseGeocode($midpoint->lat, $midpoint->lon);
            } elseif (isset($midpoint->latitude) && isset($midpoint->longitude)) {
                return $this->reverseGeocode($midpoint->latitude, $midpoint->longitude);
            }
            return null;
        } elseif (!is_array($midpoint)) {
            Log::warning('Unexpected coordinate format', ['type' => gettype($midpoint), 'value' => $midpoint]);
            return null;
        } elseif (count($midpoint) < 2) {
            Log::warning('Coordinate array too short', ['array' => $midpoint]);
            return null;
        }

        // Standard array format [lat, lon]
        Log::info('Using coordinates', ['lat' => $midpoint[0], 'lon' => $midpoint[1]]);
        return $this->reverseGeocode($midpoint[0], $midpoint[1]);
    }
}
