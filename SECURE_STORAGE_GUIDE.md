# Secure Storage Configuration Guide

This guide explains how to securely configure and use Cloudflare R2 storage with your ScenicRoutes application.

## Local Development

For local development, you need to manually add your Cloudflare R2 credentials to your `.env` file:

```
AWS_ACCESS_KEY_ID=your_cloudflare_r2_access_key
AWS_SECRET_ACCESS_KEY=your_cloudflare_r2_secret_key
AWS_DEFAULT_REGION=auto
AWS_BUCKET=scenicroutes-bucket
AWS_ENDPOINT=https://367be3a2035528943240074d0096e0cd.r2.cloudflarestorage.com
AWS_USE_PATH_STYLE_ENDPOINT=true
```

**IMPORTANT: Never commit your `.env` file with real credentials to version control!**

## Laravel Cloud Deployment

For Laravel Cloud deployment, you should set these environment variables in the Laravel Cloud dashboard:

1. Go to your Laravel Cloud dashboard
2. Navigate to your application's settings
3. Add the following environment variables:
   - `AWS_ACCESS_KEY_ID`: Your Cloudflare R2 access key
   - `AWS_SECRET_ACCESS_KEY`: Your Cloudflare R2 secret key
   - `AWS_DEFAULT_REGION`: auto
   - `AWS_BUCKET`: scenicroutes-bucket
   - `AWS_ENDPOINT`: https://367be3a2035528943240074d0096e0cd.r2.cloudflarestorage.com
   - `AWS_USE_PATH_STYLE_ENDPOINT`: true
   - `FILESYSTEM_DISK`: s3

## Testing Your Storage Configuration

You can test your storage configuration using the included Artisan command:

```bash
php artisan storage:test
```

This command will attempt to upload a test file to your Cloudflare R2 bucket and verify that it can be retrieved.

## Troubleshooting

If you encounter issues with your storage configuration:

1. Verify that your Cloudflare R2 credentials are correct
2. Ensure that your bucket exists and is accessible
3. Check that the required packages are installed:
   ```bash
   composer require league/flysystem-aws-s3-v3
   ```
4. Verify that your application has the correct permissions to access the bucket

## Security Best Practices

1. **Never commit credentials to version control**
2. Use environment variables for all sensitive information
3. Consider using a secrets manager for production environments
4. Regularly rotate your access keys
5. Use the principle of least privilege when creating access keys

## File Storage Implementation

The application is configured to automatically use the appropriate storage disk based on your environment:

- In local development, you can use either the `local` disk or the `s3` disk
- In production, the application will use the `s3` disk

All file-related models (User, RoadPhoto, PoiPhoto, ReviewPhoto) have been updated to handle both local and S3 storage.
