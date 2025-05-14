#!/bin/bash
set -e

echo "Running Laravel Cloud deployment script..."

# Clear configuration cache first
echo "Clearing configuration cache..."
php artisan config:clear

# Run the Laravel Cloud fix migrations
echo "Running Laravel Cloud fix migrations..."
php artisan migrate --path=database/migrations/2025_06_01_000000_laravel_cloud_fix_schema.php --force
php artisan migrate --path=database/migrations/2025_06_10_000000_fix_leaderboard_review_photos_table.php --force

# Run all other migrations to ensure database is up to date
echo "Running all migrations..."
php artisan migrate --force

# Create storage link
echo "Creating storage link..."
php artisan storage:link || echo "Storage link already exists"

# Clear all caches first
echo "Clearing caches..."
php artisan optimize:clear

# Run optimization commands
echo "Running optimization commands..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
composer dump-autoload --optimize --no-dev

echo "Laravel Cloud deployment completed successfully!"
