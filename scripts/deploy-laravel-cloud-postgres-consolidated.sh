#!/bin/bash
set -e

echo "Running PostgreSQL deployment script for Laravel Cloud (Consolidated)..."

# Clear configuration cache
echo "Clearing configuration cache..."
php artisan config:clear

# Run the consolidated PostgreSQL-specific migration
echo "Running consolidated PostgreSQL migration..."
php artisan migrate:fresh --path=database/migrations/2025_05_01_000000_create_all_tables_postgres_consolidated.php --force

# Clear all caches
echo "Clearing caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "Deployment completed successfully!"
