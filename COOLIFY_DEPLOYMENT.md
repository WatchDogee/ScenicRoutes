# ScenicRoutes Coolify Deployment Guide

This branch is specifically configured for deploying ScenicRoutes to Coolify.

## Prerequisites

- A Coolify server set up and running
- A domain name configured with Coolify
- Access to the Coolify dashboard

## Deployment Steps

### 1. Create a MySQL Database in Coolify

1. Log in to your Coolify dashboard
2. Go to "Resources" and click "New Resource"
3. Select "Database" and then "MySQL"
4. Configure the database:
   - Name: `scenic_routes_db` (or your preferred name)
   - Username: Choose a username
   - Password: Generate a secure password
   - Version: 8.0
5. Click "Save"

### 2. Deploy the ScenicRoutes App

1. Log in to your Coolify dashboard
2. Go to "Applications" and click "New Application"
3. Select "Docker Compose"
4. Configure the application:
   - Name: `scenic-routes` (or your preferred name)
   - Repository: Enter your GitHub repository URL
   - Branch: `deploy-coolify`
   - Docker Compose File: `docker-compose.yml`
5. Configure environment variables (see below)
6. Click "Save" and then "Deploy"

### 3. Configure Environment Variables

Add the following environment variables in the Coolify dashboard:

```
APP_NAME=ScenicRoutes
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=https://your-app-domain.com

DB_CONNECTION=mysql
DB_HOST=your-db-host-from-coolify
DB_PORT=3306
DB_DATABASE=scenic_routes
DB_USERNAME=your-db-username
DB_PASSWORD=your-db-password

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.your-root-domain.com

SANCTUM_STATEFUL_DOMAINS=your-app-domain.com,*.your-root-domain.com

CACHE_DRIVER=file
QUEUE_CONNECTION=database
FILESYSTEM_DISK=public

LOG_CHANNEL=stack
LOG_LEVEL=error
```

Replace placeholders with your actual values.

### 4. Configure Domain and SSL

1. In the Coolify dashboard, go to your application
2. Click on "Domains"
3. Add your domain and configure SSL

### 5. Verify Deployment

1. Visit your app's URL to verify it's working
2. Check the logs in the Coolify dashboard for any errors

## Troubleshooting

If you encounter issues:

1. Check the logs in the Coolify dashboard
2. SSH into the container to run commands:
   ```
   docker exec -it container_name /bin/bash
   cd /var/www/html
   php artisan migrate:status
   ```
3. Verify database connection:
   ```
   php artisan tinker
   DB::connection()->getPdo();
   ```

## Maintenance

To run migrations or other Laravel commands:

1. SSH into the container:
   ```
   docker exec -it container_name /bin/bash
   ```
2. Navigate to the app directory:
   ```
   cd /var/www/html
   ```
3. Run Laravel commands:
   ```
   php artisan migrate
   php artisan cache:clear
   ```
