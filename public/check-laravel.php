<?php
// Script to check Laravel installation
header('Content-Type: text/plain');

echo "Laravel Installation Check\n";
echo "========================\n\n";

// Get the project root directory
$rootDir = dirname(__DIR__);
echo "Project root: $rootDir\n\n";

// Check for Laravel framework
$laravelPath = $rootDir . '/vendor/laravel/framework/src/Illuminate/Foundation/Application.php';
if (file_exists($laravelPath)) {
    echo "Laravel framework found at:\n$laravelPath\n\n";
} else {
    echo "Laravel framework NOT found at:\n$laravelPath\n\n";
    
    // Check if vendor directory exists
    if (!is_dir($rootDir . '/vendor')) {
        echo "Vendor directory does not exist. Composer dependencies may not be installed.\n\n";
    } else {
        echo "Vendor directory exists, but Laravel framework not found. Composer dependencies may be incomplete.\n\n";
    }
}

// Check for artisan file
$artisanPath = $rootDir . '/artisan';
if (file_exists($artisanPath)) {
    echo "Artisan file found at:\n$artisanPath\n\n";
    
    // Check if artisan is executable
    $isExecutable = is_executable($artisanPath);
    echo "Artisan is executable: " . ($isExecutable ? "Yes" : "No") . "\n";
    
    // Make artisan executable if it's not
    if (!$isExecutable) {
        echo "Making artisan executable...\n";
        if (chmod($artisanPath, 0755)) {
            echo "Successfully made artisan executable.\n";
        } else {
            echo "Failed to make artisan executable!\n";
        }
    }
    
    echo "\n";
} else {
    echo "Artisan file NOT found at:\n$artisanPath\n\n";
}

// Check for composer.json
$composerJsonPath = $rootDir . '/composer.json';
if (file_exists($composerJsonPath)) {
    echo "composer.json found at:\n$composerJsonPath\n\n";
    
    // Parse composer.json
    $composerJson = json_decode(file_get_contents($composerJsonPath), true);
    if ($composerJson) {
        echo "Laravel version requirement: " . ($composerJson['require']['laravel/framework'] ?? 'not specified') . "\n\n";
    }
} else {
    echo "composer.json NOT found at:\n$composerJsonPath\n\n";
}

// Check for key Laravel directories
$directories = [
    'app' => $rootDir . '/app',
    'bootstrap' => $rootDir . '/bootstrap',
    'config' => $rootDir . '/config',
    'database' => $rootDir . '/database',
    'public' => $rootDir . '/public',
    'resources' => $rootDir . '/resources',
    'routes' => $rootDir . '/routes',
    'storage' => $rootDir . '/storage',
    'tests' => $rootDir . '/tests',
    'vendor' => $rootDir . '/vendor'
];

echo "Laravel Directory Structure:\n";
foreach ($directories as $name => $path) {
    $exists = is_dir($path);
    echo "$name: " . ($exists ? "Found" : "Missing") . "\n";
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
