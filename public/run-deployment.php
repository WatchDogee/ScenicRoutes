<?php
// Manual deployment script
// WARNING: This script should only be used for troubleshooting and should be removed in production

// Set content type to plain text for better readability
header('Content-Type: text/plain');

// Function to run a command and display output
function runCommand($command) {
    echo "Running: $command\n";
    $output = [];
    $returnVar = 0;
    exec($command . " 2>&1", $output, $returnVar);
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
    return $returnVar === 0;
}

// Display current directory
echo "Current directory: " . getcwd() . "\n";
echo "Parent directory: " . dirname(getcwd()) . "\n\n";

// Change to parent directory (project root)
chdir(dirname(getcwd()));
echo "Changed to: " . getcwd() . "\n\n";

// Display directory contents
echo "Directory contents:\n";
runCommand("ls -la");

// Check if artisan exists
$artisanPath = getcwd() . '/artisan';
if (file_exists($artisanPath)) {
    echo "Artisan file found at: $artisanPath\n";
    
    // Make artisan executable
    runCommand("chmod +x artisan");
    
    // Create storage directories
    runCommand("mkdir -p storage/logs storage/framework/sessions storage/framework/views storage/framework/cache");
    
    // Set permissions
    runCommand("chmod -R 777 storage bootstrap/cache");
    
    // Create log file
    runCommand("touch storage/logs/laravel.log");
    runCommand("chmod 666 storage/logs/laravel.log");
    
    // Copy environment file
    if (file_exists('.env.coolify')) {
        runCommand("cp .env.coolify .env");
    } else {
        echo ".env.coolify not found\n";
        if (file_exists('.env.example')) {
            runCommand("cp .env.example .env");
        }
    }
    
    // Run Laravel commands
    runCommand("php artisan key:generate --force");
    runCommand("php artisan config:clear");
    runCommand("php artisan cache:clear");
    runCommand("php artisan view:clear");
    runCommand("php artisan route:clear");
    runCommand("php artisan storage:link");
    runCommand("php artisan migrate --force");
    
    // Install dependencies and build assets
    if (file_exists('package.json')) {
        runCommand("npm install");
        runCommand("npm run build");
    }
    
    echo "Post-deployment completed\n";
} else {
    echo "Artisan file NOT found at: $artisanPath\n";
    echo "Searching for artisan file:\n";
    runCommand("find . -name 'artisan' -type f");
}

// Return to original directory
chdir(dirname(getcwd()) . '/public');
echo "Changed back to: " . getcwd() . "\n";
