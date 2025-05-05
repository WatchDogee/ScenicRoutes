# ScenicRoutes Deployment Guide

This guide provides instructions for deploying the ScenicRoutes application using Docker.

## Prerequisites

- Docker and Docker Compose installed on your server
- A domain name pointing to your server (optional)

## Deployment Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ScenicRoutes.git
cd ScenicRoutes
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory of the project:

```bash
cp .env.example .env
```

Edit the `.env` file to set your environment variables:

```
APP_NAME=ScenicRoutes
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=scenic_routes
DB_USERNAME=scenic_routes_user
DB_PASSWORD=your_secure_password

# Other environment variables...
```

### 3. Update Docker Compose Configuration (Optional)

If needed, update the `docker-compose.yml` file to match your requirements:

- Change database credentials
- Adjust port mappings
- Configure volumes

### 4. Build and Start the Application

```bash
docker-compose up -d
```

This command will:
- Build the Docker images
- Start the containers
- Run database migrations
- Generate application key
- Set up the application

### 5. Access the Application

Once the deployment is complete, you can access the application at:

- http://your-domain.com (if you configured a domain)
- http://server-ip (if you're using the server's IP address)

## Maintenance

### Updating the Application

To update the application:

```bash
git pull
docker-compose build
docker-compose up -d
```

### Viewing Logs

```bash
docker-compose logs -f
```

### Stopping the Application

```bash
docker-compose down
```

### Backing Up the Database

```bash
docker-compose exec db mysqldump -u root -p scenic_routes > backup.sql
```

## Troubleshooting

If you encounter issues:

1. Check the application logs:
   ```bash
   docker-compose logs app
   ```

2. Check the database logs:
   ```bash
   docker-compose logs db
   ```

3. Verify the health check endpoint:
   ```bash
   curl http://your-domain.com/health-check.php
   ```

4. Restart the containers:
   ```bash
   docker-compose restart
   ```
