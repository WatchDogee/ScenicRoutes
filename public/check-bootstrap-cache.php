<?php
// Script to check bootstrap/cache directory
header('Content-Type: text/plain');

echo "Bootstrap/Cache Directory Check\n";
echo "=============================\n\n";

// Get the project root directory
$rootDir = dirname(__DIR__);
$bootstrapDir = $rootDir . '/bootstrap';
$cacheDir = $bootstrapDir . '/cache';

echo "Project root: $rootDir\n";
echo "Bootstrap directory: $bootstrapDir\n";
echo "Cache directory: $cacheDir\n\n";

// Check bootstrap directory
echo "Bootstrap Directory Check:\n";
if (is_dir($bootstrapDir)) {
    echo "Exists: Yes\n";
    echo "Writable: " . (is_writable($bootstrapDir) ? "Yes" : "No") . "\n";
    echo "Permissions: " . substr(sprintf('%o', fileperms($bootstrapDir)), -4) . "\n";
    
    // List contents
    echo "Contents:\n";
    $files = scandir($bootstrapDir);
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            $fullPath = $bootstrapDir . '/' . $file;
            $type = is_dir($fullPath) ? 'Directory' : 'File';
            $size = is_file($fullPath) ? filesize($fullPath) . ' bytes' : 'N/A';
            $perms = substr(sprintf('%o', fileperms($fullPath)), -4);
            echo "- $file ($type, $perms, $size)\n";
        }
    }
} else {
    echo "Exists: No\n";
    echo "Creating bootstrap directory...\n";
    if (mkdir($bootstrapDir, 0777, true)) {
        echo "Bootstrap directory created successfully.\n";
    } else {
        echo "Failed to create bootstrap directory!\n";
    }
}

echo "\n";

// Check cache directory
echo "Cache Directory Check:\n";
if (is_dir($cacheDir)) {
    echo "Exists: Yes\n";
    echo "Writable: " . (is_writable($cacheDir) ? "Yes" : "No") . "\n";
    echo "Permissions: " . substr(sprintf('%o', fileperms($cacheDir)), -4) . "\n";
    
    // List contents
    echo "Contents:\n";
    $files = scandir($cacheDir);
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            $fullPath = $cacheDir . '/' . $file;
            $type = is_dir($fullPath) ? 'Directory' : 'File';
            $size = is_file($fullPath) ? filesize($fullPath) . ' bytes' : 'N/A';
            $perms = substr(sprintf('%o', fileperms($fullPath)), -4);
            echo "- $file ($type, $perms, $size)\n";
        }
    }
} else {
    echo "Exists: No\n";
    echo "Creating cache directory...\n";
    if (mkdir($cacheDir, 0777, true)) {
        echo "Cache directory created successfully.\n";
    } else {
        echo "Failed to create cache directory!\n";
    }
}

echo "\n";

// Create .gitignore file if it doesn't exist
$gitignorePath = $cacheDir . '/.gitignore';
if (!file_exists($gitignorePath)) {
    echo "Creating .gitignore file...\n";
    $gitignoreContent = "*\n!.gitignore\n";
    if (file_put_contents($gitignorePath, $gitignoreContent)) {
        echo ".gitignore file created successfully.\n";
    } else {
        echo "Failed to create .gitignore file!\n";
    }
} else {
    echo ".gitignore file already exists.\n";
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

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
