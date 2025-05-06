<?php
// Enhanced health check file for Coolify deployment
header('Content-Type: text/plain');

echo "ScenicRoutes Health Check\n";
echo "======================\n\n";

// Basic PHP check
echo "PHP Version: " . phpversion() . "\n";
echo "Server Time: " . date('Y-m-d H:i:s') . "\n";

// Check if we're in a Docker container
$inDocker = file_exists('/.dockerenv');
echo "Running in Docker container: " . ($inDocker ? 'Yes' : 'No') . "\n\n";

// Check document root
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Not available') . "\n";
echo "Current Script: " . __FILE__ . "\n";
echo "Script Filename: " . ($_SERVER['SCRIPT_FILENAME'] ?? 'Not available') . "\n\n";

// Check environment
echo "Environment: " . (getenv('APP_ENV') ?: 'Not set') . "\n";
echo "Debug Mode: " . (getenv('APP_DEBUG') ? 'Enabled' : 'Disabled') . "\n";
echo "App URL: " . (getenv('APP_URL') ?: 'Not set') . "\n\n";

// Check Nixpacks settings
echo "Nixpacks Settings:\n";
echo "NIXPACKS_PHP_ROOT_DIR: " . (getenv('NIXPACKS_PHP_ROOT_DIR') ?: 'Not set') . "\n";
echo "NIXPACKS_PHP_FALLBACK_PATH: " . (getenv('NIXPACKS_PHP_FALLBACK_PATH') ?: 'Not set') . "\n";
echo "WEB_DOCUMENT_ROOT: " . (getenv('WEB_DOCUMENT_ROOT') ?: 'Not set') . "\n\n";

// Check database connection
echo "Database Settings:\n";
echo "DB_CONNECTION: " . (getenv('DB_CONNECTION') ?: 'Not set') . "\n";
echo "DB_HOST: " . (getenv('DB_HOST') ?: 'Not set') . "\n";
echo "DB_PORT: " . (getenv('DB_PORT') ?: 'Not set') . "\n";
echo "DB_DATABASE: " . (getenv('DB_DATABASE') ?: 'Not set') . "\n";
echo "DB_USERNAME: " . (getenv('DB_USERNAME') ?: 'Not set') . "\n";

// Try to connect to the database
if (getenv('DB_CONNECTION') && getenv('DB_HOST') && getenv('DB_PORT') && getenv('DB_DATABASE') && getenv('DB_USERNAME')) {
    try {
        $dsn = getenv('DB_CONNECTION') . ':host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE');
        $pdo = new PDO($dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'));
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "Database Connection: Success\n\n";
    } catch (PDOException $e) {
        echo "Database Connection: Failed - " . $e->getMessage() . "\n\n";
    }
} else {
    echo "Database Connection: Not configured\n\n";
}

// Check session and Sanctum configuration
echo "Session & Sanctum Settings:\n";
echo "SESSION_DOMAIN: " . (getenv('SESSION_DOMAIN') ?: 'Not set') . "\n";
echo "SANCTUM_STATEFUL_DOMAINS: " . (getenv('SANCTUM_STATEFUL_DOMAINS') ?: 'Not set') . "\n\n";

// Check if Laravel is working
if (file_exists(__DIR__ . '/../artisan')) {
    echo "Laravel: Detected\n";
} else {
    echo "Laravel: Not detected\n";
}

// Check if storage is writable
if (is_writable(__DIR__ . '/../storage')) {
    echo "Storage Directory: Writable\n";
} else {
    echo "Storage Directory: Not writable\n";
}

// Check if bootstrap/cache is writable
if (is_writable(__DIR__ . '/../bootstrap/cache')) {
    echo "Bootstrap Cache Directory: Writable\n";
} else {
    echo "Bootstrap Cache Directory: Not writable\n";
}

// Check if .env file exists
if (file_exists(__DIR__ . '/../.env')) {
    echo ".env File: Exists\n";
} else {
    echo ".env File: Missing\n";
}

// Check if .env.coolify file exists
if (file_exists(__DIR__ . '/../.env.coolify')) {
    echo ".env.coolify File: Exists\n";
} else {
    echo ".env.coolify File: Missing\n";
}

// Check Nginx configuration files
$nginxConfigPaths = [
    '/etc/nginx/conf.d/default.conf',
    '/etc/nginx/sites-enabled/default',
    '/etc/nginx/nginx.conf',
    '/opt/docker/etc/nginx/vhost.conf'
];

echo "\nNginx Configuration Files:\n";
foreach ($nginxConfigPaths as $path) {
    echo "$path: " . (file_exists($path) ? "Exists" : "Not found") . "\n";
}

echo "\nStatus: OK\n";
echo "Health check completed at " . date('Y-m-d H:i:s') . "\n";
