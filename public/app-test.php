<?php
// Application test file
header('Content-Type: text/plain');

echo "ScenicRoutes Application Test\n";
echo "===========================\n\n";

// Basic PHP check
echo "PHP Version: " . phpversion() . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Not available') . "\n";
echo "Current Script: " . __FILE__ . "\n\n";

// Check Laravel autoloader
echo "Checking Laravel autoloader...\n";
$autoloaderPath = dirname(__DIR__) . '/vendor/autoload.php';
if (file_exists($autoloaderPath)) {
    echo "Autoloader found at: $autoloaderPath\n";
    try {
        require $autoloaderPath;
        echo "Autoloader loaded successfully\n";
    } catch (Exception $e) {
        echo "Error loading autoloader: " . $e->getMessage() . "\n";
    }
} else {
    echo "Autoloader not found at: $autoloaderPath\n";
}

// Check Laravel bootstrap
echo "\nChecking Laravel bootstrap...\n";
$bootstrapPath = dirname(__DIR__) . '/bootstrap/app.php';
if (file_exists($bootstrapPath)) {
    echo "Bootstrap found at: $bootstrapPath\n";
    try {
        $app = require_once $bootstrapPath;
        echo "Bootstrap loaded successfully\n";
        echo "Laravel version: " . $app->version() . "\n";
    } catch (Exception $e) {
        echo "Error loading bootstrap: " . $e->getMessage() . "\n";
    }
} else {
    echo "Bootstrap not found at: $bootstrapPath\n";
}

// Check environment
echo "\nEnvironment Variables:\n";
$envVars = [
    'APP_ENV', 'APP_DEBUG', 'APP_URL',
    'SESSION_DRIVER', 'SESSION_DOMAIN', 'SANCTUM_STATEFUL_DOMAINS',
    'NIXPACKS_PHP_ROOT_DIR', 'NIXPACKS_PHP_FALLBACK_PATH',
    'WEB_DOCUMENT_ROOT'
];

// Only show non-sensitive environment variables
foreach ($envVars as $var) {
    $value = getenv($var);
    echo "$var: " . ($value ?: 'Not set') . "\n";
}

// Just indicate database is configured without showing details
echo "Database configured: " . (getenv('DB_CONNECTION') ? 'Yes' : 'No') . "\n";

echo "\nTest completed at " . date('Y-m-d H:i:s') . "\n";
