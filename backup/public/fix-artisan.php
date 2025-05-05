<?php
// Script to fix the artisan file directly in the container
header('Content-Type: text/plain');

echo "Artisan File Fixer\n";
echo "================\n\n";

// Create artisan file content
$artisanContent = <<<'EOL'
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
EOL;

// Write artisan file directly to /app/artisan
$artisanPath = '/app/artisan';
echo "Creating artisan file at: $artisanPath\n";

if (file_put_contents($artisanPath, $artisanContent)) {
    echo "Artisan file created successfully.\n";

    // Make artisan executable
    if (chmod($artisanPath, 0755)) {
        echo "Made artisan executable.\n";
    } else {
        echo "Failed to make artisan executable!\n";
    }

    // Check for syntax errors
    echo "Checking for syntax errors...\n";
    $output = array();
    $returnVar = 0;
    exec("php -l $artisanPath 2>&1", $output, $returnVar);

    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
} else {
    echo "Failed to create artisan file!\n";
}

// Create bootstrap/app.php if it doesn't exist
$bootstrapAppPath = '/app/bootstrap/app.php';
if (!file_exists($bootstrapAppPath)) {
    echo "Creating bootstrap/app.php...\n";

    // Create bootstrap directory if it doesn't exist
    if (!is_dir('/app/bootstrap')) {
        mkdir('/app/bootstrap', 0755, true);
    }

    $bootstrapAppContent = <<<'EOL'
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
EOL;

    if (file_put_contents($bootstrapAppPath, $bootstrapAppContent)) {
        echo "bootstrap/app.php created successfully.\n";
    } else {
        echo "Failed to create bootstrap/app.php!\n";
    }
}

// Create public/index.php if it doesn't exist
$indexPhpPath = '/app/public/index.php';
if (!file_exists($indexPhpPath)) {
    echo "Creating public/index.php...\n";

    // Create public directory if it doesn't exist
    if (!is_dir('/app/public')) {
        mkdir('/app/public', 0755, true);
    }

    $indexPhpContent = <<<'EOL'
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
EOL;

    if (file_put_contents($indexPhpPath, $indexPhpContent)) {
        echo "public/index.php created successfully.\n";
    } else {
        echo "Failed to create public/index.php!\n";
    }
}

// Create storage directories
echo "Creating storage directories...\n";
$storageDirs = array(
    '/app/storage/app/public',
    '/app/storage/framework/cache',
    '/app/storage/framework/sessions',
    '/app/storage/framework/views',
    '/app/storage/logs'
);

foreach ($storageDirs as $dir) {
    if (!is_dir($dir)) {
        if (mkdir($dir, 0777, true)) {
            echo "Created $dir directory.\n";
        } else {
            echo "Failed to create $dir directory!\n";
        }
    }
}

// Create bootstrap/cache directory
echo "Creating bootstrap/cache directory...\n";
$bootstrapCachePath = '/app/bootstrap/cache';
if (!is_dir($bootstrapCachePath)) {
    if (mkdir($bootstrapCachePath, 0777, true)) {
        echo "Created bootstrap/cache directory.\n";
    } else {
        echo "Failed to create bootstrap/cache directory!\n";
    }
}

// Set permissions
echo "Setting permissions...\n";
chmod('/app/storage', 0777);
chmod('/app/bootstrap/cache', 0777);

echo "Fix completed at " . date('Y-m-d H:i:s') . "\n";
