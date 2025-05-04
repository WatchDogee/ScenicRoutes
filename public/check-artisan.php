<?php
// Script to check artisan file
header('Content-Type: text/plain');

echo "Artisan File Check\n";
echo "=================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check for artisan file
$artisanPath = $parentDir . '/artisan';
if (file_exists($artisanPath)) {
    echo "Artisan file found at: $artisanPath\n";
    
    // Check if artisan is executable
    $isExecutable = is_executable($artisanPath);
    echo "Artisan is executable: " . ($isExecutable ? "Yes" : "No") . "\n";
    
    // Check artisan content
    $artisanContent = file_get_contents($artisanPath);
    echo "Artisan content:\n";
    echo $artisanContent . "\n\n";
    
    // Check for syntax errors
    echo "Checking for syntax errors...\n";
    $tempFile = tempnam(sys_get_temp_dir(), 'artisan_check');
    file_put_contents($tempFile, $artisanContent);
    
    $output = [];
    $returnVar = 0;
    exec("php -l $tempFile 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
    
    unlink($tempFile);
} else {
    echo "Artisan file NOT found at: $artisanPath\n";
    
    // Search for artisan file
    echo "Searching for artisan file...\n";
    $output = [];
    exec("find $parentDir -name artisan -type f 2>/dev/null", $output);
    
    if (!empty($output)) {
        foreach ($output as $file) {
            echo "Found: $file\n";
        }
    } else {
        echo "No artisan file found in parent directory and subdirectories.\n";
    }
}
echo "\n";

// Try to run artisan commands
echo "Trying to run artisan commands...\n";
$commands = [
    'php ' . $artisanPath . ' --version',
    'php ' . $artisanPath . ' list',
    'php ' . $artisanPath . ' env'
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

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
