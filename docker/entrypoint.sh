#!/bin/bash
set -e

# Display PHP and Node.js versions
echo "PHP version: $(php -v | head -n 1)"
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

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
touch /app/storage/logs/laravel.log
chmod 664 /app/storage/logs/laravel.log

# Wait for database if DB_HOST is set
if [ ! -z "$DB_HOST" ]; then
    echo "Waiting for database at $DB_HOST:$DB_PORT..."

    # Use a timeout to avoid hanging indefinitely
    timeout=60
    counter=0

    until mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "SELECT 1" &> /dev/null
    do
        if [ $counter -gt $timeout ]; then
            echo "ERROR: Timed out waiting for database to be ready"
            exit 1
        fi
        echo "Database not ready yet. Waiting..."
        sleep 1
        counter=$((counter+1))
    done

    echo "Database is ready!"
fi

# Generate application key if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then
    echo "Generating application key..."
    php /app/artisan key:generate --force
fi

# Run migrations if DB_CONNECTION is set
if [ ! -z "$DB_CONNECTION" ]; then
    echo "Running database migrations..."
    php /app/artisan migrate --force || echo "Migration failed, but continuing..."
fi

# Clear caches
echo "Clearing application caches..."
php /app/artisan config:clear
php /app/artisan cache:clear
php /app/artisan view:clear
php /app/artisan route:clear

# Create storage link
echo "Creating storage link..."
php /app/artisan storage:link || echo "Storage link creation failed, but continuing..."

# Optimize the application
echo "Optimizing the application..."
php /app/artisan optimize || echo "Optimization failed, but continuing..."

echo "Laravel application is ready!"

# Start services
exec "$@"
