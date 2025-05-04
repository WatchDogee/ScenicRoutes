<?php
// Script to check bootstrap/app.php file
header('Content-Type: text/plain');

echo "Bootstrap/app.php Check\n";
echo "=====================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check for bootstrap directory
$bootstrapPath = $parentDir . '/bootstrap';
echo "Checking bootstrap directory: $bootstrapPath\n";
if (is_dir($bootstrapPath)) {
    echo "Bootstrap directory exists.\n";
    
    // List contents
    $bootstrapContents = scandir($bootstrapPath);
    echo "Bootstrap directory contents: " . implode(', ', $bootstrapContents) . "\n\n";
    
    // Check for app.php
    $appPath = $bootstrapPath . '/app.php';
    echo "Checking app.php: $appPath\n";
    if (file_exists($appPath)) {
        echo "app.php exists.\n";
        
        // Check content
        $appContent = file_get_contents($appPath);
        echo "app.php content:\n";
        echo $appContent . "\n\n";
        
        // Try to require app.php
        echo "Trying to require app.php...\n";
        try {
            $app = require_once $appPath;
            echo "app.php required successfully.\n";
            echo "app is of type: " . gettype($app) . "\n";
            if (is_object($app)) {
                echo "app is an instance of: " . get_class($app) . "\n";
            }
        } catch (Exception $e) {
            echo "Failed to require app.php: " . $e->getMessage() . "\n";
        }
    } else {
        echo "app.php does not exist!\n";
        
        // Create app.php
        echo "\nCreating app.php...\n";
        $appContent = <<<'EOL'
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
        
        if (file_put_contents($appPath, $appContent)) {
            echo "app.php created successfully.\n";
        } else {
            echo "Failed to create app.php!\n";
        }
    }
    
    // Check for cache directory
    $cachePath = $bootstrapPath . '/cache';
    echo "\nChecking cache directory: $cachePath\n";
    if (is_dir($cachePath)) {
        echo "Cache directory exists.\n";
        
        // List contents
        $cacheContents = scandir($cachePath);
        echo "Cache directory contents: " . implode(', ', $cacheContents) . "\n";
    } else {
        echo "Cache directory does not exist!\n";
        
        // Create cache directory
        echo "\nCreating cache directory...\n";
        if (mkdir($cachePath, 0777, true)) {
            echo "Cache directory created successfully.\n";
        } else {
            echo "Failed to create cache directory!\n";
        }
    }
} else {
    echo "Bootstrap directory does not exist!\n";
    
    // Create bootstrap directory
    echo "\nCreating bootstrap directory...\n";
    if (mkdir($bootstrapPath, 0777, true)) {
        echo "Bootstrap directory created successfully.\n";
        
        // Create cache directory
        echo "\nCreating cache directory...\n";
        $cachePath = $bootstrapPath . '/cache';
        if (mkdir($cachePath, 0777, true)) {
            echo "Cache directory created successfully.\n";
        } else {
            echo "Failed to create cache directory!\n";
        }
        
        // Create app.php
        echo "\nCreating app.php...\n";
        $appPath = $bootstrapPath . '/app.php';
        $appContent = <<<'EOL'
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
        
        if (file_put_contents($appPath, $appContent)) {
            echo "app.php created successfully.\n";
        } else {
            echo "Failed to create app.php!\n";
        }
    } else {
        echo "Failed to create bootstrap directory!\n";
    }
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
