#!/bin/bash
set -e

# Change to application directory
cd /var/www/html

echo "Starting Laravel initialization for Coolify..."

# Copy .env.coolify to .env if it exists
if [ -f ".env.coolify" ]; then
    echo "Copying .env.coolify to .env..."
    cp .env.coolify .env
fi

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    echo "Generating application key..."
    php artisan key:generate
fi

# Configure database connection
echo "Configuring database connection..."
if [ -n "$DB_HOST" ] && [ -n "$DB_DATABASE" ]; then
    # Wait for database to be ready
    echo "Waiting for database connection..."
    max_tries=30
    counter=0

    until php -r "try { new PDO('$DB_CONNECTION:host=$DB_HOST;port=$DB_PORT;dbname=$DB_DATABASE', '$DB_USERNAME', '$DB_PASSWORD'); echo 'Connected to database'; } catch (PDOException \$e) { echo \$e->getMessage(); exit(1); }" > /dev/null 2>&1; do
        sleep 1
        counter=$((counter + 1))
        if [ $counter -gt $max_tries ]; then
            echo "Could not connect to database after $max_tries attempts. Continuing anyway..."
            break
        fi
        echo "Waiting for database... ($counter/$max_tries)"
    done
fi

# Run migrations
echo "Running database migrations..."
php artisan migrate --force || echo "Migration failed, but continuing..."

# Create storage link
echo "Creating storage link..."
php artisan storage:link || echo "Storage link creation failed, but continuing..."

# Configure domain for Sanctum
echo "Configuring Sanctum stateful domains..."
if [ -n "$APP_URL" ]; then
    DOMAIN=$(echo $APP_URL | sed -e "s|^[^/]*//||" -e "s|/.*$||")

    if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "127.0.0.1" ]; then
        echo "Adding domain $DOMAIN to Sanctum stateful domains..."

        # Use the provided SESSION_DOMAIN and SANCTUM_STATEFUL_DOMAINS if available
        if [ -n "$SESSION_DOMAIN" ]; then
            echo "Using provided SESSION_DOMAIN: $SESSION_DOMAIN"
            # Update SESSION_DOMAIN in .env if it exists
            if grep -q "^SESSION_DOMAIN=" .env; then
                sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=$SESSION_DOMAIN|g" .env
            else
                echo "SESSION_DOMAIN=$SESSION_DOMAIN" >> .env
            fi
        else
            # Extract the root domain for session cookies
            ROOT_DOMAIN=$(echo $DOMAIN | grep -oP '([^.]+\.[^.]+)$' || echo $DOMAIN)
            echo "Setting SESSION_DOMAIN to .$ROOT_DOMAIN"
            # Update SESSION_DOMAIN in .env if it exists
            if grep -q "^SESSION_DOMAIN=" .env; then
                sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=.$ROOT_DOMAIN|g" .env
            else
                echo "SESSION_DOMAIN=.$ROOT_DOMAIN" >> .env
            fi
        fi

        if [ -n "$SANCTUM_STATEFUL_DOMAINS" ]; then
            echo "Using provided SANCTUM_STATEFUL_DOMAINS: $SANCTUM_STATEFUL_DOMAINS"
            # Update SANCTUM_STATEFUL_DOMAINS in .env if it exists
            if grep -q "^SANCTUM_STATEFUL_DOMAINS=" .env; then
                sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=$SANCTUM_STATEFUL_DOMAINS|g" .env
            else
                echo "SANCTUM_STATEFUL_DOMAINS=$SANCTUM_STATEFUL_DOMAINS" >> .env
            fi
        else
            # Add both the full domain and the root domain with wildcard
            echo "Setting SANCTUM_STATEFUL_DOMAINS to $DOMAIN,*.$ROOT_DOMAIN"
            if grep -q "^SANCTUM_STATEFUL_DOMAINS=" .env; then
                sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=$DOMAIN,*.$ROOT_DOMAIN|g" .env
            else
                echo "SANCTUM_STATEFUL_DOMAINS=$DOMAIN,*.$ROOT_DOMAIN" >> .env
            fi
        fi

        echo "Domain configuration updated in .env file"
    fi
