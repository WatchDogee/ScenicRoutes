<?php
// Coolify deployment debug script
header('Content-Type: text/plain');

echo "ScenicRoutes Coolify Debug Tool\n";
echo "============================\n\n";

// Check environment
echo "Environment Information:\n";
echo "-----------------------\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Not available') . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Not available') . "\n";
echo "Script Filename: " . ($_SERVER['SCRIPT_FILENAME'] ?? 'Not available') . "\n";
echo "Current Directory: " . getcwd() . "\n";
echo "Parent Directory: " . dirname(getcwd()) . "\n";
echo "In Docker: " . (file_exists('/.dockerenv') ? 'Yes' : 'No') . "\n\n";

// Check environment variables
echo "Environment Variables:\n";
echo "---------------------\n";
$envVars = [
    'APP_ENV', 'APP_DEBUG', 'APP_URL',
    'DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME',
    'SESSION_DRIVER', 'SESSION_DOMAIN', 'SANCTUM_STATEFUL_DOMAINS',
    'NIXPACKS_PHP_ROOT_DIR', 'NIXPACKS_PHP_FALLBACK_PATH',
    'WEB_DOCUMENT_ROOT'
];

foreach ($envVars as $var) {
    $value = getenv($var);
    // Hide sensitive information
    if (in_array($var, ['DB_PASSWORD', 'APP_KEY', 'DB_USERNAME', 'MAIL_PASSWORD'])) {
        echo "$var: [HIDDEN]\n";
    } else if ($var === 'DB_DATABASE' || $var === 'DB_HOST') {
        echo "$var: [DATABASE INFO HIDDEN]\n";
    } else {
        echo "$var: " . ($value ? $value : 'Not set') . "\n";
    }
}
echo "\n";

// Check file paths
echo "File Path Checks:\n";
echo "----------------\n";
$paths = [
    'index.php' => __DIR__ . '/index.php',
    'artisan' => dirname(__DIR__) . '/artisan',
    '.env' => dirname(__DIR__) . '/.env',
    '.env.coolify' => dirname(__DIR__) . '/.env.coolify',
    'bootstrap/app.php' => dirname(__DIR__) . '/bootstrap/app.php',
    'storage' => dirname(__DIR__) . '/storage',
    'bootstrap/cache' => dirname(__DIR__) . '/bootstrap/cache',
    'vendor' => dirname(__DIR__) . '/vendor'
];

foreach ($paths as $name => $path) {
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

// Check Nginx configuration
echo "Nginx Configuration:\n";
echo "------------------\n";
$nginxConfigPaths = [
    '/etc/nginx/conf.d/default.conf',
    '/etc/nginx/sites-enabled/default',
    '/etc/nginx/nginx.conf',
    '/opt/docker/etc/nginx/vhost.conf',
    '/opt/docker/etc/nginx/conf.d/10-location-root.conf',
    '/opt/docker/etc/nginx/conf.d/10-php.conf'
];

foreach ($nginxConfigPaths as $configPath) {
    if (file_exists($configPath)) {
        echo "$configPath: Exists\n";
        $content = file_get_contents($configPath);
        $rootLine = preg_grep('/\s*root\s+/', explode("\n", $content));
        if (!empty($rootLine)) {
            echo "  Root directive: " . trim(implode("\n", $rootLine)) . "\n";
        }
        $indexLine = preg_grep('/\s*index\s+/', explode("\n", $content));
        if (!empty($indexLine)) {
            echo "  Index directive: " . trim(implode("\n", $indexLine)) . "\n";
        }
    } else {
        echo "$configPath: Does not exist\n";
    }
}
echo "\n";

// Check PHP-FPM status
echo "PHP-FPM Status:\n";
echo "--------------\n";
$phpFpmSockPaths = [
    '/var/run/php-fpm.sock',
    '/var/run/php/php8.2-fpm.sock',
    '/var/run/php/php8.1-fpm.sock',
    '/var/run/php/php8.0-fpm.sock',
    '/var/run/php/php7.4-fpm.sock'
];

foreach ($phpFpmSockPaths as $sockPath) {
    if (file_exists($sockPath)) {
        echo "$sockPath: Exists\n";
    } else {
        echo "$sockPath: Does not exist\n";
    }
}

// Check PHP-FPM processes
echo "\nPHP-FPM Processes:\n";
$output = [];
exec('ps aux | grep php-fpm', $output);
foreach ($output as $line) {
    echo "$line\n";
}
echo "\n";

// Check Laravel application
echo "Laravel Application:\n";
echo "-------------------\n";
$laravelPath = dirname(__DIR__) . '/vendor/laravel/framework/src/Illuminate/Foundation/Application.php';
if (file_exists($laravelPath)) {
    echo "Laravel framework found\n";
} else {
    echo "Laravel framework NOT found\n";
}

// Try to load Laravel bootstrap
echo "\nTrying to load Laravel bootstrap:\n";
try {
    if (file_exists(dirname(__DIR__) . '/vendor/autoload.php')) {
        require dirname(__DIR__) . '/vendor/autoload.php';
        echo "Autoloader loaded successfully\n";

        if (file_exists(dirname(__DIR__) . '/bootstrap/app.php')) {
            $app = require_once dirname(__DIR__) . '/bootstrap/app.php';
            echo "Bootstrap loaded successfully\n";
            echo "Laravel version: " . $app->version() . "\n";
        } else {
            echo "Bootstrap file not found\n";
        }
    } else {
        echo "Autoloader not found\n";
    }
} catch (Exception $e) {
    echo "Error loading Laravel: " . $e->getMessage() . "\n";
}

echo "\nDebug completed at " . date('Y-m-d H:i:s') . "\n";
