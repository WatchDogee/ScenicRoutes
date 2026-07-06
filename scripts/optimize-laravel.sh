#!/bin/bash
set -e

echo "Running Laravel optimization commands..."

# Clear all caches first
echo "Clearing all caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Run optimization commands
echo "Running optimization commands..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Optimize autoloader
echo "Optimizing Composer autoloader..."
composer dump-autoload --optimize --no-dev

echo "Laravel optimization completed successfully!"
