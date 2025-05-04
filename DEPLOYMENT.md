# ScenicRoutes Deployment Guide

## Prerequisites
- Coolify server
- MySQL database
- Domain name (optional)

## Deployment Steps

1. **Create a new service in Coolify**
   - Select "Docker Compose" as the deployment type
   - Connect your Git repository

2. **Configure Environment Variables**
   - `APP_URL`: Your application URL
   - `DB_HOST`: Database host
   - `DB_PORT`: Database port (usually 3306)
   - `DB_DATABASE`: Database name
   - `DB_USERNAME`: Database username
   - `DB_PASSWORD`: Database password
   - `SESSION_DOMAIN`: Your domain
   - `SANCTUM_STATEFUL_DOMAINS`: Your domain

3. **Deploy the Application**
   - Click "Deploy" in Coolify

## Troubleshooting

If you encounter issues:

1. **Check the health endpoint**
   - Visit `/health.php` to see database connection status

2. **Check permissions**
   - Ensure storage and bootstrap/cache directories are writable

3. **Verify database connection**
   - Check database credentials in environment variables

4. **Rebuild and redeploy**
   - If issues persist, try rebuilding the application