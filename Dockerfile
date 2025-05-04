FROM webdevops/php-nginx:8.2

# Set working directory
WORKDIR /app

# Copy application files
COPY . /app

# Install dependencies
RUN composer install --no-interaction --optimize-autoloader --no-dev
RUN npm install && npm run build

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
    && chmod +x /opt/docker/bin/entrypoint.d/30-laravel-init.sh