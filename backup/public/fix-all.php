<?php
// Script to fix all issues
header('Content-Type: text/plain');

echo "Fix All Issues\n";
echo "=============\n\n";

// Fix index.php
echo "Fixing index.php...\n";
$indexPhpPath = '/app/public/index.php';
$indexPhpContent = <<<'EOL'
<?php

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
$kernel = $app->make('Illuminate\Contracts\Http\Kernel');

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
EOL;

if (file_put_contents($indexPhpPath, $indexPhpContent)) {
    echo "index.php fixed successfully.\n";
    
    // Check for syntax errors
    echo "Checking for syntax errors in index.php...\n";
    $output = [];
    $returnVar = 0;
    exec("php -l $indexPhpPath 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
} else {
    echo "Failed to fix index.php!\n";
}

// Fix artisan
echo "Fixing artisan...\n";
$artisanPath = '/app/artisan';
$artisanContent = <<<'EOL'
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
EOL;

if (file_put_contents($artisanPath, $artisanContent)) {
    echo "artisan fixed successfully.\n";
    
    // Make artisan executable
    if (chmod($artisanPath, 0755)) {
        echo "Made artisan executable.\n";
    } else {
        echo "Failed to make artisan executable!\n";
    }
    
    // Check for syntax errors
    echo "Checking for syntax errors in artisan...\n";
    $output = [];
    $returnVar = 0;
    exec("php -l $artisanPath 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
} else {
    echo "Failed to fix artisan!\n";
}

// Fix bootstrap/app.php
echo "Fixing bootstrap/app.php...\n";
$bootstrapAppPath = '/app/bootstrap/app.php';
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
EOL;

// Create bootstrap directory if it doesn't exist
if (!is_dir('/app/bootstrap')) {
    if (mkdir('/app/bootstrap', 0755, true)) {
        echo "Created bootstrap directory.\n";
    } else {
        echo "Failed to create bootstrap directory!\n";
    }
}

if (file_put_contents($bootstrapAppPath, $bootstrapAppContent)) {
    echo "bootstrap/app.php fixed successfully.\n";
    
    // Check for syntax errors
    echo "Checking for syntax errors in bootstrap/app.php...\n";
    $output = [];
    $returnVar = 0;
    exec("php -l $bootstrapAppPath 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
} else {
    echo "Failed to fix bootstrap/app.php!\n";
}

// Create bootstrap/cache directory
echo "Creating bootstrap/cache directory...\n";
$bootstrapCachePath = '/app/bootstrap/cache';
if (!is_dir($bootstrapCachePath)) {
    if (mkdir($bootstrapCachePath, 0755, true)) {
        echo "Created bootstrap/cache directory.\n";
    } else {
        echo "Failed to create bootstrap/cache directory!\n";
    }
}

// Create storage directories
echo "Creating storage directories...\n";
$storageDirs = [
    '/app/storage',
    '/app/storage/app',
    '/app/storage/app/public',
    '/app/storage/framework',
    '/app/storage/framework/cache',
    '/app/storage/framework/sessions',
    '/app/storage/framework/views',
    '/app/storage/logs'
];

foreach ($storageDirs as $dir) {
    if (!is_dir($dir)) {
        if (mkdir($dir, 0755, true)) {
            echo "Created $dir directory.\n";
        } else {
            echo "Failed to create $dir directory!\n";
        }
    }
}

// Create .env file if it doesn't exist
echo "Creating .env file...\n";
$envPath = '/app/.env';
if (!file_exists($envPath)) {
    $envContent = <<<'EOL'
APP_NAME=Laravel
APP_ENV=production
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_DEBUG=true
APP_URL=http://localhost

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

MEMCACHED_HOST=127.0.0.1

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_HOST="${PUSHER_HOST}"
VITE_PUSHER_PORT="${PUSHER_PORT}"
VITE_PUSHER_SCHEME="${PUSHER_SCHEME}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
EOL;

    if (file_put_contents($envPath, $envContent)) {
        echo ".env file created successfully.\n";
    } else {
        echo "Failed to create .env file!\n";
    }
}

// Generate application key
echo "Generating application key...\n";
$output = [];
$returnVar = 0;
exec("cd /app && php artisan key:generate --force 2>&1", $output, $returnVar);

echo "Return code: $returnVar\n";
echo "Output:\n";
echo implode("\n", $output) . "\n\n";

// Clear caches
echo "Clearing caches...\n";
$cacheCommands = [
    "cd /app && php artisan config:clear",
    "cd /app && php artisan cache:clear",
    "cd /app && php artisan view:clear",
    "cd /app && php artisan route:clear"
];

foreach ($cacheCommands as $command) {
    echo "Running: $command\n";
    $output = [];
    $returnVar = 0;
    exec($command . " 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
}

// Create storage link
echo "Creating storage link...\n";
$output = [];
$returnVar = 0;
exec("cd /app && php artisan storage:link 2>&1", $output, $returnVar);

echo "Return code: $returnVar\n";
echo "Output:\n";
echo implode("\n", $output) . "\n\n";

// Run migrations
echo "Running migrations...\n";
$output = [];
$returnVar = 0;
exec("cd /app && php artisan migrate --force 2>&1", $output, $returnVar);

echo "Return code: $returnVar\n";
echo "Output:\n";
echo implode("\n", $output) . "\n\n";

echo "Fix completed at " . date('Y-m-d H:i:s') . "\n";
