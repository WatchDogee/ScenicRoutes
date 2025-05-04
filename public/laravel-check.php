<?php
// Script to check Laravel application
header('Content-Type: text/plain');

echo "Laravel Application Check\n";
echo "=======================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check for Laravel installation
echo "Laravel installation:\n";
$laravelPath = $parentDir . '/vendor/laravel/framework/src/Illuminate/Foundation/Application.php';
if (file_exists($laravelPath)) {
    echo "Laravel framework found at: $laravelPath\n";
} else {
    echo "Laravel framework NOT found at: $laravelPath\n";
}
echo "\n";

// Check for vendor directory
echo "Vendor directory:\n";
$vendorPath = $parentDir . '/vendor';
if (is_dir($vendorPath)) {
    echo "Vendor directory found at: $vendorPath\n";
    $vendorFiles = scandir($vendorPath);
    echo "Vendor directory contents: " . implode(', ', array_slice($vendorFiles, 0, 10)) . (count($vendorFiles) > 10 ? '...' : '') . "\n";
} else {
    echo "Vendor directory NOT found at: $vendorPath\n";
}
echo "\n";

// Check for composer.json
echo "Composer configuration:\n";
$composerJsonPath = $parentDir . '/composer.json';
if (file_exists($composerJsonPath)) {
    echo "composer.json found at: $composerJsonPath\n";
    $composerJson = json_decode(file_get_contents($composerJsonPath), true);
    if ($composerJson) {
        echo "Composer package name: " . ($composerJson['name'] ?? 'unknown') . "\n";
        echo "Composer require: " . implode(', ', array_keys($composerJson['require'] ?? [])) . "\n";
    }
} else {
    echo "composer.json NOT found at: $composerJsonPath\n";
}
echo "\n";

// Check for .env file
echo "Environment configuration:\n";
$envPath = $parentDir . '/.env';
if (file_exists($envPath)) {
    echo ".env file found at: $envPath\n";
    $envContent = file_get_contents($envPath);
    $envLines = explode("\n", $envContent);
    $envVars = [];
    foreach ($envLines as $line) {
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!empty($key) && !empty($value)) {
                if (in_array(strtoupper($key), ['APP_KEY', 'DB_PASSWORD', 'MAIL_PASSWORD'])) {
                    $envVars[$key] = '********';
                } else {
                    $envVars[$key] = $value;
                }
            }
        }
    }
    echo "Environment variables: " . json_encode($envVars, JSON_PRETTY_PRINT) . "\n";
} else {
    echo ".env file NOT found at: $envPath\n";
}
echo "\n";

// Check for artisan file
echo "Artisan file:\n";
$artisanPath = $parentDir . '/artisan';
if (file_exists($artisanPath)) {
    echo "Artisan file found at: $artisanPath\n";
    $artisanContent = file_get_contents($artisanPath);
    echo "Artisan file content (first 10 lines):\n";
    $artisanLines = explode("\n", $artisanContent);
    for ($i = 0; $i < min(10, count($artisanLines)); $i++) {
        echo $artisanLines[$i] . "\n";
    }
} else {
    echo "Artisan file NOT found at: $artisanPath\n";
}
echo "\n";

// Check for bootstrap/app.php file
echo "Bootstrap/app.php file:\n";
$bootstrapAppPath = $parentDir . '/bootstrap/app.php';
if (file_exists($bootstrapAppPath)) {
    echo "Bootstrap/app.php file found at: $bootstrapAppPath\n";
    $bootstrapAppContent = file_get_contents($bootstrapAppPath);
    echo "Bootstrap/app.php file content (first 10 lines):\n";
    $bootstrapAppLines = explode("\n", $bootstrapAppContent);
    for ($i = 0; $i < min(10, count($bootstrapAppLines)); $i++) {
        echo $bootstrapAppLines[$i] . "\n";
    }
} else {
    echo "Bootstrap/app.php file NOT found at: $bootstrapAppPath\n";
}
echo "\n";

