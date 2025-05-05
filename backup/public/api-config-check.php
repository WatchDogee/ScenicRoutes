<?php
// API Configuration Check Script
// This script helps diagnose API URL configuration issues in CapRover deployments

header('Content-Type: text/plain');

echo "=== ScenicRoutes API Configuration Check ===\n\n";

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
    echo "SESSION_DOMAIN: " . config('session.domain') . "\n";
    echo "SANCTUM_STATEFUL_DOMAINS: " . implode(', ', config('sanctum.stateful')) . "\n";
    echo "CORS Allowed Origins: " . implode(', ', config('cors.allowed_origins')) . "\n";
    echo "CORS Supports Credentials: " . (config('cors.supports_credentials') ? 'Yes' : 'No') . "\n";
} catch (Exception $e) {
    echo "Error loading Laravel configuration: " . $e->getMessage() . "\n";
}
echo "\n";

// Check frontend configuration files
echo "Frontend Configuration:\n";

// Check bootstrap.js
$bootstrapPath = __DIR__ . '/../resources/js/bootstrap.js';
if (file_exists($bootstrapPath)) {
    echo "bootstrap.js exists\n";
    $content = file_get_contents($bootstrapPath);
    if (preg_match('/window\.axios\.defaults\.baseURL\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
        echo "baseURL in bootstrap.js: " . $matches[1] . "\n";
    } else {
        echo "baseURL in bootstrap.js: Not found or using dynamic configuration\n";
    }
} else {
    echo "bootstrap.js not found\n";
}

// Check apiClient.js
$apiClientPath = __DIR__ . '/../resources/js/utils/apiClient.js';
if (file_exists($apiClientPath)) {
    echo "apiClient.js exists\n";
    $content = file_get_contents($apiClientPath);
    if (preg_match('/baseURL:\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
        echo "baseURL in apiClient.js: " . $matches[1] . "\n";
    } else {
        echo "baseURL in apiClient.js: Not found or using dynamic configuration\n";
    }
} else {
    echo "apiClient.js not found\n";
}

echo "\n=== End of Configuration Check ===\n";
