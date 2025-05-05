# ScenicRoutes CapRover Deployment Guide

This branch is specifically configured for deploying ScenicRoutes to CapRover.

## Prerequisites

- A CapRover server set up and running
- A domain name configured with CapRover
- Access to the CapRover dashboard

## Deployment Steps

### 1. Create a MySQL Database App in CapRover

1. Log in to your CapRover dashboard
2. Go to "Apps" and click "Create a New App"
3. Name it `scenic-routes-db` (or your preferred name)
4. Go to the app's "Deployment" tab
5. Under "Deploy from Docker Registry", enter `mysql:8.0`
6. Click "Deploy"
7. Go to the app's "App Configs" tab
8. Add the following environment variables:
   - `MYSQL_DATABASE`: `scenic_routes`
   - `MYSQL_ROOT_PASSWORD`: `your-secure-password`
9. Click "Save & Update"

### 2. Deploy the ScenicRoutes App

#### Option 1: Deploy from GitHub

1. Log in to your CapRover dashboard
2. Go to "Apps" and click "Create a New App"
3. Name it `scenic-routes` (or your preferred name)
4. Go to the app's "Deployment" tab
5. Under "Deploy from Github/Bitbucket/Gitlab", enter your repository details
   - Make sure to select the `deploy-caprover` branch
6. Click "Deploy"

#### Option 2: Deploy using CapRover CLI

1. Install CapRover CLI: `npm install -g caprover`
2. Log in to your CapRover server: `caprover login`
3. Deploy the app: `caprover deploy`

### 3. Configure Environment Variables

Go to the app's "App Configs" tab and add the following environment variables:

```
APP_NAME=ScenicRoutes
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=https://your-app-domain.com

DB_CONNECTION=mysql
DB_HOST=srv-captain--scenic-routes-db
DB_PORT=3306
DB_DATABASE=scenic_routes
DB_USERNAME=root
DB_PASSWORD=your-secure-password

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

### 4. Enable HTTPS

1. Go to the app's "HTTP Settings" tab
2. Enable HTTPS and force HTTPS
3. Click "Save & Update"

### 5. Verify Deployment

1. Visit your app's URL to verify it's working
2. Check the logs for any errors: Go to the app's "Logs" tab

## Troubleshooting

If you encounter issues:

1. Check the logs in the CapRover dashboard
2. SSH into the container to run commands:
   ```
   docker exec -it srv-captain--scenic-routes /bin/bash
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
   docker exec -it srv-captain--scenic-routes /bin/bash
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
