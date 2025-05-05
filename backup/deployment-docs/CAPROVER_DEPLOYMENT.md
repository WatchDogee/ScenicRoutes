# CapRover Deployment Guide for ScenicRoutes

This guide provides detailed instructions for deploying the ScenicRoutes application on CapRover, with a focus on ensuring proper API URL configuration.

## Prerequisites

- A CapRover server set up and running
- A domain name configured with CapRover
- Access to the CapRover dashboard

## Environment Variables

The following environment variables are critical for proper functioning of the application:

### Essential Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_URL` | The full URL of your application | `https://scenic-routes.live` |
| `APP_ENV` | The environment (should be production) | `production` |
| `APP_KEY` | Laravel application key (will be generated if not set) | `base64:...` |
| `DB_CONNECTION` | Database connection type | `mysql` |
| `DB_HOST` | Database host | `srv-captain--scenic-routes-db` |
| `DB_PORT` | Database port | `3306` |
| `DB_DATABASE` | Database name | `scenic_routes` |
| `DB_USERNAME` | Database username | `scenic_routes_user` |
| `DB_PASSWORD` | Database password | `your_secure_password` |
| `SANCTUM_STATEFUL_DOMAINS` | Domains for Sanctum authentication | `scenic-routes.live` |
| `SESSION_DOMAIN` | Session cookie domain | `.scenic-routes.live` |

### Additional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_DEBUG` | Enable debug mode (should be false in production) | `false` |
| `LOG_LEVEL` | Logging level | `error` |
| `FILESYSTEM_DISK` | Default filesystem disk | `public` |
| `MAIL_MAILER` | Mail driver | `smtp` |
| `MAIL_HOST` | Mail host | `smtp.mailtrap.io` |

## Deployment Steps

### 1. Create the Application in CapRover

1. Log in to your CapRover dashboard
2. Go to "Apps" and click "Create New App"
3. Enter your app name (e.g., `scenic-routes`)
4. Enable HTTPS if you have a domain

### 2. Configure Environment Variables

1. In your app's page, go to "App Configs"
2. Add all the environment variables listed above
3. Make sure `APP_URL` is set to your actual domain (e.g., `https://scenic-routes.live`)
4. Set `SANCTUM_STATEFUL_DOMAINS` to your domain (e.g., `scenic-routes.live`)
5. Set `SESSION_DOMAIN` to your domain with a dot prefix (e.g., `.scenic-routes.live`)
6. Click "Save & Update"

### 3. Deploy the Application

#### Option 1: Deploy from the CapRover Dashboard

1. In your app's page, go to "Deployment"
2. Choose "Deploy from Github/Bitbucket/etc."
3. Enter your repository details
4. Click "Deploy"

#### Option 2: Deploy using the CapRover CLI

1. Install the CapRover CLI:
   ```bash
   npm install -g caprover
   ```

2. Deploy your application:
   ```bash
   caprover deploy
   ```

3. Follow the prompts to select your CapRover server and application

### 4. Verify the Deployment

After deployment, check the following:

1. Visit your application URL to ensure it loads correctly
2. Try logging in to verify authentication works
3. Check the logs for any errors:
   - In the CapRover dashboard, go to your app
   - Click on "Logs" to view application logs

## Troubleshooting

### API URL Issues

If you're experiencing issues with API requests going to localhost instead of your domain:

1. Verify that `APP_URL` is set correctly in your environment variables
2. SSH into your container and check the frontend code:
   ```bash
   docker exec -it srv-captain--scenic-routes /bin/bash
   cat /app/resources/js/bootstrap.js
   ```
3. Look for the line `window.axios.defaults.baseURL` and ensure it's set to your domain
4. If needed, manually update it and rebuild the frontend:
   ```bash
   sed -i "s|window.axios.defaults.baseURL = 'http://localhost:8000'|window.axios.defaults.baseURL = 'https://your-domain.com'|g" /app/resources/js/bootstrap.js
   cd /app
   npm run build
   ```

### Authentication Issues

If you're having authentication problems:

1. Verify that `SANCTUM_STATEFUL_DOMAINS` includes your domain
2. Check that `SESSION_DOMAIN` is set to your domain with a dot prefix
3. Clear your browser cookies and try again
4. Check the Laravel logs for more details:
   ```bash
   docker exec -it srv-captain--scenic-routes /bin/bash
   tail -f /app/storage/logs/laravel.log
   ```

## Maintenance

### Updating the Application

To update your application:

1. Push changes to your repository
2. Redeploy using the CapRover dashboard or CLI
3. Monitor the logs for any issues

### Database Backups

To backup your database:

```bash
docker exec srv-captain--scenic-routes-db mysqldump -u root -p scenic_routes > backup.sql
```

### Running Artisan Commands

To run Laravel Artisan commands:

```bash
docker exec -it srv-captain--scenic-routes /bin/bash
cd /app
php artisan your-command
```
