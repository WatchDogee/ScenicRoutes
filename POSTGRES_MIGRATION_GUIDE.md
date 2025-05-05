# PostgreSQL Migration Guide

This branch is configured to use PostgreSQL with Laravel Cloud. To prevent MySQL migrations from running during deployment, we've implemented the following strategy:

## How We Prevent MySQL Migrations

1. **Removed MySQL Migration Files**:
   - We've removed all MySQL-specific migration files from this branch.
   - Only PostgreSQL migration files remain in the `database/migrations` directory.

2. **Explicit Migration Path**:
   - The `docker-entrypoint.sh` script explicitly specifies the PostgreSQL migration path:
     ```bash
     php artisan migrate --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php --force
     ```
   - This ensures that only the PostgreSQL migration runs during deployment.

3. **PostgreSQL Environment Configuration**:
   - The `.env.postgres` file is configured specifically for PostgreSQL.
   - It sets `DB_CONNECTION=pgsql` and other PostgreSQL-specific settings.

## Deployment Instructions

When deploying to Laravel Cloud with PostgreSQL:

1. Make sure you're using this `postgres-laravel-cloud` branch.

2. Set the environment variables in Laravel Cloud:
   ```
   DB_CONNECTION=pgsql
   DB_HOST=postgres.laravel.app
   DB_PORT=5432
   DB_DATABASE=laravel
   DB_USERNAME=laravel
   DB_PASSWORD=your-db-password
   DB_SCHEMA=public
   DB_SSLMODE=require
   ```

3. During deployment, the PostgreSQL migration will run automatically.

## Manual Migration

If you need to run migrations manually:

```bash
php artisan migrate --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php
```

## Data Migration from MySQL

If you need to migrate data from an existing MySQL database, you can use the ImportFromMySQLSeeder:

1. Configure your MySQL connection in `.env`:
   ```
   DB_MYSQL_HOST=your-mysql-host
   DB_MYSQL_PORT=3306
   DB_MYSQL_DATABASE=your-mysql-database
   DB_MYSQL_USERNAME=your-mysql-username
   DB_MYSQL_PASSWORD=your-mysql-password
   ```

2. Run the PostgreSQL migration:
   ```bash
   php artisan migrate --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php
   ```

3. Run the seeder to import data:
   ```bash
   php artisan db:seed --class=Database\\Seeders\\ImportFromMySQLSeeder
   ```

## Troubleshooting

If you encounter issues with migrations:

1. Make sure you're using the correct database connection:
   ```bash
   php artisan tinker
   DB::connection()->getPdo();
   ```

2. Check that only PostgreSQL migrations are being run:
   ```bash
   php artisan migrate:status
   ```

3. If MySQL migrations are still running, explicitly specify the PostgreSQL migration path:
   ```bash
   php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php
   ```
