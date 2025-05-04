<?php
// Artisan file check script
header('Content-Type: application/json');

// Define paths to check
$paths = [
    '/app/artisan',
    __DIR__ . '/../artisan',
    getcwd() . '/artisan',
    '/var/www/html/artisan',
    '/var/www/artisan'
];

$results = [];

foreach ($paths as $path) {
    $exists = file_exists($path);
    $isReadable = $exists ? is_readable($path) : false;
    $isExecutable = $exists ? is_executable($path) : false;
    $permissions = $exists ? substr(sprintf('%o', fileperms($path)), -4) : 'N/A';
    
    $results[$path] = [
        'exists' => $exists,
        'readable' => $isReadable,
        'executable' => $isExecutable,
        'permissions' => $permissions
    ];
}

// Check for Laravel installation
$laravelInstalled = file_exists(__DIR__ . '/../vendor/laravel/framework/src/Illuminate/Foundation/Application.php');

// List files in the root directory
$rootDir = __DIR__ . '/..';
$rootFiles = scandir($rootDir);

// List files in the vendor directory if it exists
$vendorFiles = [];
if (is_dir($rootDir . '/vendor')) {
    $vendorFiles = scandir($rootDir . '/vendor');
}

echo json_encode([
    'status' => array_reduce($paths, function($carry, $path) use ($results) {
        return $carry || $results[$path]['exists'];
    }, false) ? 'ok' : 'error',
    'message' => array_reduce($paths, function($carry, $path) use ($results) {
        return $carry || $results[$path]['exists'];
    }, false) ? 'Artisan file found in at least one location' : 'Artisan file not found in any location',
    'artisan_paths' => $results,
    'laravel_installed' => $laravelInstalled,
    'root_directory' => $rootDir,
    'root_files' => $rootFiles,
    'vendor_files' => $vendorFiles,
    'current_directory' => getcwd(),
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown'
], JSON_PRETTY_PRINT);
