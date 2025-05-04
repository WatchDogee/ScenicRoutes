<?php
// Script to create a very simple artisan file
header('Content-Type: text/plain');

echo "Simple Artisan File Creator\n";
echo "========================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Create artisan file
$artisanPath = $parentDir . '/artisan';
echo "Creating artisan file at: $artisanPath\n";

$artisanContent = <<<'EOL'
#!/usr/bin/env php
<?php

// This is a very simple artisan file that should work with any PHP version

// Define the application start time
define('LARAVEL_START', microtime(true));

// Register the Composer autoloader
require __DIR__.'/vendor/autoload.php';

// Bootstrap the application
$app = require_once __DIR__.'/bootstrap/app.php';

// Get the kernel
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');

// Handle the command
$input = new Symfony\Component\Console\Input\ArgvInput;
$output = new Symfony\Component\Console\Output\ConsoleOutput;
$status = $kernel->handle($input, $output);

// Terminate the kernel
$kernel->terminate($input, $status);

// Exit with the status code
exit($status);
EOL;

if (file_put_contents($artisanPath, $artisanContent)) {
    echo "Artisan file created successfully.\n";
    
    // Make artisan executable
    if (chmod($artisanPath, 0755)) {
        echo "Made artisan file executable.\n";
    } else {
        echo "Failed to make artisan file executable!\n";
    }
    
    // Check for syntax errors
    echo "Checking for syntax errors...\n";
    $output = [];
    $returnVar = 0;
    exec("php -l $artisanPath 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
    
    // Try to run artisan commands
    echo "Trying to run artisan commands...\n";
    $commands = [
        'cd ' . $parentDir . ' && php artisan --version',
        'cd ' . $parentDir . ' && php artisan list',
        'cd ' . $parentDir . ' && php artisan env'
    ];
    
    foreach ($commands as $command) {
        echo "Running: $command\n";
        $output = [];
        $returnVar = 0;
        exec($command . " 2>&1", $output, $returnVar);
        
        echo "Return code: $returnVar\n";
        echo "Output:\n";
        echo implode("\n", $output) . "\n\n";
    }
} else {
    echo "Failed to create artisan file!\n";
}

echo "Creation completed at " . date('Y-m-d H:i:s') . "\n";
