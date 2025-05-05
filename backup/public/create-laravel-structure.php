<?php
// Script to create a minimal Laravel application structure
header('Content-Type: text/plain');

echo "Laravel Structure Creator\n";
echo "=======================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Function to create directory
function createDirectory($path) {
    if (!is_dir($path)) {
        echo "Creating directory: $path\n";
        if (mkdir($path, 0777, true)) {
            echo "Directory created successfully.\n";
        } else {
            echo "Failed to create directory!\n";
        }
    } else {
        echo "Directory already exists: $path\n";
    }
    
    // Set permissions
    if (is_dir($path)) {
        if (chmod($path, 0777)) {
            echo "Permissions set to 777.\n";
        } else {
            echo "Failed to set permissions!\n";
        }
    }
}

// Create essential Laravel directories
echo "Creating essential Laravel directories...\n";
$directories = [
    $parentDir . '/app',
    $parentDir . '/bootstrap',
    $parentDir . '/bootstrap/cache',
    $parentDir . '/config',
    $parentDir . '/database',
    $parentDir . '/public',
    $parentDir . '/resources',
    $parentDir . '/routes',
    $parentDir . '/storage',
    $parentDir . '/storage/logs',
    $parentDir . '/storage/framework',
    $parentDir . '/storage/framework/views',
    $parentDir . '/storage/framework/cache',
    $parentDir . '/storage/framework/sessions',
    $parentDir . '/vendor'
];

foreach ($directories as $dir) {
    createDirectory($dir);
}

echo "\n";

// Create essential Laravel files
echo "Creating essential Laravel files...\n";

// Create artisan file
$artisanPath = $parentDir . '/artisan';
if (!file_exists($artisanPath)) {
    echo "Creating artisan file...\n";
    $artisanContent = <<<'EOD'
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
EOD;
    
    if (file_put_contents($artisanPath, $artisanContent)) {
        echo "Artisan file created successfully.\n";
        chmod($artisanPath, 0755);
        echo "Made artisan file executable.\n";
    } else {
        echo "Failed to create artisan file!\n";
    }
} else {
    echo "Artisan file already exists.\n";
    chmod($artisanPath, 0755);
    echo "Made artisan file executable.\n";
}

// Create bootstrap/app.php file
$bootstrapAppPath = $parentDir . '/bootstrap/app.php';
if (!file_exists($bootstrapAppPath)) {
    echo "Creating bootstrap/app.php file...\n";
    $bootstrapAppContent = <<<'EOD'
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        api: __DIR__.'/../routes/api.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
EOD;
    
    if (file_put_contents($bootstrapAppPath, $bootstrapAppContent)) {
        echo "bootstrap/app.php file created successfully.\n";
    } else {
        echo "Failed to create bootstrap/app.php file!\n";
    }
} else {
    echo "bootstrap/app.php file already exists.\n";
}

// Create .env file if it doesn't exist
$envPath = $parentDir . '/.env';
$envCoolifyPath = $parentDir . '/.env.coolify';
if (!file_exists($envPath) && file_exists($envCoolifyPath)) {
    echo "Copying .env.coolify to .env...\n";
    if (copy($envCoolifyPath, $envPath)) {
        echo "Copy successful.\n";
    } else {
        echo "Copy failed!\n";
    }
} elseif (!file_exists($envPath)) {
    echo "Creating .env file...\n";
    $envContent = <<<'EOD'
APP_NAME=Laravel
APP_ENV=production
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

LOG_CHANNEL=stack
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
EOD;
    
    if (file_put_contents($envPath, $envContent)) {
        echo ".env file created successfully.\n";
    } else {
        echo "Failed to create .env file!\n";
    }
} else {
    echo ".env file already exists.\n";
}

// Create .gitignore files
echo "\nCreating .gitignore files...\n";
$gitignoreContent = "*\n!.gitignore\n";
$gitignorePaths = [
    $parentDir . '/bootstrap/cache/.gitignore',
    $parentDir . '/storage/framework/views/.gitignore',
    $parentDir . '/storage/framework/cache/.gitignore',
    $parentDir . '/storage/framework/sessions/.gitignore',
    $parentDir . '/storage/logs/.gitignore'
];

foreach ($gitignorePaths as $path) {
    if (!file_exists($path)) {
        echo "Creating: $path\n";
        if (file_put_contents($path, $gitignoreContent)) {
            echo "Created successfully.\n";
        } else {
            echo "Failed to create!\n";
        }
    } else {
        echo "Already exists: $path\n";
    }
}

// Create Laravel log file
$logFile = $parentDir . '/storage/logs/laravel.log';
if (!file_exists($logFile)) {
    echo "\nCreating Laravel log file...\n";
    if (file_put_contents($logFile, '')) {
        echo "Created successfully.\n";
        chmod($logFile, 0666);
        echo "Set permissions to 666.\n";
    } else {
        echo "Failed to create!\n";
    }
} else {
    echo "\nLaravel log file already exists.\n";
    chmod($logFile, 0666);
    echo "Set permissions to 666.\n";
}

echo "\nStructure creation completed at " . date('Y-m-d H:i:s') . "\n";
