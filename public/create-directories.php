<?php
// Script to create necessary directories
header('Content-Type: text/plain');

echo "Directory Creation Script\n";
echo "=======================\n\n";

// Function to create directory
function createDirectory($path, $name) {
    echo "Creating $name directory...\n";
    echo "Path: $path\n";
    
    if (is_dir($path)) {
        echo "Directory already exists.\n";
    } else {
        if (mkdir($path, 0777, true)) {
            echo "Directory created successfully.\n";
        } else {
            echo "Failed to create directory!\n";
        }
    }
    
    // Set permissions
    if (is_dir($path)) {
        if (chmod($path, 0777)) {
            echo "Permissions set to 777.\n";
        } else {
            echo "Failed to set permissions!\n";
        }
    }
    
    echo "\n";
}

// Get the project root directory
$rootDir = dirname(__DIR__);
echo "Project root: $rootDir\n\n";

// Create important directories
createDirectory($rootDir . '/bootstrap', "Bootstrap");
createDirectory($rootDir . '/bootstrap/cache', "Bootstrap/Cache");
createDirectory($rootDir . '/storage', "Storage");
createDirectory($rootDir . '/storage/logs', "Storage/Logs");
createDirectory($rootDir . '/storage/framework', "Storage/Framework");
createDirectory($rootDir . '/storage/framework/views', "Storage/Framework/Views");
createDirectory($rootDir . '/storage/framework/cache', "Storage/Framework/Cache");
createDirectory($rootDir . '/storage/framework/sessions', "Storage/Framework/Sessions");

// Create .gitignore files
$gitignoreContent = "*\n!.gitignore\n";
$gitignorePaths = [
    $rootDir . '/bootstrap/cache/.gitignore',
    $rootDir . '/storage/framework/views/.gitignore',
    $rootDir . '/storage/framework/cache/.gitignore',
    $rootDir . '/storage/framework/sessions/.gitignore',
    $rootDir . '/storage/logs/.gitignore'
];

echo "Creating .gitignore files...\n";
foreach ($gitignorePaths as $path) {
    if (!file_exists($path)) {
        if (file_put_contents($path, $gitignoreContent)) {
            echo "Created: $path\n";
        } else {
            echo "Failed to create: $path\n";
        }
    } else {
        echo "Already exists: $path\n";
    }
}

// Create Laravel log file
$logFile = $rootDir . '/storage/logs/laravel.log';
if (!file_exists($logFile)) {
    if (file_put_contents($logFile, '')) {
        echo "\nCreated Laravel log file.\n";
        chmod($logFile, 0666);
        echo "Set log file permissions to 666.\n";
    } else {
        echo "\nFailed to create Laravel log file!\n";
    }
} else {
    echo "\nLaravel log file already exists.\n";
    chmod($logFile, 0666);
    echo "Set log file permissions to 666.\n";
}

echo "\nScript completed at " . date('Y-m-d H:i:s') . "\n";
