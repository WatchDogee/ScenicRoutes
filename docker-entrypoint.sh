#!/bin/bash
set -e

# Change to application directory
cd /var/www/html

echo "Starting Laravel initialization for CapRover..."

# Check if artisan file exists and is executable
if [ ! -f "artisan" ]; then
    echo "ERROR: artisan file is missing!"
    exit 1
fi

# Ensure artisan is executable
chmod +x artisan

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

        # Extract the root domain for session cookies
        ROOT_DOMAIN=$(echo $DOMAIN | grep -oP '([^.]+\.[^.]+)$' || echo $DOMAIN)

        # Update SESSION_DOMAIN in .env if it exists
        if grep -q "^SESSION_DOMAIN=" .env; then
            sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=.$ROOT_DOMAIN|g" .env
        else
            echo "SESSION_DOMAIN=.$ROOT_DOMAIN" >> .env
        fi

        # Update SANCTUM_STATEFUL_DOMAINS in .env if it exists
        if grep -q "^SANCTUM_STATEFUL_DOMAINS=" .env; then
            # Add both the full domain and the root domain with wildcard
            sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=$DOMAIN,*.$ROOT_DOMAIN|g" .env
        else
            echo "SANCTUM_STATEFUL_DOMAINS=$DOMAIN,*.$ROOT_DOMAIN" >> .env
        fi

        echo "Domain configuration updated in .env file"
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

echo "CapRover initialization completed!"
