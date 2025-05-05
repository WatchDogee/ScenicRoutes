<?php
// Script to check directory structure
header('Content-Type: text/plain');

echo "Directory Structure Check\n";
echo "========================\n\n";

// Function to check directory
function checkDirectory($path, $name) {
    echo "$name Directory Check:\n";
    echo "Path: $path\n";
    
    if (is_dir($path)) {
        echo "Exists: Yes\n";
        echo "Writable: " . (is_writable($path) ? "Yes" : "No") . "\n";
        echo "Permissions: " . substr(sprintf('%o', fileperms($path)), -4) . "\n";
        
        // List contents
        echo "Contents:\n";
        $files = scandir($path);
        foreach ($files as $file) {
            if ($file != '.' && $file != '..') {
                $fullPath = $path . '/' . $file;
                $type = is_dir($fullPath) ? 'Directory' : 'File';
                $size = is_file($fullPath) ? filesize($fullPath) . ' bytes' : 'N/A';
                $perms = substr(sprintf('%o', fileperms($fullPath)), -4);
                echo "- $file ($type, $perms, $size)\n";
            }
        }
    } else {
        echo "Exists: No\n";
        
        // Check parent directory
        $parentDir = dirname($path);
        echo "Parent directory ($parentDir) exists: " . (is_dir($parentDir) ? "Yes" : "No") . "\n";
        if (is_dir($parentDir)) {
            echo "Parent directory writable: " . (is_writable($parentDir) ? "Yes" : "No") . "\n";
        }
    }
    
    echo "\n";
}

// Get the project root directory
$rootDir = dirname(__DIR__);
echo "Project root: $rootDir\n\n";

// Check important directories
checkDirectory($rootDir, "Root");
checkDirectory($rootDir . '/bootstrap', "Bootstrap");
checkDirectory($rootDir . '/bootstrap/cache', "Bootstrap/Cache");
checkDirectory($rootDir . '/storage', "Storage");
checkDirectory($rootDir . '/storage/logs', "Storage/Logs");
checkDirectory($rootDir . '/storage/framework', "Storage/Framework");
checkDirectory($rootDir . '/storage/framework/views', "Storage/Framework/Views");
checkDirectory($rootDir . '/storage/framework/cache', "Storage/Framework/Cache");
checkDirectory($rootDir . '/storage/framework/sessions', "Storage/Framework/Sessions");
checkDirectory($rootDir . '/vendor', "Vendor");
checkDirectory($rootDir . '/public', "Public");

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
