# Deploying ScenicRoutes with Coolify

This guide explains how to deploy the ScenicRoutes Laravel + React application using Coolify on DigitalOcean.

## Prerequisites

1. A DigitalOcean account
2. A domain name (optional, but recommended)
3. Basic knowledge of Docker and Laravel

## Step 1: Set Up DigitalOcean Droplet

1. Create a new DigitalOcean Droplet with at least 2GB RAM and Ubuntu 22.04
2. Set up SSH access to your Droplet

## Step 2: Install Coolify on Your Droplet

1. SSH into your Droplet
2. Run the following command to install Coolify:

```bash
wget -q https://get.coolify.io -O install.sh && sudo bash ./install.sh
```

3. Follow the installation prompts
4. Once installed, access the Coolify dashboard at `http://your-droplet-ip:8000`

## Step 3: Configure Coolify

1. Create a new account in Coolify
2. Set up your project:
   - Add a new project
   - Connect your Git repository (GitHub, GitLab, etc.)
   - Select the ScenicRoutes repository

## Step 4: Set Up External Database

Since we want to keep the database separate from the containerized application:

1. Create a managed MySQL database on DigitalOcean
2. Note the connection details (host, port, username, password)

## Step 5: Deploy Your Application

1. In Coolify, create a new service for your project
2. Select "Docker Compose" as the deployment type
3. Configure the environment variables:
   - Use the values from `.env.coolify` as a template
   - Update the database connection details to point to your external database
   - Set a secure APP_KEY (you can generate one with `php artisan key:generate --show`)
   - Configure your mail settings
   - Set your domain name in APP_URL, SESSION_DOMAIN, and SANCTUM_STATEFUL_DOMAINS

4. Configure build settings:
   - Build command: Leave empty (uses docker-compose.yaml)
   - Port: 80
   - Healthcheck path: /

5. Configure deployment settings:
   - Enable "Run migrations"
   - Add post-deployment commands:
     ```
     php artisan config:cache
     php artisan route:cache
     php artisan view:cache
     ```

6. Click "Deploy"

## Step 6: Set Up SSL (Optional but Recommended)

1. In Coolify, go to your service settings
2. Enable SSL
3. Choose "Let's Encrypt" for automatic SSL certificate generation
4. Enter your domain name

## Step 7: Verify Deployment

1. Access your application at your domain or the provided Coolify URL
2. Check the logs in Coolify to ensure everything is running correctly
3. Test the application functionality

## Troubleshooting

If you encounter issues:

1. Check the Coolify logs for errors
2. Verify your environment variables are correctly set
3. Ensure your database connection is working
4. Check that your storage directories have the correct permissions

## Maintenance

To update your application:

1. Push changes to your Git repository
2. Coolify will automatically detect changes and redeploy (if auto-deploy is enabled)
3. Alternatively, manually trigger a deployment from the Coolify dashboard

## Backup Strategy

1. Set up regular database backups for your external database
2. Consider backing up the persistent volumes for your application storage

## Scaling

If you need to scale your application:

1. Increase the resources of your DigitalOcean Droplet
2. Consider setting up a load balancer if needed
3. Optimize your database for higher traffic
