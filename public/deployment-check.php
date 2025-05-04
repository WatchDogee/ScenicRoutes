<?php
// Deployment check script to help troubleshoot deployment issues

// Display PHP info
echo "<h1>Deployment Environment Check</h1>";
echo "<pre>";
echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Current Directory: " . getcwd() . "\n";
echo "Script Filename: " . $_SERVER['SCRIPT_FILENAME'] . "\n";
echo "</pre>";

// Check if Laravel is installed
echo "<h1>Laravel Check</h1>";
echo "<pre>";
if (file_exists(__DIR__ . '/../vendor/laravel/framework/src/Illuminate/Foundation/Application.php')) {
    echo "Laravel framework found.\n";
} else {
    echo "Laravel framework not found!\n";
}

// Check for artisan file
echo "\nArtisan File Check:\n";
$artisanPath = __DIR__ . '/../artisan';
if (file_exists($artisanPath)) {
    echo "Artisan file exists at: $artisanPath\n";
    echo "Artisan file permissions: " . substr(sprintf('%o', fileperms($artisanPath)), -4) . "\n";
    echo "Artisan file owner ID: " . fileowner($artisanPath) . "\n";
} else {
    echo "Artisan file NOT found at: $artisanPath\n";

    // List files in the root directory
    echo "\nListing files in the root directory:\n";
    $files = scandir(__DIR__ . '/..');
    foreach ($files as $file) {
        echo "- $file\n";
    }
}

// Check directory structure
echo "\nDirectory Structure Check:\n";
$directories = [
    'storage' => __DIR__ . '/../storage',
    'bootstrap/cache' => __DIR__ . '/../bootstrap/cache',
    'vendor' => __DIR__ . '/../vendor',
    'app' => __DIR__ . '/../app',
];

foreach ($directories as $name => $path) {
    if (is_dir($path)) {
        echo "$name directory exists at: $path\n";
        echo "$name directory permissions: " . substr(sprintf('%o', fileperms($path)), -4) . "\n";
    } else {
        echo "$name directory NOT found at: $path\n";
    }
}

// Check environment file
echo "\nEnvironment File Check:\n";
$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    echo ".env file exists at: $envPath\n";
    echo ".env file permissions: " . substr(sprintf('%o', fileperms($envPath)), -4) . "\n";
} else {
    echo ".env file NOT found at: $envPath\n";

    // Check for other env files
    $envFiles = glob(__DIR__ . '/../.env*');
    if (!empty($envFiles)) {
        echo "Found these environment files:\n";
        foreach ($envFiles as $file) {
            echo "- " . basename($file) . "\n";
        }
    }
}
echo "</pre>";
