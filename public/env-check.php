<?php
// Environment variables check script
header('Content-Type: application/json');

// Get all environment variables
$envVars = getenv();

// Filter out sensitive information
$filteredEnvVars = [];
foreach ($envVars as $key => $value) {
    // Skip sensitive variables or replace their values with asterisks
    if (in_array(strtoupper($key), ['DB_PASSWORD', 'APP_KEY', 'MAIL_PASSWORD'])) {
        $filteredEnvVars[$key] = '********';
    } else {
        $filteredEnvVars[$key] = $value;
    }
}

// Add server information
$serverInfo = [
    'PHP_VERSION' => phpversion(),
    'SERVER_SOFTWARE' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'DOCUMENT_ROOT' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
    'SCRIPT_FILENAME' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown',
    'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'CURRENT_DIR' => getcwd(),
];

// Check for important Laravel environment variables
$requiredEnvVars = [
    'APP_ENV', 'APP_DEBUG', 'APP_URL', 
    'DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME',
    'CACHE_DRIVER', 'SESSION_DRIVER', 'QUEUE_CONNECTION'
];

$missingEnvVars = [];
foreach ($requiredEnvVars as $var) {
    if (empty(getenv($var))) {
        $missingEnvVars[] = $var;
    }
}

echo json_encode([
    'status' => empty($missingEnvVars) ? 'ok' : 'warning',
    'message' => empty($missingEnvVars) ? 'All required environment variables are set' : 'Some required environment variables are missing',
    'missing_variables' => $missingEnvVars,
    'environment_variables' => $filteredEnvVars,
    'server_info' => $serverInfo
], JSON_PRETTY_PRINT);
