<?php
// Script to run artisan commands
header('Content-Type: text/plain');

echo "Artisan Commands Runner\n";
echo "=====================\n\n";

// Function to run artisan command
function runArtisanCommand($command) {
    $rootDir = dirname(__DIR__);
    $artisanPath = $rootDir . '/artisan';
    
    echo "Running: php $artisanPath $command\n";
    
    if (!file_exists($artisanPath)) {
        echo "Error: Artisan file not found at $artisanPath\n";
        return false;
    }
    
    // Make artisan executable
    chmod($artisanPath, 0755);
    
    // Run command
    $output = [];
    $returnVar = 0;
    exec("php $artisanPath $command 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
    
    return $returnVar === 0;
}

// Get the project root directory
$rootDir = dirname(__DIR__);
echo "Project root: $rootDir\n";
echo "Artisan path: $rootDir/artisan\n\n";

// Check if artisan exists
if (!file_exists($rootDir . '/artisan')) {
    echo "Error: Artisan file not found!\n";
    exit;
}

// Run essential artisan commands
$commands = [
    'key:generate --force',
    'config:clear',
    'cache:clear',
    'view:clear',
    'route:clear',
    'storage:link',
    'migrate --force'
];

foreach ($commands as $command) {
    runArtisanCommand($command);
}

echo "All commands completed at " . date('Y-m-d H:i:s') . "\n";
