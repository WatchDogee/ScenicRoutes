#!/bin/bash
echo "Starting frontend rebuild process..."

# Navigate to the project root directory
cd "$(dirname "$0")"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm ci --include=dev

# Build frontend assets
echo "Building frontend assets..."
npm run build

# Clean up dev dependencies to reduce size
echo "Cleaning up dev dependencies..."
npm prune --production

echo "Frontend rebuild completed successfully!"
