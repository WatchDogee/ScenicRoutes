# ScenicRoutes Deployment Quick Reference

## Pre-Deployment Checklist

- [ ] DigitalOcean account created
- [ ] Domain name purchased and DNS configured
- [ ] Stripe account set up with live keys
- [ ] Repository accessible via SSH or HTTPS
- [ ] OSM data file downloaded (for GraphHopper region)

## Server Requirements

**Minimum:**
- 4 GB RAM
- 2 vCPUs
- 80 GB SSD

**Recommended:**
- 8 GB RAM
- 4 vCPUs
- 160 GB SSD

## Quick Command Reference

### Initial Setup
```bash
# Connect to server
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl wget git unzip software-properties-common
```

### Install Software
```bash
# PHP 8.2
apt install -y php8.2-fpm php8.2-cli php8.2-common php8.2-pgsql php8.2-zip php8.2-gd php8.2-mbstring php8.2-curl php8.2-xml php8.2-bcmath php8.2-intl php8.2-redis

# Composer
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Java (GraphHopper)
apt install -y openjdk-17-jdk

# Nginx
apt install -y nginx

# Redis
apt install -y redis-server
```

### Database Setup
```bash
sudo -u postgres psql
CREATE DATABASE scenicroutes;
CREATE USER scenicroutes_user WITH PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE scenicroutes TO scenicroutes_user;
\c scenicroutes
GRANT ALL ON SCHEMA public TO scenicroutes_user;
\q
```

### GraphHopper Setup
```bash
mkdir -p /opt/graphhopper
cd /opt/graphhopper
wget https://github.com/graphhopper/graphhopper/releases/download/8.0/graphhopper-web-8.0.jar
wget https://download.geofabrik.de/europe/latvia-latest.osm.pbf
# Create config-motorcycle.yml (see main guide)
```

### Laravel Deployment
```bash
cd /var/www
git clone YOUR_REPO_URL scenicroutes
cd scenicroutes
composer install --optimize-autoloader --no-dev
npm install && npm run build
cp .env.example .env
nano .env  # Configure all settings
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Permissions
```bash
chown -R www-data:www-data /var/www/scenicroutes
chmod -R 775 /var/www/scenicroutes/storage
chmod -R 775 /var/www/scenicroutes/bootstrap/cache
```

### SSL Setup
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Service Management
```bash
# Start services
systemctl start nginx
systemctl start php8.2-fpm
systemctl start postgresql
systemctl start graphhopper
systemctl start scenicroutes-queue

# Enable on boot
systemctl enable nginx
systemctl enable php8.2-fpm
systemctl enable postgresql
systemctl enable graphhopper
systemctl enable scenicroutes-queue

# Check status
systemctl status SERVICE_NAME

# View logs
journalctl -u SERVICE_NAME -f
```

## Environment Variables (.env)

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=scenicroutes
DB_USERNAME=scenicroutes_user
DB_PASSWORD=YOUR_PASSWORD

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

GRAPHHOPPER_URL=http://localhost:8989
GRAPHHOPPER_PROFILE=motorcycle

STRIPE_KEY=pk_live_...
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

## Update Workflow

```bash
cd /var/www/scenicroutes
git pull
composer install --optimize-autoloader --no-dev
npm install && npm run build
php artisan migrate --force
php artisan config:clear && php artisan config:cache
php artisan route:clear && php artisan route:cache
php artisan view:clear && php artisan view:cache
systemctl restart php8.2-fpm
systemctl restart scenicroutes-queue
```

## Log Locations

- Laravel: `/var/www/scenicroutes/storage/logs/laravel.log`
- Nginx: `/var/log/nginx/error.log` and `/var/log/nginx/access.log`
- GraphHopper: `journalctl -u graphhopper`
- Queue: `journalctl -u scenicroutes-queue`

## Common Issues

**500 Error:**
- Check Laravel logs
- Check Nginx error log
- Verify permissions
- Clear cache: `php artisan config:clear`

**Database Connection:**
- Verify PostgreSQL running: `systemctl status postgresql`
- Test: `psql -U scenicroutes_user -d scenicroutes`
- Check `.env` credentials

**GraphHopper Not Working:**
- Check service: `systemctl status graphhopper`
- Check logs: `journalctl -u graphhopper`
- Verify memory: `free -h`

## Firewall Rules

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8989/tcp
ufw enable
```

## Ports Used

- 80: HTTP (Nginx)
- 443: HTTPS (Nginx)
- 8989: GraphHopper
- 5432: PostgreSQL (internal)
- 6379: Redis (internal)

## File Locations

- Application: `/var/www/scenicroutes`
- GraphHopper: `/opt/graphhopper`
- Nginx config: `/etc/nginx/sites-available/scenicroutes`
- Systemd services: `/etc/systemd/system/`


























