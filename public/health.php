<?php
// Health check script for Coolify

// Set content type to JSON
header('Content-Type: application/json');

// Initialize response array
$response = [
    'status' => 'ok',
    'timestamp' => date('Y-m-d H:i:s'),
    'checks' => []
];

// Check PHP version
$response['checks']['php'] = [
    'status' => 'ok',
    'version' => phpversion()
];

// Check storage directory
$storageDir = __DIR__ . '/../storage';
if (is_dir($storageDir) && is_writable($storageDir)) {
    $response['checks']['storage'] = [
        'status' => 'ok',
        'writable' => true
    ];
} else {
    $response['checks']['storage'] = [
        'status' => 'error',
        'writable' => is_writable($storageDir),
        'exists' => is_dir($storageDir)
    ];
    $response['status'] = 'error';
}

// Check bootstrap/cache directory
$cacheDir = __DIR__ . '/../bootstrap/cache';
if (is_dir($cacheDir) && is_writable($cacheDir)) {
    $response['checks']['bootstrap_cache'] = [
        'status' => 'ok',
        'writable' => true
    ];
} else {
    $response['checks']['bootstrap_cache'] = [
        'status' => 'error',
        'writable' => is_writable($cacheDir),
        'exists' => is_dir($cacheDir)
    ];
    $response['status'] = 'error';
}

// Check database connection
try {
    $dbConnection = getenv('DB_CONNECTION');
    $dbHost = getenv('DB_HOST');
    $dbPort = getenv('DB_PORT');
    $dbName = getenv('DB_DATABASE');
    $dbUser = getenv('DB_USERNAME');
    $dbPass = getenv('DB_PASSWORD');
    
    if ($dbConnection && $dbHost && $dbPort && $dbName && $dbUser && $dbPass) {
        // Set a short timeout for the connection
        $options = [
            PDO::ATTR_TIMEOUT => 5,
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ];
        
        $dsn = "$dbConnection:host=$dbHost;port=$dbPort;dbname=$dbName";
        $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
        
        // Simple query to test connection
        $pdo->query("SELECT 1");
        
        $response['checks']['database'] = [
            'status' => 'ok',
            'connection' => "$dbConnection:$dbHost:$dbPort"
        ];
    } else {
        $response['checks']['database'] = [
            'status' => 'warning',
            'message' => 'Database configuration incomplete'
        ];
        if ($response['status'] === 'ok') {
            $response['status'] = 'warning';
        }
    }
} catch (PDOException $e) {
    $response['checks']['database'] = [
        'status' => 'error',
        'message' => 'Database connection failed',
        'error' => $e->getMessage()
    ];
    $response['status'] = 'error';
}

// Check .env file
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $response['checks']['env_file'] = [
        'status' => 'ok',
        'exists' => true
    ];
} else {
    $response['checks']['env_file'] = [
        'status' => 'error',
        'exists' => false
    ];
    $response['status'] = 'error';
}

// Check storage symlink
if (is_link(__DIR__ . '/storage')) {
    $response['checks']['storage_symlink'] = [
        'status' => 'ok',
        'exists' => true
    ];
} else {
    $response['checks']['storage_symlink'] = [
        'status' => 'warning',
        'exists' => false
    ];
    if ($response['status'] === 'ok') {
        $response['status'] = 'warning';
    }
}

// Output response
echo json_encode($response, JSON_PRETTY_PRINT);
