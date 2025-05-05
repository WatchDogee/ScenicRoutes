<?php
// Debug script to help troubleshoot deployment issues

// Display PHP info
echo "<h1>PHP Info</h1>";
echo "<pre>";
echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Script Filename: " . $_SERVER['SCRIPT_FILENAME'] . "\n";
echo "Request URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "</pre>";

// Check if Laravel is installed
echo "<h1>Laravel Check</h1>";
echo "<pre>";
if (file_exists(__DIR__ . '/../vendor/laravel/framework/src/Illuminate/Foundation/Application.php')) {
    echo "Laravel framework found.\n";
} else {
    echo "Laravel framework not found!\n";
}
echo "</pre>";

// Check storage directory permissions
echo "<h1>Storage Directory Permissions</h1>";
echo "<pre>";
$storageDir = __DIR__ . '/../storage';
if (is_dir($storageDir)) {
    echo "Storage directory exists.\n";
    echo "Storage directory permissions: " . substr(sprintf('%o', fileperms($storageDir)), -4) . "\n";
    
    $dirs = ['app', 'framework', 'logs'];
    foreach ($dirs as $dir) {
        $path = $storageDir . '/' . $dir;
        if (is_dir($path)) {
            echo "$dir directory exists. Permissions: " . substr(sprintf('%o', fileperms($path)), -4) . "\n";
        } else {
            echo "$dir directory does not exist!\n";
        }
    }
    
    // Check framework subdirectories
    $frameworkDir = $storageDir . '/framework';
    if (is_dir($frameworkDir)) {
        $subdirs = ['cache', 'sessions', 'views'];
        foreach ($subdirs as $subdir) {
            $path = $frameworkDir . '/' . $subdir;
            if (is_dir($path)) {
                echo "framework/$subdir directory exists. Permissions: " . substr(sprintf('%o', fileperms($path)), -4) . "\n";
            } else {
                echo "framework/$subdir directory does not exist!\n";
            }
        }
    }
} else {
    echo "Storage directory does not exist!\n";
}
echo "</pre>";

// Check bootstrap/cache directory permissions
echo "<h1>Bootstrap/Cache Directory Permissions</h1>";
echo "<pre>";
$cacheDir = __DIR__ . '/../bootstrap/cache';
if (is_dir($cacheDir)) {
    echo "Bootstrap/cache directory exists.\n";
    echo "Bootstrap/cache directory permissions: " . substr(sprintf('%o', fileperms($cacheDir)), -4) . "\n";
} else {
    echo "Bootstrap/cache directory does not exist!\n";
}
echo "</pre>";

// Check environment variables
echo "<h1>Environment Variables</h1>";
echo "<pre>";
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    echo ".env file exists.\n";
    
    // List important environment variables (without showing sensitive values)
    $importantVars = [
        'APP_ENV', 'APP_DEBUG', 'APP_URL', 
        'DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME',
        'SESSION_DRIVER', 'CACHE_DRIVER', 'QUEUE_CONNECTION',
        'MAIL_MAILER', 'MAIL_HOST', 'MAIL_PORT',
        'SESSION_DOMAIN', 'SANCTUM_STATEFUL_DOMAINS'
    ];
    
    foreach ($importantVars as $var) {
        if (getenv($var) !== false) {
            if (in_array($var, ['DB_PASSWORD', 'MAIL_PASSWORD'])) {
                echo "$var: [HIDDEN]\n";
            } else {
                echo "$var: " . getenv($var) . "\n";
            }
        } else {
            echo "$var: Not set\n";
        }
    }
} else {
    echo ".env file does not exist!\n";
}
echo "</pre>";

// Check public/storage symlink
echo "<h1>Public/Storage Symlink</h1>";
echo "<pre>";
if (is_link(__DIR__ . '/storage')) {
    echo "Public/storage symlink exists.\n";
    echo "Symlink target: " . readlink(__DIR__ . '/storage') . "\n";
} else {
    echo "Public/storage symlink does not exist!\n";
}
echo "</pre>";

// Check database connection
echo "<h1>Database Connection</h1>";
echo "<pre>";
try {
    $dbConnection = getenv('DB_CONNECTION');
    $dbHost = getenv('DB_HOST');
    $dbPort = getenv('DB_PORT');
    $dbName = getenv('DB_DATABASE');
    $dbUser = getenv('DB_USERNAME');
    $dbPass = getenv('DB_PASSWORD');
    
    if ($dbConnection && $dbHost && $dbPort && $dbName && $dbUser && $dbPass) {
        echo "Database configuration found.\n";
        echo "Attempting to connect to database...\n";
        
        $dsn = "$dbConnection:host=$dbHost;port=$dbPort;dbname=$dbName";
        $pdo = new PDO($dsn, $dbUser, $dbPass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        echo "Successfully connected to database!\n";
        
        // Check if migrations have been run
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo "Database tables found: " . count($tables) . "\n";
        if (count($tables) > 0) {
            echo "Tables: " . implode(', ', $tables) . "\n";
        } else {
            echo "No tables found. Migrations may not have been run.\n";
        }
    } else {
        echo "Database configuration incomplete.\n";
    }
} catch (PDOException $e) {
    echo "Database connection failed: " . $e->getMessage() . "\n";
}
echo "</pre>";

// Check for common Laravel errors in the log
echo "<h1>Recent Laravel Errors</h1>";
echo "<pre>";
$logFile = __DIR__ . '/../storage/logs/laravel.log';
if (file_exists($logFile)) {
    echo "Laravel log file exists.\n";
    
    // Get the last 10 lines containing "error" or "exception"
    $log = file_get_contents($logFile);
    $lines = explode("\n", $log);
    $errorLines = [];
    
    foreach ($lines as $line) {
        if (stripos($line, 'error') !== false || stripos($line, 'exception') !== false) {
            $errorLines[] = $line;
        }
    }
    
    $errorLines = array_slice($errorLines, -10);
    
    if (count($errorLines) > 0) {
        echo "Last " . count($errorLines) . " error entries:\n\n";
        foreach ($errorLines as $line) {
            echo htmlspecialchars($line) . "\n";
        }
    } else {
        echo "No errors found in the log file.\n";
    }
} else {
    echo "Laravel log file does not exist!\n";
}
echo "</pre>";

