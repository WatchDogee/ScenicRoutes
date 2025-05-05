<?php
// Script to create the artisan file if it's missing
header('Content-Type: text/plain');

echo "Artisan File Creator\n";
echo "==================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check if artisan exists in parent directory
$artisanPath = $parentDir . '/artisan';
if (file_exists($artisanPath)) {
    echo "Artisan file already exists at: $artisanPath\n";
    echo "Content of existing artisan file:\n";
    echo file_get_contents($artisanPath) . "\n\n";
} else {
    echo "Artisan file does not exist at: $artisanPath\n";
    
    // Create artisan file
    echo "Creating artisan file...\n";
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
    
    if (file_put_contents($artisanPath, $artisanContent)) {
        echo "Artisan file created successfully.\n";
        
        // Make artisan executable
        if (chmod($artisanPath, 0755)) {
            echo "Made artisan file executable.\n";
        } else {
            echo "Failed to make artisan file executable!\n";
        }
    } else {
        echo "Failed to create artisan file!\n";
    }
}

// Check if artisan exists in other common locations
$locations = [
    '/app/artisan',
    '/var/www/html/artisan',
    '/var/www/artisan',
    '/artisan'
];

echo "\nChecking other common locations:\n";
foreach ($locations as $location) {
    if (file_exists($location)) {
        echo "$location: EXISTS\n";
    } else {
        echo "$location: NOT FOUND\n";
        
        // Try to create artisan file in this location
        echo "Trying to create artisan file at: $location\n";
        if (file_put_contents($location, $artisanContent)) {
            echo "Artisan file created successfully at: $location\n";
            
            // Make artisan executable
            if (chmod($location, 0755)) {
                echo "Made artisan file executable.\n";
            } else {
                echo "Failed to make artisan file executable!\n";
            }
        } else {
            echo "Failed to create artisan file at: $location\n";
        }
    }
}

echo "\nCreation process completed at " . date('Y-m-d H:i:s') . "\n";
