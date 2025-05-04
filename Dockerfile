FROM webdevops/php-nginx:8.2

# Set working directory
WORKDIR /app

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && node -v \
    && npm -v

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy application files
COPY . /app

# Set proper permissions
RUN chown -R application:application /app

# Install PHP dependencies
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Install Node.js dependencies and build assets
RUN npm install && npm run build

# Create necessary directories and set permissions
RUN mkdir -p /app/storage/app/public \
    /app/storage/framework/cache \
    /app/storage/framework/sessions \
    /app/storage/framework/views \
    /app/storage/logs \
    /app/bootstrap/cache \
    && chown -R application:application /app/storage /app/bootstrap/cache \
    && chmod -R 775 /app/storage /app/bootstrap/cache

# Create a simple artisan file to avoid syntax issues
RUN echo '#!/usr/bin/env php' > /app/artisan \
    && echo '<?php' >> /app/artisan \
    && echo 'define("LARAVEL_START", microtime(true));' >> /app/artisan \
    && echo 'require __DIR__."/vendor/autoload.php";' >> /app/artisan \
    && echo '$app = require_once __DIR__."/bootstrap/app.php";' >> /app/artisan \
    && echo '$kernel = $app->make("Illuminate\Contracts\Console\Kernel");' >> /app/artisan \
    && echo '$status = $kernel->handle($input = new Symfony\Component\Console\Input\ArgvInput, new Symfony\Component\Console\Output\ConsoleOutput);' >> /app/artisan \
    && echo '$kernel->terminate($input, $status);' >> /app/artisan \
    && echo 'exit($status);' >> /app/artisan \
    && chmod +x /app/artisan

# Copy Nginx configuration
COPY docker/nginx/nginx.conf /opt/docker/etc/nginx/vhost.conf

# Create entrypoint script for Laravel setup
RUN echo '#!/bin/bash' > /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'set -e' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'echo "Setting up Laravel application..."' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'mkdir -p /app/storage/app/public' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'mkdir -p /app/storage/framework/cache' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'mkdir -p /app/storage/framework/sessions' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'mkdir -p /app/storage/framework/views' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'mkdir -p /app/storage/logs' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'mkdir -p /app/bootstrap/cache' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'chown -R application:application /app/storage /app/bootstrap/cache' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'chmod -R 775 /app/storage /app/bootstrap/cache' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ]; then' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo '    php /app/artisan key:generate --force || true' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'fi' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'if [ ! -z "$DB_CONNECTION" ]; then' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo '    php /app/artisan migrate --force || true' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'fi' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'php /app/artisan config:clear || true' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'php /app/artisan cache:clear || true' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'php /app/artisan view:clear || true' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'php /app/artisan route:clear || true' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'php /app/artisan storage:link || true' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && echo 'echo "Laravel application is ready!"' >> /opt/docker/bin/entrypoint.d/30-laravel-setup.sh \
    && chmod +x /opt/docker/bin/entrypoint.d/30-laravel-setup.sh

# Create health check file
RUN echo '<?php echo "OK";' > /app/public/health-check.php

# Expose port for CapRover
EXPOSE 80

# Set environment variables for webdevops/php-nginx
ENV WEB_DOCUMENT_ROOT=/app/public
ENV PHP_DISPLAY_ERRORS=1
ENV PHP_MEMORY_LIMIT=512M
ENV PHP_MAX_EXECUTION_TIME=300
ENV PHP_POST_MAX_SIZE=64M
ENV PHP_UPLOAD_MAX_FILESIZE=64M
ENV PHP_DATE_TIMEZONE=UTC
