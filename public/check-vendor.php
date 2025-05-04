<?php
// Script to check vendor directory and autoload.php file
header('Content-Type: text/plain');

echo "Vendor Directory Check\n";
echo "====================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check for vendor directory
$vendorPath = $parentDir . '/vendor';
echo "Checking vendor directory: $vendorPath\n";
if (is_dir($vendorPath)) {
    echo "Vendor directory exists.\n";
    
    // List contents
    $vendorContents = scandir($vendorPath);
    echo "Vendor directory contents: " . implode(', ', $vendorContents) . "\n\n";
    
    // Check for autoload.php
    $autoloadPath = $vendorPath . '/autoload.php';
    echo "Checking autoload.php: $autoloadPath\n";
    if (file_exists($autoloadPath)) {
        echo "autoload.php exists.\n";
        
        // Check content
        $autoloadContent = file_get_contents($autoloadPath);
        echo "autoload.php content:\n";
        echo $autoloadContent . "\n\n";
        
        // Try to require autoload.php
        echo "Trying to require autoload.php...\n";
        try {
            require_once $autoloadPath;
            echo "autoload.php required successfully.\n";
        } catch (Exception $e) {
            echo "Failed to require autoload.php: " . $e->getMessage() . "\n";
        }
    } else {
        echo "autoload.php does not exist!\n";
    }
    
    // Check for composer directory
    $composerPath = $vendorPath . '/composer';
    echo "\nChecking composer directory: $composerPath\n";
    if (is_dir($composerPath)) {
        echo "Composer directory exists.\n";
        
        // List contents
        $composerContents = scandir($composerPath);
        echo "Composer directory contents: " . implode(', ', $composerContents) . "\n";
    } else {
        echo "Composer directory does not exist!\n";
    }
    
    // Check for illuminate directory
    $illuminatePath = $vendorPath . '/laravel/framework/src/Illuminate';
    echo "\nChecking Illuminate directory: $illuminatePath\n";
    if (is_dir($illuminatePath)) {
        echo "Illuminate directory exists.\n";
        
        // List contents
        $illuminateContents = scandir($illuminatePath);
        echo "Illuminate directory contents: " . implode(', ', $illuminateContents) . "\n";
        
        // Check for Foundation directory
        $foundationPath = $illuminatePath . '/Foundation';
        echo "\nChecking Foundation directory: $foundationPath\n";
        if (is_dir($foundationPath)) {
            echo "Foundation directory exists.\n";
            
            // List contents
            $foundationContents = scandir($foundationPath);
            echo "Foundation directory contents: " . implode(', ', $foundationContents) . "\n";
            
            // Check for Application.php
            $applicationPath = $foundationPath . '/Application.php';
            echo "\nChecking Application.php: $applicationPath\n";
            if (file_exists($applicationPath)) {
                echo "Application.php exists.\n";
                
                // Check content
                $applicationContent = file_get_contents($applicationPath);
                echo "Application.php content (first 20 lines):\n";
                $applicationLines = explode("\n", $applicationContent);
                for ($i = 0; $i < min(20, count($applicationLines)); $i++) {
                    echo $applicationLines[$i] . "\n";
                }
            } else {
                echo "Application.php does not exist!\n";
            }
        } else {
            echo "Foundation directory does not exist!\n";
        }
    } else {
        echo "Illuminate directory does not exist!\n";
    }
} else {
    echo "Vendor directory does not exist!\n";
    
    // Try to create vendor directory
    echo "\nTrying to create vendor directory...\n";
    if (mkdir($vendorPath, 0777, true)) {
        echo "Vendor directory created successfully.\n";
    } else {
        echo "Failed to create vendor directory!\n";
    }
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
