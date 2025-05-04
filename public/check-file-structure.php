<?php
// Script to check the file structure
header('Content-Type: text/plain');

echo "File Structure Check\n";
echo "==================\n\n";

// Function to list directory contents recursively
function listDirectory($dir, $indent = 0) {
    if (!is_dir($dir)) {
        echo str_repeat(' ', $indent) . "Not a directory: $dir\n";
        return;
    }
    
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file == '.' || $file == '..') continue;
        
        $path = $dir . '/' . $file;
        $type = is_dir($path) ? 'Directory' : 'File';
        $size = is_file($path) ? filesize($path) . ' bytes' : '';
        
        echo str_repeat(' ', $indent) . "- $file ($type $size)\n";
        
        // Recursively list subdirectories, but limit depth to avoid infinite recursion
        if (is_dir($path) && $indent < 6) {
            listDirectory($path, $indent + 2);
        }
    }
}

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check common root directories
$rootDirs = [
    '/app',
    '/var/www',
    '/var/www/html',
    $parentDir
];

foreach ($rootDirs as $dir) {
    echo "Checking directory: $dir\n";
    if (is_dir($dir)) {
        echo "Directory exists. Contents:\n";
        listDirectory($dir);
    } else {
        echo "Directory does not exist.\n";
    }
    echo "\n";
}

// Check for Laravel-specific directories
$laravelDirs = [
    $parentDir . '/app',
    $parentDir . '/bootstrap',
    $parentDir . '/config',
    $parentDir . '/database',
    $parentDir . '/public',
    $parentDir . '/resources',
    $parentDir . '/routes',
    $parentDir . '/storage',
    $parentDir . '/vendor'
];

echo "Checking Laravel-specific directories:\n";
foreach ($laravelDirs as $dir) {
    echo "$dir: " . (is_dir($dir) ? "EXISTS" : "NOT FOUND") . "\n";
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
