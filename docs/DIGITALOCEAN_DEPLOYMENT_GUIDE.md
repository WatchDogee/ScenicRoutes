# Complete DigitalOcean Deployment Guide for ScenicRoutes

This guide will walk you through deploying your ScenicRoutes application on DigitalOcean, including Laravel, PostgreSQL, GraphHopper, and Stripe integration.

## Table of Contents

1. [Droplet Selection](#1-droplet-selection)
2. [Initial Server Setup](#2-initial-server-setup)
3. [Install Required Software](#3-install-required-software)
4. [Set Up PostgreSQL](#4-set-up-postgresql)
5. [Set Up GraphHopper](#5-set-up-graphhopper)
6. [Deploy Laravel Application](#6-deploy-laravel-application)
7. [Configure Nginx](#7-configure-nginx)
8. [Configure Domain (Namecheap)](#8-configure-domain-namecheap)
9. [Set Up SSL with Let's Encrypt](#9-set-up-ssl-with-lets-encrypt)
10. [Configure Stripe](#10-configure-stripe)
11. [Set Up Systemd Services](#11-set-up-systemd-services)
12. [Final Configuration](#12-final-configuration)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Droplet Selection

### Recommended Droplet Specifications

For a production environment with GraphHopper, PostgreSQL, and Laravel:

**Minimum (Small Scale):**
- **Size:** 4 GB RAM / 2 vCPUs / 80 GB SSD
- **Cost:** ~$24/month
- **Use Case:** Low to medium traffic, single region

**Recommended (Production):**
- **Size:** 8 GB RAM / 4 vCPUs / 160 GB SSD
- **Cost:** ~$48/month
- **Use Case:** Medium to high traffic, better performance

**Optimal (High Traffic):**
- **Size:** 16 GB RAM / 8 vCPUs / 320 GB SSD
- **Cost:** ~$96/month
- **Use Case:** High traffic, multiple regions, better GraphHopper performance

### Droplet Configuration

1. **Region:** Choose closest to your primary user base
2. **Image:** Ubuntu 22.04 LTS (recommended) or Ubuntu 24.04 LTS
3. **Authentication:** SSH keys (recommended) or password
4. **Additional Options:**
   - Enable Monitoring
   - Enable Backups (recommended for production)
   - IPv6 (optional)

### Create the Droplet

1. Log in to DigitalOcean
2. Click "Create" → "Droplets"
3. Select Ubuntu 22.04 LTS
4. Choose your size (8 GB recommended)
5. Select your region
6. Add SSH keys or set password
7. Name your droplet (e.g., `scenicroutes-prod`)
8. Click "Create Droplet"

---

## 2. Initial Server Setup

### Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Update System

```bash
apt update && apt upgrade -y
```

### Create Non-Root User (Required)

This user is required for GraphHopper and other services. Create it now:

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

Verify the user was created:

```bash
id deploy
```

You should see output like: `uid=1001(deploy) gid=1001(deploy) groups=1001(deploy),27(sudo)`

### Set Up Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8989/tcp  # GraphHopper
sudo ufw enable
sudo ufw status
```

### Install Basic Tools

```bash
sudo apt install -y curl wget git unzip software-properties-common
```

---

## 3. Install Required Software

### Install PHP 8.3 and Extensions

PHP 8.3 is available by default on Ubuntu 24.04. On Ubuntu 22.04, add Ondřej Surý's PHP PPA to install 8.3.

```bash
# Detect Ubuntu version
source /etc/os-release && echo "Ubuntu $VERSION_ID"

# Common prerequisites
sudo apt update
sudo apt install -y software-properties-common ca-certificates lsb-release apt-transport-https

# If Ubuntu 22.04, enable the PHP PPA (skip on 24.04)
if [ "$VERSION_ID" = "22.04" ]; then
   sudo add-apt-repository ppa:ondrej/php -y
   sudo apt update
fi

# Install PHP 8.3 and common extensions
sudo apt install -y \
   php8.3-fpm php8.3-cli php8.3-common \
   php8.3-mysql php8.3-pgsql php8.3-zip php8.3-gd \
   php8.3-mbstring php8.3-curl php8.3-xml php8.3-bcmath \
   php8.3-intl php-redis php-imagick

# Verify installation
php -v
```

### Install Composer

```bash
cd ~
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
composer --version
```

### Install Node.js 20.x and npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Install PostgreSQL 15

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo -u postgres psql -c "SELECT version();"
```

### Install Java 17 (for GraphHopper)

```bash
sudo apt install -y openjdk-17-jdk
java -version
```

### Install Redis (Optional but Recommended)

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

---

## 4. Set Up PostgreSQL

### Start Fresh (Reset GraphHopper)

If GraphHopper was previously installed and is failing to start, reset it cleanly:

```bash
sudo systemctl stop graphhopper || true
sudo systemctl disable graphhopper || true

# Kill any leftover java
sudo pkill -f graphhopper-web || true

# Remove old graph cache and config/models (safe to re-create)
sudo rm -rf /opt/graphhopper/graph-cache
sudo rm -rf /opt/graphhopper/custom_models
sudo rm -f /opt/graphhopper/config-motorcycle.yml

# Optional: re-download artifacts if needed
# sudo rm -f /opt/graphhopper/graphhopper-web-8.0.jar
# sudo rm -f /opt/graphhopper/*.osm.pbf
```

### Create Database and User

```bash
sudo -u postgres psql
```

In PostgreSQL prompt:

```sql
-- Create database
CREATE DATABASE scenicroutes;
CREATE USER scenicroutes_user WITH PASSWORD 'graphhopper';

-- Grant privileges on the database
GRANT ALL PRIVILEGES ON DATABASE scenicroutes TO scenicroutes_user;

-- Optional: make the user the owner (simplifies migrations)
ALTER DATABASE scenicroutes OWNER TO scenicroutes_user;

-- For PostgreSQL 15+, also grant schema privileges
-- IMPORTANT: Run the next two lines separately (press Enter after each)
-- Using the long form here avoids confusion when copy/pasting
\connect scenicroutes
GRANT ALL ON SCHEMA public TO scenicroutes_user;

-- Exit
\q
```

Tip: Ensure "\\connect scenicroutes" is on its own line. If pasted on the same line as the GRANT command, psql will try to parse words like "ON" as connection options and show: invalid integer value 'ON' for connection option 'port'.

### Configure PostgreSQL for Remote Access (if needed)

Edit `/etc/postgresql/15/main/postgresql.conf`:

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Find and uncomment/modify:
```
listen_addresses = 'localhost'
```

Edit `/etc/postgresql/15/main/pg_hba.conf`:

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add:
```
host    scenicroutes    scenicroutes_user    127.0.0.1/32    md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## 5. Set Up GraphHopper

> **Important:** This production deployment uses OSM data for routing. The size depends on your droplet:
> 
> **For 4GB Droplets (current):** Use **Austria** (~1.2GB, ~5 min import)
> - Smaller dataset avoids OutOfMemoryError
> - Excellent mountain roads for scenic motorcycle routes
> - Perfect for Phase 1 MVP testing
> - Upgrade to 8GB droplet later for Germany expansion
> 
> **For 8GB+ Droplets:** Use **Germany** (~4.5GB, ~15-20 min import)
> - Larger user base and road network
> - More comprehensive road quality data
> - Excellent infrastructure for Phase 2 scale
> 
> Your local development config references `latvia-latest.osm.pbf` (0.3GB), but production needs larger datasets.

### Create GraphHopper Directory

```bash
sudo mkdir -p /opt/graphhopper
sudo chown $USER:$USER /opt/graphhopper
cd /opt/graphhopper
```

### Download GraphHopper

```bash
wget https://github.com/graphhopper/graphhopper/releases/download/8.0/graphhopper-web-8.0.jar
```

### Download OSM Data

**Choose based on your droplet size:**

```bash
# For 4GB Droplets: Austria (RECOMMENDED for Phase 1)
wget https://download.geofabrik.de/europe/austria-latest.osm.pbf

# For 8GB+ Droplets: Germany (Phase 2 scale)
# wget https://download.geofabrik.de/europe/germany-latest.osm.pbf

# Other country options:
# wget https://download.geofabrik.de/europe/switzerland-latest.osm.pbf   # 0.8GB (best for 4GB)
# wget https://download.geofabrik.de/europe/france-latest.osm.pbf         # 3.5GB (needs 8GB)
# wget https://download.geofabrik.de/europe/italy-latest.osm.pbf         # 3.2GB (needs 8GB)
# wget https://download.geofabrik.de/europe/spain-latest.osm.pbf         # 4.0GB (needs 8GB)
# wget https://download.geofabrik.de/europe/poland-latest.osm.pbf        # 2.8GB (needs 8GB)
# wget https://download.geofabrik.de/europe/latvia-latest.osm.pbf        # 0.3GB (local dev only)
```

**Memory Guidelines:**
- **4GB Droplet:** Use datasets ≤1.2GB (Austria, Switzerland)
- **8GB Droplet:** Use datasets ≤4.5GB (Germany, France, Italy, Spain, Poland)
- **16GB+ Droplet:** Multiple countries or larger datasets

### Create GraphHopper Configuration

**Important:** Use the command below to create the config file with correct YAML indentation. Manual editing can introduce tab/space issues.

```bash
cat > /opt/graphhopper/config-motorcycle.yml <<'EOF'
graphhopper:
  datareader.file: /opt/graphhopper/austria-latest.osm.pbf
  graph.location: graph-cache
  
  # Required in GH 8 - empty string means use all highways
  import.osm.ignored_highways: ""
  
  profiles:
    - name: motorcycle
      vehicle: car
      weighting: custom
      turn_costs: true
      custom_model:
        priority:
          - if: road_access == DESTINATION
            multiply_by: 0

server:
  application_connectors:
    - type: http
      port: 8989
  admin_connectors:
    - type: http
      port: 8990
EOF
```

**Note:** This config uses the `car` vehicle with a custom model that excludes DESTINATION-only roads, as required by GraphHopper 8.0.

### Create Systemd Service for GraphHopper

```bash
sudo nano /etc/systemd/system/graphhopper.service
```

Add:

```ini
[Unit]
Description=GraphHopper Routing Server
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/graphhopper
ExecStart=/usr/bin/java -Xmx4g -Xms2g -jar /opt/graphhopper/graphhopper-web-8.0.jar server config-motorcycle.yml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

For 4GB droplets, use these JVM settings to leave room for the OS and other services:

```ini
ExecStart=/usr/bin/java -Xmx3g -Xms1g -jar /opt/graphhopper/graphhopper-web-8.0.jar server /opt/graphhopper/config-motorcycle.yml
```

**Note:** For 4GB droplets, these JVM settings work with Austria/Switzerland (~1.2GB/0.8GB). For Germany (~4.5GB) or larger datasets, upgrade to 8GB droplet and adjust:
```ini
ExecStart=/usr/bin/java -Xmx6g -Xms2g -jar /opt/graphhopper/graphhopper-web-8.0.jar server /opt/graphhopper/config-motorcycle.yml
```

Enable and start GraphHopper:

```bash
sudo systemctl daemon-reload
sudo systemctl enable graphhopper
sudo systemctl start graphhopper

# Check status
sudo systemctl --no-pager status graphhopper

# View logs
sudo journalctl -u graphhopper -f
```

Tip: If you run `systemctl status graphhopper` and see `lines 1-12/12 (END)`, that's the pager (`less`) showing you're at the end of the output. Use the arrow keys/PageUp/PageDown to scroll and press `q` to exit. To avoid the pager entirely, run `systemctl --no-pager status graphhopper` or set `export SYSTEMD_PAGER=cat` in your shell.

**Note:** Import time depends on dataset:
- Austria (~1.2GB): ~5-7 minutes
- Switzerland (~0.8GB): ~3-4 minutes  
- Germany (~4.5GB): ~15-20 minutes (requires 8GB droplet)

GraphHopper will be available at `http://localhost:8989` once ready. Monitor with: `sudo journalctl -u graphhopper -f`

### Verify GraphHopper

```bash
curl http://localhost:8989/info
```

---

## 6. Deploy Laravel Application

### Prerequisites: Push Production Branch to GitHub

**IMPORTANT:** Before deploying, ensure your production branch is pushed to GitHub:

```bash
# On your local development machine:
git push -u origin production
```

Verify the branch exists on GitHub:
- Go to https://github.com/WatchDogee/ScenicRoutes_dev
- Click the branch dropdown
- Confirm "production" branch is listed

### Set Up GitHub Authentication

GitHub no longer supports password authentication. Choose one of these methods:

#### Option A: SSH Key (Recommended)

1. **Generate SSH key on server (if not already done):**
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Optionally set a passphrase or press Enter for none
```

2. **Add SSH key to GitHub:**
```bash
# Display your public key
cat ~/.ssh/id_ed25519.pub
```
Copy the output, then:
- Go to GitHub.com → Settings → SSH and GPG keys
- Click "New SSH key"
- Paste your public key
- Click "Add SSH key"

3. **Test SSH connection:**
```bash
ssh -T git@github.com
# Should see: "Hi WatchDogee! You've successfully authenticated..."
```

#### Option B: Personal Access Token (Alternative)

1. **Create token on GitHub:**
   - Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name (e.g., "ScenicRoutes Production")
   - Select scopes: `repo` (all)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **Save token securely on server:**
```bash
# Store token in Git credential helper
git config --global credential.helper store
```

### Clone Your Repository

**Using SSH (recommended):**
```bash
cd /var/www
sudo git clone git@github.com:WatchDogee/ScenicRoutes_dev.git scenicroutes
sudo chown -R deploy:www-data /var/www/scenicroutes
cd /var/www/scenicroutes
# Fix Git ownership issue and checkout production branch
sudo git config --global --add safe.directory /var/www/scenicroutes
sudo -u deploy git checkout production
```

**Using HTTPS with PAT:**
```bash
cd /var/www
sudo git clone https://github.com/WatchDogee/ScenicRoutes_dev.git scenicroutes
# When prompted:
# Username: WatchDogee
# Password: [PASTE YOUR PERSONAL ACCESS TOKEN]
sudo chown -R deploy:www-data /var/www/scenicroutes
cd /var/www/scenicroutes
# Fix Git ownership issue and checkout production branch
sudo git config --global --add safe.directory /var/www/scenicroutes
sudo -u deploy git fetch origin
sudo -u deploy git checkout production
```

**Note:** The `safe.directory` config is needed because we cloned as root but changed ownership to deploy.

### Install PHP Dependencies

```bash
composer install --optimize-autoloader --no-dev
```

### Install Node Dependencies and Build Assets

```bash
npm install
npm run build
```

### Set Up Environment File

```bash
cp .env.example .env
nano .env
```

Configure your `.env` file:

```env
APP_NAME=ScenicRoutes
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://scenicroutes.me

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=scenicroutes
DB_USERNAME=scenicroutes_user
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

BROADCAST_DRIVER=log
CACHE_DRIVER=redis
FILESYSTEM_DISK=local
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@scenicroutes.me"
MAIL_FROM_NAME="${APP_NAME}"

# GraphHopper
GRAPHHOPPER_URL=http://localhost:8989
GRAPHHOPPER_PROFILE=motorcycle

# Stripe (see section 9)
STRIPE_KEY=pk_live_YOUR_KEY
STRIPE_SECRET=sk_live_YOUR_SECRET
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_WEBHOOK_TOLERANCE=300
STRIPE_PRICE_PREMIUM_MONTHLY=price_YOUR_ID
STRIPE_PRICE_PREMIUM_YEARLY=price_YOUR_ID
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_ID
STRIPE_PRICE_PRO_YEARLY=price_YOUR_ID

# AWS S3 (optional, for file storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

# OpenWeatherMap (optional)
OPENWEATHERMAP_API_KEY=

# Google OAuth (if using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://scenicroutes.me/auth/google/callback
```

### Generate Application Key

```bash
php artisan key:generate
```

### Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/scenicroutes
sudo chmod -R 775 /var/www/scenicroutes/storage
sudo chmod -R 775 /var/www/scenicroutes/bootstrap/cache
```

### Run Migrations

```bash
php artisan migrate --force
```

### Create Storage Link

```bash
php artisan storage:link
```

### Optimize Laravel

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## 7. Configure Nginx

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/scenicroutes
```

Add:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name scenicroutes.me www.scenicroutes.me;
    root /var/www/scenicroutes/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

   location ~ \.php$ {
      fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        fastcgi_read_timeout 300;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Client body size
    client_max_body_size 64M;
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/scenicroutes /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Configure Domain (Namecheap)

### Step 1: Get Your DigitalOcean Droplet IP

1. Log in to your DigitalOcean account
2. Go to **Droplets**
3. Find your ScenicRoutes droplet
4. Copy the **IPv4 address** (it should look like `123.45.67.89`)

### Step 2: Configure DNS at Namecheap

#### Option A: Using DigitalOcean Nameservers (Recommended)

1. **Log in to Namecheap:**
   - Go to https://www.namecheap.com
   - Sign in with your account

2. **Access Domain Settings:**
   - Click **Domain List** in the left sidebar
   - Find `scenicroutes.me`
   - Click **Manage** next to your domain

3. **Add DigitalOcean Nameservers:**
   - Go to the **Nameservers** tab
   - Select **Custom DNS** from the dropdown
   - Enter DigitalOcean's nameservers:
     - `ns1.digitalocean.com`
     - `ns2.digitalocean.com`
     - `ns3.digitalocean.com`
   - Click **Save**

4. **Configure DNS in DigitalOcean:**
   - Go to DigitalOcean Control Panel
   - Click **Networking** → **Domains**
   - Click **Add Domain**
   - Enter `scenicroutes.me`
   - Select your droplet from the list
   - Click **Add Domain**
   - DigitalOcean will create DNS records automatically

5. **Wait for DNS Propagation:**
   - DNS changes can take 24-48 hours to propagate globally
   - Check status: `nslookup scenicroutes.me` or `dig scenicroutes.me`

#### Option B: Using A Records (Direct at Namecheap)

If you prefer to keep DNS at Namecheap:

1. **Log in to Namecheap**
2. **Domain Settings:**
   - Click **Domain List**
   - Click **Manage** for `scenicroutes.me`
   - Go to **Advanced DNS** tab

3. **Add A Records:**
   - Click **Add Record**
   - **Type:** A Record
   - **Host:** @ (root domain)
   - **Value:** Your DigitalOcean droplet IP (e.g., `123.45.67.89`)
   - **TTL:** 30 minutes (default)
   - Click **Save**

4. **Add WWW Subdomain:**
   - Click **Add Record** again
   - **Type:** A Record
   - **Host:** www
   - **Value:** Same DigitalOcean IP
   - Click **Save**

5. **Optional: Add Mail Records**
   - If using email, add MX records
   - For basic setup, skip this for now

### Step 3: Update Nginx Configuration with Domain

Now that your domain is configured, update the Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/scenicroutes
```

Find the `server_name` line and update it:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name scenicroutes.me www.scenicroutes.me;  # <-- Update this line
    root /var/www/scenicroutes/public;
    # ... rest of config
}
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Update Application Configuration

Update your Laravel `.env` file with the domain:

```bash
sudo nano /var/www/scenicroutes/.env
```

Update the `APP_URL`:

```env
APP_URL=https://scenicroutes.me
```

Also update Google OAuth callback if using it:

```env
GOOGLE_REDIRECT_URI=https://scenicroutes.me/auth/google/callback
```

Clear cache:

```bash
cd /var/www/scenicroutes
php artisan config:clear
php artisan config:cache
```

### Step 5: Test Domain Access

Before proceeding to SSL, test that your domain resolves:

```bash
# Check DNS resolution
nslookup scenicroutes.me
dig scenicroutes.me

# Test HTTP access (if DNS is propagated)
curl -I http://scenicroutes.me
```

**Note:** If DNS hasn't fully propagated yet (24-48 hours), you can still test by adding an entry to your local `/etc/hosts` file or skip to SSL setup - Let's Encrypt will handle the domain verification.

---

## 9. Set Up SSL with Let's Encrypt

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificate

```bash
sudo certbot --nginx -d scenicroutes.me -d www.scenicroutes.me
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### Auto-Renewal

Certbot sets up auto-renewal automatically. Test it:

```bash
sudo certbot renew --dry-run
```

### Update Nginx Configuration

Certbot automatically updates your Nginx config. Verify:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. Configure Stripe

### Get Stripe Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Live mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy your **Publishable key** and **Secret key**

### Create Products and Prices

1. Go to **Products** in Stripe Dashboard
2. Create products for Premium and Pro tiers
3. Add monthly and yearly prices for each
4. Copy the **Price IDs** (start with `price_`)

### Set Up Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://scenicroutes.me/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### Update .env File

```bash
nano /var/www/scenicroutes/.env
```

Update Stripe values:

```env
STRIPE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET=sk_live_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PRICE_PREMIUM_MONTHLY=price_YOUR_ID
STRIPE_PRICE_PREMIUM_YEARLY=price_YOUR_ID
STRIPE_PRICE_PRO_MONTHLY=price_YOUR_ID
STRIPE_PRICE_PRO_YEARLY=price_YOUR_ID
```

### Clear and Rebuild Cache

```bash
cd /var/www/scenicroutes
php artisan config:clear
php artisan config:cache
```

---

## 11. Set Up Systemd Services

### Create Queue Worker Service

```bash
sudo nano /etc/systemd/system/scenicroutes-queue.service
```

Add:

```ini
[Unit]
Description=ScenicRoutes Queue Worker
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/scenicroutes
ExecStart=/usr/bin/php /var/www/scenicroutes/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable scenicroutes-queue
sudo systemctl start scenicroutes-queue
sudo systemctl status scenicroutes-queue
```

### Create Scheduler Service (for Laravel Cron)

```bash
sudo nano /etc/systemd/system/scenicroutes-scheduler.service
```

Add:

```ini
[Unit]
Description=ScenicRoutes Scheduler
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/scenicroutes
ExecStart=/usr/bin/php /var/www/scenicroutes/artisan schedule:work
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable scenicroutes-scheduler
sudo systemctl start scenicroutes-scheduler
```

**Alternative:** Use cron (more traditional):

```bash
sudo crontab -e -u www-data
```

Add:

```
* * * * * cd /var/www/scenicroutes && php artisan schedule:run >> /dev/null 2>&1
```

---

## 12. Final Configuration

### Update Frontend Environment Variables

If your frontend needs API URLs, update your build:

```bash
cd /var/www/scenicroutes
nano .env
```

Add:

```env
VITE_API_URL=https://scenicroutes.me
VITE_STRIPE_KEY=pk_live_YOUR_KEY
```

Rebuild assets:

```bash
npm run build
```

### Set Up Log Rotation

```bash
sudo nano /etc/logrotate.d/scenicroutes
```

Add:

```
/var/www/scenicroutes/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### Configure PHP-FPM

```bash
sudo nano /etc/php/8.3/fpm/php.ini
```

Recommended settings:

```ini
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 300
max_input_time = 300
```

Restart PHP-FPM:

```bash
sudo systemctl restart php8.3-fpm
```

### Set Up Backups (Recommended)

Create backup script:

```bash
sudo nano /usr/local/bin/backup-scenicroutes.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/scenicroutes"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD='YOUR_DB_PASSWORD' pg_dump -U scenicroutes_user -h localhost scenicroutes > $BACKUP_DIR/db_$DATE.sql

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/scenicroutes/storage

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/backup-scenicroutes.sh
```

Add to cron:

```bash
sudo crontab -e
```

Add:

```
0 2 * * * /usr/local/bin/backup-scenicroutes.sh
```

---

## 13. Troubleshooting

### Check Service Status

```bash
sudo systemctl status nginx
sudo systemctl status php8.3-fpm
sudo systemctl status postgresql
sudo systemctl status graphhopper
sudo systemctl status scenicroutes-queue
```

### View Logs

```bash
# Laravel logs
tail -f /var/www/scenicroutes/storage/logs/laravel.log

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# GraphHopper logs
sudo journalctl -u graphhopper -f

# Queue worker logs
sudo journalctl -u scenicroutes-queue -f
```

### Common Issues

#### 500 Internal Server Error

1. Check Laravel logs: `tail -f storage/logs/laravel.log`
2. Check Nginx error log: `sudo tail -f /var/log/nginx/error.log`
3. Check permissions: `sudo chown -R www-data:www-data /var/www/scenicroutes`
4. Clear cache: `php artisan config:clear && php artisan cache:clear`

#### Database Connection Issues

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Test connection: `psql -U scenicroutes_user -d scenicroutes -h localhost`
3. Check `.env` database credentials
4. Verify firewall allows local connections

#### GraphHopper Not Responding

1. Check service: `sudo systemctl status graphhopper`
2. Check logs: `sudo journalctl -u graphhopper -n 50`
3. Verify port: `sudo netstat -tlnp | grep 8989`
4. Check memory: `free -h` (GraphHopper needs at least 2GB free)

#### GraphHopper: OutOfMemoryError During Import

If you see `OutOfMemoryError: Java heap space` during graph import:

**Error Example:**
```
Exception in thread "pool-3-thread-1" java.lang.OutOfMemoryError: Java heap space
pass2 - start reading OSM ways
```

**Causes & Solutions:**
1. **Dataset too large for droplet:**
   - 4GB droplets: Use Austria (1.2GB) or Switzerland (0.8GB), NOT Germany
   - Upgrade to 8GB droplet to use Germany dataset

2. **Fix for current 4GB droplet:**
   ```bash
   sudo systemctl stop graphhopper
   cd /opt/graphhopper
   rm -rf graph-cache/*  # Clear incomplete import
   rm -f config-motorcycle.yml
   
   # Download Austria dataset
   wget https://download.geofabrik.de/europe/austria-latest.osm.pbf
   
   # Create config with Austria
   cat > config-motorcycle.yml <<'EOF'
graphhopper:
  datareader.file: /opt/graphhopper/austria-latest.osm.pbf
  graph.location: graph-cache
  import.osm.ignored_highways: ""
  profiles:
    - name: motorcycle
      vehicle: car
      weighting: custom
      turn_costs: true
      custom_model:
        priority:
          - if: road_access == DESTINATION
            multiply_by: 0
server:
  application_connectors:
    - type: http
      port: 8989
  admin_connectors:
    - type: http
      port: 8990
EOF
   
   sudo systemctl start graphhopper
   sudo journalctl -u graphhopper -f
   ```

3. **Upgrade to 8GB for Germany (production):**
   - Create new 8GB droplet
   - Repeat GraphHopper setup
   - Use Germany dataset in config
   - Update JVM: `-Xmx6g -Xms2g`

#### GraphHopper: YAML Configuration Error

If you see "Malformed YAML" or "mapping values are not allowed here":

**Error Example:**
```
Malformed YAML at line: 11, column: 18; mapping values are not allowed here
 in 'reader', line 10, column 17:
             vehicle: motorcycle
```

**Solution:**

1. Stop GraphHopper:
   ```bash
   sudo systemctl stop graphhopper
   ```

2. Recreate the config file with correct indentation:
   ```bash
   cd /opt/graphhopper
   rm -f config-motorcycle.yml
   cat > config-motorcycle.yml <<'EOF'
graphhopper:
  datareader.file: /opt/graphhopper/germany-latest.osm.pbf
  graph.location: graph-cache
  
  # Required in GH 8 - empty string means use all highways
  import.osm.ignored_highways: ""
  
  profiles:
    - name: motorcycle
      vehicle: car
      weighting: custom
      turn_costs: true
      custom_model:
        priority:
          - if: road_access == DESTINATION
            multiply_by: 0

server:
  application_connectors:
    - type: http
      port: 8989
  admin_connectors:
    - type: http
      port: 8990
EOF
   ```

3. Verify the file was created correctly:
   ```bash
   cat config-motorcycle.yml
   ```

4. Restart GraphHopper:
   ```bash
   sudo systemctl start graphhopper
   sudo journalctl -u graphhopper -f
   ```

**Common Causes:**
- Mixed tabs and spaces (use spaces only)
- Incorrect indentation (must be exactly 2 spaces per level)
- Copy-paste from PDF/formatted documents

#### GraphHopper: User credentials error (status=217/USER)

If you see `status=217/USER` and "Failed to determine user credentials":

1. The `deploy` user doesn't exist. Create it:
   ```bash
   sudo useradd -m -s /bin/bash deploy
   sudo usermod -aG sudo deploy
   ```

2. Set permissions:
   ```bash
   sudo chown -R deploy:deploy /opt/graphhopper
   ```

3. Restart:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart graphhopper
   ```

   **Alternative:** If you want to run GraphHopper as root temporarily, edit the service file:
   ```bash
   sudo nano /etc/systemd/system/graphhopper.service
   ```
   Change `User=deploy` to `User=root`, then:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart graphhopper
   ```

#### Permission Denied Errors

```bash
sudo chown -R www-data:www-data /var/www/scenicroutes
sudo chmod -R 775 /var/www/scenicroutes/storage
sudo chmod -R 775 /var/www/scenicroutes/bootstrap/cache
```

#### Assets Not Loading

1. Rebuild assets: `npm run build`
2. Clear cache: `php artisan view:clear`
3. Check Nginx static file configuration
4. Verify file permissions

### Performance Optimization

#### Enable OPcache

```bash
sudo nano /etc/php/8.3/fpm/php.ini
```

Uncomment and configure:

```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=10000
opcache.revalidate_freq=2
opcache.fast_shutdown=1
```

Restart PHP-FPM:

```bash
sudo systemctl restart php8.3-fpm
```

#### Enable Redis Caching

Already configured in `.env`. Verify Redis is running:

```bash
sudo systemctl status redis-server
```

Test connection:

```bash
redis-cli ping
```

---

## Deployment Workflow

### Initial Deployment

1. Follow all sections above
2. Test the application thoroughly
3. Monitor logs for errors

### Updating the Application

```bash
cd /var/www/scenicroutes

# Pull latest changes
git pull origin main

# Install/update dependencies
composer install --optimize-autoloader --no-dev
npm install
npm run build

# Run migrations
php artisan migrate --force

# Clear and rebuild cache
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
sudo systemctl restart php8.3-fpm
sudo systemctl restart scenicroutes-queue
```

### Automated Deploys (GitHub Actions)

You can keep this manual setup and still deploy automatically on every push without Docker.

1) Server script (one-time):

```bash
sudo mkdir -p /opt/deploy
sudo tee /opt/deploy/deploy.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/var/www/scenicroutes"
BRANCH="production"
PHP_FPM_SERVICE="php8.3-fpm"
cd "$APP_DIR"
git fetch --all --prune
git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"
composer install --no-dev --prefer-dist --optimize-autoloader
npm ci --no-audit --no-fund
npm run build
php artisan down || true
php artisan migrate --force
php artisan storage:link || true
php artisan optimize:clear
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan up || true
sudo systemctl restart "$PHP_FPM_SERVICE" || true
sudo systemctl restart scenicroutes-queue || true
EOF
sudo chmod +x /opt/deploy/deploy.sh
```

2) GitHub Actions workflow: add `.github/workflows/deploy.yml` in your repo and create secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY` (private key), and optional `SSH_PORT`.

```yaml
name: Deploy on Push
on:
   push:
      branches: [ production ]

jobs:
   deploy:
      runs-on: ubuntu-latest
      steps:
         - name: Use SSH key
            uses: webfactory/ssh-agent@v0.9.0
            with:
               ssh-private-key: ${{ secrets.SSH_KEY }}

         - name: Run deploy script on server
            run: |
               ssh -o StrictHostKeyChecking=no -p "${{ secrets.SSH_PORT || 22 }}" \
                  "${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}" \
                  "bash /opt/deploy/deploy.sh"
```

This keeps costs minimal and gives you push-to-deploy with logs and easy rollbacks (`git revert` + push).

### Monitoring

Consider setting up:
- **Uptime monitoring:** UptimeRobot, Pingdom
- **Error tracking:** Sentry, Bugsnag
- **Application monitoring:** New Relic, DataDog
- **Server monitoring:** DigitalOcean Monitoring (built-in)

---

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] Root login disabled (optional)
- [ ] SSL certificate installed
- [ ] `APP_DEBUG=false` in production
- [ ] Strong database passwords
- [ ] `.env` file permissions (600)
- [ ] Regular security updates
- [ ] Backups configured
- [ ] Rate limiting configured (if needed)

## Deployment Verification Checklist

- [ ] GraphHopper using appropriate OSM data (Austria 4GB, Germany 8GB+)
- [ ] GraphHopper import completed successfully (Austria ~5-7 min, Germany ~15-20 min)
- [ ] GraphHopper responding at `http://localhost:8989/info`
- [ ] Database migrations completed
- [ ] SSL certificate active
- [ ] All systemd services running
- [ ] `.env` configured for production domain
- [ ] Assets built with `npm run build`
- [ ] Stripe webhook configured and tested

---

## Cost Estimation

**Monthly Costs:**
- Droplet (8GB): ~$48/month
- Domain: ~$12/year (~$1/month)
- SSL: Free (Let's Encrypt)
- **Total: ~$49/month**

**Optional:**
- DigitalOcean Backups: +20% of droplet cost (~$10/month)
- Monitoring: Free (basic) or paid plans
- CDN: Varies by usage

---

## Support Resources

- **DigitalOcean Docs:** https://docs.digitalocean.com
- **Laravel Docs:** https://laravel.com/docs
- **GraphHopper Docs:** https://www.graphhopper.com/docs/
- **Stripe Docs:** https://stripe.com/docs
- **Nginx Docs:** https://nginx.org/en/docs/

---

## Next Steps

1. Set up monitoring and alerts
2. Configure automated backups
3. Set up staging environment (optional)
4. Implement CI/CD pipeline (optional)
5. Configure CDN for static assets (optional)
6. Set up email service (SendGrid, Mailgun, etc.)

---

**Note:** This guide assumes a single-server setup. For high-traffic applications, consider:
- Separate database server
- Load balancer
- Multiple app servers
- CDN for static assets
- Managed database service

Good luck with your deployment! 🚀


























