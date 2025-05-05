#!/bin/bash

# This script updates the API base URL and database configuration in the frontend code
# It ensures the correct domain and database settings are used in production

# Get the APP_URL from environment or use a default
APP_URL=${APP_URL:-http://localhost:8000}

echo "Updating API base URL to: $APP_URL"

# Extract domain from APP_URL
DOMAIN=$(echo $APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||')
echo "Domain extracted: $DOMAIN"

# Update sanctum.php stateful domains configuration
if [ -f /app/config/sanctum.php ]; then
    # Check if domain is already in the stateful domains list
    if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "127.0.0.1" ]; then
        # Use PHP artisan to update the config
        cd /app
        php artisan tinker --execute "
            \$stateful = config('sanctum.stateful');
            if (!in_array('$DOMAIN', \$stateful)) {
                \$stateful[] = '$DOMAIN';
                config(['sanctum.stateful' => \$stateful]);
                echo 'Added $DOMAIN to sanctum stateful domains.';
            } else {
                echo '$DOMAIN already in sanctum stateful domains.';
            }
        "
        echo "Updated sanctum.php configuration"
    fi
fi

# Update .env file if needed
if [ -f /app/.env ]; then
    if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "127.0.0.1" ]; then
        # For ScenicRoutes specific configuration
        if [[ "$DOMAIN" == *"scenic-routes"* ]]; then
            # Check if SESSION_DOMAIN is already set
            if grep -q "^SESSION_DOMAIN=" /app/.env; then
                # Update existing SESSION_DOMAIN to use the root domain
                sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=.scenic-routes.live|g" /app/.env
            else
                # Add SESSION_DOMAIN
                echo "SESSION_DOMAIN=.scenic-routes.live" >> /app/.env
            fi

            # Check if SANCTUM_STATEFUL_DOMAINS is already set
            if grep -q "^SANCTUM_STATEFUL_DOMAINS=" /app/.env; then
                # Update existing SANCTUM_STATEFUL_DOMAINS to include all relevant domains
                sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=scenic-routes.caprover-root.scenic-routes.live,caprover-root.scenic-routes.live,scenic-routes.live|g" /app/.env
            else
                # Add SANCTUM_STATEFUL_DOMAINS
                echo "SANCTUM_STATEFUL_DOMAINS=scenic-routes.caprover-root.scenic-routes.live,caprover-root.scenic-routes.live,scenic-routes.live" >> /app/.env
            fi

            echo "Updated .env file with ScenicRoutes domain configuration"
        else
            # Generic domain configuration for other deployments
            # Check if SESSION_DOMAIN is already set
            if grep -q "^SESSION_DOMAIN=" /app/.env; then
                # Update existing SESSION_DOMAIN
                sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=.$DOMAIN|g" /app/.env
            else
                # Add SESSION_DOMAIN
                echo "SESSION_DOMAIN=.$DOMAIN" >> /app/.env
            fi

            # Check if SANCTUM_STATEFUL_DOMAINS is already set
            if grep -q "^SANCTUM_STATEFUL_DOMAINS=" /app/.env; then
                # Update existing SANCTUM_STATEFUL_DOMAINS
                sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=$DOMAIN|g" /app/.env
            else
                # Add SANCTUM_STATEFUL_DOMAINS
                echo "SANCTUM_STATEFUL_DOMAINS=$DOMAIN" >> /app/.env
            fi

            echo "Updated .env file with domain configuration"
        fi
    fi

    # Update database configuration for CapRover
    echo "Checking database configuration..."

    # Check if DB_HOST is set to 'db' (Docker Compose default)
    if grep -q "^DB_HOST=db$" /app/.env; then
        # Update to CapRover database host
        sed -i "s|^DB_HOST=db$|DB_HOST=srv-captain--scenic-routes-db|g" /app/.env
        echo "Updated DB_HOST from 'db' to 'srv-captain--scenic-routes-db'"
    fi

    # Check if DB_DATABASE needs to be updated
    if grep -q "^DB_DATABASE=ScenicRoutesDB$" /app/.env; then
        # Update to CapRover database name
        sed -i "s|^DB_DATABASE=ScenicRoutesDB$|DB_DATABASE=scenic_routes|g" /app/.env
        echo "Updated DB_DATABASE from 'ScenicRoutesDB' to 'scenic_routes'"
    fi

    echo "Database configuration check completed"
fi

echo "Configuration update completed"
