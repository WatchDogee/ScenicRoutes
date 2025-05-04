<?php
// Script to check the current artisan file
header('Content-Type: text/plain');

echo "Current Artisan File Check\n";
echo "=======================\n\n";

// Check for artisan file
$artisanPath = '/app/artisan';
echo "Checking artisan file: $artisanPath\n";
if (file_exists($artisanPath)) {
    echo "Artisan file exists.\n";
    
    // Check if artisan is executable
    $isExecutable = is_executable($artisanPath);
    echo "Artisan is executable: " . ($isExecutable ? "Yes" : "No") . "\n";
    
    // Check artisan content
    $artisanContent = file_get_contents($artisanPath);
    echo "Artisan content:\n";
    echo $artisanContent . "\n\n";
    
    // Check for syntax errors
    echo "Checking for syntax errors...\n";
    $output = [];
    $returnVar = 0;
    exec("php -l $artisanPath 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
} else {
    echo "Artisan file does not exist!\n";
}

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
