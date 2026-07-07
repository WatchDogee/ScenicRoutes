# ScenicRoutes

ScenicRoutes is a route-planning and road discovery app with social ride-sharing, built with Laravel, Inertia, React, and an Android companion app. App features: 

- Road discovery, route planning and map-based navigation
- Saved roads, ride recording, and GPX import/export
- Social features such as collections, followers, and following


## Requirements

- PHP 8.2+
- Composer
- Node.js 20+ and npm
- PostgreSQL 15+ or compatible local database
- Android Studio (required for android app)

## Local Setup

1. Clone the repository.
2. Copy the example environment file:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Set your local database values in `.env`.
4. Generate the app key:
   ```powershell
   php artisan key:generate
   ```
5. Install PHP dependencies:
   ```powershell
   composer install
   ```
6. Install frontend dependencies:
   ```powershell
   npm install
   ```
7. Run the database migrations:
   ```powershell
   php artisan migrate
   ```
8. Start the Laravel backend:
   ```powershell
   php artisan serve
   ```
9. Start the frontend in another terminal:
   ```powershell
   npm run dev
   ```

## Helpful Commands

- `npm run build` - Build the frontend for production
- `npm run start:all` - Start the combined local development flow
- `php artisan test` - Run the Laravel test suite

## Notes

- Android work lives under `android-native/`.

## Project Layout

- `app/` - Laravel application code
- `resources/js/` - Inertia + React frontend
- `database/` - Migrations, seeders, and factories
- `android-native/` - Android project
- `deployment/` - Deployment helpers and GitHub secrets setup scripts
- `public/` - Web assets and entry point
