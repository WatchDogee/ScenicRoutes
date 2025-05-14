<?php

namespace App\Services;

use App\Models\PointOfInterest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class PointOfInterestService
{
protected $tourismTypes = [
        'attraction',
        'museum',
        'gallery',
        'viewpoint',
        'hotel',
        'guest_house',
        'hostel',
        'camp_site',
        'alpine_hut',
        'wilderness_hut',
        'information',
        'picnic_site',
    ];
public function fetchTourismObjects($lat, $lon, $radius, $types = [])
    {
        $radiusMeters = $radius * 1000;
        $tourismTypes = !empty($types) ? $types : $this->tourismTypes;
        
        
        $query = "[out:json];(";
        
        foreach ($tourismTypes as $type) {
            $query .= "node[tourism=\"$type\"](around:$radiusMeters,$lat,$lon);";
        }
        
        $query .= ");out body;";
        
        
        $cacheKey = 'tourism_' . md5($query);
        
        
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }
        
        try {
            $url = "https://overpass-api.de/api/interpreter";
            $response = Http::post($url, ['data' => $query]);
            
            if (!$response->successful()) {
                Log::error('Failed to fetch tourism objects from Overpass API', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }
            
            $data = $response->json();
            $tourismObjects = [];
            
            if (isset($data['elements'])) {
                foreach ($data['elements'] as $element) {
                    if ($element['type'] === 'node' && isset($element['tags']['tourism'])) {
                        $poi = [
                            'osm_id' => $element['id'],
                            'type' => 'tourism',
                            'subtype' => $element['tags']['tourism'],
                            'name' => $element['tags']['name'] ?? 'Unnamed',
                            'latitude' => $element['lat'],
                            'longitude' => $element['lon'],
                            'properties' => [
                                'website' => $element['tags']['website'] ?? null,
                                'phone' => $element['tags']['phone'] ?? null,
                                'opening_hours' => $element['tags']['opening_hours'] ?? null,
                                'description' => $element['tags']['description'] ?? null,
                                'wheelchair' => $element['tags']['wheelchair'] ?? null,
                                'internet_access' => $element['tags']['internet_access'] ?? null,
                            ]
                        ];
                        
                        $tourismObjects[] = $poi;
                    }
                }
            }
            
            
            Cache::put($cacheKey, $tourismObjects, 60 * 24);
            
            return $tourismObjects;
        } catch (\Exception $e) {
            Log::error('Exception when fetching tourism objects: ' . $e->getMessage());
            return [];
        }
    }
public function fetchFuelStations($lat, $lon, $radius)
    {
        $radiusMeters = $radius * 1000;
        
        
        $query = "[out:json];(node[amenity=\"fuel\"](around:$radiusMeters,$lat,$lon););out body;";
        
        
        $cacheKey = 'fuel_' . md5($query);
        
        
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }
        
        try {
            $url = "https://overpass-api.de/api/interpreter";
            $response = Http::post($url, ['data' => $query]);
            
            if (!$response->successful()) {
                Log::error('Failed to fetch fuel stations from Overpass API', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }
            
            $data = $response->json();
            $fuelStations = [];
            
            if (isset($data['elements'])) {
                foreach ($data['elements'] as $element) {
                    if ($element['type'] === 'node' && isset($element['tags']['amenity']) && $element['tags']['amenity'] === 'fuel') {
                        
                        $fuelTypes = [];
                        foreach ($element['tags'] as $key => $value) {
                            if (strpos($key, 'fuel:') === 0 && $value === 'yes') {
                                $fuelTypes[] = str_replace('fuel:', '', $key);
                            }
                        }
                        
                        $poi = [
                            'osm_id' => $element['id'],
                            'type' => 'fuel',
                            'subtype' => 'gas_station',
                            'name' => $element['tags']['name'] ?? 'Unnamed Fuel Station',
                            'latitude' => $element['lat'],
                            'longitude' => $element['lon'],
                            'properties' => [
                                'brand' => $element['tags']['brand'] ?? null,
                                'operator' => $element['tags']['operator'] ?? null,
                                'opening_hours' => $element['tags']['opening_hours'] ?? null,
                                'fuel_types' => $fuelTypes,
                                'payment:credit_card' => $element['tags']['payment:credit_card'] ?? null,
                                'payment:debit_card' => $element['tags']['payment:debit_card'] ?? null,
                                'payment:cash' => $element['tags']['payment:cash'] ?? null,
                                'wheelchair' => $element['tags']['wheelchair'] ?? null,
                                'shop' => $element['tags']['shop'] ?? null,
                            ]
                        ];
                        
                        $fuelStations[] = $poi;
                    }
                }
            }
            
            
            Cache::put($cacheKey, $fuelStations, 60 * 24);
            
            return $fuelStations;
        } catch (\Exception $e) {
            Log::error('Exception when fetching fuel stations: ' . $e->getMessage());
            return [];
        }
    }
public function fetchChargingStations($lat, $lon, $radius)
    {
        $radiusMeters = $radius * 1000;
        
        
        $query = "[out:json];(node[amenity=\"charging_station\"](around:$radiusMeters,$lat,$lon););out body;";
        
        
        $cacheKey = 'charging_' . md5($query);
        
        
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }
        
        try {
            $url = "https://overpass-api.de/api/interpreter";
            $response = Http::post($url, ['data' => $query]);
            
            if (!$response->successful()) {
                Log::error('Failed to fetch charging stations from Overpass API', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }
            
            $data = $response->json();
            $chargingStations = [];
            
            if (isset($data['elements'])) {
                foreach ($data['elements'] as $element) {
                    if ($element['type'] === 'node' && isset($element['tags']['amenity']) && $element['tags']['amenity'] === 'charging_station') {
                        $poi = [
                            'osm_id' => $element['id'],
                            'type' => 'charging',
                            'subtype' => 'ev_charging',
                            'name' => $element['tags']['name'] ?? 'Unnamed Charging Station',
                            'latitude' => $element['lat'],
                            'longitude' => $element['lon'],
                            'properties' => [
                                'operator' => $element['tags']['operator'] ?? null,
                                'network' => $element['tags']['network'] ?? null,
                                'opening_hours' => $element['tags']['opening_hours'] ?? null,
                                'socket:type2' => $element['tags']['socket:type2'] ?? null,
                                'socket:chademo' => $element['tags']['socket:chademo'] ?? null,
                                'socket:ccs' => $element['tags']['socket:ccs'] ?? null,
                                'capacity' => $element['tags']['capacity'] ?? null,
                                'authentication' => $element['tags']['authentication'] ?? null,
                                'payment' => $element['tags']['payment'] ?? null,
                                'fee' => $element['tags']['fee'] ?? null,
                                'maxpower' => $element['tags']['maxpower'] ?? null,
                            ]
                        ];
                        
                        $chargingStations[] = $poi;
                    }
                }
            }
            
            
            Cache::put($cacheKey, $chargingStations, 60 * 24);
            
            return $chargingStations;
        } catch (\Exception $e) {
            Log::error('Exception when fetching charging stations: ' . $e->getMessage());
            return [];
        }
    }
public function savePoi($poiData, $userId = null)
    {
        $poi = PointOfInterest::updateOrCreate(
            [
                'osm_id' => $poiData['osm_id'],
                'type' => $poiData['type'],
                'subtype' => $poiData['subtype'],
            ],
            [
                'user_id' => $userId,
                'name' => $poiData['name'],
                'latitude' => $poiData['latitude'],
                'longitude' => $poiData['longitude'],
                'description' => $poiData['description'] ?? null,
                'properties' => $poiData['properties'] ?? null,
                'is_verified' => $userId ? false : true, 
            ]
        );
        
        return $poi;
    }
public function getPoisWithinRadius($lat, $lon, $radius, $type = null, $subtype = null)
    {
        $query = PointOfInterest::nearby($lat, $lon, $radius);
        
        if ($type) {
            $query->where('type', $type);
        }
        
        if ($subtype) {
            $query->where('subtype', $subtype);
        }
        
        return $query->get();
    }
}
