<?php
// Script to check the current index.php file
header('Content-Type: text/plain');

echo "Current Index.php File Check\n";
echo "=========================\n\n";

// Check for index.php file
$indexPhpPath = '/app/public/index.php';
echo "Checking index.php file: $indexPhpPath\n";
if (file_exists($indexPhpPath)) {
    echo "Index.php file exists.\n";
    
    // Check index.php content
    $indexPhpContent = file_get_contents($indexPhpPath);
    echo "Index.php content:\n";
    echo $indexPhpContent . "\n\n";
    
    // Check for syntax errors
    echo "Checking for syntax errors...\n";
    $output = [];
    $returnVar = 0;
    exec("php -l $indexPhpPath 2>&1", $output, $returnVar);
    
    echo "Return code: $returnVar\n";
    echo "Output:\n";
    echo implode("\n", $output) . "\n\n";
} else {
    echo "Index.php file does not exist!\n";
}

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
