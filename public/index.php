<?php

// This is a PHP 5.3 compatible index.php file

// Define the application start time
define('LARAVEL_START', microtime(true));

// Check for maintenance mode
if (file_exists($maintenance = dirname(__FILE__).'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader
require dirname(__FILE__).'/../vendor/autoload.php';

// Bootstrap the application
$app = require_once dirname(__FILE__).'/../bootstrap/app.php';

// Run the application
$kernel = $app->make('Illuminate\Contracts\Http\Kernel');

$request = Illuminate\Http\Request::capture();
$response = $kernel->handle($request);

$response->send();

$kernel->terminate($request, $response);
