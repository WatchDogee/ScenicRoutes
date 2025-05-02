<?php

// Simple script to test the elevation APIs directly

// Test coordinates (sample points)
$coordinates = [
    [57.1, 27.1],  // Latvia
    [46.8, 8.2],   // Switzerland (mountainous)
    [51.5, -0.1],  // London
    [40.7, -74.0], // New York
    [37.8, -122.4] // San Francisco
];

// Format coordinates for Open-Elevation API
$locations = implode('|', array_map(function($point) {
    return $point[0] . ',' . $point[1];
}, $coordinates));

echo "Testing Open-Elevation API...\n";
echo "Coordinates: $locations\n";

// Test Open-Elevation API
$openElevationUrl = "https://api.open-elevation.com/api/v1/lookup?locations=$locations";
echo "URL: $openElevationUrl\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $openElevationUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
if ($httpCode == 200) {
    $data = json_decode($response, true);
    echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "Error response: $response\n";
}

echo "\n\nTesting OpenTopoData API...\n";

// Test OpenTopoData API
$openTopoDataUrl = "https://api.opentopodata.org/v1/srtm30m?locations=$locations";
echo "URL: $openTopoDataUrl\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $openTopoDataUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
if ($httpCode == 200) {
    $data = json_decode($response, true);
    echo "Response: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "Error response: $response\n";
}
