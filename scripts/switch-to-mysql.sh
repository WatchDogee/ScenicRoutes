#!/bin/bash
set -e

echo "Switching to MySQL for local development..."

# Copy the MySQL local environment file to .env
echo "Copying MySQL environment configuration..."
cp .env.local .env

# Clear configuration cache
echo "Clearing configuration cache..."
php artisan config:clear

# Run the standard Laravel migrations
echo "Running MySQL migrations..."
php artisan migrate:fresh

echo "Successfully switched to MySQL!"
echo "You can now run 'php artisan serve' and 'npm run dev' to test your application."
