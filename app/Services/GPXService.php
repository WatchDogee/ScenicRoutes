<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class GPXService
{
    /**
     * Generate GPX XML from route data
     * 
     * @param array $route Route data with coordinates, distance, duration, etc.
     * @param string $name Route name
     * @param string $description Route description
     * @return string GPX XML content
     */
    public function generateGPX($route, $name = 'Route', $description = '')
    {
        $coordinates = $route['coordinates'] ?? [];
        
        if (empty($coordinates)) {
            throw new \Exception('Route has no coordinates');
        }

        // Normalize coordinates to [lat, lon] format - handle both object {lat, lng} and array [lat, lon]
        $normalizedCoords = array_map(function($coord) {
            if (is_array($coord)) {
                // Check if it's object-like array with keys
                if (isset($coord['lat']) && isset($coord['lng'])) {
                    return [$coord['lat'], $coord['lng'], $coord['ele'] ?? null];
                } elseif (isset($coord['latitude']) && isset($coord['longitude'])) {
                    return [$coord['latitude'], $coord['longitude'], $coord['ele'] ?? null];
                } elseif (isset($coord[0]) && isset($coord[1])) {
                    // Already in [lat, lon] format
                    return [$coord[0], $coord[1], $coord[2] ?? null];
                }
            }
            return null;
        }, $coordinates);
        
        // Filter out null entries
        $normalizedCoords = array_filter($normalizedCoords);
        
        if (empty($normalizedCoords)) {
            throw new \Exception('No valid coordinates found in route');
        }

        // Create GPX with proper namespace attributes using DOM
        $dom = new \DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;
        
        $gpx = $dom->createElementNS('http://www.topografix.com/GPX/1/1', 'gpx');
        $gpx->setAttribute('version', '1.1');
        $gpx->setAttribute('creator', 'ScenicRoutes');
        $gpx->setAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'xsi:schemaLocation', 
            'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd');
        $dom->appendChild($gpx);

        // Add metadata
        $metadata = $dom->createElement('metadata');
        $metaName = $dom->createElement('name', htmlspecialchars($name, ENT_XML1));
        $metadata->appendChild($metaName);
        if (!empty($description)) {
            $metaDesc = $dom->createElement('desc', htmlspecialchars($description, ENT_XML1));
            $metadata->appendChild($metaDesc);
        }
        $metaTime = $dom->createElement('time', date('c'));
        $metadata->appendChild($metaTime);
        $gpx->appendChild($metadata);

        // Add route as track
        $trk = $dom->createElement('trk');
        $trkName = $dom->createElement('name', htmlspecialchars($name, ENT_XML1));
        $trk->appendChild($trkName);
        if (!empty($description)) {
            $trkDesc = $dom->createElement('desc', htmlspecialchars($description, ENT_XML1));
            $trk->appendChild($trkDesc);
        }
        $trkseg = $dom->createElement('trkseg');
        $trk->appendChild($trkseg);

        // Add waypoints (start and end)
        $startPoint = $normalizedCoords[array_key_first($normalizedCoords)];
        $endPoint = $normalizedCoords[array_key_last($normalizedCoords)];

        $wpt = $dom->createElement('wpt');
        $wpt->setAttribute('lat', $startPoint[0]);
        $wpt->setAttribute('lon', $startPoint[1]);
        $wptName = $dom->createElement('name', 'Start');
        $wpt->appendChild($wptName);
        $wptSym = $dom->createElement('sym', 'Flag, Green');
        $wpt->appendChild($wptSym);
        $gpx->appendChild($wpt);

        $wpt = $dom->createElement('wpt');
        $wpt->setAttribute('lat', $endPoint[0]);
        $wpt->setAttribute('lon', $endPoint[1]);
        $wptName = $dom->createElement('name', 'End');
        $wpt->appendChild($wptName);
        $wptSym = $dom->createElement('sym', 'Flag, Red');
        $wpt->appendChild($wptSym);
        $gpx->appendChild($wpt);

        // Add track points
        foreach ($normalizedCoords as $coord) {
            $trkpt = $dom->createElement('trkpt');
            $trkpt->setAttribute('lat', $coord[0]);
            $trkpt->setAttribute('lon', $coord[1]);
            
            // Add elevation if available
            if (isset($coord[2]) && $coord[2] !== null) {
                $ele = $dom->createElement('ele', $coord[2]);
                $trkpt->appendChild($ele);
            }
            
            $trkseg->appendChild($trkpt);
        }
        
        $gpx->appendChild($trk);

        return $dom->saveXML();
    }

    /**
     * Generate GPX from saved road
     * 
     * @param \App\Models\SavedRoad $savedRoad
     * @return string GPX XML content
     */
    public function generateGPXFromSavedRoad($savedRoad)
    {
        // Normalize coordinates from saved road record
        $coords = $savedRoad->coordinates ?? null;
        if (!$coords && isset($savedRoad->road_coordinates)) {
            try {
                $parsed = is_string($savedRoad->road_coordinates)
                    ? json_decode($savedRoad->road_coordinates, true)
                    : $savedRoad->road_coordinates;
                if (is_array($parsed)) {
                    $coords = array_values(array_filter(array_map(function ($c) {
                        if (is_array($c) && count($c) >= 2) return [$c[0], $c[1]];
                        if (is_array($c) && isset($c['lat'], $c['lng'])) return [$c['lat'], $c['lng']];
                        if (is_array($c) && isset($c['latitude'], $c['longitude'])) return [$c['latitude'], $c['longitude']];
                        return null;
                    }, $parsed)));
                }
            } catch (\Throwable $e) {
                \Log::error('Failed to parse road_coordinates for saved road', [
                    'road_id' => $savedRoad->id ?? 'unknown',
                    'error' => $e->getMessage()
                ]);
                $coords = [];
            }
        }

        // Log what we're exporting
        \Log::info('Generating GPX for saved road', [
            'road_id' => $savedRoad->id ?? 'unknown',
            'road_name' => $savedRoad->road_name ?? 'unnamed',
            'has_coordinates' => !empty($coords),
            'coordinate_count' => is_array($coords) ? count($coords) : 0,
            'first_coord' => is_array($coords) && !empty($coords) ? $coords[0] : null,
            'raw_road_coordinates_type' => isset($savedRoad->road_coordinates) ? gettype($savedRoad->road_coordinates) : 'not set',
            'raw_road_coordinates_length' => isset($savedRoad->road_coordinates) && is_string($savedRoad->road_coordinates) 
                ? strlen($savedRoad->road_coordinates) 
                : (is_array($savedRoad->road_coordinates) ? count($savedRoad->road_coordinates) : 0)
        ]);

        $route = [
            'coordinates' => $coords ?? [],
            'distance_km' => $savedRoad->distance_km ?? 0,
            'duration_min' => $savedRoad->duration_min ?? 0,
            'curvature' => $savedRoad->curvature ?? 0,
            'corner_count' => $savedRoad->corner_count ?? 0,
        ];

        $name = $savedRoad->road_name ?? 'Route';
        $description = $savedRoad->description ?? '';

        return $this->generateGPX($route, $name, $description);
    }

    /**
     * Generate GPX from collection (multiple routes)
     * 
     * @param \App\Models\Collection $collection
     * @return string GPX XML content
     */
    public function generateGPXFromCollection($collection)
    {
        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><gpx></gpx>');
        $xml->addAttribute('version', '1.1');
        $xml->addAttribute('creator', 'ScenicRoutes');
        $xml->addAttribute('xmlns', 'http://www.topografix.com/GPX/1/1');
        $xml->addAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $xml->addAttribute('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd');

        // Add metadata
        $metadata = $xml->addChild('metadata');
        $metadata->addChild('name', htmlspecialchars($collection->name ?? 'Collection'));
        if (!empty($collection->description)) {
            $metadata->addChild('desc', htmlspecialchars($collection->description));
        }
        $metadata->addChild('time', date('c'));

        // Add each road as a separate track
        $roads = $collection->roads ?? [];
        foreach ($roads as $road) {
            $coordinates = $road->coordinates ?? [];
            if (empty($coordinates)) {
                continue;
            }

            $trk = $xml->addChild('trk');
            $trk->addChild('name', htmlspecialchars($road->road_name ?? 'Route'));
            if (!empty($road->description)) {
                $trk->addChild('desc', htmlspecialchars($road->description));
            }
            $trkseg = $trk->addChild('trkseg');

            foreach ($coordinates as $coord) {
                $trkpt = $trkseg->addChild('trkpt');
                $trkpt->addAttribute('lat', $coord[0]);
                $trkpt->addAttribute('lon', $coord[1]);
                if (isset($coord[2])) {
                    $trkpt->addChild('ele', $coord[2]);
                }
            }
        }

        return $xml->asXML();
    }

    /**
     * Parse GPX file and extract route data
     * 
     * @param string $gpxContent GPX XML content
     * @return array Parsed route data
     */
    public function parseGPX($gpxContent)
    {
        try {
            libxml_use_internal_errors(true);
            $xml = simplexml_load_string($gpxContent);
            
            if ($xml === false) {
                $errors = libxml_get_errors();
                $errorMessages = array_map(function($error) {
                    return trim($error->message);
                }, $errors);
                libxml_clear_errors();
                throw new \Exception('Invalid GPX format: ' . implode(', ', $errorMessages));
            }

            $coordinates = [];
            $name = '';
            $description = '';
            $waypoints = [];

            // Register namespaces - handle default namespace properly
            $namespaces = $xml->getNamespaces(true);
            
            // Always register common GPX namespaces for XPath queries
            $xml->registerXPathNamespace('gpx', 'http://www.topografix.com/GPX/1/1');
            $xml->registerXPathNamespace('gpx10', 'http://www.topografix.com/GPX/1/0');
            
            // If there's a default namespace, register it too
            if (isset($namespaces[''])) {
                $xml->registerXPathNamespace('default', $namespaces['']);
            }
            
            $hasNamespace = !empty($namespaces);

            // Get metadata
            $metadata = $xml->metadata ?? null;
            if ($metadata) {
                $name = (string)($metadata->name ?? '');
                $description = (string)($metadata->desc ?? '');
            }

            // Extract waypoints (try with namespace first, then without)
            $wpts = [];
            if ($hasNamespace) {
                $result = $xml->xpath('//gpx:wpt | //wpt');
                $wpts = ($result !== false) ? $result : [];
            } else {
                $result = $xml->xpath('//wpt');
                $wpts = ($result !== false) ? $result : [];
            }
            
            foreach ($wpts as $wpt) {
                $lat = (float)$wpt['lat'];
                $lon = (float)$wpt['lon'];
                $wptName = (string)($wpt->name ?? '');
                $waypoints[] = [
                    'lat' => $lat,
                    'lon' => $lon,
                    'name' => $wptName
                ];
            }

            // Extract track points (preferred method) - try all possible namespace combinations
            $trksegs = [];
            $result = $xml->xpath('//gpx:trkseg | //gpx10:trkseg | //default:trkseg | //trkseg');
            $trksegs = ($result !== false) ? $result : [];
            
            \Log::info('GPX parsing: track segments found', [
                'count' => count($trksegs),
                'hasNamespace' => $hasNamespace,
                'namespaces' => $namespaces
            ]);
            
            if (!empty($trksegs)) {
                foreach ($trksegs as $trkseg) {
                    // For elements with default namespace, we need to use the registered prefix
                    // Try multiple approaches to find trkpt elements
                    $trkpts = [];
                    
                    // Approach 1: Use children() method which doesn't require namespace
                    foreach ($trkseg->children() as $child) {
                        if ($child->getName() === 'trkpt') {
                            $trkpts[] = $child;
                        }
                    }
                    
                    // Approach 2: If that didn't work, try with namespace
                    if (empty($trkpts) && isset($namespaces[''])) {
                        foreach ($trkseg->children($namespaces['']) as $child) {
                            if ($child->getName() === 'trkpt') {
                                $trkpts[] = $child;
                            }
                        }
                    }
                    
                    \Log::info('GPX parsing: track points in segment', ['count' => count($trkpts)]);
                    
                    foreach ($trkpts as $trkpt) {
                        $lat = (float)$trkpt['lat'];
                        $lon = (float)$trkpt['lon'];
                        $ele = isset($trkpt->ele) ? (float)$trkpt->ele : null;
                        
                        $coord = [$lat, $lon];
                        if ($ele !== null) {
                            $coord[] = $ele;
                        }
                        $coordinates[] = $coord;
                    }
                }
            }

            // If no track points, try route points
            if (empty($coordinates)) {
                $result = $xml->xpath('//gpx:rtept | //gpx10:rtept | //default:rtept | //rtept');
                $rtepts = ($result !== false) ? $result : [];
                
                foreach ($rtepts as $rtept) {
                    $lat = (float)$rtept['lat'];
                    $lon = (float)$rtept['lon'];
                    $ele = isset($rtept->ele) ? (float)$rtept->ele : null;
                    
                    $coord = [$lat, $lon];
                    if ($ele !== null) {
                        $coord[] = $ele;
                    }
                    $coordinates[] = $coord;
                }
            }

            // Get track/route name if metadata name is empty
            if (empty($name)) {
                $trks = [];
                if ($hasNamespace) {
                    $result = $xml->xpath('//gpx:trk | //trk');
                    $trks = ($result !== false) ? $result : [];
                } else {
                    $result = $xml->xpath('//trk');
                    $trks = ($result !== false) ? $result : [];
                }
                
                if (!empty($trks)) {
                    $name = (string)($trks[0]->name ?? '');
                    $description = (string)($trks[0]->desc ?? $description);
                } else {
                    $rtes = [];
                    if ($hasNamespace) {
                        $result = $xml->xpath('//gpx:rte | //rte');
                        $rtes = ($result !== false) ? $result : [];
                    } else {
                        $result = $xml->xpath('//rte');
                        $rtes = ($result !== false) ? $result : [];
                    }
                    
                    if (!empty($rtes)) {
                        $name = (string)($rtes[0]->name ?? '');
                        $description = (string)($rtes[0]->desc ?? $description);
                    }
                }
            }

            if (empty($coordinates)) {
                throw new \Exception('No route coordinates found in GPX file');
            }

            // Convert coordinates to lat/lng object format for frontend
            $formattedCoordinates = array_map(function($coord) {
                return [
                    'lat' => $coord[0],
                    'lng' => $coord[1],
                    'ele' => $coord[2] ?? null
                ];
            }, $coordinates);

            // Calculate distance and basic stats
            $distance = $this->calculateDistance($coordinates);
            $duration = $this->estimateDuration($distance);

            return [
                'coordinates' => $formattedCoordinates,
                'name' => $name ?: 'Imported Route',
                'description' => $description,
                'waypoints' => $waypoints,
                'distance' => $distance,
                'distance_km' => round($distance / 1000, 2),
                'duration' => $duration,
                'duration_min' => round($duration / 60, 2),
            ];
        } catch (\Exception $e) {
            // Fallback: try regex extraction if XPath parsing fails
            Log::warning('XPath parsing failed, attempting regex fallback', ['error' => $e->getMessage()]);
            return $this->parseGPXWithRegex($gpxContent);
        }
    }

    /**
     * Fallback GPX parser using regex for coordinate extraction
     * Handles cases where namespace or structure is non-standard
     * 
     * @param string $gpxContent GPX XML content
     * @return array Parsed route data
     */
    private function parseGPXWithRegex($gpxContent)
    {
        $coordinates = [];
        $name = 'Imported Route';
        $description = '';
        $waypoints = [];

        try {
            // Extract name from metadata or track
            if (preg_match('/<name[^>]*>([^<]+)<\/name>/i', $gpxContent, $m)) {
                $name = trim($m[1]);
            }
            if (preg_match('/<desc[^>]*>([^<]+)<\/desc>/i', $gpxContent, $m)) {
                $description = trim($m[1]);
            }

            // Extract track points: match <trkpt lat="X" lon="Y"> or <trkpt lon="Y" lat="X">
            if (preg_match_all('/<trkpt[^>]+lat=["\']?([^"\'\s>]+)["\']?[^>]+lon=["\']?([^"\'\s>]+)["\']?[^>]*>(?:.*?<ele[^>]*>([^<]+)<\/ele>)?.*?<\/trkpt>/is', $gpxContent, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $lat = (float)$match[1];
                    $lon = (float)$match[2];
                    $ele = isset($match[3]) ? (float)$match[3] : null;
                    
                    $coord = [$lat, $lon];
                    if ($ele !== null) {
                        $coord[] = $ele;
                    }
                    $coordinates[] = $coord;
                }
            }
            // Also try with reversed lat/lon order
            if (empty($coordinates) && preg_match_all('/<trkpt[^>]+lon=["\']?([^"\'\s>]+)["\']?[^>]+lat=["\']?([^"\'\s>]+)["\']?[^>]*>(?:.*?<ele[^>]*>([^<]+)<\/ele>)?.*?<\/trkpt>/is', $gpxContent, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $lat = (float)$match[2];
                    $lon = (float)$match[1];
                    $ele = isset($match[3]) ? (float)$match[3] : null;
                    
                    $coord = [$lat, $lon];
                    if ($ele !== null) {
                        $coord[] = $ele;
                    }
                    $coordinates[] = $coord;
                }
            }

            // Fallback to route points if no track points
            if (empty($coordinates) && preg_match_all('/<rtept[^>]+lat=["\']?([^"\'\s>]+)["\']?[^>]+lon=["\']?([^"\'\s>]+)["\']?[^>]*>(?:.*?<ele[^>]*>([^<]+)<\/ele>)?.*?<\/rtept>/is', $gpxContent, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $lat = (float)$match[1];
                    $lon = (float)$match[2];
                    $ele = isset($match[3]) ? (float)$match[3] : null;
                    
                    $coord = [$lat, $lon];
                    if ($ele !== null) {
                        $coord[] = $ele;
                    }
                    $coordinates[] = $coord;
                }
            }

            if (empty($coordinates)) {
                throw new \Exception('No route coordinates found in GPX file (regex fallback also failed)');
            }

            // Convert coordinates to lat/lng object format for frontend
            $formattedCoordinates = array_map(function($coord) {
                return [
                    'lat' => $coord[0],
                    'lng' => $coord[1],
                    'ele' => $coord[2] ?? null
                ];
            }, $coordinates);

            $distance = $this->calculateDistance($coordinates);
            $duration = $this->estimateDuration($distance);

            return [
                'coordinates' => $formattedCoordinates,
                'name' => $name ?: 'Imported Route',
                'description' => $description,
                'waypoints' => $waypoints,
                'distance' => $distance,
                'distance_km' => round($distance / 1000, 2),
                'duration' => $duration,
                'duration_min' => round($duration / 60, 2),
            ];
        } catch (\Exception $e) {
            Log::error('GPX regex fallback parsing error', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Calculate total distance from coordinates
     * 
     * @param array $coordinates Array of [lat, lon] or [lat, lon, ele]
     * @return float Distance in meters
     */
    protected function calculateDistance($coordinates)
    {
        if (count($coordinates) < 2) {
            return 0;
        }

        $totalDistance = 0;
        for ($i = 0; $i < count($coordinates) - 1; $i++) {
            $coord1 = $coordinates[$i];
            $coord2 = $coordinates[$i + 1];
            
            $totalDistance += $this->haversineDistance(
                $coord1[0], $coord1[1],
                $coord2[0], $coord2[1]
            );
        }

        return $totalDistance;
    }

    /**
     * Calculate distance between two points using Haversine formula
     * 
     * @param float $lat1
     * @param float $lon1
     * @param float $lat2
     * @param float $lon2
     * @return float Distance in meters
     */
    protected function haversineDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Estimate duration based on distance
     * Assumes average speed of 60 km/h
     * 
     * @param float $distance Distance in meters
     * @return int Duration in seconds
     */
    protected function estimateDuration($distance)
    {
        $averageSpeedKmh = 60; // km/h
        $averageSpeedMs = ($averageSpeedKmh * 1000) / 3600; // m/s
        return (int)($distance / $averageSpeedMs);
    }
}

