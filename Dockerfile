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

# Install Node.js using the official setup script
RUN apt-get update && apt-get install -y ca-certificates curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    node -v && \
    npm -v

# Clear apt cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring zip && \
    docker-php-ext-enable opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configure PHP for production
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
    echo "memory_limit=512M" >> "$PHP_INI_DIR/conf.d/memory-limit.ini" && \
    echo "upload_max_filesize=64M" >> "$PHP_INI_DIR/conf.d/upload-limit.ini" && \
    echo "post_max_size=64M" >> "$PHP_INI_DIR/conf.d/post-limit.ini"

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

# Create a simple artisan file
COPY docker/artisan.php /app/artisan
RUN chmod +x /app/artisan

# Copy Nginx and Supervisor configuration
COPY docker/nginx/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Entry point script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Entrypoint and CMD
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
