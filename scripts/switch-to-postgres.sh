#!/bin/bash
set -e

echo "Switching to PostgreSQL for local development..."

# Copy the PostgreSQL local environment file to .env
echo "Copying PostgreSQL environment configuration..."
cp .env.postgres.local .env

# Clear configuration cache
echo "Clearing configuration cache..."
php artisan config:clear

# Run the PostgreSQL migration
echo "Running PostgreSQL migration..."
php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php

echo "Successfully switched to PostgreSQL!"
echo "You can now run 'php artisan serve' and 'npm run dev' to test your application."
