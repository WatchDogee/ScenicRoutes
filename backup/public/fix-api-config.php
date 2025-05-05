<?php
// API Configuration Fix Script
// This script fixes API URL configuration issues in CapRover deployments

header('Content-Type: text/plain');

echo "=== ScenicRoutes API Configuration Fix ===\n\n";

// Get the current domain
$domain = $_SERVER['HTTP_HOST'] ?? 'localhost';
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$appUrl = "$protocol://$domain";

echo "Detected domain: $domain\n";
echo "App URL: $appUrl\n\n";

// Update .env file
echo "Updating .env file...\n";
$envPath = __DIR__ . '/../.env';
$envUpdated = false;

if (file_exists($envPath) && is_writable($envPath)) {
    $envContent = file_get_contents($envPath);
    
    // Update APP_URL
    $envContent = preg_replace('/^APP_URL=.*$/m', "APP_URL=$appUrl", $envContent, -1, $count);
    if ($count > 0) {
        echo "- Updated APP_URL in .env\n";
        $envUpdated = true;
    }
    
    // Update SESSION_DOMAIN
    if (preg_match('/^SESSION_DOMAIN=.*$/m', $envContent)) {
        $envContent = preg_replace('/^SESSION_DOMAIN=.*$/m', "SESSION_DOMAIN=.$domain", $envContent, -1, $count);
        if ($count > 0) {
            echo "- Updated SESSION_DOMAIN in .env\n";
            $envUpdated = true;
        }
    } else {
        $envContent .= "\nSESSION_DOMAIN=.$domain\n";
        echo "- Added SESSION_DOMAIN to .env\n";
        $envUpdated = true;
    }
    
    // Update SANCTUM_STATEFUL_DOMAINS
    if (preg_match('/^SANCTUM_STATEFUL_DOMAINS=.*$/m', $envContent)) {
        $envContent = preg_replace('/^SANCTUM_STATEFUL_DOMAINS=.*$/m', "SANCTUM_STATEFUL_DOMAINS=$domain", $envContent, -1, $count);
        if ($count > 0) {
            echo "- Updated SANCTUM_STATEFUL_DOMAINS in .env\n";
            $envUpdated = true;
        }
    } else {
        $envContent .= "SANCTUM_STATEFUL_DOMAINS=$domain\n";
        echo "- Added SANCTUM_STATEFUL_DOMAINS to .env\n";
        $envUpdated = true;
    }
    
    if ($envUpdated) {
        file_put_contents($envPath, $envContent);
        echo "Successfully updated .env file\n";
    } else {
        echo "No changes needed in .env file\n";
    }
} else {
    echo "Warning: .env file not found or not writable\n";
}

echo "\n";

// Update bootstrap.js
echo "Updating bootstrap.js...\n";
$bootstrapPath = __DIR__ . '/../resources/js/bootstrap.js';
$bootstrapUpdated = false;

if (file_exists($bootstrapPath) && is_writable($bootstrapPath)) {
    $content = file_get_contents($bootstrapPath);
    
    // Check if it's using the old hardcoded localhost URL
    if (strpos($content, "window.axios.defaults.baseURL = 'http://localhost:8000'") !== false) {
        // Replace with dynamic URL detection
        $newCode = <<<'EOD'
window.axios.defaults.withCredentials = true; // Ensure cookies are sent
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';

// Dynamically determine the base URL
const getBaseUrl = () => {
    // In production, use the current origin
    if (window.location.hostname !== 'localhost') {
        return window.location.origin;
    }
    // In development, use localhost:8000
    return 'http://localhost:8000';
};

window.axios.defaults.baseURL = getBaseUrl();
EOD;
        
        $content = str_replace(
            "window.axios.defaults.withCredentials = true; // Ensure cookies are sent\nwindow.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';\nwindow.axios.defaults.headers.common['Accept'] = 'application/json';\nwindow.axios.defaults.baseURL = 'http://localhost:8000';",
            $newCode,
            $content
        );
        
        file_put_contents($bootstrapPath, $content);
        echo "- Updated bootstrap.js with dynamic URL detection\n";
        $bootstrapUpdated = true;
    } else {
        echo "- bootstrap.js already using dynamic configuration\n";
    }
} else {
    echo "Warning: bootstrap.js not found or not writable\n";
}

echo "\n";

// Update apiClient.js
echo "Updating apiClient.js...\n";
$apiClientPath = __DIR__ . '/../resources/js/utils/apiClient.js';
$apiClientUpdated = false;

if (file_exists($apiClientPath) && is_writable($apiClientPath)) {
    $content = file_get_contents($apiClientPath);
    
    // Check if it's using the old relative URL
    if (strpos($content, "baseURL: '/api'") !== false) {
        // Replace with dynamic URL detection
        $oldCode = <<<'EOD'
// Create axios instance with default config
const apiClient = axios.create({
    baseURL: '/api', // This is already prepended, so don't add /api in the URLs
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
    withCredentials: true, // Important for cookies
});
EOD;
        
        $newCode = <<<'EOD'
// Dynamically determine the base URL
const getApiBaseUrl = () => {
    // In production, use the current origin + /api
    if (window.location.hostname !== 'localhost') {
        return `${window.location.origin}/api`;
    }
    // In development, use localhost:8000/api
    return 'http://localhost:8000/api';
};

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
    withCredentials: true, // Important for cookies
});
EOD;
        
        $content = str_replace($oldCode, $newCode, $content);
        file_put_contents($apiClientPath, $content);
        echo "- Updated apiClient.js with dynamic URL detection\n";
        $apiClientUpdated = true;
    } else {
        echo "- apiClient.js already using dynamic configuration\n";
    }
} else {
    echo "Warning: apiClient.js not found or not writable\n";
}

echo "\n";

// Clear Laravel cache
echo "Clearing Laravel cache...\n";
try {
    require_once __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    
    $kernel->call('config:clear');
    echo "- Cleared config cache\n";
    
    $kernel->call('route:clear');
    echo "- Cleared route cache\n";
    
    $kernel->call('view:clear');
    echo "- Cleared view cache\n";
    
    $kernel->call('cache:clear');
    echo "- Cleared application cache\n";
} catch (Exception $e) {
    echo "Error clearing cache: " . $e->getMessage() . "\n";
}

echo "\n=== Configuration Fix Complete ===\n";
echo "Please rebuild your frontend assets if needed.\n";
echo "You may need to restart your application for all changes to take effect.\n";
