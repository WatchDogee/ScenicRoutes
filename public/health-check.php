<?php
// Simple health check file
header('Content-Type: text/plain');

echo "ScenicRoutes Health Check\n";
echo "======================\n\n";

// Basic PHP check
echo "PHP Version: " . phpversion() . "\n";

// Check if we're in a Docker container
$inDocker = file_exists('/.dockerenv');
echo "Running in Docker container: " . ($inDocker ? 'Yes' : 'No') . "\n\n";

// Check document root
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Not available') . "\n";
echo "Current Script: " . __FILE__ . "\n\n";

// Check environment
echo "Environment: " . (getenv('APP_ENV') ?: 'Not set') . "\n";
echo "Debug Mode: " . (getenv('APP_DEBUG') ? 'Enabled' : 'Disabled') . "\n";
echo "App URL: " . (getenv('APP_URL') ?: 'Not set') . "\n\n";

// Check Nixpacks settings
echo "Nixpacks Settings:\n";
echo "NIXPACKS_PHP_ROOT_DIR: " . (getenv('NIXPACKS_PHP_ROOT_DIR') ?: 'Not set') . "\n";
echo "NIXPACKS_PHP_FALLBACK_PATH: " . (getenv('NIXPACKS_PHP_FALLBACK_PATH') ?: 'Not set') . "\n\n";

echo "Status: OK\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";
