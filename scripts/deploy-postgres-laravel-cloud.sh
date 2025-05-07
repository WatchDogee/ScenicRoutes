#!/bin/bash
set -e

echo "Running PostgreSQL deployment script for Laravel Cloud..."

# Clear configuration cache
echo "Clearing configuration cache..."
php artisan config:clear

# Run the PostgreSQL schema migration
echo "Running PostgreSQL schema migration..."
php artisan migrate:fresh --path=database/migrations/2025_05_08_000000_postgres_schema.php --force

# Clear all caches
echo "Clearing caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "Deployment completed successfully!"
