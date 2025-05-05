#!/bin/bash
echo "Starting ScenicRoutes development environment..."

# Switch to local environment
echo "Switching to local environment..."
./switch-env.sh local

# Start Docker containers
echo "Starting Docker containers..."
docker-compose up -d

# Wait for containers to be ready
echo "Waiting for containers to be ready..."
sleep 5

# Run migrations
echo "Running database migrations..."
./reset-db.sh

# Create storage link
echo "Creating storage link..."
docker-compose exec app php artisan storage:link

# Clear cache
echo "Clearing cache..."
docker-compose exec app php artisan config:clear
docker-compose exec app php artisan route:clear
docker-compose exec app php artisan view:clear
docker-compose exec app php artisan cache:clear

echo "Development environment is ready!"
echo "Access the application at: http://localhost:8000"
echo "To start the Vite development server, run: npm run dev"
