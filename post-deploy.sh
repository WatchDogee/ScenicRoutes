#!/bin/bash
# Post-deployment script for ScenicRoutes

# Display current directory and list files
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la

# Check if artisan exists
if [ -f "artisan" ]; then
    echo "Artisan file found"
    
    # Set permissions
    chmod +x artisan
    
    # Create storage directories
    mkdir -p storage/logs
    mkdir -p storage/framework/sessions
    mkdir -p storage/framework/views
    mkdir -p storage/framework/cache
    
    # Set permissions
    chmod -R 777 storage
    chmod -R 777 bootstrap/cache
    
    # Create log file
    touch storage/logs/laravel.log
    chmod 666 storage/logs/laravel.log
    
    # Copy environment file if it doesn't exist
    if [ ! -f ".env" ] && [ -f ".env.coolify" ]; then
        cp .env.coolify .env
    fi
    
    # Run Laravel commands
    php artisan key:generate --force
    php artisan config:clear
    php artisan cache:clear
    php artisan view:clear
    php artisan route:clear
    php artisan storage:link
    php artisan migrate --force
    
    # Install dependencies and build assets
    if [ -f "package.json" ]; then
        npm install
        npm run build
    fi
    
    echo "Post-deployment completed successfully"
else
    echo "Artisan file not found!"
    echo "Searching for artisan file:"
    find . -name "artisan" -type f
fi
