<?php
// Script to check environment variables
header('Content-Type: text/plain');

echo "Environment Variables Check\n";
echo "=========================\n\n";

// Function to check environment variable
function checkEnvVar($name) {
    $value = getenv($name);
    echo "$name: " . ($value ? ($name === 'DB_PASSWORD' ? '********' : $value) : 'not set') . "\n";
    return !empty($value);
}

// Check important environment variables
$envVars = [
    'APP_ENV',
    'APP_DEBUG',
    'APP_URL',
    'APP_KEY',
    'DB_CONNECTION',
    'DB_HOST',
    'DB_PORT',
    'DB_DATABASE',
    'DB_USERNAME',
    'DB_PASSWORD',
    'CACHE_DRIVER',
    'SESSION_DRIVER',
    'QUEUE_CONNECTION',
    'MAIL_MAILER',
    'MAIL_HOST',
    'MAIL_PORT',
    'MAIL_USERNAME',
    'MAIL_PASSWORD',
    'MAIL_ENCRYPTION',
    'MAIL_FROM_ADDRESS'
];

$missingVars = [];
foreach ($envVars as $var) {
    if (!checkEnvVar($var)) {
        $missingVars[] = $var;
    }
}

// Check .env file
$rootDir = dirname(__DIR__);
$envPath = $rootDir . '/.env';
$envCoolifyPath = $rootDir . '/.env.coolify';
$envExamplePath = $rootDir . '/.env.example';

echo "\nEnvironment Files:\n";
echo ".env: " . (file_exists($envPath) ? "exists" : "missing") . "\n";
echo ".env.coolify: " . (file_exists($envCoolifyPath) ? "exists" : "missing") . "\n";
echo ".env.example: " . (file_exists($envExamplePath) ? "exists" : "missing") . "\n";

// Copy .env.coolify to .env if needed
if (!file_exists($envPath) && file_exists($envCoolifyPath)) {
    echo "\nCopying .env.coolify to .env...\n";
    if (copy($envCoolifyPath, $envPath)) {
        echo "Copy successful.\n";
    } else {
        echo "Copy failed!\n";
    }
}

// Summary
echo "\nSummary:\n";
echo "Total variables checked: " . count($envVars) . "\n";
echo "Missing variables: " . count($missingVars) . "\n";
if (!empty($missingVars)) {
    echo "Missing variable names: " . implode(', ', $missingVars) . "\n";
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
