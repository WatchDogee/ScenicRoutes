#!/bin/bash
set -e

echo "Starting deployment process..."

# Check if we should backup the database
read -p "Do you want to backup the database before deployment? (y/n): " backup_db
if [[ "$backup_db" == "y" || "$backup_db" == "Y" ]]; then
    echo "Creating database backup..."
    php db-management.php <<EOF
3
EOF
    echo "Database backup created."
fi

# Check if we should clear the database
read -p "Do you want to clear the database during deployment? (y/n): " clear_db
if [[ "$clear_db" == "y" || "$clear_db" == "Y" ]]; then
    echo "Clearing database..."
    php db-management.php <<EOF
5
yes
EOF
    echo "Database cleared."
fi

# Run Laravel commands
echo "Running Laravel commands..."
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
php artisan optimize

# Set permissions
echo "Setting permissions..."
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Check if we should restore the database
if [[ "$clear_db" == "y" || "$clear_db" == "Y" ]]; then
    read -p "Do you want to restore the database from backup? (y/n): " restore_db
    if [[ "$restore_db" == "y" || "$restore_db" == "Y" ]]; then
        echo "Restoring database from backup..."
        php db-management.php <<EOF
4
1
EOF
        echo "Database restored."
    fi
fi

echo "Deployment completed successfully!"
