#!/bin/bash
set -e

echo "Starting MySQL to PostgreSQL migration for Laravel Cloud..."

# Step 1: Copy the PostgreSQL environment file
echo "Setting up PostgreSQL environment..."
cp .env.postgres .env

# Step 2: Clear configuration cache
echo "Clearing configuration cache..."
php artisan config:clear

# Step 3: Run the PostgreSQL migration
echo "Running the PostgreSQL migration..."
php artisan migrate --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php --force

# Step 4: Import data from MySQL if needed
echo "Do you want to import data from MySQL? (y/n)"
read -r import_data

if [ "$import_data" = "y" ]; then
    echo "Importing data from MySQL..."

    echo "Please provide MySQL connection details:"
    echo "MySQL Host (default: 127.0.0.1):"
    read -r mysql_host
    mysql_host=${mysql_host:-127.0.0.1}

    echo "MySQL Port (default: 3306):"
    read -r mysql_port
    mysql_port=${mysql_port:-3306}

    echo "MySQL Database:"
    read -r mysql_database

    echo "MySQL Username (default: root):"
    read -r mysql_username
    mysql_username=${mysql_username:-root}

    echo "MySQL Password:"
    read -rs mysql_password

    # Update .env with MySQL connection details for the mysql_old connection
    echo "" >> .env
    echo "# MySQL connection for data import" >> .env
    echo "DB_MYSQL_HOST=$mysql_host" >> .env
    echo "DB_MYSQL_PORT=$mysql_port" >> .env
    echo "DB_MYSQL_DATABASE=$mysql_database" >> .env
    echo "DB_MYSQL_USERNAME=$mysql_username" >> .env
    echo "DB_MYSQL_PASSWORD=$mysql_password" >> .env

    # Clear config cache again
    php artisan config:clear

    # Run the import seeder
    php artisan db:seed --class=Database\\Seeders\\ImportFromMySQLSeeder

    # Remove MySQL connection details from .env
    sed -i '/# MySQL connection for data import/d' .env
    sed -i '/DB_MYSQL_HOST/d' .env
    sed -i '/DB_MYSQL_PORT/d' .env
    sed -i '/DB_MYSQL_DATABASE/d' .env
    sed -i '/DB_MYSQL_USERNAME/d' .env
    sed -i '/DB_MYSQL_PASSWORD/d' .env
fi

echo "Migration to PostgreSQL completed successfully!"
echo "Please verify your data in PostgreSQL."
