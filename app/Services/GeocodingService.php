<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class GeocodingService
{
public function reverseGeocode($lat, $lon)
    {
        
        $cacheKey = 'geocode_' . round($lat, 3) . '_' . round($lon, 3);

        
        if (Cache::has($cacheKey)) {
            Log::info('Using cached geocoding result', ['cache_key' => $cacheKey]);
            return Cache::get($cacheKey);
        }

        
        $result = $this->reverseGeocodeWithNominatim($lat, $lon);

        
        if (!$result) {
            Log::info('Nominatim geocoding failed, trying BigDataCloud fallback');
            $result = $this->reverseGeocodeWithBigDataCloud($lat, $lon);
        }

        
        if ($result) {
            Cache::put($cacheKey, $result, now()->addDays(30));
        }

        return $result;
    }
private function reverseGeocodeWithNominatim($lat, $lon)
    {

        try {
            
            $params = [
                'lat' => $lat,
                'lon' => $lon,
                'format' => 'json',
                'addressdetails' => 1,
                'zoom' => 10, 
                'accept-language' => 'en'
            ];

            Log::info('Making geocoding request', [
                'url' => 'https://nominatim.openstreetmap.org/reverse',
                'params' => $params
            ]);

            
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
private function reverseGeocodeWithBigDataCloud($lat, $lon)
    {
        try {
            Log::info('Making BigDataCloud geocoding request', [
                'url' => 'https://api.bigdatacloud.net/data/reverse-geocode-client',
                'params' => ['latitude' => $lat, 'longitude' => $lon]
            ]);

            
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

        
        $midpointIndex = intval(count($coordinates) / 2);
        $midpoint = $coordinates[$midpointIndex];

        
        if (is_string($midpoint)) {
            
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

        
        Log::info('Using coordinates', ['lat' => $midpoint[0], 'lon' => $midpoint[1]]);
        return $this->reverseGeocode($midpoint[0], $midpoint[1]);
    }
}
