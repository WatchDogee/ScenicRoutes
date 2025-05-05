#!/bin/bash
echo "Starting frontend rebuild process..."

# Navigate to the project root directory
cd "$(dirname "$0")"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Build frontend assets
echo "Building frontend assets..."
npm run build

echo "Frontend rebuild completed successfully!"
