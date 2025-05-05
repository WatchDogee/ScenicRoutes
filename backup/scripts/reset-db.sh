#!/bin/bash
echo "Resetting database and running migrations..."

# Check if running in Docker
if [ -f /.dockerenv ]; then
    # Inside Docker container
    echo "Running inside Docker container..."
    php artisan migrate:fresh --force
else
    # Local environment
    echo "Running in local environment..."
    if docker-compose ps | grep -q "app.*Up"; then
        echo "Docker containers are running, executing migration in container..."
        docker-compose exec app php artisan migrate:fresh --force
    else
        echo "Docker containers are not running. Starting them..."
        docker-compose up -d
        echo "Waiting for containers to be ready..."
        sleep 10
        echo "Running migrations..."
        docker-compose exec app php artisan migrate:fresh --force
    fi
fi

echo "Database reset complete!"
