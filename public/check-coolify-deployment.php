<?php
// Script to check the Coolify deployment process
header('Content-Type: text/plain');

echo "Coolify Deployment Check\n";
echo "======================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check for Coolify configuration files
$coolifyFiles = [
    $parentDir . '/coolify.json',
    $parentDir . '/.env.coolify',
    $parentDir . '/docker-compose.yml',
    $parentDir . '/Dockerfile',
    $parentDir . '/docker-entrypoint.sh'
];

echo "Checking Coolify configuration files:\n";
foreach ($coolifyFiles as $file) {
    echo "$file: " . (file_exists($file) ? "EXISTS" : "NOT FOUND") . "\n";
}

echo "\n";

// Check coolify.json content if it exists
$coolifyJsonPath = $parentDir . '/coolify.json';
if (file_exists($coolifyJsonPath)) {
    echo "coolify.json content:\n";
    $coolifyJson = json_decode(file_get_contents($coolifyJsonPath), true);
    if ($coolifyJson) {
        // Check deploy commands
        if (isset($coolifyJson['deploy']['command']) && is_array($coolifyJson['deploy']['command'])) {
            echo "Deploy commands:\n";
            foreach ($coolifyJson['deploy']['command'] as $index => $command) {
                echo "[$index] $command\n";
            }
        } else {
            echo "No deploy commands found in coolify.json\n";
        }
        
        // Check volumes
        if (isset($coolifyJson['volumes']) && is_array($coolifyJson['volumes'])) {
            echo "\nVolumes:\n";
            foreach ($coolifyJson['volumes'] as $volume) {
                echo "- $volume\n";
            }
        }
        
        // Check services
        if (isset($coolifyJson['services']) && is_array($coolifyJson['services'])) {
            echo "\nServices:\n";
            foreach ($coolifyJson['services'] as $name => $service) {
                echo "- $name\n";
                
                // Check volumes
                if (isset($service['volumes']) && is_array($service['volumes'])) {
                    echo "  Volumes:\n";
                    foreach ($service['volumes'] as $volume) {
                        if (is_array($volume)) {
                            echo "  - " . $volume['source'] . " -> " . $volume['target'] . "\n";
                        } else {
                            echo "  - $volume\n";
                        }
                    }
                }
            }
        }
    } else {
        echo "Failed to parse coolify.json\n";
    }
} else {
    echo "coolify.json not found\n";
}

echo "\n";

// Check docker-compose.yml content if it exists
$dockerComposePath = $parentDir . '/docker-compose.yml';
if (file_exists($dockerComposePath)) {
    echo "docker-compose.yml content (first 20 lines):\n";
    $dockerComposeContent = file_get_contents($dockerComposePath);
    $lines = explode("\n", $dockerComposeContent);
    $linesToShow = min(20, count($lines));
    for ($i = 0; $i < $linesToShow; $i++) {
        echo $lines[$i] . "\n";
    }
    if (count($lines) > $linesToShow) {
        echo "... (truncated)\n";
    }
} else {
    echo "docker-compose.yml not found\n";
}

echo "\n";

// Check for Docker environment
$inDocker = file_exists('/.dockerenv');
echo "Running in Docker container: " . ($inDocker ? "Yes" : "No") . "\n\n";

// Try to get Docker container information
echo "Docker container information:\n";
$output = [];
exec('cat /etc/hostname 2>&1', $output);
echo "Hostname: " . (isset($output[0]) ? $output[0] : 'unknown') . "\n";

$output = [];
exec('cat /proc/self/cgroup 2>&1', $output);
echo "cgroup information:\n";
foreach ($output as $line) {
    echo "$line\n";
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
