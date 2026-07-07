<?php
$url = "http://localhost:8989/route?point=57.1314,27.2658&point=56.9496,24.1052&profile=car&type=json&points_encoded=false";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $data = json_decode($response, true);
    if (isset($data['paths'][0])) {
        $path = $data['paths'][0];
        echo "Has points: " . (isset($path['points']) ? 'YES' : 'NO') . "\n";
        echo "Points type: " . (isset($path['points']) ? gettype($path['points']) : 'N/A') . "\n";
        if (isset($path['points']['coordinates'])) {
            echo "Has coordinates: YES\n";
            echo "Coordinates count: " . count($path['points']['coordinates']) . "\n";
            echo "First coord: " . json_encode($path['points']['coordinates'][0]) . "\n";
        } else {
            echo "Has coordinates: NO\n";
            if (isset($path['points']) && is_array($path['points'])) {
                echo "Points keys: " . implode(', ', array_keys($path['points'])) . "\n";
            }
        }
    } else {
        echo "No paths in response\n";
    }
} else {
    echo "HTTP Error: $httpCode\n";
}
