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
            // Overpass API works better with GET request and URL-encoded query (like RouteService does)
            $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);
            
            Log::info('Fetching tourism POIs from Overpass', [
                'lat' => $lat,
                'lon' => $lon,
                'radius' => $radius,
                'radius_meters' => $radiusMeters,
                'query_length' => strlen($query),
                'query' => $query
            ]);
            
            $response = Http::timeout(30)->get($url);
            
            if (!$response->successful()) {
                Log::error('Overpass API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }
            
            $data = $response->json();
            $tourismObjects = [];
            
            Log::info('Overpass API response received', [
                'has_elements' => isset($data['elements']),
                'element_count' => isset($data['elements']) ? count($data['elements']) : 0,
                'remark' => $data['remark'] ?? null
            ]);
            
            if (isset($data['elements'])) {
                foreach ($data['elements'] as $element) {
                    $isTourism = false;
                    $lat = null;
                    $lon = null;
                    
                    // Handle nodes
                    if ($element['type'] === 'node' && isset($element['tags']['tourism'])) {
                        $isTourism = true;
                        $lat = $element['lat'] ?? null;
                        $lon = $element['lon'] ?? null;
                    }
                    // Handle ways (areas/polygons) - use center point
                    elseif ($element['type'] === 'way' && isset($element['tags']['tourism'])) {
                        $isTourism = true;
                        // Use center if available, otherwise calculate from bounds
                        if (isset($element['center'])) {
                            $lat = $element['center']['lat'] ?? null;
                            $lon = $element['center']['lon'] ?? null;
                        } elseif (isset($element['bounds'])) {
                            $lat = ($element['bounds']['minlat'] + $element['bounds']['maxlat']) / 2;
                            $lon = ($element['bounds']['minlon'] + $element['bounds']['maxlon']) / 2;
                        }
                    }
                    
                    if ($isTourism && $lat && $lon) {
                        $poi = [
                            'osm_id' => $element['id'],
                            'type' => 'tourism',
                            'subtype' => $element['tags']['tourism'],
                            'name' => $element['tags']['name'] ?? 'Unnamed',
                            'latitude' => $lat,
                            'longitude' => $lon,
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
            
            Log::info('Tourism POIs processed', [
                'found_count' => count($tourismObjects)
            ]);
            
            Cache::put($cacheKey, $tourismObjects, 60 * 24);
            
            return $tourismObjects;
        } catch (\Exception $e) {
            Log::error('Error fetching tourism POIs', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return [];
        }
    }
    
    public function fetchFuelStations($lat, $lon, $radius)
    {
        $radiusMeters = $radius * 1000;
        
        // Overpass query: search for fuel stations with multiple tag variations
        // Some fuel stations might be tagged as amenity=service with service=fuel
        // Or might be on ways (areas) instead of nodes
        $query = "[out:json][timeout:25];(" .
            "node[amenity=\"fuel\"](around:$radiusMeters,$lat,$lon);" .
            "node[amenity=\"service\"][service=\"fuel\"](around:$radiusMeters,$lat,$lon);" .
            "way[amenity=\"fuel\"](around:$radiusMeters,$lat,$lon);" .
            "way[amenity=\"service\"][service=\"fuel\"](around:$radiusMeters,$lat,$lon);" .
            ");out center body;";
        
        $cacheKey = 'fuel_' . md5($query);
        
        if (Cache::has($cacheKey)) {
            Log::info('Returning cached fuel stations', ['count' => count(Cache::get($cacheKey))]);
            return Cache::get($cacheKey);
        }
        
        try {
            // Overpass API works better with GET request and URL-encoded query
            $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);
            
            Log::info('Fetching fuel stations from Overpass', [
                'lat' => $lat,
                'lon' => $lon,
                'radius' => $radius,
                'radius_meters' => $radiusMeters,
                'query' => $query,
                'url_length' => strlen($url)
            ]);
            
            $response = Http::timeout(30)->get($url);
            
            if (!$response->successful()) {
                Log::error('Overpass API request failed for fuel stations', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }
            
            $data = $response->json();
            $fuelStations = [];
            
            Log::info('Overpass API response received for fuel', [
                'has_elements' => isset($data['elements']),
                'element_count' => isset($data['elements']) ? count($data['elements']) : 0,
                'remark' => $data['remark'] ?? null,
                'response_keys' => array_keys($data),
                'full_response_sample' => isset($data['elements'][0]) ? $data['elements'][0] : null
            ]);
            
            if (isset($data['elements'])) {
                Log::info('Processing Overpass fuel elements', [
                    'total_elements' => count($data['elements']),
                    'sample_element' => isset($data['elements'][0]) ? [
                        'type' => $data['elements'][0]['type'] ?? null,
                        'has_tags' => isset($data['elements'][0]['tags']),
                        'tags_keys' => isset($data['elements'][0]['tags']) ? array_keys($data['elements'][0]['tags']) : [],
                        'amenity' => $data['elements'][0]['tags']['amenity'] ?? null,
                        'service' => $data['elements'][0]['tags']['service'] ?? null
                    ] : null
                ]);
                
                foreach ($data['elements'] as $element) {
                    $isFuel = false;
                    $lat = null;
                    $lon = null;
                    
                    // Handle nodes
                    if ($element['type'] === 'node') {
                        $amenity = $element['tags']['amenity'] ?? null;
                        $service = $element['tags']['service'] ?? null;
                        
                        if ($amenity === 'fuel' || 
                            ($amenity === 'service' && $service === 'fuel')) {
                            $isFuel = true;
                            $lat = $element['lat'] ?? null;
                            $lon = $element['lon'] ?? null;
                        }
                    }
                    // Handle ways (areas/polygons) - use center point
                    elseif ($element['type'] === 'way') {
                        $amenity = $element['tags']['amenity'] ?? null;
                        $service = $element['tags']['service'] ?? null;
                        
                        if ($amenity === 'fuel' || 
                            ($amenity === 'service' && $service === 'fuel')) {
                            $isFuel = true;
                            // Use center if available, otherwise calculate from bounds
                            if (isset($element['center'])) {
                                $lat = $element['center']['lat'] ?? null;
                                $lon = $element['center']['lon'] ?? null;
                            } elseif (isset($element['bounds'])) {
                                $lat = ($element['bounds']['minlat'] + $element['bounds']['maxlat']) / 2;
                                $lon = ($element['bounds']['minlon'] + $element['bounds']['maxlon']) / 2;
                            }
                        }
                    }
                    
                    if ($isFuel && $lat && $lon) {
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
                            'latitude' => $lat,
                            'longitude' => $lon,
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
            } else {
                Log::warning('Overpass response has no elements', [
                    'response_keys' => array_keys($data),
                    'remark' => $data['remark'] ?? null
                ]);
            }
            
            Cache::put($cacheKey, $fuelStations, 60 * 24);
            
            return $fuelStations;
        } catch (\Exception $e) {
            return [];
        }
    }
    
    public function fetchChargingStations($lat, $lon, $radius)
    {
        $radiusMeters = $radius * 1000;
        
        // Search for charging stations - also try alternative tags
        $query = "[out:json][timeout:25];(" .
            "node[amenity=\"charging_station\"](around:$radiusMeters,$lat,$lon);" .
            "node[amenity=\"fuel\"][ev_charging=\"yes\"](around:$radiusMeters,$lat,$lon);" .
            "way[amenity=\"charging_station\"](around:$radiusMeters,$lat,$lon);" .
            ");out center body;";
        
        $cacheKey = 'charging_' . md5($query);
        
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }
        
        try {
            // Overpass API works better with GET request and URL-encoded query (like RouteService does)
            $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($query);
            
            Log::info('Fetching charging stations from Overpass', [
                'lat' => $lat,
                'lon' => $lon,
                'radius' => $radius,
                'radius_meters' => $radiusMeters,
                'query' => $query
            ]);
            
            $response = Http::timeout(30)->get($url);
            
            if (!$response->successful()) {
                Log::error('Overpass API request failed for charging stations', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [];
            }
            
            $data = $response->json();
            $chargingStations = [];
            
            Log::info('Overpass API response received for charging', [
                'has_elements' => isset($data['elements']),
                'element_count' => isset($data['elements']) ? count($data['elements']) : 0
            ]);
            
            if (isset($data['elements'])) {
                Log::info('Processing Overpass charging elements', [
                    'total_elements' => count($data['elements']),
                    'sample_element' => isset($data['elements'][0]) ? [
                        'type' => $data['elements'][0]['type'] ?? null,
                        'has_tags' => isset($data['elements'][0]['tags']),
                        'tags_keys' => isset($data['elements'][0]['tags']) ? array_keys($data['elements'][0]['tags']) : []
                    ] : null
                ]);
                
                foreach ($data['elements'] as $element) {
                    $isCharging = false;
                    $lat_coord = null;
                    $lon_coord = null;
                    
                    $amenity = $element['tags']['amenity'] ?? null;
                    $evCharging = $element['tags']['ev_charging'] ?? null;
                    
                    // Handle nodes
                    if ($element['type'] === 'node') {
                        if ($amenity === 'charging_station' || 
                            ($amenity === 'fuel' && $evCharging === 'yes')) {
                            $isCharging = true;
                            $lat_coord = $element['lat'] ?? null;
                            $lon_coord = $element['lon'] ?? null;
                        }
                    }
                    // Handle ways
                    elseif ($element['type'] === 'way') {
                        if ($amenity === 'charging_station' || 
                            ($amenity === 'fuel' && $evCharging === 'yes')) {
                            $isCharging = true;
                            if (isset($element['center'])) {
                                $lat_coord = $element['center']['lat'] ?? null;
                                $lon_coord = $element['center']['lon'] ?? null;
                            } elseif (isset($element['bounds'])) {
                                $lat_coord = ($element['bounds']['minlat'] + $element['bounds']['maxlat']) / 2;
                                $lon_coord = ($element['bounds']['minlon'] + $element['bounds']['maxlon']) / 2;
                            }
                        }
                    }
                    
                    if ($isCharging && $lat_coord && $lon_coord) {
                        $poi = [
                            'osm_id' => $element['id'],
                            'type' => 'charging',
                            'subtype' => 'ev_charging',
                            'name' => $element['tags']['name'] ?? 'Unnamed Charging Station',
                            'latitude' => $lat_coord,
                            'longitude' => $lon_coord,
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
