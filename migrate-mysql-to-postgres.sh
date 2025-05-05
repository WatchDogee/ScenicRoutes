#!/bin/bash
set -e

echo "Starting MySQL to PostgreSQL migration..."

# Step 1: Update .env file to use PostgreSQL
echo "Updating .env file to use PostgreSQL..."
sed -i 's/DB_CONNECTION=mysql/DB_CONNECTION=pgsql/g' .env
sed -i 's/DB_PORT=3306/DB_PORT=5432/g' .env

# Step 2: Run the new migration
echo "Running the new PostgreSQL migration..."
php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php --force

# Step 3: Import data from MySQL
echo "Importing data from MySQL..."
php artisan db:seed --class=Database\\Seeders\\ImportFromMySQLSeeder

echo "Migration completed successfully!"
echo "Please verify your data in PostgreSQL."
