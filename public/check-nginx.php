<?php
// Script to check Nginx configuration
header('Content-Type: text/plain');

echo "Nginx Configuration Check\n";
echo "=======================\n\n";

// Check for nginx configuration
$nginxConfigPaths = [
    '/etc/nginx/conf.d/default.conf',
    '/etc/nginx/sites-enabled/default',
    '/etc/nginx/nginx.conf',
    '/opt/docker/etc/nginx/conf.d/10-location-root.conf',
    '/opt/docker/etc/nginx/conf.d/10-php.conf',
    '/opt/docker/etc/nginx/vhost.conf'
];

foreach ($nginxConfigPaths as $path) {
    echo "Checking $path: ";
    if (file_exists($path)) {
        echo "EXISTS\n";
        echo "Content (first 20 lines):\n";
        $content = file_get_contents($path);
        $lines = explode("\n", $content);
        for ($i = 0; $i < min(20, count($lines)); $i++) {
            echo ($i + 1) . ": " . $lines[$i] . "\n";
        }
        echo "\n";
    } else {
        echo "NOT FOUND\n";
    }
}

// Check document root
echo "\nDocument Root Check:\n";
echo "-------------------\n";
echo "Current script path: " . __FILE__ . "\n";
echo "Document root (from server): " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Not available') . "\n";

// Check for public directory
$publicDir = dirname(__FILE__);
echo "Public directory: $publicDir\n";
echo "Parent directory: " . dirname($publicDir) . "\n";

// Check for index.php
$indexPhp = $publicDir . '/index.php';
echo "index.php exists: " . (file_exists($indexPhp) ? 'Yes' : 'No') . "\n";

// Check for environment variables
echo "\nEnvironment Variables:\n";
echo "---------------------\n";
echo "WEB_DOCUMENT_ROOT: " . (getenv('WEB_DOCUMENT_ROOT') ?: 'Not set') . "\n";
echo "DOCUMENT_ROOT: " . (getenv('DOCUMENT_ROOT') ?: 'Not set') . "\n";

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
