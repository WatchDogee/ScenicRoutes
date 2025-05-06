# ScenicRoutes Deployment Guide

This guide explains how to deploy ScenicRoutes while ensuring images and storage work correctly.

## Understanding Storage Issues

When deploying ScenicRoutes, image storage can break for several reasons:

1. **Container Ephemerality**: Docker containers are temporary, and files stored inside them are lost when the container is replaced during deployment.
2. **Storage Configuration**: The application can use either local storage or cloud storage (Cloudflare R2/S3), and inconsistencies between environments can cause issues.
3. **Symlink Problems**: The `storage:link` command creates a symbolic link that might not persist between deployments.

## Pre-Deployment Checklist

Before deploying, ensure:

1. **Environment Variables**: Set the correct storage configuration in your environment:
   ```
   # For Cloudflare R2 (recommended for production)
   FILESYSTEM_DISK=s3
   AWS_ACCESS_KEY_ID=your_actual_cloudflare_r2_access_key
   AWS_SECRET_ACCESS_KEY=your_actual_cloudflare_r2_secret_key
   AWS_DEFAULT_REGION=auto
   AWS_BUCKET=scenicroutes-bucket
   AWS_ENDPOINT=https://your-actual-endpoint.r2.cloudflarestorage.com
   AWS_USE_PATH_STYLE_ENDPOINT=true
   
   # For local storage (development only)
   FILESYSTEM_DISK=local
   ```

2. **Persistent Storage**: Ensure your deployment platform is configured to use persistent volumes for the storage directory.

## Deployment Steps

### Using the Deployment Script

We've created a `deploy.sh` script that handles the deployment process, including database management:

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script will:
- Offer to backup the database before deployment
- Offer to clear the database during deployment
- Run necessary Laravel commands
- Set proper permissions
- Offer to restore the database from backup

### Manual Deployment

If you prefer to deploy manually:

1. **Backup the database** (optional):
   ```bash
   php db-management.php
   # Select option 3 to backup the database
   ```

2. **Clear the database** (optional):
   ```bash
   php db-management.php
   # Select option 5 to clear the database
   ```

3. **Run Laravel commands**:
   ```bash
   php artisan key:generate --force
   php artisan migrate --force
   php artisan storage:link
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   php artisan cache:clear
   php artisan optimize
   ```

4. **Set permissions**:
   ```bash
   chmod -R 775 storage bootstrap/cache
   chown -R www-data:www-data storage bootstrap/cache
   ```

5. **Restore the database** (optional):
   ```bash
   php db-management.php
   # Select option 4 to restore the database
   ```

## Storage Configuration

### Using Cloudflare R2 (Recommended for Production)

For production environments, we recommend using Cloudflare R2 for storage:

1. Create a Cloudflare R2 bucket
2. Set the environment variables as shown in the pre-deployment checklist
3. Deploy the application

The application will automatically use R2 for storing and retrieving images.

### Using Local Storage with Persistent Volumes

If you prefer to use local storage:

1. Ensure your deployment platform supports persistent volumes
2. Set `FILESYSTEM_DISK=local` in your environment
3. Deploy the application

The `captain-definition` file includes a persistent volume configuration for CapRover:

```json
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile",
  "volumes": [
    {
      "volumeName": "scenic-routes-storage",
      "containerPath": "/var/www/html/storage"
    }
  ]
}
```

## Troubleshooting

If images are still not working after deployment:

1. **Check Storage Configuration**:
   ```bash
   php fix-storage.php
   # Select option 1 to check storage configuration
   ```

2. **Fix Storage Symlink**:
   ```bash
   php fix-storage.php
   # Select option 2 to fix storage symlink
   ```

3. **Check User Profile Pictures**:
   ```bash
   php fix-storage.php
   # Select option 3 to check user profile pictures
   ```

4. **Create Test Image**:
   ```bash
   php fix-storage.php
   # Select option 4 to create a test image
   ```

5. **Check Logs**:
   ```bash
   tail -f storage/logs/laravel.log
   ```

## Conclusion

By following this guide, you should be able to deploy ScenicRoutes with working image storage. The key is to ensure consistent storage configuration and persistent storage for your files.
