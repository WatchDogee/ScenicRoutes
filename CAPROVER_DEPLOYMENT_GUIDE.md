# ScenicRoutes CapRover Deployment Guide

This guide provides step-by-step instructions for deploying the ScenicRoutes application on CapRover.

## Prerequisites

- A CapRover server set up and running
- A domain configured with CapRover
- Access to the CapRover dashboard

## Deployment Steps

### 1. Create the Database App

1. Log in to your CapRover dashboard
2. Go to "Apps" and click "Create New App"
3. Name your database app (e.g., `scenic-routes-db`)
4. Click "Create New App"
5. Go to "One-Click Apps/Databases"
6. Find and select "MySQL"
7. Configure the MySQL instance:
   - MySQL Version: Latest
   - Root Password: Choose a secure password
   - Database Name: `scenic_routes`
   - Container Name: Leave as default
8. Click "Deploy"

### 2. Create the Application

1. Go back to "Apps" and click "Create New App"
2. Name your app (e.g., `scenic-routes`)
3. Enable HTTPS if you have a domain
4. Click "Create New App"

### 3. Configure Environment Variables

1. In your app's page, go to "App Configs"
2. Add the following environment variables:

```
APP_NAME=ScenicRoutes
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app-domain.com (use your actual domain)

DB_CONNECTION=mysql
DB_HOST=srv-captain--scenic-routes-db
DB_PORT=3306
DB_DATABASE=scenic_routes
DB_USERNAME=root
DB_PASSWORD=your-mysql-password

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.your-root-domain.com (use your root domain with a dot prefix)

CACHE_DRIVER=file
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=your-mail-host
MAIL_PORT=your-mail-port
MAIL_USERNAME=your-mail-username
MAIL_PASSWORD=your-mail-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="${APP_NAME}"
```

3. Click "Save & Update"

### 4. Deploy the Application

#### Option 1: Deploy from GitHub

1. In your app's page, go to "Deployment"
2. Choose "Deploy from Github/Bitbucket/etc."
3. Enter your repository details
4. Click "Deploy"

#### Option 2: Deploy using the CapRover CLI

1. Install the CapRover CLI:
   ```bash
   npm install -g caprover
   ```

2. Log in to your CapRover server:
   ```bash
   caprover login
   ```

3. Deploy your application:
   ```bash
   caprover deploy
   ```

4. Follow the prompts to select your CapRover server and application

### 5. Verify the Deployment

After deployment, check the following:

1. Visit your application URL to ensure it loads correctly
2. Try logging in to verify authentication works
3. Check the logs for any errors:
   - In the CapRover dashboard, go to your app
   - Click on "Logs" to view application logs

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify that the database service is running
2. Check that the database credentials are correct
3. Make sure the database host name is correct (should be `srv-captain--scenic-routes-db`)
4. Ensure the database exists and is accessible

You can check the database connection by SSH'ing into your container:

```bash
docker exec -it srv-captain--scenic-routes /bin/bash
cd /app
php artisan tinker
DB::connection()->getPdo();
```

### Authentication Issues

If you're having authentication problems:

1. Verify that `SESSION_DOMAIN` is set to your root domain with a dot prefix (e.g., `.your-domain.com`)
2. Check that `SANCTUM_STATEFUL_DOMAINS` includes your app domain
3. Clear your browser cookies and try again
4. Check the Laravel logs for more details

### Frontend Issues

If the frontend is not loading correctly:

1. Check that the API URL is configured correctly
2. Verify that the frontend assets were built successfully
3. Clear your browser cache and try again

## Maintenance

### Updating the Application

To update your application:

1. Push changes to your repository
2. Redeploy using the CapRover dashboard or CLI
3. Monitor the logs for any issues

### Running Artisan Commands

To run Laravel Artisan commands:

```bash
docker exec -it srv-captain--scenic-routes /bin/bash
cd /app
php artisan your-command
```

### Database Backups

To backup your database:

```bash
docker exec srv-captain--scenic-routes-db mysqldump -u root -p scenic_routes > backup.sql
```
