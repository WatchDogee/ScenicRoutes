<?php
// Application status check script
header('Content-Type: text/plain');

echo "ScenicRoutes Application Status Check\n";
echo "==================================\n\n";

// Check Laravel version
echo "Laravel Version: ";
if (file_exists(__DIR__ . '/../vendor/laravel/framework/src/Illuminate/Foundation/Application.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
    echo app()->version() . "\n";
} else {
    echo "Laravel not found\n";
}

// Check environment
echo "Environment: " . (getenv('APP_ENV') ?: 'Not set') . "\n";
echo "Debug Mode: " . (getenv('APP_DEBUG') ? 'Enabled' : 'Disabled') . "\n";
echo "App URL: " . (getenv('APP_URL') ?: 'Not set') . "\n\n";

// Check database connection
echo "Database Connection:\n";
try {
    $dbConnection = getenv('DB_CONNECTION') ?: 'mysql';
    $dbHost = getenv('DB_HOST') ?: '127.0.0.1';
    $dbPort = getenv('DB_PORT') ?: '3306';
    $dbName = getenv('DB_DATABASE') ?: 'scenic_routes';
    $dbUser = getenv('DB_USERNAME') ?: 'root';
    $dbPass = getenv('DB_PASSWORD') ?: '';
    
    echo "Connection: $dbConnection\n";
    echo "Host: $dbHost\n";
    echo "Port: $dbPort\n";
    echo "Database: $dbName\n";
    echo "Username: $dbUser\n";
    
    $dsn = "$dbConnection:host=$dbHost;port=$dbPort;dbname=$dbName";
    $pdo = new PDO($dsn, $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Status: Connected successfully\n";
    
    // Check if migrations have been run
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "Tables found: " . count($tables) . "\n";
    if (count($tables) > 0) {
        echo "First 5 tables: " . implode(', ', array_slice($tables, 0, 5)) . "\n";
    }
} catch (PDOException $e) {
    echo "Status: Connection failed - " . $e->getMessage() . "\n";
}

echo "\n";

// Check storage permissions
echo "Storage Permissions:\n";
$storagePath = __DIR__ . '/../storage';
$bootstrapCachePath = __DIR__ . '/../bootstrap/cache';

echo "Storage directory: " . (is_writable($storagePath) ? 'Writable' : 'Not writable') . "\n";
echo "Bootstrap/cache directory: " . (is_writable($bootstrapCachePath) ? 'Writable' : 'Not writable') . "\n\n";

// Check routes
echo "Routes:\n";
if (file_exists(__DIR__ . '/../routes/web.php')) {
    echo "Web routes file exists\n";
} else {
    echo "Web routes file not found\n";
}

if (file_exists(__DIR__ . '/../routes/api.php')) {
    echo "API routes file exists\n";
} else {
    echo "API routes file not found\n";
}

echo "\nStatus check completed at " . date('Y-m-d H:i:s') . "\n";
