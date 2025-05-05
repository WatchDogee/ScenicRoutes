<?php
// Script to fix bootstrap/cache directory issues
header('Content-Type: text/plain');

echo "Bootstrap/Cache Directory Fix Script\n";
echo "===================================\n\n";

// Get the project root directory
$rootDir = dirname(__DIR__);
$bootstrapDir = $rootDir . '/bootstrap';
$cacheDir = $bootstrapDir . '/cache';

echo "Project root: $rootDir\n";
echo "Bootstrap directory: $bootstrapDir\n";
echo "Cache directory: $cacheDir\n\n";

// Check if bootstrap directory exists
if (!is_dir($bootstrapDir)) {
    echo "Creating bootstrap directory...\n";
    if (mkdir($bootstrapDir, 0777, true)) {
        echo "Bootstrap directory created successfully.\n";
    } else {
        echo "Failed to create bootstrap directory!\n";
    }
} else {
    echo "Bootstrap directory already exists.\n";
}

// Check if cache directory exists
if (!is_dir($cacheDir)) {
    echo "Creating cache directory...\n";
    if (mkdir($cacheDir, 0777, true)) {
        echo "Cache directory created successfully.\n";
    } else {
        echo "Failed to create cache directory!\n";
    }
} else {
    echo "Cache directory already exists.\n";
}

// Set permissions
echo "\nSetting permissions...\n";
if (is_dir($bootstrapDir)) {
    if (chmod($bootstrapDir, 0777)) {
        echo "Bootstrap directory permissions set to 777.\n";
    } else {
        echo "Failed to set bootstrap directory permissions!\n";
    }
}

if (is_dir($cacheDir)) {
    if (chmod($cacheDir, 0777)) {
        echo "Cache directory permissions set to 777.\n";
    } else {
        echo "Failed to set cache directory permissions!\n";
    }
}

// Create .gitignore file if it doesn't exist
$gitignorePath = $cacheDir . '/.gitignore';
if (!file_exists($gitignorePath)) {
    echo "\nCreating .gitignore file...\n";
    $gitignoreContent = "*\n!.gitignore\n";
    if (file_put_contents($gitignorePath, $gitignoreContent)) {
        echo ".gitignore file created successfully.\n";
    } else {
        echo "Failed to create .gitignore file!\n";
    }
} else {
    echo "\n.gitignore file already exists.\n";
}

// Check final status
echo "\nFinal status:\n";
echo "Bootstrap directory exists: " . (is_dir($bootstrapDir) ? "Yes" : "No") . "\n";
echo "Bootstrap directory is writable: " . (is_writable($bootstrapDir) ? "Yes" : "No") . "\n";
echo "Cache directory exists: " . (is_dir($cacheDir) ? "Yes" : "No") . "\n";
echo "Cache directory is writable: " . (is_writable($cacheDir) ? "Yes" : "No") . "\n";
echo ".gitignore file exists: " . (file_exists($gitignorePath) ? "Yes" : "No") . "\n";

echo "\nScript completed at " . date('Y-m-d H:i:s') . "\n";
