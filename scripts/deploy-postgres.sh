#!/bin/bash
set -e

echo "Running PostgreSQL deployment script..."

# Check if the database exists and has tables
echo "Checking database status..."
php artisan db:status

# Run migrations with the --force flag to run in production
echo "Running migrations..."
php artisan migrate --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php --force

# Clear cache
echo "Clearing cache..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "Deployment completed successfully!"
