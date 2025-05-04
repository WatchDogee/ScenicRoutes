<?php
// Script to check nginx configuration
header('Content-Type: text/plain');

echo "Nginx Configuration Check\n";
echo "=======================\n\n";

// Function to run a command and display output
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

// Check nginx version
runCommand("nginx -v");

// Check nginx configuration
runCommand("nginx -t");

// Check nginx status
runCommand("service nginx status");

// Check nginx configuration files
$configFiles = [
    '/etc/nginx/nginx.conf',
    '/etc/nginx/conf.d/default.conf',
    '/opt/docker/etc/nginx/main.conf',
    '/opt/docker/etc/nginx/conf.d/10-php.conf',
    '/opt/docker/etc/nginx/vhost.conf'
];

echo "Checking nginx configuration files:\n";
foreach ($configFiles as $file) {
    if (file_exists($file)) {
        echo "$file: EXISTS\n";
        $content = file_get_contents($file);
        echo "Content (first 20 lines):\n";
        $lines = explode("\n", $content);
        for ($i = 0; $i < min(20, count($lines)); $i++) {
            echo $lines[$i] . "\n";
        }
        echo "\n";
    } else {
        echo "$file: NOT FOUND\n";
    }
}

// Check nginx logs
$logFiles = [
    '/var/log/nginx/access.log',
    '/var/log/nginx/error.log'
];

echo "Checking nginx log files:\n";
foreach ($logFiles as $file) {
    if (file_exists($file)) {
        echo "$file: EXISTS\n";
        if (is_readable($file)) {
            $content = file_get_contents($file);
            echo "Content (last 20 lines):\n";
            $lines = explode("\n", $content);
            $lastLines = array_slice($lines, -20);
            foreach ($lastLines as $line) {
                echo $line . "\n";
            }
        } else {
            echo "File is not readable\n";
        }
        echo "\n";
    } else {
        echo "$file: NOT FOUND\n";
    }
}

// Check nginx processes
runCommand("ps aux | grep nginx");

// Check listening ports
runCommand("netstat -tulpn | grep nginx");

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
