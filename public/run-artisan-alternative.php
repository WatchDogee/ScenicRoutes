<?php
// Script to run artisan commands using a different approach
header('Content-Type: text/plain');

echo "Alternative Artisan Command Runner\n";
echo "===============================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check if a command was provided
$command = $_GET['command'] ?? '';
if (empty($command)) {
    echo "Error: No command specified\n";
    echo "Usage: run-artisan-alternative.php?command=<artisan-command>\n";
    echo "Example: run-artisan-alternative.php?command=migrate\n";
    exit;
}

// Validate command (basic security check)
if (!preg_match('/^[a-zA-Z0-9:_\-]+$/', $command)) {
    echo "Error: Invalid command format\n";
    exit;
}

// Try to find artisan file
$artisanPaths = [
    $parentDir . '/artisan',
    '/app/artisan',
    '/var/www/html/artisan',
    '/var/www/artisan',
    '/artisan'
];

$artisanPath = null;
foreach ($artisanPaths as $path) {
    if (file_exists($path)) {
        $artisanPath = $path;
        echo "Found artisan file at: $artisanPath\n\n";
        break;
    }
}

if ($artisanPath === null) {
    echo "Error: Artisan file not found in any of the common locations!\n";
    
    // Try to run the command directly using the Laravel application
    echo "\nTrying to run the command directly using the Laravel application...\n";
    
    // Check if bootstrap/app.php exists
    $bootstrapAppPath = $parentDir . '/bootstrap/app.php';
    if (!file_exists($bootstrapAppPath)) {
        echo "Error: bootstrap/app.php not found at: $bootstrapAppPath\n";
        exit;
    }
    
    // Check if vendor/autoload.php exists
    $autoloadPath = $parentDir . '/vendor/autoload.php';
    if (!file_exists($autoloadPath)) {
        echo "Error: vendor/autoload.php not found at: $autoloadPath\n";
        exit;
    }
    
    // Create a temporary artisan file
    $tempArtisanPath = $parentDir . '/temp-artisan.php';
    $artisanContent = <<<'EOD'
#!/usr/bin/env php
<?php

use Illuminate\Foundation\Application;
use Symfony\Component\Console\Input\ArgvInput;

define('LARAVEL_START', microtime(true));

// Register the Composer autoloader...
require __DIR__.'/vendor/autoload.php';

// Bootstrap Laravel and handle the command...
/** @var Application $app */
$app = require_once __DIR__.'/bootstrap/app.php';

$status = $app->handleCommand(new ArgvInput);

exit($status);
EOD;
    
    if (file_put_contents($tempArtisanPath, $artisanContent)) {
        echo "Created temporary artisan file at: $tempArtisanPath\n";
        chmod($tempArtisanPath, 0755);
        $artisanPath = $tempArtisanPath;
    } else {
        echo "Failed to create temporary artisan file!\n";
        exit;
    }
}

// Make artisan executable
chmod($artisanPath, 0755);

// Run the command
echo "Running command: php $artisanPath $command\n\n";
$output = [];
$returnVar = 0;
exec("php $artisanPath $command 2>&1", $output, $returnVar);

echo "Return code: $returnVar\n";
echo "Output:\n";
echo implode("\n", $output) . "\n\n";

// Clean up temporary file if created
if (isset($tempArtisanPath) && file_exists($tempArtisanPath)) {
    unlink($tempArtisanPath);
    echo "Removed temporary artisan file.\n";
}

echo "Command execution completed at " . date('Y-m-d H:i:s') . "\n";
