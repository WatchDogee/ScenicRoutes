<?php
// Script to check database connection
header('Content-Type: text/plain');

echo "Database Connection Check\n";
echo "========================\n\n";

// Get environment variables
$dbConnection = getenv('DB_CONNECTION') ?: 'mysql';
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbDatabase = getenv('DB_DATABASE') ?: 'laravel';
$dbUsername = getenv('DB_USERNAME') ?: 'root';
$dbPassword = getenv('DB_PASSWORD') ?: '';

echo "Database configuration:\n";
echo "DB_CONNECTION: $dbConnection\n";
echo "DB_HOST: $dbHost\n";
echo "DB_PORT: $dbPort\n";
echo "DB_DATABASE: $dbDatabase\n";
echo "DB_USERNAME: $dbUsername\n";
echo "DB_PASSWORD: " . (empty($dbPassword) ? 'not set' : '********') . "\n\n";

// Try to connect to the database
echo "Attempting to connect to the database...\n";
try {
    $dsn = "$dbConnection:host=$dbHost;port=$dbPort;dbname=$dbDatabase";
    $pdo = new PDO($dsn, $dbUsername, $dbPassword);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connection successful!\n\n";
    
    // Check database version
    $stmt = $pdo->query("SELECT VERSION()");
    $version = $stmt->fetchColumn();
    echo "Database version: $version\n\n";
    
    // Check database tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($tables) > 0) {
        echo "Database tables:\n";
        foreach ($tables as $table) {
            echo "- $table\n";
            
            // Check table structure
            $stmt = $pdo->query("DESCRIBE $table");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "  Columns:\n";
            foreach ($columns as $column) {
                echo "  - " . $column['Field'] . " (" . $column['Type'] . ")\n";
            }
            
            // Check row count
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
            $count = $stmt->fetchColumn();
            
            echo "  Row count: $count\n\n";
        }
    } else {
        echo "No tables found in the database.\n\n";
    }
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n\n";
}

// Check for .env file
$parentDir = dirname(getcwd());
$envPath = $parentDir . '/.env';
if (file_exists($envPath)) {
    echo ".env file found at: $envPath\n";
    $envContent = file_get_contents($envPath);
    $envLines = explode("\n", $envContent);
    $dbEnvVars = [];
    foreach ($envLines as $line) {
        if (strpos($line, 'DB_') === 0 && strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!empty($key) && !empty($value)) {
                if ($key === 'DB_PASSWORD') {
                    $dbEnvVars[$key] = '********';
                } else {
                    $dbEnvVars[$key] = $value;
                }
            }
        }
    }
    echo "Database environment variables in .env file: " . json_encode($dbEnvVars, JSON_PRETTY_PRINT) . "\n";
} else {
    echo ".env file NOT found at: $envPath\n";
}
echo "\n";

echo "Check completed at " . date('Y-m-d H:i:s') . "\n";
