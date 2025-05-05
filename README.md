# ScenicRoutes

ScenicRoutes is a web application for discovering, saving, and sharing scenic driving routes.

## Features

- User authentication and profile management
- Save and share scenic routes
- Rate and review routes
- Add photos to routes and reviews
- Points of interest and fuel stations
- Elevation data for routes

## Local Development

### Prerequisites

- Docker and Docker Compose
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ScenicRoutes
   ```

2. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```

3. Run migrations:
   ```bash
   docker-compose exec app php artisan migrate
   ```

4. Create storage link:
   ```bash
   docker-compose exec app php artisan storage:link
   ```

5. Access the application at http://localhost:8000

### Frontend Development

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. The Vite server will be available at http://localhost:5173

## Database

The application uses a single comprehensive migration file that creates all necessary tables in the correct order with proper relationships.

## License

This application is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
