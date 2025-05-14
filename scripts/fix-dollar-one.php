<?php

// Get all PHP files in the project
$directory = __DIR__ . '/..';
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($directory)
);

// Directories to exclude
$excludeDirs = [
    'vendor',
    'node_modules',
    '.git',
    'storage/framework',
    'bootstrap/cache'
];

// Count of fixed files
$fixedCount = 0;

// Process each file
foreach ($files as $file) {
    // Skip directories and non-PHP files
    if ($file->isDir() || $file->getExtension() !== 'php') {
        continue;
    }
    
    // Skip excluded directories
    $relativePath = str_replace($directory . '/', '', $file->getPathname());
    $skip = false;
    foreach ($excludeDirs as $excludeDir) {
        if (strpos($relativePath, $excludeDir) === 0) {
            $skip = true;
            break;
        }
    }
    if ($skip) {
        continue;
    }
    
    // Read file content
    $content = file_get_contents($file->getPathname());
    
    // Check if the file contains
if (strpos($content, '
') !== false) {
        // Replace
with empty string
        $newContent = preg_replace('/\s*\
\s*/', "\n", $content);
        
        // Write the modified content back to the file
        file_put_contents($file->getPathname(), $newContent);
        
        echo "Fixed: {$relativePath}\n";
        $fixedCount++;
    }
}

echo "Fixed {$fixedCount} files\n";
