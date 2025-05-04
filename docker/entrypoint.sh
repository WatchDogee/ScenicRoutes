#!/bin/bash
set -e

# Set permissions
chown -R www-data:www-data /app/storage /app/bootstrap/cache
chmod -R 775 /app/storage /app/bootstrap/cache

# Create Laravel storage symlink
php artisan storage:link || true

# Generate key if not set
if [ -z "$APP_KEY" ]; then
    php artisan key:generate
fi

# Clear caches
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Run migrations
php artisan migrate --force || true

# Start services
exec "$@"
