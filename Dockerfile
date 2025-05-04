FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    nginx \
    supervisor \
    nodejs \
    npm

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Copy composer.json and composer.lock
COPY composer.json composer.lock ./

# Install PHP dependencies
RUN composer install --no-scripts --no-autoloader --no-dev

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

<<<<<<< HEAD
# Fix the artisan file
RUN echo '#!/usr/bin/env php' > /app/artisan \
    && echo '<?php' >> /app/artisan \
    && echo '' >> /app/artisan \
    && echo '// Define the application start time' >> /app/artisan \
    && echo 'define('"'"'LARAVEL_START'"'"', microtime(true));' >> /app/artisan \
    && echo '' >> /app/artisan \
    && echo '// Register the Composer autoloader' >> /app/artisan \
    && echo 'require __DIR__.'"'"'/vendor/autoload.php'"'"';' >> /app/artisan \
    && echo '' >> /app/artisan \
    && echo '// Bootstrap the application' >> /app/artisan \
    && echo '$app = require_once __DIR__.'"'"'/bootstrap/app.php'"'"';' >> /app/artisan \
    && echo '' >> /app/artisan \
    && echo '// Get the kernel' >> /app/artisan \
    && echo '$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);' >> /app/artisan \
    && echo '' >> /app/artisan \
    && echo '// Handle the command' >> /app/artisan \
    && echo '$status = $kernel->handle(' >> /app/artisan \
    && echo '    $input = new Symfony\Component\Console\Input\ArgvInput,' >> /app/artisan \
    && echo '    new Symfony\Component\Console\Output\ConsoleOutput' >> /app/artisan \
    && echo ');' >> /app/artisan \
    && echo '' >> /app/artisan \
    && echo '// Terminate the kernel' >> /app/artisan \
    && echo '$kernel->terminate($input, $status);' >> /app/artisan \
    && echo '' >> /app/artisan \
    && echo '// Exit with the status code' >> /app/artisan \
    && echo 'exit($status);' >> /app/artisan \
    && chmod +x /app/artisan

=======
>>>>>>> d26d5cb991e86db8d0091b1591a626e295923b3b
# Generate optimized Composer autoload files
RUN composer dump-autoload --optimize

# Build React assets
RUN npm run build

# Create necessary directories and set permissions
RUN mkdir -p /app/storage/logs \
    /app/storage/framework/cache \
    /app/storage/framework/sessions \
    /app/storage/framework/views \
    /app/bootstrap/cache \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache \
    && chmod -R 775 /app/storage /app/bootstrap/cache

# Copy Nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/sites-available/default

# Copy Supervisor configuration
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
<<<<<<< HEAD

# Create entrypoint script
RUN echo '#!/bin/bash' > /entrypoint.sh \
    && echo 'set -e' >> /entrypoint.sh \
    && echo '' >> /entrypoint.sh \
    && echo '# Create necessary directories' >> /entrypoint.sh \
    && echo 'mkdir -p /app/storage/logs' >> /entrypoint.sh \
    && echo 'mkdir -p /app/storage/framework/cache' >> /entrypoint.sh \
    && echo 'mkdir -p /app/storage/framework/sessions' >> /entrypoint.sh \
    && echo 'mkdir -p /app/storage/framework/views' >> /entrypoint.sh \
    && echo 'mkdir -p /app/bootstrap/cache' >> /entrypoint.sh \
    && echo '' >> /entrypoint.sh \
    && echo '# Set proper permissions' >> /entrypoint.sh \
    && echo 'chown -R www-data:www-data /app/storage /app/bootstrap/cache' >> /entrypoint.sh \
    && echo 'chmod -R 775 /app/storage /app/bootstrap/cache' >> /entrypoint.sh \
    && echo '' >> /entrypoint.sh \
    && echo '# Generate application key if not set' >> /entrypoint.sh \
    && echo 'if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then' >> /entrypoint.sh \
    && echo '    php /app/artisan key:generate --force' >> /entrypoint.sh \
    && echo 'fi' >> /entrypoint.sh \
    && echo '' >> /entrypoint.sh \
    && echo '# Run migrations' >> /entrypoint.sh \
    && echo 'php /app/artisan migrate --force' >> /entrypoint.sh \
    && echo '' >> /entrypoint.sh \
    && echo '# Clear caches' >> /entrypoint.sh \
    && echo 'php /app/artisan config:clear' >> /entrypoint.sh \
    && echo 'php /app/artisan cache:clear' >> /entrypoint.sh \
    && echo 'php /app/artisan view:clear' >> /entrypoint.sh \
    && echo 'php /app/artisan route:clear' >> /entrypoint.sh \
    && echo '' >> /entrypoint.sh \
    && echo '# Create storage link' >> /entrypoint.sh \
    && echo 'php /app/artisan storage:link' >> /entrypoint.sh \
    && echo '' >> /entrypoint.sh \
    && echo '# Start PHP-FPM and Nginx' >> /entrypoint.sh \
    && echo 'exec "$@"' >> /entrypoint.sh \
    && chmod +x /entrypoint.sh
=======
>>>>>>> d26d5cb991e86db8d0091b1591a626e295923b3b

# Expose port
EXPOSE 80

# Start services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]