<?php

// Add this to your config/database.php 'connections' array

return [
    'mysql_old' => [
        'driver' => 'mysql',
        'url' => env('DATABASE_URL_MYSQL'),
        'host' => env('DB_MYSQL_HOST', '127.0.0.1'),
        'port' => env('DB_MYSQL_PORT', '3306'),
        'database' => env('DB_MYSQL_DATABASE', 'scenic_routes'),
        'username' => env('DB_MYSQL_USERNAME', 'root'),
        'password' => env('DB_MYSQL_PASSWORD', ''),
        'unix_socket' => env('DB_MYSQL_SOCKET', ''),
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => '',
        'prefix_indexes' => true,
        'strict' => true,
        'engine' => null,
        'options' => extension_loaded('pdo_mysql') ? array_filter([
            PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
        ]) : [],
    ],
];