fi

# Configure Nixpacks settings if provided
if [ -n "$NIXPACKS_PHP_ROOT_DIR" ] || [ -n "$NIXPACKS_PHP_FALLBACK_PATH" ]; then
    echo "Configuring Nixpacks settings..."

    if [ -n "$NIXPACKS_PHP_ROOT_DIR" ]; then
        echo "NIXPACKS_PHP_ROOT_DIR: $NIXPACKS_PHP_ROOT_DIR"

        # Create symbolic link if needed
        if [ "$NIXPACKS_PHP_ROOT_DIR" != "/var/www/html/public" ]; then
            echo "Creating symbolic link from $NIXPACKS_PHP_ROOT_DIR to /var/www/html/public"
            mkdir -p $(dirname "$NIXPACKS_PHP_ROOT_DIR")

            # Remove existing directory or link if it exists
            if [ -e "$NIXPACKS_PHP_ROOT_DIR" ]; then
                echo "Removing existing directory or link at $NIXPACKS_PHP_ROOT_DIR"
                rm -rf "$NIXPACKS_PHP_ROOT_DIR"
            fi

            # Create the symbolic link
            ln -sf /var/www/html/public "$NIXPACKS_PHP_ROOT_DIR"
            echo "Symbolic link created successfully"

            # Verify the link
            if [ -L "$NIXPACKS_PHP_ROOT_DIR" ]; then
                echo "Verified: $NIXPACKS_PHP_ROOT_DIR is now a symbolic link"
                ls -la "$NIXPACKS_PHP_ROOT_DIR"
            else
                echo "Warning: Failed to create symbolic link at $NIXPACKS_PHP_ROOT_DIR"
            fi
        else
            echo "No symbolic link needed, NIXPACKS_PHP_ROOT_DIR already points to /var/www/html/public"
        fi
    fi

    if [ -n "$NIXPACKS_PHP_FALLBACK_PATH" ]; then
        echo "NIXPACKS_PHP_FALLBACK_PATH: $NIXPACKS_PHP_FALLBACK_PATH"
    fi
fi

# Update frontend API URL configuration
echo "Configuring frontend API URL..."
if [ -n "$APP_URL" ] && [ -f "resources/js/bootstrap.js" ]; then
    # Check if bootstrap.js contains hardcoded localhost URL
    if grep -q "window.axios.defaults.baseURL = 'http://localhost:8000'" resources/js/bootstrap.js; then
        echo "Updating API URL in bootstrap.js..."
        sed -i "s|window.axios.defaults.baseURL = 'http://localhost:8000'|window.axios.defaults.baseURL = '$APP_URL'|g" resources/js/bootstrap.js
    fi
fi

# Clear cache
echo "Clearing cache..."
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
php artisan optimize

# Verify Nginx configuration
echo "Verifying Nginx configuration..."
NGINX_CONF_PATH="/opt/docker/etc/nginx/vhost.conf"
if [ -f "$NGINX_CONF_PATH" ]; then
    echo "Nginx configuration found at $NGINX_CONF_PATH"
    grep -q "root /var/www/html/public" "$NGINX_CONF_PATH" && echo "Document root correctly set in Nginx config" || echo "WARNING: Document root may not be correctly set in Nginx config"
else
    echo "WARNING: Nginx configuration not found at $NGINX_CONF_PATH"
    # Try to copy it again
    if [ -f "/var/www/html/docker/nginx/coolify.conf" ]; then
        echo "Copying Nginx configuration from /var/www/html/docker/nginx/coolify.conf to $NGINX_CONF_PATH"
        cp /var/www/html/docker/nginx/coolify.conf "$NGINX_CONF_PATH"
        echo "Nginx configuration copied successfully"
    else
        echo "ERROR: Could not find Nginx configuration at /var/www/html/docker/nginx/coolify.conf"
    fi
