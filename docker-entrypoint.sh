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

# Create bootstrap/app.php file
cat > /app/bootstrap/app.php << 'EOL'
<?php

/*
|--------------------------------------------------------------------------
| Create The Application
|--------------------------------------------------------------------------
|
| The first thing we will do is create a new Laravel application instance
| which serves as the "glue" for all the components of Laravel, and is
| the IoC container for the system binding all of the various parts.
|
*/

$app = new Illuminate\Foundation\Application(
    $_ENV['APP_BASE_PATH'] ?? dirname(__DIR__)
);

/*
|--------------------------------------------------------------------------
| Bind Important Interfaces
|--------------------------------------------------------------------------
|
| Next, we need to bind some important interfaces into the container so
| we will be able to resolve them when needed. The kernels serve the
| incoming requests to this application from both the web and CLI.
|
*/

$app->singleton(
    Illuminate\Contracts\Http\Kernel::class,
    App\Http\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Console\Kernel::class,
    App\Console\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Debug\ExceptionHandler::class,
    App\Exceptions\Handler::class
);

/*
|--------------------------------------------------------------------------
| Return The Application
|--------------------------------------------------------------------------
|
| This script returns the application instance. The instance is given to
| the calling script so we can separate the building of the instances
| from the actual running of the application and sending responses.
|
*/

return $app;
EOL

# Create artisan file
cat > /app/artisan << 'EOL'
#!/usr/bin/env php
<?php

define('LARAVEL_START', microtime(true));

// Register the Composer autoloader
require __DIR__.'/vendor/autoload.php';

// Bootstrap the application
$app = require_once __DIR__.'/bootstrap/app.php';

// Run the command
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$status = $kernel->handle(
    $input = new Symfony\Component\Console\Input\ArgvInput,
    new Symfony\Component\Console\Output\ConsoleOutput
);

$kernel->terminate($input, $status);

exit($status);
EOL

# Make artisan executable
chmod +x /app/artisan

# Create index.php file
cat > /app/public/index.php << 'EOL'
<?php

// Define the application start time
define('LARAVEL_START', microtime(true));

// Check for maintenance mode
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader
require __DIR__.'/../vendor/autoload.php';

// Bootstrap the application
$app = require_once __DIR__.'/../bootstrap/app.php';

// Run the application
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = \Illuminate\Http\Request::capture()
);

$response->send();

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
