#!/bin/bash
echo "Starting deployment process..."

# Laravel commands
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
php artisan optimize

# Set permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

echo "Deployment completed successfully!"