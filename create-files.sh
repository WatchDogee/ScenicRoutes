#!/bin/bash

# Create bootstrap/app.php file
mkdir -p bootstrap
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
cat > artisan << 'EOL'
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
chmod +x artisan

# Create index.php file
mkdir -p public
cat > public/index.php << 'EOL'
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
cat > public/health-check.php << 'EOL'
<?php
// Simple health check file
echo "OK";
EOL

# Create necessary directories
mkdir -p bootstrap/cache
mkdir -p storage/logs
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/framework/cache

# Set permissions
chmod -R 777 storage
chmod -R 777 bootstrap/cache
touch storage/logs/laravel.log
chmod 666 storage/logs/laravel.log

# Create .gitignore files
echo "*
!.gitignore" > bootstrap/cache/.gitignore

echo "*
!.gitignore" > storage/framework/views/.gitignore

echo "*
!.gitignore" > storage/framework/cache/.gitignore

echo "*
!.gitignore" > storage/framework/sessions/.gitignore

echo "*
!.gitignore" > storage/logs/.gitignore

echo "Files created successfully!"
