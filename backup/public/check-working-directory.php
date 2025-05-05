<?php
// Script to check the working directory
header('Content-Type: text/plain');

echo "Working Directory Check\n";
echo "=====================\n\n";

// Get current directory
$currentDir = getcwd();
echo "Current directory: $currentDir\n";

// Get parent directory
$parentDir = dirname($currentDir);
echo "Parent directory: $parentDir\n\n";

// List environment variables
echo "Environment Variables:\n";
$env = getenv();
foreach ($env as $key => $value) {
    // Skip sensitive information
    if (in_array(strtoupper($key), ['DB_PASSWORD', 'APP_KEY', 'MAIL_PASSWORD'])) {
        echo "$key: ********\n";
    } else {
        echo "$key: $value\n";
    }
}

echo "\n";

// Check if we're in a Docker container
$inDocker = file_exists('/.dockerenv');
echo "Running in Docker container: " . ($inDocker ? "Yes" : "No") . "\n\n";

// Get server information
echo "Server Information:\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'unknown') . "\n";
echo "Script Filename: " . ($_SERVER['SCRIPT_FILENAME'] ?? 'unknown') . "\n";
echo "Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'unknown') . "\n\n";

// Try to run shell commands to get more information
echo "Shell Command Output:\n";

// Run pwd command
echo "pwd command:\n";
$output = [];
exec('pwd 2>&1', $output);
echo implode("\n", $output) . "\n\n";

// Run ls command
echo "ls command:\n";
$output = [];
exec('ls -la 2>&1', $output);
echo implode("\n", $output) . "\n\n";

// Run ls on parent directory
echo "ls parent directory command:\n";
$output = [];
exec('ls -la .. 2>&1', $output);
echo implode("\n", $output) . "\n\n";

// Run whoami command
echo "whoami command:\n";
$output = [];
exec('whoami 2>&1', $output);
echo implode("\n", $output) . "\n\n";

// Check if artisan exists in various locations
echo "Checking for artisan file:\n";
$locations = [
    $currentDir . '/artisan',
    $parentDir . '/artisan',
    '/app/artisan',
    '/var/www/html/artisan',
    '/var/www/artisan',
    '/artisan'
];

foreach ($locations as $location) {
    echo "$location: " . (file_exists($location) ? "EXISTS" : "NOT FOUND") . "\n";
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
