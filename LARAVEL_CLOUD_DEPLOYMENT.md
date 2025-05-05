# Laravel Cloud Deployment Guide

This guide provides instructions for deploying the ScenicRoutes application on Laravel Cloud.

## Database Migration

The application includes a comprehensive migration file that creates all necessary database tables for the application. This migration file is designed to work with Laravel Cloud's database services.

### Migration File

The main migration file is located at:
```
database/migrations/2025_06_01_000000_create_all_tables_laravel_cloud.php
```

This file creates all the tables needed for the application in the correct order to ensure foreign key constraints are properly established.

### Running Migrations

When deploying to Laravel Cloud, the migrations will be automatically run during the deployment process. However, you can also run them manually using the following command:

```bash
php artisan migrate
```

If you need to refresh the database and run all migrations from scratch:

```bash
php artisan migrate:fresh
```

## Models

The application includes models for all database tables. The main models are:

- `User` - User accounts
- `SavedRoad` - Saved scenic routes
- `Review` - Reviews for scenic routes
- `Comment` - Comments on scenic routes
- `RoadPhoto` - Photos of scenic routes
- `ReviewPhoto` - Photos attached to reviews
- `PointOfInterest` - Points of interest (tourism objects, fuel stations, etc.)
- `PoiPhoto` - Photos of points of interest
- `PoiReview` - Reviews for points of interest
- `UserSetting` - User settings

## Environment Configuration

Make sure to set the following environment variables in your Laravel Cloud environment:

```
APP_NAME=ScenicRoutes
APP_ENV=production
APP_KEY=your-app-key
APP_DEBUG=false
APP_URL=https://your-app-url.laravel.app

DB_CONNECTION=mysql
DB_HOST=mysql.laravel.app
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=laravel
DB_PASSWORD=your-db-password

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.your-app-url.laravel.app

SANCTUM_STATEFUL_DOMAINS=your-app-url.laravel.app
```

## Storage Configuration

The application uses Laravel's storage system for storing uploaded files. Make sure to configure the storage disk in your `config/filesystems.php` file:

```php
'disks' => [
    'public' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
        'throw' => false,
    ],
],
```

And set the corresponding environment variables in your Laravel Cloud environment.

## Post-Deployment Steps

After deploying to Laravel Cloud, you may need to:

1. Create a symbolic link for the storage:
   ```bash
   php artisan storage:link
   ```

2. Clear the application cache:
   ```bash
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   ```

3. Optimize the application:
   ```bash
   php artisan optimize
   ```

## Troubleshooting

If you encounter any issues during deployment, check the Laravel Cloud logs for error messages. Common issues include:

- Database connection errors: Check your database credentials
- Storage permission issues: Make sure the storage directory is writable
- Missing environment variables: Verify all required environment variables are set

For more information, refer to the Laravel Cloud documentation at https://laravel.com/docs/cloud.
