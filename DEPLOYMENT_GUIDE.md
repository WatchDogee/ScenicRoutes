# ScenicRoutes Deployment Guide

This guide explains how to deploy the ScenicRoutes application using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your server
- Git installed on your server
- A domain name (optional)

## Deployment Steps

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/ScenicRoutes.git
cd ScenicRoutes
```

2. **Configure environment variables**

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env
```

Edit the `.env` file and update the following variables:

- `APP_URL`: Set this to your domain name or server IP (e.g., `http://yourdomain.com` or `http://your-server-ip:3000`)
- `DB_PASSWORD`: Set a secure password for your database
- `MAIL_*`: Configure your mail settings

3. **Build and start the containers**

```bash
docker-compose up -d
```

This will build the Docker images and start the containers in detached mode.

4. **Access your application**

Your application should now be accessible at:

- http://your-server-ip:3000
- http://yourdomain.com (if you've configured your domain to point to your server)

## Troubleshooting

### 404 Error when accessing routes like /map

If you're experiencing 404 errors when accessing routes like `/map`, it could be due to one of the following issues:

1. **Apache rewrite module not enabled**

The rewrite module should be enabled automatically in the Dockerfile, but you can verify it by running:

```bash
docker exec -it laravel-app a2enmod rewrite
docker exec -it laravel-app service apache2 restart
```

2. **Incorrect .htaccess configuration**

Check that the `.htaccess` file in the `public` directory is correctly configured for SPA routing.

3. **Container restarting**

If the container is constantly restarting, check the logs:

```bash
docker logs laravel-app
```

### Database Connection Issues

If you're experiencing database connection issues, make sure:

1. The database container is running:

```bash
docker ps | grep laravel-db
```

2. The database credentials in your `.env` file match those in the `docker-compose.yaml` file.

3. The database host in your `.env` file is set to `db` (the service name in docker-compose).

## Updating the Application

To update the application:

1. Pull the latest changes:

```bash
git pull
```

2. Rebuild and restart the containers:

```bash
docker-compose down
docker-compose up -d --build
```

## Backup and Restore

### Database Backup

```bash
docker exec laravel-db mariadb-dump -u root -p"your-password" ScenicRoutesDB > backup.sql
```

### Database Restore

```bash
cat backup.sql | docker exec -i laravel-db mariadb -u root -p"your-password" ScenicRoutesDB
```

## Monitoring

You can monitor the application logs using:

```bash
docker logs -f laravel-app
```

For database logs:

```bash
docker logs -f laravel-db
```