// Check for public/index.php file
echo "Public/index.php file:\n";
$indexPhpPath = $parentDir . '/public/index.php';
if (file_exists($indexPhpPath)) {
    echo "Public/index.php file found at: $indexPhpPath\n";
    $indexPhpContent = file_get_contents($indexPhpPath);
    echo "Public/index.php file content (first 10 lines):\n";
    $indexPhpLines = explode("\n", $indexPhpContent);
    for ($i = 0; $i < min(10, count($indexPhpLines)); $i++) {
        echo $indexPhpLines[$i] . "\n";
    }
} else {
    echo "Public/index.php file NOT found at: $indexPhpPath\n";
}
echo "\n";

// Check for storage directory
echo "Storage directory:\n";
$storagePath = $parentDir . '/storage';
if (is_dir($storagePath)) {
    echo "Storage directory found at: $storagePath\n";
    $storageFiles = scandir($storagePath);
    echo "Storage directory contents: " . implode(', ', array_slice($storageFiles, 0, 10)) . (count($storageFiles) > 10 ? '...' : '') . "\n";
} else {
    echo "Storage directory NOT found at: $storagePath\n";
}
echo "\n";

// Check for bootstrap/cache directory
echo "Bootstrap/cache directory:\n";
$bootstrapCachePath = $parentDir . '/bootstrap/cache';
if (is_dir($bootstrapCachePath)) {
    echo "Bootstrap/cache directory found at: $bootstrapCachePath\n";
    $bootstrapCacheFiles = scandir($bootstrapCachePath);
    echo "Bootstrap/cache directory contents: " . implode(', ', array_slice($bootstrapCacheFiles, 0, 10)) . (count($bootstrapCacheFiles) > 10 ? '...' : '') . "\n";
} else {
    echo "Bootstrap/cache directory NOT found at: $bootstrapCachePath\n";
}
echo "\n";

// Check for routes directory
echo "Routes directory:\n";
$routesPath = $parentDir . '/routes';
if (is_dir($routesPath)) {
    echo "Routes directory found at: $routesPath\n";
    $routesFiles = scandir($routesPath);
    echo "Routes directory contents: " . implode(', ', array_slice($routesFiles, 0, 10)) . (count($routesFiles) > 10 ? '...' : '') . "\n";
} else {
    echo "Routes directory NOT found at: $routesPath\n";
}
echo "\n";

// Check for app directory
echo "App directory:\n";
$appPath = $parentDir . '/app';
if (is_dir($appPath)) {
    echo "App directory found at: $appPath\n";
    $appFiles = scandir($appPath);
    echo "App directory contents: " . implode(', ', array_slice($appFiles, 0, 10)) . (count($appFiles) > 10 ? '...' : '') . "\n";
} else {
    echo "App directory NOT found at: $appPath\n";
}
echo "\n";

// Check for config directory
echo "Config directory:\n";
$configPath = $parentDir . '/config';
if (is_dir($configPath)) {
    echo "Config directory found at: $configPath\n";
    $configFiles = scandir($configPath);
    echo "Config directory contents: " . implode(', ', array_slice($configFiles, 0, 10)) . (count($configFiles) > 10 ? '...' : '') . "\n";
} else {
    echo "Config directory NOT found at: $configPath\n";
}
echo "\n";

// Check for database directory
echo "Database directory:\n";
$databasePath = $parentDir . '/database';
if (is_dir($databasePath)) {
    echo "Database directory found at: $databasePath\n";
    $databaseFiles = scandir($databasePath);
    echo "Database directory contents: " . implode(', ', array_slice($databaseFiles, 0, 10)) . (count($databaseFiles) > 10 ? '...' : '') . "\n";
} else {
    echo "Database directory NOT found at: $databasePath\n";
}
echo "\n";

// Check for resources directory
echo "Resources directory:\n";
$resourcesPath = $parentDir . '/resources';
if (is_dir($resourcesPath)) {
    echo "Resources directory found at: $resourcesPath\n";
    $resourcesFiles = scandir($resourcesPath);
    echo "Resources directory contents: " . implode(', ', array_slice($resourcesFiles, 0, 10)) . (count($resourcesFiles) > 10 ? '...' : '') . "\n";
} else {
    echo "Resources directory NOT found at: $resourcesPath\n";
}
echo "\n";

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
