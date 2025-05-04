<?php
// Script to check PHP-FPM configuration
header('Content-Type: text/plain');

echo "PHP-FPM Configuration Check\n";
echo "=========================\n\n";

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

// Check PHP version
echo "PHP version: " . phpversion() . "\n";
echo "PHP SAPI: " . php_sapi_name() . "\n";
echo "PHP loaded extensions: " . implode(', ', get_loaded_extensions()) . "\n\n";

// Check PHP-FPM status
runCommand("service php-fpm status");

// Check PHP-FPM configuration files
$configFiles = [
    '/usr/local/etc/php-fpm.conf',
    '/usr/local/etc/php-fpm.d/www.conf',
    '/etc/php-fpm.conf',
    '/etc/php-fpm.d/www.conf',
    '/opt/docker/etc/php/fpm/php-fpm.conf',
    '/opt/docker/etc/php/fpm/pool.d/application.conf'
];

echo "Checking PHP-FPM configuration files:\n";
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

// Check PHP-FPM logs
$logFiles = [
    '/var/log/php-fpm/error.log',
    '/var/log/php-fpm.log',
    '/var/log/php-fpm/www-error.log'
];

echo "Checking PHP-FPM log files:\n";
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

// Check PHP-FPM processes
runCommand("ps aux | grep php-fpm");

// Check listening ports
runCommand("netstat -tulpn | grep php-fpm");

// Check PHP configuration
echo "PHP configuration:\n";
$iniPath = php_ini_loaded_file();
echo "PHP ini file: $iniPath\n";
if (file_exists($iniPath)) {
    $content = file_get_contents($iniPath);
    echo "Content (first 20 lines):\n";
    $lines = explode("\n", $content);
    for ($i = 0; $i < min(20, count($lines)); $i++) {
        echo $lines[$i] . "\n";
    }
}
echo "\n";

// Check PHP extensions
echo "PHP extensions directory: " . ini_get('extension_dir') . "\n";
echo "PHP extensions: " . implode(', ', get_loaded_extensions()) . "\n\n";

// Check PHP error reporting
echo "PHP error reporting: " . ini_get('error_reporting') . "\n";
echo "PHP display errors: " . ini_get('display_errors') . "\n";
echo "PHP log errors: " . ini_get('log_errors') . "\n";
echo "PHP error log: " . ini_get('error_log') . "\n\n";

// Check PHP memory limit
echo "PHP memory limit: " . ini_get('memory_limit') . "\n";
echo "PHP max execution time: " . ini_get('max_execution_time') . "\n";
echo "PHP max input time: " . ini_get('max_input_time') . "\n";
echo "PHP post max size: " . ini_get('post_max_size') . "\n";
echo "PHP upload max filesize: " . ini_get('upload_max_filesize') . "\n\n";

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
