# ScenicRoutes Deployment Guide

This guide provides instructions for deploying the ScenicRoutes application using CapRover.

## Prerequisites

- A CapRover server set up and running
- A domain name configured with CapRover
- Access to the CapRover dashboard

## Docker Image Details

The Docker image includes:
- PHP 8.2 with Nginx
- Node.js 18.x for frontend asset compilation
- Composer for PHP dependencies
- Supervisor for process management

## Deployment Steps

### 1. Prepare Your Repository

Make sure your repository includes:
- A valid `Dockerfile`
- A `captain-definition` file pointing to your Dockerfile
- `.env.example` as a template (but no actual `.env` files with credentials)

### 2. Configure Environment Variables in CapRover

1. Log in to your CapRover dashboard
2. Navigate to your app
3. Go to the "App Configs" tab
4. Add all required environment variables:
   - `APP_NAME`
   - `APP_ENV` (set to `production`)
   - `APP_KEY` (will be generated automatically on first deploy)
   - `APP_DEBUG` (set to `false` in production)
   - `APP_URL` (your app's URL)
   - Database credentials
   - Mail settings
   - Other required environment variables

### 3. Deploy the Application

#### Option 1: Deploy from the CapRover Dashboard

1. In the CapRover dashboard, go to your app
2. Click on "Deployment" tab
3. Choose "Deploy from Github/Bitbucket/etc."
4. Enter your repository details
5. Click "Deploy"

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

### 4. Access the Application

Once the deployment is complete, you can access the application at the URL configured in CapRover.

## Maintenance

### Updating the Application

To update the application, simply push changes to your repository and redeploy using the CapRover dashboard or CLI.

### Viewing Logs

1. In the CapRover dashboard, go to your app
2. Click on the "Logs" tab to view application logs

### Running Commands

To run commands on your deployed application:

1. In the CapRover dashboard, go to your app
2. Click on the "Deployment" tab
3. Scroll down to "Container HTTP Terminal"
4. Use the terminal to run commands like:
   ```bash
   php artisan migrate
   php artisan cache:clear
   ```

## Troubleshooting

If you encounter issues:

1. Check the application logs in the CapRover dashboard:
   - Go to your app
   - Click on the "Logs" tab

2. Verify the application is running:
   - Go to your app in the CapRover dashboard
   - Check the "Deployment" tab for status

3. Verify the health check endpoint:
   ```bash
   curl https://your-app-domain.com/health-check.php
   ```

4. Restart the application:
   - In the CapRover dashboard, go to your app
   - Click "Restart App"

### Common Issues

#### Build Failures

If your build fails during deployment:

1. Check the build logs in the CapRover dashboard
2. Make sure your Dockerfile is correctly configured
3. Verify that all required environment variables are set in CapRover

#### Node.js Build Failures

If you encounter Node.js build failures:

1. Increase the memory limit for Node.js in the Dockerfile:
   ```
   ENV NODE_OPTIONS=--max_old_space_size=8192
   ```

2. Check if your Node.js dependencies are compatible with Node.js 18.x.

3. Try building locally first to identify specific errors.

#### PHP Dependency Issues

If you encounter PHP dependency issues:

1. Make sure your composer.json file is up to date.

2. Try clearing the Composer cache using the CapRover terminal:
   ```bash
   composer clear-cache
   ```

#### Database Connection Issues

If you have database connection issues:

1. Verify your database credentials in the CapRover environment variables
2. Make sure your database is accessible from the CapRover container
3. Check if your database service is running
