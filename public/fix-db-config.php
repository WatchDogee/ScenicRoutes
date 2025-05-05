<?php
// Database Configuration Fix Script
// This script fixes database connection issues in CapRover deployments

header('Content-Type: text/plain');

echo "=== ScenicRoutes Database Configuration Fix ===\n\n";

// Get the current domain
$domain = $_SERVER['HTTP_HOST'] ?? 'localhost';
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$appUrl = "$protocol://$domain";

echo "Detected domain: $domain\n";
echo "App URL: $appUrl\n\n";

// Update .env file
echo "Checking database configuration...\n";
$envPath = __DIR__ . '/../.env';
$envUpdated = false;

if (file_exists($envPath) && is_writable($envPath)) {
    $envContent = file_get_contents($envPath);

    // Check if DB_HOST is set to 'db'
    if (preg_match('/^DB_HOST=db$/m', $envContent)) {
        // Update DB_HOST to the CapRover database host
        $envContent = preg_replace('/^DB_HOST=db$/m', "DB_HOST=srv-captain--scenic-routes-db", $envContent, -1, $count);
        if ($count > 0) {
            echo "- Updated DB_HOST from 'db' to 'srv-captain--scenic-routes-db'\n";
            $envUpdated = true;
        }
    } else {
        echo "- DB_HOST is not set to 'db', current value: ";
        preg_match('/^DB_HOST=(.*)$/m', $envContent, $matches);
        echo isset($matches[1]) ? $matches[1] : "not found\n";
    }

    // Update APP_URL to match the actual domain
    if (preg_match('/^APP_URL=http:\/\/localhost:3000$/m', $envContent) ||
        preg_match('/^APP_URL=http:\/\/localhost:8000$/m', $envContent)) {
        // Update APP_URL to the actual domain
        $envContent = preg_replace('/^APP_URL=http:\/\/localhost:[0-9]+$/m', "APP_URL=https://scenic-routes.caprover-root.scenic-routes.live", $envContent, -1, $count);
        if ($count > 0) {
            echo "- Updated APP_URL to 'https://scenic-routes.caprover-root.scenic-routes.live'\n";
            $envUpdated = true;
        }
    }

    // Check DB_DATABASE
    if (preg_match('/^DB_DATABASE=ScenicRoutesDB$/m', $envContent)) {
        // Update DB_DATABASE to the CapRover database name
        $envContent = preg_replace('/^DB_DATABASE=ScenicRoutesDB$/m', "DB_DATABASE=scenic_routes", $envContent, -1, $count);
        if ($count > 0) {
            echo "- Updated DB_DATABASE from 'ScenicRoutesDB' to 'scenic_routes'\n";
            $envUpdated = true;
        }
    }

    // Check DB_USERNAME
    if (preg_match('/^DB_USERNAME=root$/m', $envContent)) {
        // Update DB_USERNAME if needed
        echo "- DB_USERNAME is set to 'root', which may be correct for your CapRover setup\n";
    }

    // Update SESSION_DOMAIN
    if (preg_match('/^SESSION_DOMAIN=localhost$/m', $envContent)) {
        // Update SESSION_DOMAIN to the actual domain
        $envContent = preg_replace('/^SESSION_DOMAIN=localhost$/m', "SESSION_DOMAIN=.scenic-routes.live", $envContent, -1, $count);
        if ($count > 0) {
            echo "- Updated SESSION_DOMAIN from 'localhost' to '.scenic-routes.live'\n";
            $envUpdated = true;
        }
    }

    // Update SANCTUM_STATEFUL_DOMAINS
    if (preg_match('/^SANCTUM_STATEFUL_DOMAINS=.*localhost.*$/m', $envContent)) {
        // Update SANCTUM_STATEFUL_DOMAINS to include the actual domain
        $envContent = preg_replace('/^SANCTUM_STATEFUL_DOMAINS=.*$/m', "SANCTUM_STATEFUL_DOMAINS=scenic-routes.caprover-root.scenic-routes.live,caprover-root.scenic-routes.live,scenic-routes.live", $envContent, -1, $count);
        if ($count > 0) {
            echo "- Updated SANCTUM_STATEFUL_DOMAINS to include your domains\n";
            $envUpdated = true;
        }
    }

    if ($envUpdated) {
        file_put_contents($envPath, $envContent);
        echo "Successfully updated database configuration in .env file\n";
    } else {
        echo "No changes needed in database configuration\n";
    }
} else {
    echo "Warning: .env file not found or not writable\n";
}

echo "\n";

// Test database connection
echo "Testing database connection...\n";
try {
    require_once __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    $dbConfig = config('database.connections.' . config('database.default'));
    echo "Current database configuration:\n";
    echo "- Connection: " . config('database.default') . "\n";
    echo "- Host: " . $dbConfig['host'] . "\n";
    echo "- Port: " . $dbConfig['port'] . "\n";
    echo "- Database: " . $dbConfig['database'] . "\n";
    echo "- Username: " . $dbConfig['username'] . "\n";

    // Try to connect to the database
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        echo "Database connection successful!\n";
    } catch (\Exception $e) {
        echo "Database connection failed: " . $e->getMessage() . "\n";
        echo "\nPossible solutions:\n";
        echo "1. Check that the database service is running in CapRover\n";
        echo "2. Verify that the database credentials are correct\n";
        echo "3. Make sure the database host name is correct (should be srv-captain--scenic-routes-db)\n";
        echo "4. Check if the database exists and is accessible\n";
    }

    // Clear config cache
    $kernel->call('config:clear');
    echo "Cleared configuration cache\n";
} catch (\Exception $e) {
    echo "Error testing database connection: " . $e->getMessage() . "\n";
}

echo "\n=== Database Configuration Check Complete ===\n";
echo "If you made changes, you may need to restart your application for them to take effect.\n";
