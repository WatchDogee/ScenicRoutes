<?php
// Deployment verification script
header('Content-Type: application/json');

// Function to check if a file or directory exists and is readable
function checkPath($path, $type = 'file') {
    $exists = $type === 'file' ? file_exists($path) : is_dir($path);
    $readable = $exists ? is_readable($path) : false;
    $writable = $exists ? is_writable($path) : false;
    
    return [
        'exists' => $exists,
        'readable' => $readable,
        'writable' => $writable,
        'type' => $type
    ];
}

// Get current directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

// Check important files and directories
$checks = [
    'artisan' => checkPath($parentDir . '/artisan'),
    'env' => checkPath($parentDir . '/.env'),
    'env_coolify' => checkPath($parentDir . '/.env.coolify'),
    'storage_dir' => checkPath($parentDir . '/storage', 'directory'),
    'bootstrap_cache_dir' => checkPath($parentDir . '/bootstrap/cache', 'directory'),
    'vendor_dir' => checkPath($parentDir . '/vendor', 'directory'),
    'public_dir' => checkPath($parentDir . '/public', 'directory')
];

// Check Laravel installation
$laravelInstalled = file_exists($parentDir . '/vendor/laravel/framework/src/Illuminate/Foundation/Application.php');

// Get directory structure
$directoryStructure = [];
if (is_dir($parentDir)) {
    $directoryStructure['parent_dir'] = scandir($parentDir);
    
    // Check storage subdirectories
    if (is_dir($parentDir . '/storage')) {
        $directoryStructure['storage'] = scandir($parentDir . '/storage');
        
        // Check framework subdirectories
        if (is_dir($parentDir . '/storage/framework')) {
            $directoryStructure['storage_framework'] = scandir($parentDir . '/storage/framework');
        }
    }
    
    // Check bootstrap subdirectories
    if (is_dir($parentDir . '/bootstrap')) {
        $directoryStructure['bootstrap'] = scandir($parentDir . '/bootstrap');
    }
}

// Check PHP configuration
$phpConfig = [
    'version' => phpversion(),
    'extensions' => get_loaded_extensions(),
    'memory_limit' => ini_get('memory_limit'),
    'max_execution_time' => ini_get('max_execution_time'),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size')
];

// Check environment variables
$envVars = [];
$requiredEnvVars = [
    'APP_ENV', 'APP_DEBUG', 'APP_URL', 
    'DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME',
    'CACHE_DRIVER', 'SESSION_DRIVER', 'QUEUE_CONNECTION'
];

foreach ($requiredEnvVars as $var) {
    $value = getenv($var);
    $envVars[$var] = $value ? ($var === 'DB_PASSWORD' ? '********' : $value) : 'not set';
}

// Prepare response
$response = [
    'status' => 'ok',
    'timestamp' => date('Y-m-d H:i:s'),
    'current_directory' => $currentDir,
    'parent_directory' => $parentDir,
    'checks' => $checks,
    'laravel_installed' => $laravelInstalled,
    'directory_structure' => $directoryStructure,
    'php_config' => $phpConfig,
    'environment_variables' => $envVars,
    'server_info' => [
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
        'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
    ]
];

// Set status based on critical checks
if (!$checks['artisan']['exists'] || !$laravelInstalled || !$checks['env']['exists']) {
    $response['status'] = 'error';
    $response['message'] = 'Critical components missing';
}

echo json_encode($response, JSON_PRETTY_PRINT);
