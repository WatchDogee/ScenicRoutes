# ScenicRoutes Coolify Deployment Guide

This guide provides instructions for deploying the ScenicRoutes application using Coolify.

## Deployment Files

The following files are used for Coolify deployment:

- `Dockerfile` - Defines the container image for the application
- `docker-compose.yaml` - Defines the services for Coolify deployment
- `docker-entrypoint.sh` - Script that runs when the container starts
- `.env.coolify` - Environment variables for Coolify deployment
- `docker/nginx/coolify.conf` - Nginx configuration for Coolify

## Environment Variables

The following environment variables should be set in Coolify:

```
APP_URL=http://your-coolify-domain.sslip.io
DB_DATABASE=ScenicRoutesDB
DB_HOST=ScenicRoutesDB
DB_PASSWORD=your-db-password
DB_PORT=3306
DB_USERNAME=mysql
NIXPACKS_PHP_FALLBACK_PATH=/index.php
NIXPACKS_PHP_ROOT_DIR=/app/public
SANCTUM_STATEFUL_DOMAINS=.your-coolify-domain.sslip.io
SESSION_DOMAIN=.your-coolify-domain.sslip.io
```

## Deployment Steps

1. Push your code to the `deploy-coolify` branch
2. In Coolify, create a new deployment from the `deploy-coolify` branch
3. Set the environment variables as described above
4. Deploy the application

## Troubleshooting

If you encounter the "Welcome to nginx" page after deployment, check the following:

1. Visit `/health-check.php` to verify PHP is working
2. Visit `/coolify-test.html` to verify static files are being served
3. Visit `/check-nginx.php` to check the Nginx configuration
4. Visit `/app-status.php` to check the Laravel application status
5. Visit `/coolify-health-check.php` for detailed environment information

### Common Issues

1. **Nginx Default Page**: This usually means Nginx is not using the correct configuration. Check that the `docker/nginx/coolify.conf` file is being copied to `/opt/docker/etc/nginx/vhost.conf` in the container.

2. **Database Connection Issues**: Verify the database credentials in the environment variables.

3. **File Permissions**: Make sure the storage and bootstrap/cache directories are writable.

4. **Missing .env File**: The `docker-entrypoint.sh` script should copy `.env.coolify` to `.env` during container startup.

## Logs

To view the logs, use the Coolify dashboard or connect to the container:

```bash
docker exec -it your-container-id /bin/bash
tail -f /var/log/nginx/error.log
tail -f /var/www/html/storage/logs/laravel.log
```
