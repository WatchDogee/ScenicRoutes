# ScenicRoutes Deployment Guide for Coolify

This guide provides step-by-step instructions for deploying the ScenicRoutes application using Coolify.

## Prerequisites

- A server with at least 2GB RAM
- Coolify installed on your server
- A domain name (optional but recommended)
- MySQL database (can be hosted separately or with Coolify)

## Step 1: Set Up Coolify

1. Create a server with at least 2GB RAM
2. SSH into your server
3. Install Coolify:

```bash
wget -q https://get.coolify.io -O install.sh && sudo bash ./install.sh
```

4. Access the Coolify dashboard at `http://your-server-ip:8000`
5. Create an account and log in

## Step 2: Add Your Git Repository

1. In the Coolify dashboard, go to "Sources"
2. Click "Add new source"
3. Select "GitHub" or your preferred Git provider
4. Connect your account and select the ScenicRoutes repository

## Step 3: Create a Database

1. In the Coolify dashboard, go to "Services"
2. Click "Add new service"
3. Select "MySQL"
4. Configure the database:
   - Name: `ScenicRoutesDB`
   - Username: Choose a username
   - Password: Generate a secure password
   - Version: 8.0 or later
5. Click "Create"
6. Note down the database connection details (host, port, username, password)

## Step 4: Create a New Resource

1. In the Coolify dashboard, go to "Resources"
2. Click "Add new resource"
3. Select your Git repository
4. Choose "Docker Compose" as the deployment type
5. Select the `docker-compose.yml` file

## Step 5: Configure Environment Variables

In the resource configuration, set the following environment variables:

```
APP_URL=https://your-domain.com (or http://your-server-ip:3000)
DB_HOST=your-db-host (from Step 3)
DB_PORT=3306
DB_DATABASE=ScenicRoutesDB
DB_USERNAME=your-db-username (from Step 3)
DB_PASSWORD=your-db-password (from Step 3)
SESSION_DOMAIN=your-domain.com (or your-server-ip)
SANCTUM_STATEFUL_DOMAINS=your-domain.com (or your-server-ip)
MAIL_MAILER=smtp
MAIL_HOST=your-mail-host
MAIL_PORT=587
MAIL_USERNAME=your-mail-username
MAIL_PASSWORD=your-mail-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@scenicroutes.com
```

## Step 6: Configure Deployment Settings

1. In the resource configuration, go to the "Settings" tab
2. Set the port to 3000
3. Enable "Auto Deploy" if you want automatic deployments on Git pushes
4. Configure health checks:
   - Path: `/health`
   - Port: 3000
   - Interval: 10s
   - Timeout: 5s
   - Retries: 3

## Step 7: Deploy the Application

1. Click the "Deploy" button
2. Coolify will:
   - Pull your repository
   - Build the Docker image
   - Start the containers
   - Run the deployment commands specified in coolify.json

## Step 8: Configure Domain and SSL (Optional)

1. In your resource settings, go to the "Domains" tab
2. Add your domain name
3. Enable SSL with Let's Encrypt

## Troubleshooting Common Issues

### 404 or 403 Errors

If you're experiencing 404 or 403 errors when accessing your application, check the following:

1. **Check the logs**: In the Coolify dashboard, go to your resource and check the logs for any errors.

2. **Verify environment variables**: Make sure all environment variables are correctly set, especially:
   - `APP_URL`
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
   - `SESSION_DOMAIN` and `SANCTUM_STATEFUL_DOMAINS`

3. **Check database connection**: Use the `/debug.php` endpoint to verify the database connection.

4. **Check file permissions**: Make sure storage and bootstrap/cache directories have the correct permissions.

5. **Check storage symlink**: Verify that the storage symlink has been created correctly.

6. **Enable debug mode**: Set `APP_DEBUG=true` temporarily to see detailed error messages.

7. **Check Nginx configuration**: Make sure the Nginx configuration is correctly handling SPA routes.

### Database Connection Issues

If you're having issues connecting to the database:

1. Verify the database credentials in your environment variables.
2. Make sure the database service is running.
3. Check if the database is accessible from the application container.

### Storage Issues

If you're having issues with file uploads or storage:

1. Make sure the storage directory has the correct permissions.
2. Verify that the storage symlink has been created correctly.
3. Check if the storage volume is mounted correctly.

## Maintenance and Updates

To update your application:

1. Push changes to your Git repository
2. Coolify will automatically redeploy if auto-deploy is enabled
3. To manually redeploy, click the "Deploy" button in the Coolify dashboard

## Performance Optimization

1. Consider using Redis for caching and sessions
2. Implement a CDN for static assets
3. Configure opcache settings for PHP
4. Use a load balancer if needed for high traffic

## Backup and Restore

### Database Backup

In the Coolify dashboard:

1. Go to your database service
2. Click "Backup"
3. Download the backup file

### Database Restore

In the Coolify dashboard:

1. Go to your database service
2. Click "Restore"
3. Upload the backup file

## Monitoring

Monitor your application using:

1. Coolify's built-in monitoring
2. The `/health` endpoint
3. The `/debug.php` endpoint for detailed diagnostics

