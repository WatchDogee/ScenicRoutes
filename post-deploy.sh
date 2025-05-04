#!/bin/bash
# Post-deployment script for ScenicRoutes

# Display current directory and list files
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la

# Create storage directories
mkdir -p storage/logs
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/framework/cache
mkdir -p bootstrap/cache
mkdir -p public

# Set permissions
chmod -R 777 storage
chmod -R 777 bootstrap/cache

# Create log file
touch storage/logs/laravel.log
chmod 666 storage/logs/laravel.log

# Copy environment file if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.coolify" ]; then
    cp .env.coolify .env
    echo "Copied .env.coolify to .env"
fi

# Check if artisan exists
if [ ! -f "artisan" ]; then
    echo "Artisan file not found, creating it..."

    # Create artisan file
    cat > artisan << 'EOL'
#!/usr/bin/env php
<?php

define('LARAVEL_START', microtime(true));

// Register the Composer autoloader
require __DIR__.'/vendor/autoload.php';

// Bootstrap the application
$app = require_once __DIR__.'/bootstrap/app.php';

// Run the command
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$status = $kernel->handle(
    $input = new Symfony\Component\Console\Input\ArgvInput,
    new Symfony\Component\Console\Output\ConsoleOutput
);

$kernel->terminate($input, $status);

exit($status);
EOL

    echo "Artisan file created"
else
    echo "Artisan file found"
fi

# Check if bootstrap/app.php exists
if [ ! -f "bootstrap/app.php" ]; then
    echo "bootstrap/app.php file not found, creating it..."

    # Create bootstrap/app.php file
    cat > bootstrap/app.php << 'EOL'
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

    echo "bootstrap/app.php file created"
fi

# Check if index.php exists
if [ ! -f "public/index.php" ]; then
    echo "index.php file not found, creating it..."

    # Create index.php file
    cat > public/index.php << 'EOL'
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

    echo "index.php file created"
else
    echo "index.php file found, updating it..."

    # Update index.php file
    cat > public/index.php << 'EOL'
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

    echo "index.php file updated"
fi

# Set permissions
chmod +x artisan

# Run Laravel commands
php artisan key:generate --force || echo "Failed to generate key"
php artisan config:clear || echo "Failed to clear config"
php artisan cache:clear || echo "Failed to clear cache"
php artisan view:clear || echo "Failed to clear views"
php artisan route:clear || echo "Failed to clear routes"
php artisan storage:link || echo "Failed to create storage link"
php artisan migrate --force || echo "Failed to run migrations"

# Install dependencies and build assets
if [ -f "package.json" ]; then
    npm install
    npm run build
fi

echo "Post-deployment completed successfully"
