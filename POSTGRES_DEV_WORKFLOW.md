# PostgreSQL Development Workflow

This document outlines the workflow for developing with PostgreSQL for Laravel Cloud while using MySQL for local development.

## Overview

The `postgres-laravel-cloud` branch is configured to use PostgreSQL when deployed to Laravel Cloud. However, for local development, we'll use MySQL to avoid the need for additional PHP extensions and configuration.

## Development Workflow

### Local Development (with MySQL)

1. **Use MySQL locally**:
   - Your `.env` file should be configured to use MySQL:
     ```
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=ScenicRoutesDB
     DB_USERNAME=root
     DB_PASSWORD=your-password
     ```

2. **Run standard Laravel migrations**:
   ```bash
   php artisan migrate
   ```

3. **Start the development server**:
   ```bash
   php artisan serve
   ```

4. **Compile assets**:
   ```bash
   npm run dev
   ```

### Writing Database-Agnostic Code

To ensure your code works with both MySQL and PostgreSQL:

1. **Use Laravel's query builder or Eloquent**:
   - Avoid raw SQL queries when possible
   - If you must use raw SQL, test it with both MySQL and PostgreSQL

2. **Be aware of differences**:
   - PostgreSQL is case-sensitive for identifiers unless quoted
   - PostgreSQL uses different JSON functions than MySQL
   - Date/time handling can differ between the two databases

3. **Use migrations properly**:
   - Use Laravel's schema builder which abstracts database differences
   - Avoid database-specific column types

### Deployment to Laravel Cloud (with PostgreSQL)

When deploying to Laravel Cloud:

1. **Merge your changes to the `postgres-laravel-cloud` branch**:
   ```bash
   git checkout postgres-laravel-cloud
   git merge your-feature-branch
   git push origin postgres-laravel-cloud
   ```

2. **Laravel Cloud will use its own environment variables**:
   - The PostgreSQL connection will be configured automatically
   - The PostgreSQL-specific migration will run during deployment

## Testing PostgreSQL Locally (Optional)

If you want to test with PostgreSQL locally:

1. **Install PostgreSQL**:
   - Download and install PostgreSQL from https://www.postgresql.org/download/
   - Create a database for your application

2. **Install PHP PostgreSQL extensions**:
   - For Windows/XAMPP:
     - Download `php_pgsql.dll` and `php_pdo_pgsql.dll` for your PHP version
     - Place them in your PHP extensions directory
     - Enable them in your `php.ini` file

3. **Configure your environment**:
   - Update your `.env` file to use PostgreSQL:
     ```
     DB_CONNECTION=pgsql
     DB_HOST=127.0.0.1
     DB_PORT=5432
     DB_DATABASE=your_database
     DB_USERNAME=postgres
     DB_PASSWORD=your_password
     DB_SCHEMA=public
     DB_SSLMODE=prefer
     ```

4. **Run the PostgreSQL migration**:
   ```bash
   php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php
   ```

## Troubleshooting

### MySQL Connection Issues

If you encounter issues connecting to MySQL:

1. Make sure your MySQL server is running
2. Verify your credentials in the `.env` file
3. Check that your database exists:
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"
   ```

### PostgreSQL Connection Issues (if testing locally)

If you encounter issues connecting to PostgreSQL:

1. Make sure PostgreSQL is running
2. Verify your credentials in the `.env` file
3. Check that the PHP PostgreSQL extensions are installed:
   ```bash
   php -m | grep pgsql
   ```

### Deployment Issues

If you encounter issues during deployment to Laravel Cloud:

1. Check the deployment logs in Laravel Cloud
2. Verify that the PostgreSQL migration file exists in your repository
3. Make sure your code is compatible with PostgreSQL
