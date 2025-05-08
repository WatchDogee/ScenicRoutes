<?php

// Simple script to test OpenWeatherMap API key
echo "Testing OpenWeatherMap API key...\n";

// Get API key from .env file
$envFile = file_get_contents('.env');
preg_match('/OPENWEATHERMAP_API_KEY=([^\n]+)/', $envFile, $matches);
$apiKey = $matches[1] ?? null;

if (empty($apiKey)) {
    echo "ERROR: No API key found in .env file.\n";
    exit(1);
}

echo "API key found: " . substr($apiKey, 0, 4) . "..." . substr($apiKey, -4) . "\n";

// Test coordinates (Riga, Latvia)
$lat = 56.9496;
$lon = 24.1052;
$units = 'metric';

echo "Testing with coordinates: {$lat}, {$lon}\n";

// Make API request
$url = "https://api.openweathermap.org/data/2.5/weather?lat={$lat}&lon={$lon}&units={$units}&appid={$apiKey}";
echo "Making request to: " . str_replace($apiKey, "***API_KEY***", $url) . "\n";

// Use cURL to make the request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Response status code: {$httpCode}\n";

if ($httpCode === 200) {
    $data = json_decode($response, true);
    echo "API call successful!\n";
    echo "Weather: " . ($data['weather'][0]['main'] ?? 'Unknown') . "\n";
    echo "Description: " . ($data['weather'][0]['description'] ?? 'Unknown') . "\n";
    echo "Temperature: " . ($data['main']['temp'] ?? 'Unknown') . "°C\n";
    echo "Location: " . ($data['name'] ?? 'Unknown') . ", " . ($data['sys']['country'] ?? 'Unknown') . "\n";
    
    echo "\nFull response:\n";
    echo json_encode($data, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "API call failed with status code: {$httpCode}\n";
    echo "Response body: {$response}\n";
}
