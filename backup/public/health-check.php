<?php
// Simple health check file for Docker container health checks
header('Content-Type: application/json');

$status = 'ok';
$message = 'Application is running';

// Check database connection if configured
if (getenv('DB_CONNECTION')) {
    try {
        $dbConnection = new PDO(
            getenv('DB_CONNECTION') === 'sqlite' 
                ? 'sqlite:' . getenv('DB_DATABASE') 
                : getenv('DB_CONNECTION') . ':host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE'),
            getenv('DB_USERNAME'),
            getenv('DB_PASSWORD')
        );
        $dbConnection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $dbStatus = 'ok';
        $dbMessage = 'Database connection successful';
    } catch (PDOException $e) {
        $status = 'warning';
        $dbStatus = 'error';
        $dbMessage = 'Database connection failed: ' . $e->getMessage();
    }
}

// Return response
echo json_encode([
    'status' => $status,
    'message' => $message,
    'timestamp' => date('Y-m-d H:i:s'),
    'checks' => [
        'database' => [
            'status' => $dbStatus ?? 'not_checked',
            'message' => $dbMessage ?? 'Database check not performed'
        ]
    ]
], JSON_PRETTY_PRINT);
