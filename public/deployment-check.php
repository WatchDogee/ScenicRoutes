<?php
// Deployment Check Script
// This script helps verify the deployment status of your Laravel application

header('Content-Type: text/plain');

echo "=== ScenicRoutes Deployment Check ===\n\n";

// Check server information
echo "Server Information:\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "Server Name: " . ($_SERVER['SERVER_NAME'] ?? 'unknown') . "\n";
echo "HTTP Host: " . ($_SERVER['HTTP_HOST'] ?? 'unknown') . "\n";
echo "Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'unknown') . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'unknown') . "\n";
echo "Current Directory: " . getcwd() . "\n\n";

// Check environment variables
echo "Environment Variables:\n";
$importantVars = [
    'APP_ENV', 'APP_DEBUG', 'APP_URL', 
    'DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME',
    'SESSION_DRIVER', 'SESSION_DOMAIN', 'SANCTUM_STATEFUL_DOMAINS'
];

foreach ($importantVars as $var) {
    $value = getenv($var);
    if ($value !== false) {
        if (in_array($var, ['DB_PASSWORD'])) {
            echo "$var: [HIDDEN]\n";
        } else {
            echo "$var: $value\n";
        }
    } else {
        echo "$var: Not set\n";
    }
}
echo "\n";

// Check Laravel configuration
echo "Laravel Configuration:\n";
try {
    require_once __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    
    echo "APP_URL: " . config('app.url') . "\n";
    echo "SESSION_DRIVER: " . config('session.driver') . "\n";
    echo "SESSION_DOMAIN: " . config('session.domain') . "\n";
    echo "SANCTUM_STATEFUL_DOMAINS: " . implode(', ', config('sanctum.stateful')) . "\n";
    echo "CORS Allowed Origins: " . implode(', ', config('cors.allowed_origins')) . "\n";
    echo "CORS Supports Credentials: " . (config('cors.supports_credentials') ? 'Yes' : 'No') . "\n";
} catch (Exception $e) {
    echo "Error loading Laravel configuration: " . $e->getMessage() . "\n";
}
echo "\n";

// Check database connection
echo "Database Connection:\n";
try {
    if (isset($app)) {
        $dbConfig = config('database.connections.' . config('database.default'));
        echo "Connection: " . config('database.default') . "\n";
        echo "Host: " . $dbConfig['host'] . "\n";
        echo "Port: " . $dbConfig['port'] . "\n";
        echo "Database: " . $dbConfig['database'] . "\n";
        echo "Username: " . $dbConfig['username'] . "\n";
        
        try {
            \Illuminate\Support\Facades\DB::connection()->getPdo();
            echo "Status: Connected successfully\n";
            
            // Check migrations
            $migrations = \Illuminate\Support\Facades\DB::select('SELECT migration FROM migrations ORDER BY batch DESC, migration ASC');
            echo "Migrations: " . count($migrations) . " migrations applied\n";
            echo "Latest migrations:\n";
            $count = 0;
            foreach ($migrations as $migration) {
                echo "- " . $migration->migration . "\n";
                $count++;
                if ($count >= 5) break;
            }
            
            // Check users table
            try {
                $userCount = \Illuminate\Support\Facades\DB::table('users')->count();
                echo "Users: $userCount users in database\n";
            } catch (Exception $e) {
                echo "Users table check failed: " . $e->getMessage() . "\n";
            }
        } catch (Exception $e) {
            echo "Status: Connection failed - " . $e->getMessage() . "\n";
        }
    }
} catch (Exception $e) {
    echo "Database check failed: " . $e->getMessage() . "\n";
}
echo "\n";

// Check storage and cache directories
echo "Storage and Cache:\n";
$directories = [
    'storage/app' => is_writable('../storage/app'),
    'storage/framework' => is_writable('../storage/framework'),
    'storage/logs' => is_writable('../storage/logs'),
    'bootstrap/cache' => is_writable('../bootstrap/cache')
];

foreach ($directories as $dir => $writable) {
    echo "$dir: " . ($writable ? 'Writable' : 'Not writable') . "\n";
}
echo "\n";

// Check frontend configuration
echo "Frontend Configuration:\n";
$bootstrapPath = __DIR__ . '/../resources/js/bootstrap.js';
if (file_exists($bootstrapPath)) {
    echo "bootstrap.js exists\n";
    $content = file_get_contents($bootstrapPath);
    if (preg_match('/window\.axios\.defaults\.baseURL\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
        echo "API URL: " . $matches[1] . "\n";
    } else {
        echo "API URL: Not found or using dynamic configuration\n";
    }
} else {
    echo "bootstrap.js not found\n";
}
echo "\n";

echo "=== Deployment Check Complete ===\n";
echo "If you're experiencing issues, please check the Laravel logs for more details.\n";
