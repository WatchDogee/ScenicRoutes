<?php
// Script to find the artisan file
header('Content-Type: text/plain');

echo "Artisan File Finder\n";
echo "=================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check common locations for artisan file
$locations = [
    $currentDir . '/artisan',
    $parentDir . '/artisan',
    '/app/artisan',
    '/var/www/html/artisan',
    '/var/www/artisan',
    '/artisan'
];

echo "Checking common locations:\n";
foreach ($locations as $location) {
    echo "$location: " . (file_exists($location) ? "EXISTS" : "NOT FOUND") . "\n";
}

echo "\n";

// Search for artisan file in current directory and subdirectories
echo "Searching for artisan file in current directory and subdirectories:\n";
$command = "find $currentDir -name artisan -type f 2>/dev/null";
$output = [];
exec($command, $output);

if (!empty($output)) {
    foreach ($output as $file) {
        echo "Found: $file\n";
    }
} else {
    echo "No artisan file found in current directory and subdirectories.\n";
}

echo "\n";

// Search for artisan file in parent directory and subdirectories
echo "Searching for artisan file in parent directory and subdirectories:\n";
$command = "find $parentDir -name artisan -type f 2>/dev/null";
$output = [];
exec($command, $output);

if (!empty($output)) {
    foreach ($output as $file) {
        echo "Found: $file\n";
    }
} else {
    echo "No artisan file found in parent directory and subdirectories.\n";
}

echo "\n";

// Search for artisan file in entire filesystem (may take a long time)
echo "Searching for artisan file in root directory (this may take a while):\n";
$command = "find / -name artisan -type f 2>/dev/null | head -10";
$output = [];
exec($command, $output);

if (!empty($output)) {
    foreach ($output as $file) {
        echo "Found: $file\n";
    }
} else {
    echo "No artisan file found in root directory.\n";
}

echo "\n";

// List files in current directory
echo "Files in current directory ($currentDir):\n";
$files = scandir($currentDir);
foreach ($files as $file) {
    if ($file != '.' && $file != '..') {
        $path = $currentDir . '/' . $file;
        $type = is_dir($path) ? 'Directory' : 'File';
        echo "- $file ($type)\n";
    }
}

echo "\n";

// List files in parent directory
echo "Files in parent directory ($parentDir):\n";
$files = scandir($parentDir);
foreach ($files as $file) {
    if ($file != '.' && $file != '..') {
        $path = $parentDir . '/' . $file;
        $type = is_dir($path) ? 'Directory' : 'File';
        echo "- $file ($type)\n";
    }
}

echo "\nSearch completed at " . date('Y-m-d H:i:s') . "\n";
