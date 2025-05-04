<?php
// Script to run the deployment process
header('Content-Type: text/plain');

echo "Deployment Process Runner\n";
echo "=======================\n\n";

// Get the project root directory
$rootDir = dirname(__DIR__);
echo "Project root: $rootDir\n\n";

// Function to run command
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

// Step 1: Create directories
echo "Step 1: Creating directories...\n";
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
    if (!is_dir($dir)) {
        echo "Creating: $dir\n";
        if (mkdir($dir, 0777, true)) {
            echo "Created successfully.\n";
        } else {
            echo "Failed to create!\n";
        }
    } else {
        echo "Already exists: $dir\n";
    }
    
    // Set permissions
    if (is_dir($dir)) {
        if (chmod($dir, 0777)) {
            echo "Permissions set to 777.\n";
        } else {
            echo "Failed to set permissions!\n";
        }
    }
}

echo "\n";

// Step 2: Create Laravel log file
$logFile = $rootDir . '/storage/logs/laravel.log';
if (!file_exists($logFile)) {
    echo "Step 2: Creating Laravel log file...\n";
    if (file_put_contents($logFile, '')) {
        echo "Created successfully.\n";
        chmod($logFile, 0666);
        echo "Set permissions to 666.\n";
    } else {
        echo "Failed to create!\n";
    }
} else {
    echo "Step 2: Laravel log file already exists.\n";
    chmod($logFile, 0666);
    echo "Set permissions to 666.\n";
}

echo "\n";

// Step 3: Copy .env.coolify to .env if needed
$envPath = $rootDir . '/.env';
$envCoolifyPath = $rootDir . '/.env.coolify';
if (!file_exists($envPath) && file_exists($envCoolifyPath)) {
    echo "Step 3: Copying .env.coolify to .env...\n";
    if (copy($envCoolifyPath, $envPath)) {
        echo "Copy successful.\n";
    } else {
        echo "Copy failed!\n";
    }
} else {
    echo "Step 3: .env file already exists or .env.coolify not found.\n";
}

echo "\n";

// Step 4: Make artisan executable
$artisanPath = $rootDir . '/artisan';
if (file_exists($artisanPath)) {
    echo "Step 4: Making artisan executable...\n";
    if (chmod($artisanPath, 0755)) {
        echo "Successfully made artisan executable.\n";
    } else {
        echo "Failed to make artisan executable!\n";
    }
    
    // Step 5: Run artisan commands
    echo "\nStep 5: Running artisan commands...\n";
    $commands = [
        "php $artisanPath key:generate --force",
        "php $artisanPath config:clear",
        "php $artisanPath cache:clear",
        "php $artisanPath view:clear",
        "php $artisanPath route:clear",
        "php $artisanPath storage:link",
        "php $artisanPath migrate --force"
    ];
    
    foreach ($commands as $command) {
        runCommand($command);
    }
} else {
    echo "Step 4: Artisan file not found!\n";
}

// Step 6: Install npm dependencies and build assets
if (file_exists($rootDir . '/package.json')) {
    echo "Step 6: Installing npm dependencies and building assets...\n";
    chdir($rootDir);
    runCommand("npm install");
    runCommand("npm run build");
} else {
    echo "Step 6: package.json not found, skipping npm steps.\n";
}

echo "\nDeployment process completed at " . date('Y-m-d H:i:s') . "\n";
