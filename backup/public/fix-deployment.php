<?php
// Script to fix common deployment issues
header('Content-Type: text/plain');

echo "Deployment Fix Script\n";
echo "===================\n\n";

// Get the project root directory
$rootDir = dirname(__DIR__);
echo "Project root: $rootDir\n\n";

// Function to create directory
function createDirectory($path) {
    if (!is_dir($path)) {
        echo "Creating directory: $path\n";
        if (mkdir($path, 0777, true)) {
            echo "Directory created successfully.\n";
        } else {
            echo "Failed to create directory!\n";
        }
    } else {
        echo "Directory already exists: $path\n";
    }
    
    // Set permissions
    if (is_dir($path)) {
        if (chmod($path, 0777)) {
            echo "Permissions set to 777.\n";
        } else {
            echo "Failed to set permissions!\n";
        }
    }
}

// Create essential directories
echo "Creating essential directories...\n";
$directories = [
    $rootDir . '/bootstrap',
    $rootDir . '/bootstrap/cache',
    $rootDir . '/storage',
    $rootDir . '/storage/logs',
    $rootDir . '/storage/framework',
    $rootDir . '/storage/framework/views',
    $rootDir . '/storage/framework/cache',
    $rootDir . '/storage/framework/sessions'
];

foreach ($directories as $dir) {
    createDirectory($dir);
}

echo "\n";

// Create .gitignore files
echo "Creating .gitignore files...\n";
$gitignoreContent = "*\n!.gitignore\n";
$gitignorePaths = [
    $rootDir . '/bootstrap/cache/.gitignore',
    $rootDir . '/storage/framework/views/.gitignore',
    $rootDir . '/storage/framework/cache/.gitignore',
    $rootDir . '/storage/framework/sessions/.gitignore',
    $rootDir . '/storage/logs/.gitignore'
];

foreach ($gitignorePaths as $path) {
    if (!file_exists($path)) {
        echo "Creating: $path\n";
        if (file_put_contents($path, $gitignoreContent)) {
            echo "Created successfully.\n";
        } else {
            echo "Failed to create!\n";
        }
    } else {
        echo "Already exists: $path\n";
    }
}

echo "\n";

// Create Laravel log file
$logFile = $rootDir . '/storage/logs/laravel.log';
if (!file_exists($logFile)) {
    echo "Creating Laravel log file...\n";
    if (file_put_contents($logFile, '')) {
        echo "Created successfully.\n";
        chmod($logFile, 0666);
        echo "Set permissions to 666.\n";
    } else {
        echo "Failed to create!\n";
    }
} else {
    echo "Laravel log file already exists.\n";
    chmod($logFile, 0666);
    echo "Set permissions to 666.\n";
}

echo "\n";

// Copy .env.coolify to .env if needed
$envPath = $rootDir . '/.env';
$envCoolifyPath = $rootDir . '/.env.coolify';
if (!file_exists($envPath) && file_exists($envCoolifyPath)) {
    echo "Copying .env.coolify to .env...\n";
    if (copy($envCoolifyPath, $envPath)) {
        echo "Copy successful.\n";
    } else {
        echo "Copy failed!\n";
    }
} else {
    echo ".env file already exists or .env.coolify not found.\n";
}

echo "\n";

// Make artisan executable
$artisanPath = $rootDir . '/artisan';
if (file_exists($artisanPath)) {
    echo "Making artisan executable...\n";
    if (chmod($artisanPath, 0755)) {
        echo "Successfully made artisan executable.\n";
    } else {
        echo "Failed to make artisan executable!\n";
    }
} else {
    echo "Artisan file not found!\n";
}

echo "\nFix script completed at " . date('Y-m-d H:i:s') . "\n";
