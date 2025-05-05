# ScenicRoutes - Local Development Guide

This guide provides instructions for setting up and running the ScenicRoutes application in a local development environment.

## Prerequisites

- Docker and Docker Compose
- Git

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ScenicRoutes
   ```

2. Set up the environment:
   ```bash
   # Make sure you're using the local environment
   ./switch-env.sh local
   ```

3. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```

4. The application should now be running at http://localhost:8000

## Development Workflow

### Environment Management

The project includes multiple environment configurations:

- `.env.local` - Local development environment
- `.env.deployment` - Deployment environment for Laravel Cloud

Use the provided script to switch between environments:

```bash
# Switch to local environment
./switch-env.sh local

# Switch to deployment environment
./switch-env.sh deployment

# Backup current environment
./switch-env.sh backup
```

### Database Migrations

To run database migrations:

```bash
docker-compose exec app php artisan migrate
```

To refresh the database (caution: this will delete all data):

```bash
docker-compose exec app php artisan migrate:fresh
```

### Frontend Development

The frontend is built with React and Inertia.js. To work on the frontend:

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. The Vite server will be available at http://localhost:5173

### Testing

To run tests:

```bash
docker-compose exec app php artisan test
```

## Project Structure

- `app/` - Laravel application code
  - `Http/Controllers/` - Controllers
  - `Models/` - Eloquent models
  - `Services/` - Service classes
- `database/` - Database migrations and seeders
- `resources/` - Frontend resources
  - `js/` - React components and pages
  - `css/` - CSS styles
- `routes/` - API and web routes
- `tests/` - Test files

## Useful Commands

- Start containers: `docker-compose up -d`
- Stop containers: `docker-compose down`
- View logs: `docker-compose logs -f`
- Run artisan commands: `docker-compose exec app php artisan <command>`
- Access MySQL: `docker-compose exec db mysql -u root -pmy-secret-pw ScenicRoutesDB`
- Rebuild frontend: `./rebuild-frontend.sh`

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Check if the database container is running:
   ```bash
   docker-compose ps
   ```

2. Verify database credentials in `.env` file:
   ```
   DB_CONNECTION=mysql
   DB_HOST=db
   DB_PORT=3306
   DB_DATABASE=ScenicRoutesDB
   DB_USERNAME=root
   DB_PASSWORD=my-secret-pw
   ```

3. Try connecting to the database directly:
   ```bash
   docker-compose exec db mysql -u root -pmy-secret-pw -e "SHOW DATABASES;"
   ```

### Frontend Build Issues

If you encounter issues with the frontend build:

1. Clear Node.js modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Rebuild the frontend:
   ```bash
   npm run build
   ```

3. Check for JavaScript errors in the browser console.

## Deployment

For deployment instructions, refer to:
- `LARAVEL_CLOUD_DEPLOYMENT.md` - Laravel Cloud deployment guide
- `ENV_MANAGEMENT.md` - Environment management guide
