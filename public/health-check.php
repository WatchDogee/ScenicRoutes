<?php
// Health check script for Coolify
header('Content-Type: application/json');
$response = array(
    'status' => 'ok',
    'timestamp' => date('Y-m-d H:i:s'),
    'message' => 'Application is running',
    'checks' => array()
);

// Check if we're in a Docker container
$inDocker = file_exists('/.dockerenv');
$response['checks']['docker'] = array(
    'status' => 'ok',
    'message' => 'Running in Docker: ' . ($inDocker ? 'Yes' : 'No')
);

// Check current directory
$currentDir = getcwd();
$response['checks']['directory'] = array(
    'status' => 'ok',
    'message' => 'Current directory: ' . $currentDir
);

// Check document root
$documentRoot = isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : 'unknown';
$response['checks']['document_root'] = array(
    'status' => 'ok',
    'message' => 'Document root: ' . $documentRoot
);

// Check database connection
try {
    $dbConnection = getenv('DB_CONNECTION');
    $dbHost = getenv('DB_HOST');
    $dbPort = getenv('DB_PORT');
    $dbName = getenv('DB_DATABASE');
    $dbUser = getenv('DB_USERNAME');
    $dbPass = getenv('DB_PASSWORD');

    $dsn = "{$dbConnection}:host={$dbHost};port={$dbPort};dbname={$dbName}";
    $pdo = new PDO($dsn, $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $response['checks']['database'] = array(
        'status' => 'ok',
        'message' => 'Database connection successful'
    );
} catch (PDOException $e) {
    $response['status'] = 'error';
    $response['checks']['database'] = array(
        'status' => 'error',
        'message' => 'Database connection failed: ' . $e->getMessage()
    );
}

// Check storage directory permissions
$storageWritable = is_writable('/app/storage');
$response['checks']['storage'] = array(
    'status' => $storageWritable ? 'ok' : 'error',
    'message' => $storageWritable ? 'Storage directory is writable' : 'Storage directory is not writable'
);

if (!$storageWritable) {
    $response['status'] = 'error';
}

// Check bootstrap/cache directory permissions
$cacheWritable = is_writable('/app/bootstrap/cache');
$response['checks']['cache'] = array(
    'status' => $cacheWritable ? 'ok' : 'error',
    'message' => $cacheWritable ? 'Cache directory is writable' : 'Cache directory is not writable'
);

if (!$cacheWritable) {
    $response['status'] = 'error';
}

// Check artisan file
$artisanExists = file_exists('/app/artisan');
$response['checks']['artisan'] = array(
    'status' => $artisanExists ? 'ok' : 'error',
    'message' => $artisanExists ? 'Artisan file exists' : 'Artisan file not found'
);

if (!$artisanExists) {
    $response['status'] = 'error';

    // List files in the root directory
    $rootFiles = scandir('/app');
    $response['checks']['root_files'] = $rootFiles;
}

// Check public directory
$publicExists = is_dir('/app/public');
$response['checks']['public'] = array(
    'status' => $publicExists ? 'ok' : 'error',
    'message' => $publicExists ? 'Public directory exists' : 'Public directory not found'
);

if (!$publicExists) {
    $response['status'] = 'error';
}

echo json_encode($response, JSON_PRETTY_PRINT);
