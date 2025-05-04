#!/bin/bash
set -e

# Display current directory and environment
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la

# Create necessary directories
mkdir -p /app/storage/logs
mkdir -p /app/storage/framework/sessions
mkdir -p /app/storage/framework/views
mkdir -p /app/storage/framework/cache

# Set permissions
chmod -R 777 /app/storage
chmod -R 777 /app/bootstrap/cache

# Create log file
touch /app/storage/logs/laravel.log
chmod 666 /app/storage/logs/laravel.log

# Copy environment file
if [ -f "/app/.env.coolify" ]; then
    cp /app/.env.coolify /app/.env
    echo "Copied .env.coolify to .env"
else
    echo "Warning: .env.coolify not found"
    if [ -f "/app/.env.example" ]; then
        cp /app/.env.example /app/.env
        echo "Copied .env.example to .env instead"
    fi
fi

# Check if artisan exists
if [ -f "/app/artisan" ]; then
    echo "Artisan file found at /app/artisan"
    chmod +x /app/artisan
    
    # Run Laravel commands
    php /app/artisan key:generate --force
    php /app/artisan config:clear
    php /app/artisan cache:clear
    php /app/artisan view:clear
    php /app/artisan route:clear
    php /app/artisan storage:link
    php /app/artisan migrate --force
else
    echo "Error: Artisan file not found at /app/artisan"
    echo "Searching for artisan file:"
    find / -name "artisan" -type f 2>/dev/null
fi

# Install dependencies and build assets
if [ -f "/app/package.json" ]; then
    cd /app
    npm install
    npm run build
fi

# Set proper ownership
chown -R www-data:www-data /app/storage /app/bootstrap/cache

# Execute the command passed to the container
exec "$@"
