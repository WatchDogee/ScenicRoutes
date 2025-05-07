#!/bin/bash
set -e

echo "Running PostgreSQL deployment script for Laravel Cloud..."

# Clear configuration cache
echo "Clearing configuration cache..."
php artisan config:clear

# Run the PostgreSQL-specific migration
echo "Running PostgreSQL migrations..."
php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php --force

# Clear all caches
echo "Clearing caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "Deployment completed successfully!"
