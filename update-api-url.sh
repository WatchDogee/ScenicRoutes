#!/bin/bash

# This script updates the API base URL in the frontend code
# It replaces the hardcoded localhost URL with the APP_URL from environment

# Get the APP_URL from environment or use a default
APP_URL=${APP_URL:-http://localhost:8000}

echo "Updating API base URL to: $APP_URL"

# Update the bootstrap.js file
if [ -f /app/resources/js/bootstrap.js ]; then
    # Replace the hardcoded localhost URL with the APP_URL
    sed -i "s|window.axios.defaults.baseURL = 'http://localhost:8000'|window.axios.defaults.baseURL = '$APP_URL'|g" /app/resources/js/bootstrap.js
    echo "Updated bootstrap.js"
fi

# Update the apiClient.js file if needed
if [ -f /app/resources/js/utils/apiClient.js ]; then
    # Make sure baseURL is set correctly
    sed -i "s|baseURL: '/api'|baseURL: '$APP_URL/api'|g" /app/resources/js/utils/apiClient.js
    echo "Updated apiClient.js"
fi

# Update the apiUtils.js file if needed
if [ -f /app/resources/js/utils/apiUtils.js ]; then
    # Make sure baseURL is set correctly
    sed -i "s|baseURL: '/'|baseURL: '$APP_URL'|g" /app/resources/js/utils/apiUtils.js
    echo "Updated apiUtils.js"
fi

# Update sanctum.php to include the domain
if [ -f /app/config/sanctum.php ]; then
    # Extract domain from APP_URL
    DOMAIN=$(echo $APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||')
    
    # Add the domain to the stateful domains array if it's not localhost
    if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "127.0.0.1" ]; then
        sed -i "/^    'stateful' => \[/a \ \ \ \ \ \ \ \ '$DOMAIN'," /app/config/sanctum.php
        echo "Added $DOMAIN to stateful domains in sanctum.php"
    fi
fi

echo "API URL update completed"
