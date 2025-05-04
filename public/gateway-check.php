<?php
// Script to check gateway error
header('Content-Type: text/plain');

echo "Gateway Check\n";
echo "=============\n\n";

// Check if we're in a Docker container
$inDocker = file_exists('/.dockerenv');
echo "Running in Docker: " . ($inDocker ? 'Yes' : 'No') . "\n\n";

// Check current directory
$currentDir = getcwd();
echo "Current directory: $currentDir\n";
$parentDir = dirname($currentDir);
echo "Parent directory: $parentDir\n\n";

// Check document root
$documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? 'unknown';
echo "Document root: $documentRoot\n";
$scriptFilename = $_SERVER['SCRIPT_FILENAME'] ?? 'unknown';
echo "Script filename: $scriptFilename\n";
$requestUri = $_SERVER['REQUEST_URI'] ?? 'unknown';
echo "Request URI: $requestUri\n\n";

// Check server information
$serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? 'unknown';
echo "Server software: $serverSoftware\n";
$serverProtocol = $_SERVER['SERVER_PROTOCOL'] ?? 'unknown';
echo "Server protocol: $serverProtocol\n";
$serverName = $_SERVER['SERVER_NAME'] ?? 'unknown';
echo "Server name: $serverName\n";
$serverPort = $_SERVER['SERVER_PORT'] ?? 'unknown';
echo "Server port: $serverPort\n\n";

// Check PHP information
echo "PHP version: " . phpversion() . "\n";
echo "PHP SAPI: " . php_sapi_name() . "\n";
echo "PHP loaded extensions: " . implode(', ', get_loaded_extensions()) . "\n\n";

// Check file permissions
echo "File permissions:\n";
$files = [
    'artisan' => $parentDir . '/artisan',
    'bootstrap/app.php' => $parentDir . '/bootstrap/app.php',
    'public/index.php' => $parentDir . '/public/index.php',
    'public/gateway-check.php' => $parentDir . '/public/gateway-check.php',
    'storage' => $parentDir . '/storage',
    'bootstrap/cache' => $parentDir . '/bootstrap/cache'
];

foreach ($files as $name => $path) {
    if (file_exists($path)) {
        $perms = substr(sprintf('%o', fileperms($path)), -4);
        $readable = is_readable($path) ? 'Yes' : 'No';
        $writable = is_writable($path) ? 'Yes' : 'No';
        $executable = is_executable($path) ? 'Yes' : 'No';
        echo "$name: Exists, Permissions: $perms, Readable: $readable, Writable: $writable, Executable: $executable\n";
    } else {
        echo "$name: Does not exist\n";
    }
}
echo "\n";

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

// Check for nginx configuration
echo "Nginx configuration:\n";
$nginxConfigPath = '/etc/nginx/conf.d/default.conf';
if (file_exists($nginxConfigPath)) {
    echo "Nginx configuration found at: $nginxConfigPath\n";
    $nginxConfig = file_get_contents($nginxConfigPath);
    echo "Nginx configuration content (first 10 lines):\n";
    $nginxConfigLines = explode("\n", $nginxConfig);
    for ($i = 0; $i < min(10, count($nginxConfigLines)); $i++) {
        echo $nginxConfigLines[$i] . "\n";
    }
} else {
    echo "Nginx configuration NOT found at: $nginxConfigPath\n";
}
echo "\n";

// Check for PHP-FPM configuration
echo "PHP-FPM configuration:\n";
$phpFpmConfigPath = '/usr/local/etc/php-fpm.d/www.conf';
if (file_exists($phpFpmConfigPath)) {
    echo "PHP-FPM configuration found at: $phpFpmConfigPath\n";
} else {
    echo "PHP-FPM configuration NOT found at: $phpFpmConfigPath\n";
}
echo "\n";

// Check for error logs
echo "Error logs:\n";
$errorLogPaths = [
    '/var/log/nginx/error.log',
    '/var/log/php-fpm/error.log',
    $parentDir . '/storage/logs/laravel.log'
];

foreach ($errorLogPaths as $path) {
    if (file_exists($path)) {
        echo "Error log found at: $path\n";
        if (is_readable($path)) {
            $errorLog = file_get_contents($path);
            $errorLogLines = explode("\n", $errorLog);
            $lastLines = array_slice($errorLogLines, -10);
            echo "Last 10 lines of error log:\n";
            foreach ($lastLines as $line) {
                echo $line . "\n";
            }
        } else {
            echo "Error log is not readable\n";
        }
    } else {
        echo "Error log NOT found at: $path\n";
    }
    echo "\n";
}

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
