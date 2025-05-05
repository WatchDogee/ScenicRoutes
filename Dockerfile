FROM webdevops/php-nginx:8.2

# Set working directory
WORKDIR /var/www/html

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y \
    nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy composer files first for better caching
COPY composer.json composer.lock ./

# Copy docker-entrypoint.sh to ensure it's available
COPY docker-entrypoint.sh /tmp/docker-entrypoint.sh

# Install PHP dependencies for production (no dev dependencies)
RUN composer install --no-dev --no-interaction --optimize-autoloader

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install Node.js dependencies
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build frontend assets
RUN npm run build

# Remove node_modules to reduce image size
RUN rm -rf node_modules

# Set permissions
RUN chown -R application:application /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Create essential directories
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Set environment variables
ENV WEB_DOCUMENT_ROOT=/var/www/html/public
ENV PHP_MEMORY_LIMIT=512M
ENV PHP_MAX_EXECUTION_TIME=300
ENV PHP_POST_MAX_SIZE=64M
ENV PHP_UPLOAD_MAX_FILESIZE=64M
ENV APP_ENV=production
ENV APP_DEBUG=false

# Create initialization script
COPY /tmp/docker-entrypoint.sh /opt/docker/bin/entrypoint.d/30-laravel-init.sh
RUN chmod +x /opt/docker/bin/entrypoint.d/30-laravel-init.sh