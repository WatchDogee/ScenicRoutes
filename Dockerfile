FROM webdevops/php-nginx:8.2-alpine@sha256:c9f9a9ddb4d6f6c707a9b0c14c9a3d7732c64a3a9f7d4c52d6e9f8daecba4a7c

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

# Copy application files
COPY . /var/www/html

# Install PHP dependencies without dev dependencies for production
RUN composer install --no-interaction --no-dev --optimize-autoloader

# Install Node.js dependencies
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm ci

# Build frontend assets
RUN npm run build

# Set permissions
RUN chown -R application:application /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Set environment variables
ENV WEB_DOCUMENT_ROOT=/var/www/html/public
ENV PHP_MEMORY_LIMIT=512M
ENV PHP_MAX_EXECUTION_TIME=300
ENV PHP_POST_MAX_SIZE=64M
ENV PHP_UPLOAD_MAX_FILESIZE=64M

# Create initialization script
COPY docker-entrypoint.sh /opt/docker/bin/entrypoint.d/30-laravel-init.sh
RUN chmod +x /opt/docker/bin/entrypoint.d/30-laravel-init.sh