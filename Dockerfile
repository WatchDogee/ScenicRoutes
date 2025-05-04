FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libicu-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    zip \
    unzip \
    nginx \
    supervisor \
    default-mysql-client \
    gnupg \
    ca-certificates \
    lsb-release

# Install Node.js directly from NodeSource
RUN apt-get update && apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x $(lsb_release -s -c) main" > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    node -v && \
    npm -v

# Clear apt cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions with better configuration
RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mysqli \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    intl \
    zip \
    opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configure PHP for production
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
    echo "memory_limit=512M" >> "$PHP_INI_DIR/conf.d/memory-limit.ini" && \
    echo "upload_max_filesize=64M" >> "$PHP_INI_DIR/conf.d/upload-limit.ini" && \
    echo "post_max_size=64M" >> "$PHP_INI_DIR/conf.d/post-limit.ini" && \
    echo "max_execution_time=300" >> "$PHP_INI_DIR/conf.d/max-execution-time.ini" && \
    echo "opcache.enable=1" >> "$PHP_INI_DIR/conf.d/opcache.ini" && \
    echo "opcache.memory_consumption=128" >> "$PHP_INI_DIR/conf.d/opcache.ini" && \
    echo "opcache.interned_strings_buffer=8" >> "$PHP_INI_DIR/conf.d/opcache.ini" && \
    echo "opcache.max_accelerated_files=4000" >> "$PHP_INI_DIR/conf.d/opcache.ini" && \
    echo "opcache.revalidate_freq=2" >> "$PHP_INI_DIR/conf.d/opcache.ini" && \
    echo "opcache.fast_shutdown=1" >> "$PHP_INI_DIR/conf.d/opcache.ini"

# Set working directory
WORKDIR /app

# Copy Laravel files
COPY . .

# Install PHP dependencies with optimizations
RUN composer install --prefer-dist --no-dev --no-interaction --optimize-autoloader

# Install Node.js dependencies and build assets
RUN npm install && npm run build

# Create necessary storage and cache directories with proper permissions
RUN mkdir -p \
    /app/storage/app/public \
    /app/storage/framework/cache \
    /app/storage/framework/sessions \
    /app/storage/framework/views \
    /app/storage/logs \
    /app/bootstrap/cache \
    && touch /app/storage/logs/laravel.log \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache \
    && chmod -R 775 /app/storage /app/bootstrap/cache \
    && chmod 664 /app/storage/logs/laravel.log

# Expose HTTP port
EXPOSE 80

# Fix the artisan file to ensure compatibility
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
    && echo '$kernel = $app->make('"'"'Illuminate\Contracts\Console\Kernel'"'"');' >> /app/artisan \
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

# Copy Nginx and Supervisor configuration
COPY docker/nginx/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Entry point script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Entrypoint and CMD
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
