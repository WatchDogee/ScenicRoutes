#!/bin/bash

# Script to switch between local and deployment environments

if [ "$1" == "local" ]; then
    echo "Switching to local environment..."
    cp .env.local .env
    echo "Done! Now using local environment."
elif [ "$1" == "deployment" ]; then
    echo "Switching to deployment environment..."
    # First backup the current local env if it doesn't exist
    if [ ! -f .env.local ]; then
        cp .env .env.local
        echo "Backed up local environment to .env.local"
    fi
    cp .env.deployment .env
    echo "Done! Now using deployment environment."
elif [ "$1" == "backup" ]; then
    echo "Backing up current environment to .env.local..."
    cp .env .env.local
    echo "Done! Current environment backed up to .env.local"
else
    echo "Usage: ./switch-env.sh [local|deployment|backup]"
    echo "  local      - Switch to local environment"
    echo "  deployment - Switch to deployment environment"
    echo "  backup     - Backup current environment to .env.local"
fi
