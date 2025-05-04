#!/bin/bash
set -e

# Display current directory and environment
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la

# Create necessary directories
mkdir -p /app/public
mkdir -p /app/storage/logs
mkdir -p /app/storage/framework/sessions
mkdir -p /app/storage/framework/views
mkdir -p /app/storage/framework/cache
mkdir -p /app/bootstrap/cache

# Set permissions
chmod -R 777 /app/storage
chmod -R 777 /app/bootstrap/cache

# Create log file
touch /app/storage/logs/laravel.log
chmod 666 /app/storage/logs/laravel.log

# Copy environment file
if [ -f "/app/.env.coolify" ]; then
    cp /app/.env.coolify /app/.env
    echo "Copied .env.coolify to .env"
else
    echo "Warning: .env.coolify not found"
    if [ -f "/app/.env.example" ]; then
        cp /app/.env.example /app/.env
        echo "Copied .env.example to .env instead"
    fi
fi

# Create artisan file
cat > /app/artisan << 'EOL'
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
EOL

# Make artisan executable
chmod +x /app/artisan

# Create index.php file
cat > /app/public/index.php << 'EOL'
<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| Check If The Application Is Under Maintenance
|--------------------------------------------------------------------------
|
| If the application is in maintenance / demo mode via the "down" command
| we will load this file so that any pre-rendered content can be shown
| instead of starting the framework, which could cause an exception.
|
*/

if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

/*
|--------------------------------------------------------------------------
| Register The Auto Loader
|--------------------------------------------------------------------------
|
| Composer provides a convenient, automatically generated class loader for
| this application. We just need to utilize it! We'll simply require it
| into the script here so we don't need to manually load our classes.
|
*/

require __DIR__.'/../vendor/autoload.php';

/*
|--------------------------------------------------------------------------
| Run The Application
|--------------------------------------------------------------------------
|
| Once we have the application, we can handle the incoming request using
| the application's HTTP kernel. Then, we will send the response back
| to this client's browser, allowing them to enjoy our application.
|
*/

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
EOL

# Create health check file
cat > /app/public/health-check.php << 'EOL'
<?php
// Health check script for Coolify
header('Content-Type: application/json');
$response = [
    'status' => 'ok',
    'timestamp' => date('Y-m-d H:i:s'),
    'message' => 'Application is running',
    'checks' => []
];

// Check if we're in a Docker container
$inDocker = file_exists('/.dockerenv');
$response['checks']['docker'] = [
    'status' => 'ok',
    'message' => 'Running in Docker: ' . ($inDocker ? 'Yes' : 'No')
];

// Check current directory
$currentDir = getcwd();
$response['checks']['directory'] = [
    'status' => 'ok',
    'message' => 'Current directory: ' . $currentDir
];

// Check document root
$documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? 'unknown';
$response['checks']['document_root'] = [
    'status' => 'ok',
    'message' => 'Document root: ' . $documentRoot
];

// Check database connection
try {
    $dbConnection = getenv('DB_CONNECTION');
    $dbHost = getenv('DB_HOST');
    $dbPort = getenv('DB_PORT');
    $dbName = getenv('DB_DATABASE');
    $dbUser = getenv('DB_USERNAME');
    $dbPass = getenv('DB_PASSWORD');

    $dsn = "{$dbConnection}:host={$dbHost};port={$dbPort};dbname={$dbName}";
    $pdo = new PDO($dsn, $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $response['checks']['database'] = [
        'status' => 'ok',
        'message' => 'Database connection successful'
    ];
} catch (PDOException $e) {
    $response['status'] = 'error';
    $response['checks']['database'] = [
        'status' => 'error',
        'message' => 'Database connection failed: ' . $e->getMessage()
    ];
}

// Check storage directory permissions
$storageWritable = is_writable('/app/storage');
$response['checks']['storage'] = [
    'status' => $storageWritable ? 'ok' : 'error',
    'message' => $storageWritable ? 'Storage directory is writable' : 'Storage directory is not writable'
];

if (!$storageWritable) {
    $response['status'] = 'error';
}

// Check bootstrap/cache directory permissions
$cacheWritable = is_writable('/app/bootstrap/cache');
$response['checks']['cache'] = [
    'status' => $cacheWritable ? 'ok' : 'error',
    'message' => $cacheWritable ? 'Cache directory is writable' : 'Cache directory is not writable'
];

if (!$cacheWritable) {
    $response['status'] = 'error';
}

// Check artisan file
$artisanExists = file_exists('/app/artisan');
$response['checks']['artisan'] = [
    'status' => $artisanExists ? 'ok' : 'error',
    'message' => $artisanExists ? 'Artisan file exists' : 'Artisan file not found'
];

if (!$artisanExists) {
    $response['status'] = 'error';

    // List files in the root directory
    $rootFiles = scandir('/app');
    $response['checks']['root_files'] = $rootFiles;
}

// Check public directory
$publicExists = is_dir('/app/public');
$response['checks']['public'] = [
    'status' => $publicExists ? 'ok' : 'error',
    'message' => $publicExists ? 'Public directory exists' : 'Public directory not found'
];

if (!$publicExists) {
    $response['status'] = 'error';
}

echo json_encode($response, JSON_PRETTY_PRINT);
EOL

# Create .gitignore files
echo "*
!.gitignore" > /app/bootstrap/cache/.gitignore

echo "*
!.gitignore" > /app/storage/framework/views/.gitignore

echo "*
!.gitignore" > /app/storage/framework/cache/.gitignore

echo "*
!.gitignore" > /app/storage/framework/sessions/.gitignore

echo "*
!.gitignore" > /app/storage/logs/.gitignore

# Run Laravel commands
cd /app
php /app/artisan key:generate --force || echo "Failed to generate key"
php /app/artisan config:clear || echo "Failed to clear config"
php /app/artisan cache:clear || echo "Failed to clear cache"
php /app/artisan view:clear || echo "Failed to clear views"
php /app/artisan route:clear || echo "Failed to clear routes"
php /app/artisan storage:link || echo "Failed to create storage link"
php /app/artisan migrate --force || echo "Failed to run migrations"

# Install dependencies and build assets
if [ -f "/app/package.json" ]; then
    cd /app
    npm install
    npm run build
else
    echo "package.json not found"
fi

# Set proper ownership
chown -R www-data:www-data /app/storage /app/bootstrap/cache || true

# Run original docker-php-entrypoint
exec docker-php-entrypoint "$@"
