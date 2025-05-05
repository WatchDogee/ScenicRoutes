# ScenicRoutes Deployment

This repository contains all the necessary files for deploying the ScenicRoutes application to CapRover.

## Deployment Files

- `Dockerfile` - Defines the container image for the application
- `docker-entrypoint.sh` - Script that runs when the container starts
- `CAPROVER_DEPLOYMENT_GUIDE.md` - Detailed guide for deploying to CapRover
- `public/deployment-check.php` - Script to verify the deployment status

## Quick Deployment Steps

1. **Set up CapRover**
   - Make sure you have a CapRover server running
   - Configure your domain with CapRover

2. **Create a MySQL Database**
   - In CapRover, create a MySQL app (e.g., `scenic-routes-db`)
   - Note the database credentials

3. **Create the Application**
   - In CapRover, create a new app (e.g., `scenic-routes`)
   - Configure environment variables (see below)

4. **Deploy the Application**
   - Deploy from GitHub or using the CapRover CLI
   - Monitor the deployment logs for any issues

5. **Verify the Deployment**
   - Access your application URL
   - Visit `/deployment-check.php` to verify the configuration

## Environment Variables

Configure the following environment variables in CapRover:

```
APP_NAME=ScenicRoutes
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app-domain.com

DB_CONNECTION=mysql
DB_HOST=srv-captain--scenic-routes-db
DB_PORT=3306
DB_DATABASE=scenic_routes
DB_USERNAME=root
DB_PASSWORD=your-mysql-password

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.your-root-domain.com

SANCTUM_STATEFUL_DOMAINS=your-app-domain.com
```

Replace `your-app-domain.com` and `your-root-domain.com` with your actual domains.

## Troubleshooting

If you encounter issues during deployment:

1. **Check the Logs**
   - In CapRover, go to your app and click "Logs"
   - Look for any error messages

2. **Verify Environment Variables**
   - Make sure all required environment variables are set
   - Check that the database connection information is correct

3. **Run the Deployment Check**
   - Access `/deployment-check.php` on your deployed app
   - This will show the current configuration and any issues

4. **SSH into the Container**
   - Use `docker exec -it srv-captain--scenic-routes /bin/bash` to access the container
   - Check logs at `/app/storage/logs/laravel.log`

## Manual Commands

If you need to run commands manually:

```bash
# SSH into the container
docker exec -it srv-captain--scenic-routes /bin/bash

# Navigate to the application directory
cd /app

# Run migrations
php artisan migrate

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear

# Create storage link
php artisan storage:link
```

For more detailed instructions, see `CAPROVER_DEPLOYMENT_GUIDE.md`.
