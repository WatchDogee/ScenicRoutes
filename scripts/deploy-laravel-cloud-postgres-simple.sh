#!/bin/bash
set -e

echo "Running PostgreSQL deployment script for Laravel Cloud (Simple)..."

# Clear configuration cache
echo "Clearing configuration cache..."
php artisan config:clear

# Run the simplified PostgreSQL-specific migration
echo "Running simplified PostgreSQL migration..."
php artisan migrate:fresh --path=database/migrations/2025_05_01_000000_create_all_tables_postgres_simple.php --force

# Clear all caches
echo "Clearing caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "Deployment completed successfully!"
