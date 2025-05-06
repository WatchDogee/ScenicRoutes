# PostgreSQL Development Branch

This branch is set up for local development with PostgreSQL, based on the `postgres-laravel-cloud` branch. It allows you to test the PostgreSQL configuration locally before deploying to Laravel Cloud.

## Setup Instructions

### Prerequisites

1. PostgreSQL installed locally (version 12 or higher recommended)
2. PHP with pdo_pgsql extension enabled
3. Node.js and npm installed

### Setting Up PostgreSQL Locally

1. Create a PostgreSQL database for your application:
   ```sql
   CREATE DATABASE scenic_routes;
   CREATE USER postgres WITH ENCRYPTED PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE scenic_routes TO postgres;
   ```

   Note: If you already have a PostgreSQL user with a different password, update the `.env.postgres.local` file accordingly.

### Switching to PostgreSQL for Local Development

1. Run the provided script to switch to PostgreSQL:
   ```bash
   ./scripts/switch-to-postgres.sh
   ```

   This script will:
   - Copy the PostgreSQL environment configuration to `.env`
   - Clear the configuration cache
   - Run the PostgreSQL-specific migration

2. Start the development server:
   ```bash
   php artisan serve
   ```

3. In a separate terminal, compile assets:
   ```bash
   npm run dev
   ```

### Switching Back to MySQL (if needed)

If you need to switch back to MySQL for any reason:

```bash
./scripts/switch-to-mysql.sh
```

## Merging Back to postgres-laravel-cloud

When you're ready to merge your changes back to the `postgres-laravel-cloud` branch:

1. Make sure you don't commit the `.env` file (it should be in `.gitignore`)
2. Commit your changes:
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

3. Switch to the postgres-laravel-cloud branch:
   ```bash
   git checkout postgres-laravel-cloud
   ```

4. Merge your changes:
   ```bash
   git merge postgres-dev
   ```

5. Push to the remote repository:
   ```bash
   git push origin postgres-laravel-cloud
   ```

## Environment Configuration

The environment configuration is set up to work both locally and when deployed to Laravel Cloud:

- `.env.postgres.local` - Used for local development with PostgreSQL
- `.env.postgres` - Used for Laravel Cloud deployment with PostgreSQL

When Laravel Cloud deploys your application, it will use its own environment variables, which will override the ones in your repository. This ensures that your application will work correctly in both environments.

## Troubleshooting

### PostgreSQL Connection Issues

If you encounter issues connecting to PostgreSQL:

1. Make sure PostgreSQL is running:
   ```bash
   sudo service postgresql status
   ```

2. Verify your PostgreSQL credentials:
   ```bash
   psql -U postgres -d scenic_routes
   ```

3. Check that the pdo_pgsql PHP extension is enabled:
   ```bash
   php -m | grep pdo_pgsql
   ```

### Migration Issues

If you encounter errors during migration:

1. Make sure your PostgreSQL version is compatible (version 12 or higher recommended)
2. Run migrations with the `--verbose` flag for more detailed error information:
   ```bash
   php artisan migrate:fresh --path=database/migrations/2025_05_05_000000_create_all_tables_postgres.php --verbose
   ```

### Asset Compilation Issues

If you encounter issues with asset compilation:

1. Make sure your Node.js and npm versions are up to date
2. Try clearing the npm cache:
   ```bash
   npm cache clean --force
   ```

3. Reinstall dependencies:
   ```bash
   npm install
   ```
