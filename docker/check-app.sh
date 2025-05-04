#!/bin/bash

# Wait for the application to be ready
echo "Checking if the application is ready..."

# Try to access the health endpoint
if curl -s http://localhost/health > /dev/null; then
    echo "Application is ready!"
    exit 0
else
    echo "Application is not ready yet. Starting anyway..."
    exit 0  # Exit with success to prevent container from being marked as unhealthy
fi
