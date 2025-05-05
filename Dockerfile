FROM webdevops/php-nginx:8.2

# Set working directory
WORKDIR /app

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
COPY . /app

# Make the API URL update script executable
RUN chmod +x /app/update-api-url.sh

# Install PHP dependencies
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Install Node.js dependencies (including dev dependencies for build)
ENV NODE_OPTIONS=--max_old_space_size=4096
# We need to install dev dependencies for the build process
RUN npm ci --include=dev

# Update API URL based on environment
RUN /app/update-api-url.sh

# Build frontend assets
RUN npm run build

# Clean up dev dependencies after build to reduce image size
ENV NODE_ENV=production
RUN npm prune --production

# Set permissions
RUN chown -R application:application /app/storage /app/bootstrap/cache
RUN chmod -R 775 /app/storage /app/bootstrap/cache

# Set environment variables
ENV WEB_DOCUMENT_ROOT=/app/public
ENV PHP_MEMORY_LIMIT=512M
ENV PHP_MAX_EXECUTION_TIME=300
ENV PHP_POST_MAX_SIZE=64M
ENV PHP_UPLOAD_MAX_FILESIZE=64M

# Create initialization script
RUN echo '#!/bin/bash' > /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'set -e' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'cd /app' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'if [ -z "$APP_KEY" ]; then php artisan key:generate; fi' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'php artisan migrate --force || true' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'php artisan config:cache' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'php artisan route:cache' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'php artisan view:cache' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'php artisan storage:link || true' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'echo "Adding domain to sanctum stateful domains..."' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'DOMAIN=$(echo $APP_URL | sed -e "s|^[^/]*//||" -e "s|/.*$||")' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "127.0.0.1" ]; then' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo '  php artisan tinker --execute "\\Illuminate\\Support\\Facades\\Config::set(\"sanctum.stateful\", array_merge(\\Illuminate\\Support\\Facades\\Config::get(\"sanctum.stateful\"), [\"$DOMAIN\"]));"' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && echo 'fi' >> /opt/docker/bin/entrypoint.d/30-laravel-init.sh \
    && chmod +x /opt/docker/bin/entrypoint.d/30-laravel-init.sh