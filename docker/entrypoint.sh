#!/bin/bash
set -e

echo "Starting Laravel application..."

# Create necessary directories
mkdir -p /app/storage/app/public
mkdir -p /app/storage/framework/cache
mkdir -p /app/storage/framework/sessions
mkdir -p /app/storage/framework/views
mkdir -p /app/storage/logs
mkdir -p /app/bootstrap/cache

# Set proper permissions
chown -R www-data:www-data /app/storage /app/bootstrap/cache
chmod -R 775 /app/storage /app/bootstrap/cache

# Generate application key if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then
    php /app/artisan key:generate --force || true
fi

# Run migrations if DB_CONNECTION is set
if [ ! -z "$DB_CONNECTION" ]; then
    php /app/artisan migrate --force || true
fi

# Clear caches
php /app/artisan config:clear || true
php /app/artisan cache:clear || true
php /app/artisan view:clear || true
php /app/artisan route:clear || true

# Create storage link
php /app/artisan storage:link || true

echo "Laravel application is ready!"

# Start services
exec "$@"
