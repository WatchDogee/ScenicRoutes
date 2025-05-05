# ScenicRoutes CapRover Deployment Checklist

This checklist will help you deploy your Laravel, React, and Inertia.js application to CapRover.

## Pre-Deployment Checks

- [x] Verify Dockerfile is properly configured
- [x] Verify docker-entrypoint.sh has proper permissions and configuration
- [x] Ensure captain-definition file is present and points to Dockerfile
- [x] Check .env.example for proper configuration

## Environment Variables

Ensure these environment variables are set in CapRover:

```
APP_NAME=scenic-routes
APP_ENV=production
APP_KEY=base64:BVmlPydhxnTVZM3cmlWMFgyM1F5m6AB/g8W/a8h7aso=
APP_DEBUG=false
APP_URL=https://scenic-routes.dev.scenic-routes.live

DB_CONNECTION=mysql
DB_HOST=srv-captain--scenic-routes-db
DB_PORT=3306
DB_DATABASE=scenic-routes-db
DB_USERNAME=root
DB_PASSWORD=g353q25fgq2323

CACHE_DRIVER=file
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.scenic-routes.live
SANCTUM_STATEFUL_DOMAINS=scenic-routes.dev.scenic-routes.live,*.scenic-routes.live

QUEUE_CONNECTION=database
FILESYSTEM_DISK=public

LOG_CHANNEL=stack
LOG_LEVEL=error

MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=5ce90ea3069338
MAIL_PASSWORD=f294a079c194ea
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@scenicroutes.com
MAIL_FROM_NAME=${APP_NAME}

TRUSTED_PROXIES=*
```

## Deployment Steps

1. **Create MySQL Database in CapRover**
   - Go to CapRover dashboard > Apps
   - Create a new app named "scenic-routes-db"
   - Enable "Has Persistent Data"
   - Set Container HTTP Port to 3306
   - Deploy MySQL image (e.g., mysql:8.0)
   - Set environment variables:
     - MYSQL_ROOT_PASSWORD=g353q25fgq2323
     - MYSQL_DATABASE=scenic-routes-db

2. **Create Your Application in CapRover**
   - Go to CapRover dashboard > Apps
   - Create a new app named "scenic-routes"
   - Enable HTTPS if you have a domain
   - Set environment variables as listed above
   - Deploy from your Git repository

3. **Post-Deployment Verification**
   - Check the application logs for any errors
   - Visit https://scenic-routes.dev.scenic-routes.live to verify the app is running
   - Check that authentication is working properly
   - Verify that API requests are working

## Troubleshooting

If you encounter issues:

1. **Check Logs**
   - In CapRover dashboard, go to your app and click "Logs"
   - Look for any error messages

2. **Verify Database Connection**
   - Make sure the database is running
   - Check that the database credentials are correct
   - Verify that the database host is using the correct internal CapRover hostname format

3. **Check Domain Configuration**
   - Verify that SESSION_DOMAIN is set to .scenic-routes.live
   - Verify that SANCTUM_STATEFUL_DOMAINS includes all necessary domains

4. **Manual Commands**
   - SSH into the container:
     ```
     docker exec -it srv-captain--scenic-routes /bin/bash
     ```
   - Run Laravel commands:
     ```
     cd /app
     php artisan migrate:status
     php artisan config:clear
     php artisan route:list
     ```

5. **Check Frontend Configuration**
   - Verify that the API URL is correctly configured in bootstrap.js and apiClient.js
   - Check that CSRF protection is working properly
