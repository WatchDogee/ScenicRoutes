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
            return Cache::get($cacheKey);
        }

        $result = $this->reverseGeocodeWithNominatim($lat, $lon);

        if (!$result) {
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

            $response = Http::withHeaders([
                'User-Agent' => 'ScenicRoutes/1.0 (https://scenic-routes.live; admin@scenic-routes.live)'
            ])->get('https://nominatim.openstreetmap.org/reverse', $params);

            if (!$response->successful()) {

                return null;
            }

            $data = $response->json();

            if (!isset($data['address'])) {
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

            return null;
        }
    }

    private function reverseGeocodeWithBigDataCloud($lat, $lon)
    {
        try {
            $response = Http::get('https://api.bigdatacloud.net/data/reverse-geocode-client', [
                'latitude' => $lat,
                'longitude' => $lon,
                'localityLanguage' => 'en'
            ]);

            $data = $response->json();

            if (!isset($data['countryName'])) {
                return null;
            }

            $result = [
                'country' => $data['countryName'] ?? null,
                'country_code' => $data['countryCode'] ?? null,
                'region' => $data['principalSubdivision'] ?? null
            ];

            return $result;
        } catch (\Exception $e) {
            return null;
        }
    }

    public function determineRoadLocation(array $coordinates)
    {
        if (empty($coordinates)) {
            return null;
        }

        $midpointIndex = intval(count($coordinates) / 2);
        $midpoint = $coordinates[$midpointIndex];

        if (is_string($midpoint)) {
            $parts = explode(',', $midpoint);
            if (count($parts) >= 2) {
                $lat = (float) trim($parts[0]);
                $lon = (float) trim($parts[1]);
                return $this->reverseGeocode($lat, $lon);
            }
            return null;
        } elseif (is_object($midpoint)) {
            if (isset($midpoint->lat) && isset($midpoint->lon)) {
                return $this->reverseGeocode($midpoint->lat, $midpoint->lon);
            } elseif (isset($midpoint->latitude) && isset($midpoint->longitude)) {
                return $this->reverseGeocode($midpoint->latitude, $midpoint->longitude);
            }
            return null;
        } elseif (!is_array($midpoint)) {
            return null;
        } elseif (count($midpoint) < 2) {
            return null;
        }
        return $this->reverseGeocode($midpoint[0], $midpoint[1]);
    }
}
