#!/bin/bash
# Post-deployment script for ScenicRoutes

# Display current directory and list files
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la

# Create storage directories
mkdir -p storage/logs
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/framework/cache
mkdir -p bootstrap/cache
mkdir -p public

# Set permissions
chmod -R 777 storage
chmod -R 777 bootstrap/cache

# Create log file
touch storage/logs/laravel.log
chmod 666 storage/logs/laravel.log

# Copy environment file if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.coolify" ]; then
    cp .env.coolify .env
    echo "Copied .env.coolify to .env"
fi

# Check if artisan exists
if [ ! -f "artisan" ]; then
    echo "Artisan file not found, creating it..."

    # Create artisan file
    cat > artisan << 'EOL'
#!/usr/bin/env php
<?php

use Illuminate\Foundation\Application;
use Symfony\Component\Console\Input\ArgvInput;

define('LARAVEL_START', microtime(true));

// Register the Composer autoloader...
require __DIR__.'/vendor/autoload.php';

// Bootstrap Laravel and handle the command...
/** @var Application $app */
$app = require_once __DIR__.'/bootstrap/app.php';

$status = $app->handleCommand(new ArgvInput);

exit($status);
EOL

    echo "Artisan file created"
else
    echo "Artisan file found"
fi

# Set permissions
chmod +x artisan

# Run Laravel commands
php artisan key:generate --force || echo "Failed to generate key"
php artisan config:clear || echo "Failed to clear config"
php artisan cache:clear || echo "Failed to clear cache"
php artisan view:clear || echo "Failed to clear views"
php artisan route:clear || echo "Failed to clear routes"
php artisan storage:link || echo "Failed to create storage link"
php artisan migrate --force || echo "Failed to run migrations"

# Install dependencies and build assets
if [ -f "package.json" ]; then
    npm install
    npm run build
fi

echo "Post-deployment completed successfully"
