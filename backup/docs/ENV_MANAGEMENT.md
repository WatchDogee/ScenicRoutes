# Environment Management Guide

This guide explains how to manage different environment configurations for local development and deployment.

## Environment Files

The project includes the following environment files:

- `.env` - The active environment configuration
- `.env.local` - Local development environment configuration
- `.env.deployment` - Deployment environment configuration for Laravel Cloud

## Switching Environments

You can use the provided script to switch between environments:

```bash
# Make the script executable
chmod +x switch-env.sh

# Switch to local environment
./switch-env.sh local

# Switch to deployment environment
./switch-env.sh deployment

# Backup current environment
./switch-env.sh backup
```

## Testing Laravel Cloud Migrations Locally

To test the Laravel Cloud migrations locally:

1. Create a new test database:
   ```bash
   mysql -u root -p
   CREATE DATABASE scenic_routes_test;
   exit
   ```

2. Edit your `.env` file to use the test database:
   - Comment out the current DB_* lines
   - Uncomment the test database configuration lines
   - Update the credentials as needed

3. Run the migration:
   ```bash
   php artisan migrate:fresh --path=database/migrations/2025_06_01_000000_create_all_tables_laravel_cloud.php
   ```

4. After testing, switch back to your regular local database configuration.

## Environment Variables

### Local Development

Key local development variables:
- `APP_DEBUG=true` - Enables detailed error messages
- `DB_HOST=db` - Docker container hostname for database
- `FILESYSTEM_DISK=local` - Store files locally
- `SESSION_DRIVER=cookie` - Use cookies for sessions

### Deployment

Key deployment variables:
- `APP_DEBUG=false` - Disables detailed error messages for security
- `APP_URL=https://scenic-routes.live` - Production URL
- `DB_HOST=mysql.laravel.app` - Laravel Cloud database hostname
- `FILESYSTEM_DISK=s3` - Store files on AWS S3
- `SESSION_DRIVER=database` - Use database for sessions

## Important Notes

1. **Never commit sensitive credentials** to version control. The `.env` files should be in your `.gitignore`.

2. **Keep your environment files in sync**. When you add a new environment variable to one file, add it to the others as well.

3. **Use placeholders** for sensitive values in the `.env.deployment` file. Replace them with actual values during deployment.

4. **Backup your environment files** regularly, especially before making significant changes.
