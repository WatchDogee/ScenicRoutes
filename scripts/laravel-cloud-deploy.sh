#!/bin/bash
set -e

echo "Running Laravel Cloud PostgreSQL deployment script..."

# Clear configuration cache first
echo "Clearing configuration cache..."
php artisan config:clear

# Skip the default migrations and use the PostgreSQL-specific migration
echo "Running PostgreSQL schema migration..."
php artisan migrate --path=database/migrations/2025_05_15_000000_complete_postgres_schema.php --force

# Clear all caches
echo "Clearing caches..."
php artisan optimize:clear

echo "Laravel Cloud deployment completed successfully!"
