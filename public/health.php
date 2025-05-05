<?php
// Basic health check
header('Content-Type: application/json');

// Always return OK for Docker health check
echo json_encode([
    'status' => 'ok',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION
]);

// Try database connection but don't fail health check if it fails
try {
    if (getenv('DB_CONNECTION') && getenv('DB_HOST') && getenv('DB_PORT') && getenv('DB_DATABASE')) {
        $dbconn = new PDO(
            getenv('DB_CONNECTION').':host='.getenv('DB_HOST').';port='.getenv('DB_PORT').';dbname='.getenv('DB_DATABASE'),
            getenv('DB_USERNAME'),
            getenv('DB_PASSWORD')
        );
        // Database connection successful, but we already returned OK
    }
} catch (Exception $e) {
    // Log error but don't fail health check
    error_log('Database connection error in health check: ' . $e->getMessage());
}