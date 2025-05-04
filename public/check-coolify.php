<?php
// Script to check Coolify deployment
header('Content-Type: text/plain');

echo "Coolify Deployment Check\n";
echo "======================\n\n";

// Get the project root directory
$rootDir = dirname(__DIR__);
echo "Project root: $rootDir\n\n";

// Check for Coolify configuration
$coolifyJsonPath = $rootDir . '/coolify.json';
if (file_exists($coolifyJsonPath)) {
    echo "coolify.json found at:\n$coolifyJsonPath\n\n";
    
    // Parse coolify.json
    $coolifyJson = json_decode(file_get_contents($coolifyJsonPath), true);
    if ($coolifyJson) {
        echo "Coolify configuration:\n";
        echo "Version: " . ($coolifyJson['version'] ?? 'not specified') . "\n";
        echo "Type: " . ($coolifyJson['type'] ?? 'not specified') . "\n";
        
        // Check services
        if (isset($coolifyJson['services']) && is_array($coolifyJson['services'])) {
            echo "Services: " . implode(', ', array_keys($coolifyJson['services'])) . "\n";
        }
        
        // Check volumes
        if (isset($coolifyJson['volumes']) && is_array($coolifyJson['volumes'])) {
            echo "Volumes: " . implode(', ', $coolifyJson['volumes']) . "\n";
        }
        
        // Check networks
        if (isset($coolifyJson['networks']) && is_array($coolifyJson['networks'])) {
            echo "Networks: " . implode(', ', $coolifyJson['networks']) . "\n";
        }
        
        echo "\n";
    }
} else {
    echo "coolify.json NOT found at:\n$coolifyJsonPath\n\n";
}

// Check for .env.coolify
$envCoolifyPath = $rootDir . '/.env.coolify';
if (file_exists($envCoolifyPath)) {
    echo ".env.coolify found at:\n$envCoolifyPath\n\n";
    
    // Check if it contains APP_KEY
    $envContents = file_get_contents($envCoolifyPath);
    $hasAppKey = preg_match('/APP_KEY=.+/', $envContents);
    echo "Contains APP_KEY: " . ($hasAppKey ? "Yes" : "No") . "\n\n";
} else {
    echo ".env.coolify NOT found at:\n$envCoolifyPath\n\n";
}

// Check for docker-compose.yml
$dockerComposePath = $rootDir . '/docker-compose.yml';
if (file_exists($dockerComposePath)) {
    echo "docker-compose.yml found at:\n$dockerComposePath\n\n";
} else {
    echo "docker-compose.yml NOT found at:\n$dockerComposePath\n\n";
}

// Check for Dockerfile
$dockerfilePath = $rootDir . '/Dockerfile';
if (file_exists($dockerfilePath)) {
    echo "Dockerfile found at:\n$dockerfilePath\n\n";
} else {
    echo "Dockerfile NOT found at:\n$dockerfilePath\n\n";
}

// Check for docker directory
$dockerDirPath = $rootDir . '/docker';
if (is_dir($dockerDirPath)) {
    echo "docker directory found at:\n$dockerDirPath\n";
    
    // List contents
    $files = scandir($dockerDirPath);
    echo "Contents:\n";
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            $fullPath = $dockerDirPath . '/' . $file;
            $type = is_dir($fullPath) ? 'Directory' : 'File';
            echo "- $file ($type)\n";
        }
    }
    
    echo "\n";
} else {
    echo "docker directory NOT found at:\n$dockerDirPath\n\n";
}

// Check for docker-entrypoint.sh
$entrypointPath = $rootDir . '/docker-entrypoint.sh';
if (file_exists($entrypointPath)) {
    echo "docker-entrypoint.sh found at:\n$entrypointPath\n\n";
    
    // Check if it's executable
    $isExecutable = is_executable($entrypointPath);
    echo "Entrypoint is executable: " . ($isExecutable ? "Yes" : "No") . "\n";
    
    // Make it executable if it's not
    if (!$isExecutable) {
        echo "Making entrypoint executable...\n";
        if (chmod($entrypointPath, 0755)) {
            echo "Successfully made entrypoint executable.\n";
        } else {
            echo "Failed to make entrypoint executable!\n";
        }
    }
    
    echo "\n";
} else {
    echo "docker-entrypoint.sh NOT found at:\n$entrypointPath\n\n";
}

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
