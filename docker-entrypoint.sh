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
    isset($_ENV['APP_BASE_PATH']) ? $_ENV['APP_BASE_PATH'] : dirname(__FILE__).'/..'
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
    'Illuminate\Contracts\Http\Kernel',
    'App\Http\Kernel'
);

$app->singleton(
    'Illuminate\Contracts\Console\Kernel',
    'App\Console\Kernel'
);

$app->singleton(
    'Illuminate\Contracts\Debug\ExceptionHandler',
    'App\Exceptions\Handler'
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

// This is a PHP 5.3 compatible artisan file

// Define the application start time
define('LARAVEL_START', microtime(true));

// Register the Composer autoloader
require dirname(__FILE__).'/vendor/autoload.php';

// Bootstrap the application
$app = require_once dirname(__FILE__).'/bootstrap/app.php';

// Get the kernel
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');

// Handle the command
$input = new Symfony\Component\Console\Input\ArgvInput();
$output = new Symfony\Component\Console\Output\ConsoleOutput();
$status = $kernel->handle($input, $output);

// Terminate the kernel
$kernel->terminate($input, $status);

// Exit with the status code
exit($status);
EOL

# Make artisan executable
chmod +x /app/artisan

# Create index.php file
cat > /app/public/index.php << 'EOL'
<?php

// This is a PHP 5.3 compatible index.php file

// Define the application start time
define('LARAVEL_START', microtime(true));

// Check for maintenance mode
if (file_exists($maintenance = dirname(__FILE__).'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader
require dirname(__FILE__).'/../vendor/autoload.php';

// Bootstrap the application
$app = require_once dirname(__FILE__).'/../bootstrap/app.php';

// Run the application
$kernel = $app->make('Illuminate\Contracts\Http\Kernel');

$request = Illuminate\Http\Request::capture();
$response = $kernel->handle($request);

$response->send();

$kernel->terminate($request, $response);
EOL

# Create health check file
cat > /app/public/health-check.php << 'EOL'
<?php
// Simple health check file
echo "OK";
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
