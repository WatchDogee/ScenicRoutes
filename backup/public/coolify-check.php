<?php
// Coolify environment check script
header('Content-Type: text/plain');

echo "Coolify Environment Check\n";
echo "========================\n\n";

// Check current directory
echo "Current directory: " . getcwd() . "\n";
echo "Parent directory: " . dirname(getcwd()) . "\n\n";

// Check if we're in a Docker container
$inDocker = file_exists('/.dockerenv');
echo "Running in Docker container: " . ($inDocker ? 'Yes' : 'No') . "\n\n";

// Check environment variables
echo "Environment Variables:\n";
echo "---------------------\n";
$envVars = [
    'APP_ENV', 'APP_DEBUG', 'APP_URL', 
    'DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME',
    'CACHE_DRIVER', 'SESSION_DRIVER', 'QUEUE_CONNECTION'
];

foreach ($envVars as $var) {
    $value = getenv($var);
    echo "$var: " . ($value ? ($var === 'DB_PASSWORD' ? '********' : $value) : 'not set') . "\n";
}
echo "\n";

// Check file paths
echo "File Path Checks:\n";
echo "----------------\n";
$paths = [
    'artisan' => dirname(getcwd()) . '/artisan',
    '.env' => dirname(getcwd()) . '/.env',
    '.env.coolify' => dirname(getcwd()) . '/.env.coolify',
    'storage' => dirname(getcwd()) . '/storage',
    'bootstrap/cache' => dirname(getcwd()) . '/bootstrap/cache',
    'vendor' => dirname(getcwd()) . '/vendor',
    'public' => dirname(getcwd()) . '/public'
];

foreach ($paths as $name => $path) {
    $exists = file_exists($path) || is_dir($path);
    $type = is_dir($path) ? 'directory' : 'file';
    $readable = $exists ? (is_readable($path) ? 'Yes' : 'No') : 'N/A';
    $writable = $exists ? (is_writable($path) ? 'Yes' : 'No') : 'N/A';
    
    echo "$name ($type):\n";
    echo "  Path: $path\n";
    echo "  Exists: " . ($exists ? 'Yes' : 'No') . "\n";
    echo "  Readable: $readable\n";
    echo "  Writable: $writable\n";
    echo "\n";
}

// Check for Laravel installation
echo "Laravel Check:\n";
echo "-------------\n";
$laravelPath = dirname(getcwd()) . '/vendor/laravel/framework/src/Illuminate/Foundation/Application.php';
$laravelExists = file_exists($laravelPath);
echo "Laravel framework: " . ($laravelExists ? 'Found' : 'Not found') . "\n\n";

// Check PHP configuration
echo "PHP Configuration:\n";
echo "-----------------\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Memory Limit: " . ini_get('memory_limit') . "\n";
echo "Max Execution Time: " . ini_get('max_execution_time') . "\n";
echo "Upload Max Filesize: " . ini_get('upload_max_filesize') . "\n";
echo "Post Max Size: " . ini_get('post_max_size') . "\n\n";

// Check server information
echo "Server Information:\n";
echo "------------------\n";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'unknown') . "\n";
echo "Script Filename: " . ($_SERVER['SCRIPT_FILENAME'] ?? 'unknown') . "\n";
echo "Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'unknown') . "\n\n";

// Try to find artisan file
echo "Searching for artisan file:\n";
echo "-------------------------\n";
$command = "find " . dirname(getcwd()) . " -name 'artisan' -type f 2>/dev/null";
$output = [];
exec($command, $output);
if (!empty($output)) {
    foreach ($output as $file) {
        echo "Found: $file\n";
    }
} else {
    echo "No artisan file found\n";
}
echo "\n";

// List root directory contents
echo "Root Directory Contents:\n";
echo "----------------------\n";
$rootDir = dirname(getcwd());
$files = scandir($rootDir);
foreach ($files as $file) {
    $path = $rootDir . '/' . $file;
    $type = is_dir($path) ? 'directory' : 'file';
    $size = is_file($path) ? filesize($path) . ' bytes' : 'N/A';
    echo "$file ($type, $size)\n";
}
echo "\n";

echo "Check completed at: " . date('Y-m-d H:i:s') . "\n";
