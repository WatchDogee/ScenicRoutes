<?php

// Simple script to test the ElevationService directly

require __DIR__ . '/vendor/autoload.php';

use App\Services\ElevationService;
use Illuminate\Support\Facades\Log;

// Create a new instance of the ElevationService
$elevationService = new ElevationService();

// Test coordinates (sample road)
$coordinates = [
    [57.1, 27.1],  // Start point
    [57.15, 27.15],
    [57.2, 27.2],
    [57.25, 27.25],
    [57.3, 27.3],  // End point
];

echo "Testing ElevationService with sample road coordinates...\n";
echo "Coordinates: " . json_encode($coordinates) . "\n\n";

// Get elevations
echo "Fetching elevations...\n";
$elevations = $elevationService->getElevations($coordinates);

if ($elevations) {
    echo "Elevations received: " . json_encode($elevations) . "\n\n";
    
    // Calculate elevation statistics
    echo "Calculating elevation statistics...\n";
    $stats = $elevationService->calculateElevationStats($elevations);
    
    echo "Elevation statistics:\n";
    echo "Elevation Gain: " . $stats['elevation_gain'] . " meters\n";
    echo "Elevation Loss: " . $stats['elevation_loss'] . " meters\n";
    echo "Max Elevation: " . $stats['max_elevation'] . " meters\n";
    echo "Min Elevation: " . $stats['min_elevation'] . " meters\n";
} else {
    echo "Failed to fetch elevations.\n";
}
