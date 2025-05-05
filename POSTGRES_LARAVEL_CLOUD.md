# PostgreSQL with Laravel Cloud Guide

This branch is configured to use PostgreSQL with Laravel Cloud. This guide provides instructions for setting up and deploying your ScenicRoutes application with PostgreSQL on Laravel Cloud.

## Overview

Laravel Cloud provides managed PostgreSQL databases that are optimized for Laravel applications. This branch includes all the necessary configurations to use PostgreSQL instead of MySQL, including:

1. Updated database configuration in `config/database.php`
2. PostgreSQL-specific migration file
3. Environment configuration for PostgreSQL
4. Scripts to help with migration from MySQL to PostgreSQL

## Local Development with PostgreSQL

### Prerequisites

- PostgreSQL installed locally (version 12 or higher recommended)
- PHP with pdo_pgsql extension enabled
- Laravel application set up

### Setup Steps

1. Create a PostgreSQL database for your application:
   ```sql
   CREATE DATABASE scenic_routes;
   CREATE USER laravel WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE scenic_routes TO laravel;
   ```

2. Use the provided PostgreSQL environment configuration:
   ```bash
   cp .env.postgres .env
   ```

3. Update the database connection details in your `.env` file:
   ```
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=scenic_routes
   DB_USERNAME=laravel
   DB_PASSWORD=your_password
   ```

4. Clear the configuration cache:
   ```bash
   php artisan config:clear
   ```

5. Run the PostgreSQL-specific migration:
   ```bash
   php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php
   ```

## Migrating from MySQL to PostgreSQL

If you have existing data in a MySQL database that you want to migrate to PostgreSQL, you can use the provided migration script:

```bash
./scripts/migrate-to-postgres.sh
```

This script will:
1. Set up the PostgreSQL environment
2. Run the PostgreSQL-specific migration
3. Optionally import data from your MySQL database using the `ImportFromMySQLSeeder`

## Deploying to Laravel Cloud with PostgreSQL

### 1. Create a New Laravel Cloud Application

1. Log in to your Laravel Cloud dashboard
2. Create a new application
3. Choose PostgreSQL as your database type

### 2. Configure Environment Variables

In your Laravel Cloud dashboard, set the following environment variables:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app-domain.com

DB_CONNECTION=pgsql
DB_HOST=postgres.laravel.app
DB_PORT=5432
DB_DATABASE=laravel
DB_USERNAME=laravel
DB_PASSWORD=your-db-password
DB_SCHEMA=public
DB_SSLMODE=require

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.your-domain.com
SANCTUM_STATEFUL_DOMAINS=your-app-domain.com
```

### 3. Deploy Your Application

Deploy your application to Laravel Cloud using the Laravel Cloud CLI or GitHub integration.

### 4. Run Migrations

After deployment, run the PostgreSQL-specific migration:

```bash
php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php
```

## PostgreSQL-Specific Considerations

### JSON Data

PostgreSQL handles JSON data differently than MySQL. In your models, you may need to update any JSON casting to ensure it works correctly with PostgreSQL.

### Case Sensitivity

PostgreSQL is case-sensitive for string comparisons by default. If your application relies on case-insensitive searches, you may need to use the `ILIKE` operator instead of `LIKE` in your queries.

### Sequences

PostgreSQL uses sequences for auto-incrementing columns. If you're manually inserting IDs or need to reset sequences, you can use:

```sql
ALTER SEQUENCE table_name_id_seq RESTART WITH 1;
```

## Troubleshooting

### SSL Connection Issues

If you encounter SSL connection issues with Laravel Cloud PostgreSQL, ensure that your `DB_SSLMODE` is set to `require` and that your PostgreSQL client supports SSL connections.

### Migration Errors

If you encounter errors during migration, check the following:

1. Ensure your PostgreSQL version is compatible (version 12 or higher recommended)
2. Check that the pdo_pgsql PHP extension is enabled
3. Verify that your database user has the necessary permissions

For more detailed error information, you can run migrations with the `--verbose` flag:

```bash
php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php --verbose
```