fi

# Create debug files
echo "Creating debug files..."

# Create nginx-debug.php
cat > /var/www/html/public/nginx-debug.php << 'EOL'
<?php
header('Content-Type: text/plain');
echo "Nginx Configuration Debug\n";
echo "=======================\n\n";

// Check Nginx configuration files
$nginxConfigPaths = [
    '/etc/nginx/conf.d/default.conf',
    '/etc/nginx/sites-enabled/default',
    '/etc/nginx/nginx.conf',
    '/opt/docker/etc/nginx/vhost.conf'
];

foreach ($nginxConfigPaths as $path) {
    echo "$path: " . (file_exists($path) ? "Exists" : "Not found") . "\n";
    if (file_exists($path)) {
        $content = file_get_contents($path);
        echo "Content (first 10 lines):\n";
        $lines = explode("\n", $content);
        for ($i = 0; $i < min(10, count($lines)); $i++) {
            // Filter out any potential sensitive information
            $line = $lines[$i];
            if (preg_match('/(password|secret|key|token)/i', $line)) {
                $line = "[SENSITIVE INFORMATION REDACTED]";
            }
            echo ($i+1) . ": " . $line . "\n";
        }
        echo "\n";
    }
}

echo "Server Variables (Safe):\n";
$safeServerVars = [
    'SERVER_SOFTWARE', 'SERVER_NAME', 'SERVER_ADDR', 'SERVER_PORT',
    'DOCUMENT_ROOT', 'SCRIPT_FILENAME', 'REQUEST_URI', 'SCRIPT_NAME',
    'PHP_SELF', 'REQUEST_METHOD'
];
foreach ($safeServerVars as $key) {
    if (isset($_SERVER[$key])) {
        echo "$key: " . $_SERVER[$key] . "\n";
    }
}
EOL

# Create entrypoint-debug.txt
echo "ScenicRoutes entrypoint script ran at $(date)" > /var/www/html/public/entrypoint-debug.txt
echo "Environment variables (safe):" >> /var/www/html/public/entrypoint-debug.txt
echo "APP_ENV: $APP_ENV" >> /var/www/html/public/entrypoint-debug.txt
echo "APP_DEBUG: $APP_DEBUG" >> /var/www/html/public/entrypoint-debug.txt
echo "APP_URL: $APP_URL" >> /var/www/html/public/entrypoint-debug.txt
echo "DB_CONNECTION: $DB_CONNECTION" >> /var/www/html/public/entrypoint-debug.txt
echo "DB_HOST: $DB_HOST" >> /var/www/html/public/entrypoint-debug.txt
echo "DB_PORT: $DB_PORT" >> /var/www/html/public/entrypoint-debug.txt
echo "DB_DATABASE: $DB_DATABASE" >> /var/www/html/public/entrypoint-debug.txt
echo "SESSION_DOMAIN: $SESSION_DOMAIN" >> /var/www/html/public/entrypoint-debug.txt
echo "SANCTUM_STATEFUL_DOMAINS: $SANCTUM_STATEFUL_DOMAINS" >> /var/www/html/public/entrypoint-debug.txt
echo "NIXPACKS_PHP_ROOT_DIR: $NIXPACKS_PHP_ROOT_DIR" >> /var/www/html/public/entrypoint-debug.txt
echo "NIXPACKS_PHP_FALLBACK_PATH: $NIXPACKS_PHP_FALLBACK_PATH" >> /var/www/html/public/entrypoint-debug.txt
echo "WEB_DOCUMENT_ROOT: $WEB_DOCUMENT_ROOT" >> /var/www/html/public/entrypoint-debug.txt

echo "Coolify initialization completed!"
