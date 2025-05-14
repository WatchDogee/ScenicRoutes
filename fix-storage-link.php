<?php

require __DIR__ . '/vendor/autoload.php';

// Create Laravel application
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Define paths
$publicPath = public_path('storage');
$targetPath = storage_path('app/public');

echo "Fixing storage link...\n";
echo "Public path: {$publicPath}\n";
echo "Target path: {$targetPath}\n\n";

// Remove existing storage link if it exists
if (file_exists($publicPath)) {
    echo "Removing existing storage link...\n";
    if (is_dir($publicPath) && !is_link($publicPath)) {
        // It's a directory, not a symlink, so we need to remove it recursively
        echo "Existing storage is a directory, removing recursively...\n";
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($publicPath, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        
        foreach ($files as $fileinfo) {
            $action = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
            $action($fileinfo->getRealPath());
        }
        
        rmdir($publicPath);
    } else {
        // It's a file or a symlink, just unlink it
        unlink($publicPath);
    }
}

// Create the storage directory if it doesn't exist
if (!file_exists($targetPath)) {
    echo "Creating target directory...\n";
    mkdir($targetPath, 0755, true);
}

// Create a new symlink
echo "Creating new symlink...\n";

// On Windows, we need to use a different approach
if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    echo "Windows system detected, using directory junction...\n";
    
    // On Windows, create a directory junction (similar to a symlink)
    $command = sprintf('mklink /J "%s" "%s"', $publicPath, $targetPath);
    exec($command, $output, $returnVar);
    
    if ($returnVar !== 0) {
        echo "Failed to create directory junction. Error code: {$returnVar}\n";
        echo "Output: " . implode("\n", $output) . "\n";
        
        // Try alternative method - copy the files instead
        echo "Trying alternative method - copying files...\n";
        mkdir($publicPath, 0755, true);
        
        // Copy all files from storage/app/public to public/storage
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($targetPath, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        
        foreach ($files as $fileinfo) {
            $filePath = $fileinfo->getRealPath();
            $relativePath = substr($filePath, strlen($targetPath) + 1);
            
            if ($fileinfo->isDir()) {
                mkdir($publicPath . '/' . $relativePath, 0755, true);
            } else {
                copy($filePath, $publicPath . '/' . $relativePath);
            }
        }
        
        echo "Files copied successfully.\n";
    } else {
        echo "Directory junction created successfully.\n";
    }
} else {
    // On Unix-like systems, create a symlink
    symlink($targetPath, $publicPath);
    echo "Symlink created successfully.\n";
}

// Verify the link was created
if (file_exists($publicPath)) {
    echo "✅ Storage link exists at: {$publicPath}\n";
    
    if (is_link($publicPath) || (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' && is_dir($publicPath))) {
        echo "✅ Storage link created successfully!\n";
    } else {
        echo "❌ Storage link creation failed. A regular directory was created instead.\n";
    }
} else {
    echo "❌ Storage link creation failed. The link does not exist.\n";
}

// Update the APP_URL in the .env file
echo "\nUpdating APP_URL in .env file...\n";
$envFile = file_get_contents('.env');
$envFile = preg_replace('/APP_URL=.*/', 'APP_URL=http://localhost', $envFile);
file_put_contents('.env', $envFile);
echo "APP_URL updated to http://localhost\n";

echo "\nDone!\n";
