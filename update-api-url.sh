#!/bin/bash

# This script updates the API base URL in the frontend code
# It ensures the correct domain is used in production

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

# Update session domain in .env if needed
if [ -f /app/.env ]; then
    if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "127.0.0.1" ]; then
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

echo "API URL update completed"
