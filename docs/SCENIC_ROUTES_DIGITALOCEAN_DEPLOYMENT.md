# ScenicRoutes DigitalOcean Deployment Guide

**Last Updated**: February 7, 2026  
**Architecture**: Laravel + PostgreSQL on single droplet  
**GraphHopper**: API-based (no local instance needed)

---

## 📋 Overview

This guide provides a complete deployment process for ScenicRoutes on DigitalOcean with:
- **Laravel application** and **PostgreSQL database** on the same droplet
- **GraphHopper API** (no local GraphHopper server needed)
- **Automated redeployment** for future updates

### Architecture
```
DigitalOcean Droplet (Ubuntu 22.04)
├── Laravel Application (/var/www/scenicroutes)
├── PostgreSQL Database (localhost:5432)
├── Nginx Web Server
├── PHP 8.2 + Composer
├── Node.js + NPM
└── SSL (Let's Encrypt)
```

---

## 🚀 Initial Deployment

### Step 1: Create DigitalOcean Droplet

1. **Go to DigitalOcean Dashboard**
   - Visit [digitalocean.com](https://digitalocean.com)
   - Click "Create" → "Droplets"

2. **Configure Droplet**
   ```
   Image: Ubuntu 22.04 LTS
   Plan: Basic ($6/month) - 1 GB RAM, 1 vCPU, 25 GB SSD
   Region: Choose closest to your users
   Authentication: SSH Key (recommended) or Password
   Hostname: scenicroutes-prod
   ```

3. **Additional Options**
   - ✅ Enable Monitoring
   - ✅ Enable Backups ($1/month)

4. **Create Droplet**
   - Wait for droplet to be created
   - Note the public IP address

### Step 2: Initial Server Setup

**Connect to your droplet:**
```bash
ssh root@YOUR_DROPLET_IP
```

**Update system and install basic tools:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git unzip software-properties-common ufw
```

**Configure firewall:**
```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Optional: Allow PostgreSQL remote access (only if needed)
# sudo ufw allow 5432

sudo ufw --force enable
```

**Create application user:**
```bash
# Create user
sudo adduser scenicroutes
sudo usermod -aG sudo scenicroutes

# Switch to user
su - scenicroutes
```

### Step 3: Install PHP & Dependencies

**Install PHP 8.2 and extensions:**
```bash
# Add PHP repository
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.2 and extensions
sudo apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-pgsql \
php8.2-sqlite3 php8.2-redis php8.2-xml php8.2-curl php8.2-zip \
php8.2-mbstring php8.2-gd php8.2-intl php8.2-bcmath
```

**Install Composer:**
```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
composer --version
```

### Step 4: Install Node.js & NPM

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 5: Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE scenicroutes;
CREATE USER scenicroutes_user WITH PASSWORD 'SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE scenicroutes TO scenicroutes_user;
ALTER DATABASE scenicroutes OWNER TO scenicroutes_user;
\q
```

**Configure PostgreSQL for remote access (optional but recommended for development):**

**Why you might need this:**
- Connect to production database from your local development machine
- Use database management tools like pgAdmin or DBeaver
- Allow your Android app to connect directly (if needed)

```bash
# Edit pg_hba.conf to allow remote connections
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add this line BEFORE the existing local connections (around line 90):
host    scenicroutes    scenicroutes_user    0.0.0.0/0    md5

# Edit postgresql.conf to listen on all interfaces
sudo nano /etc/postgresql/15/main/postgresql.conf

# Find and change this line (around line 59):
listen_addresses = '*'

**Configure firewall for PostgreSQL (if enabling remote access):**
```bash
# Allow PostgreSQL port 5432
sudo ufw allow 5432

# Or restrict to specific IP (more secure):
# sudo ufw allow from YOUR_IP_ADDRESS to any port 5432
```

**⚠️ Security Warning:**
- Remote access allows connections from anywhere with the correct credentials
- Consider restricting to specific IP addresses instead of `0.0.0.0/0`
- Use strong passwords and consider VPN for additional security
- For production, you may want to keep it localhost-only

**Test remote connection (from your local machine):**
```bash
# Replace YOUR_DROPLET_IP with your actual droplet IP
psql -h YOUR_DROPLET_IP -U scenicroutes_user -d scenicroutes
```

### Step 6: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 7: Deploy Laravel Application

**⚠️ IMPORTANT: GitHub Authentication Change**
GitHub no longer accepts passwords for Git operations. You must use either:
- **Personal Access Token** (for HTTPS) - Easier for one-time setup
- **SSH Key** (for SSH) - Better for ongoing deployments

**Clone your repository:**

**Option 1: HTTPS (with personal access token)**
```bash
cd /var/www

# IMPORTANT: GitHub no longer accepts passwords!
# You MUST use a Personal Access Token instead

# Step 1: Create a GitHub Personal Access Token:
# Go to: https://github.com/settings/tokens
# Click "Generate new token (classic)"
# Give it a name like "ScenicRoutes Production Server"
# Select scopes: check "repo" (full control of private repositories)
# Click "Generate token"
# COPY the token immediately (you won't see it again!)

# Step 2: Clone using the token as your password
sudo git clone https://github.com/WatchDogee/ScenicRoutes_dev.git scenicroutes

# When prompted:
# Username: WatchDogee
# Password: [paste your personal access token here]
```

**Option 2: SSH (recommended - set up SSH key first)**
```bash
# Generate SSH key on server (if not already done)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub

# Add the public key to your GitHub account:
# GitHub → Settings → SSH and GPG keys → New SSH key
# Paste the public key and save

# Then clone using SSH
cd /var/www
sudo git clone git@github.com:YOUR_USERNAME/scenicroutes.git scenicroutes
```

**Set proper ownership:**
```bash
sudo chown -R scenicroutes:scenicroutes scenicroutes
cd scenicroutes
```

**Install PHP dependencies:**
```bash
composer install --optimize-autoloader --no-dev
```

**Install Node dependencies and build assets:**
```bash
npm install
npm run build
```

**Configure environment:**
```bash
# Copy production environment template
# Note: .env.production is gitignored for security, so we use .env.production.example
cp .env.production.example .env

# Edit environment variables
nano .env
```

**Update these critical values in `.env`:**
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://scenicroutes.me

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=scenicroutes
DB_USERNAME=scenicroutes_user
DB_PASSWORD=YOUR_SECURE_PASSWORD

GRAPHHOPPER_URL=https://graphhopper.com/api/1
GRAPHHOPPER_API_KEY=YOUR_GRAPHHOPPER_API_KEY

STRIPE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET=sk_live_YOUR_STRIPE_SECRET_KEY

MAIL_MAILER=resend
RESEND_API_KEY=your_resend_api_key
```

**Generate application key:**
```bash
php artisan key:generate
```

**Run database migrations:**
```bash
php artisan migrate --force
php artisan db:seed --force  # If you have seeders
```

**Set proper permissions:**
```bash
sudo chown -R www-data:www-data /var/www/scenicroutes
sudo chmod -R 775 /var/www/scenicroutes/storage
sudo chmod -R 775 /var/www/scenicroutes/bootstrap/cache
```

### Step 8: Configure Nginx

**Create Nginx site configuration:**
```bash
sudo nano /etc/nginx/sites-available/scenicroutes
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name scenicroutes.me www.scenicroutes.me;
    root /var/www/scenicroutes/public;

    index index.php index.html index.htm;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

**Enable site and disable default:**
```bash
sudo ln -s /etc/nginx/sites-available/scenicroutes /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 9: Set Up SSL with Let's Encrypt

**Install Certbot:**
```bash
sudo apt install -y certbot python3-certbot-nginx
```

**Obtain SSL certificate:**
```bash
sudo certbot --nginx -d scenicroutes.me -d www.scenicroutes.me
```

**Follow the prompts:**
- Enter your email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

**Verify SSL renewal:**
```bash
sudo certbot renew --dry-run
```

### Step 10: Configure Domain (Namecheap)

1. **Log into Namecheap**
2. **Go to Domain List** → Manage your domain
3. **Advanced DNS** → Add these records:

```
Type: A
Host: @
Value: YOUR_DROPLET_IP
TTL: 30 min

Type: A
Host: www
Value: YOUR_DROPLET_IP
TTL: 30 min
```

4. **Wait for DNS propagation** (can take 30 minutes to 24 hours)

### Step 11: Final Laravel Configuration

**Clear and cache configuration:**
```bash
cd /var/www/scenicroutes
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

**Set up Laravel queue worker (optional but recommended):**
```bash
# Create systemd service for queue worker
sudo nano /etc/systemd/system/scenicroutes-queue.service
```

**Add this content:**
```ini
[Unit]
Description=ScenicRoutes Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/scenicroutes
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3 --max-jobs=1000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable and start queue service:**
```bash
# IMPORTANT: Reload systemd after creating service file
sudo systemctl daemon-reload

sudo systemctl enable scenicroutes-queue
sudo systemctl start scenicroutes-queue

# Verify service is running
sudo systemctl status scenicroutes-queue
```

### Step 12: Test Deployment

**Test your application:**
```bash
# Test PHP-FPM
curl http://localhost

# Test SSL
curl -I https://scenicroutes.me

# Check Laravel logs
tail -f /var/www/scenicroutes/storage/logs/laravel.log

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Verify services are running:**
```bash
sudo systemctl status nginx
sudo systemctl status php8.2-fpm
sudo systemctl status postgresql
sudo systemctl status scenicroutes-queue
```

---

## 🔄 Redeployment Process

### Automated Redeployment Script

**Create deployment script on your server:**
```bash
sudo nano /var/www/scenicroutes/deploy.sh
```

**Add this content:**
```bash
#!/bin/bash

echo "🚀 Starting ScenicRoutes deployment..."

# Navigate to application directory
cd /var/www/scenicroutes

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin graphhopper-api-production

# Install/update PHP dependencies
echo "📦 Installing PHP dependencies..."
composer install --optimize-autoloader --no-dev

# Install/update Node dependencies
echo "📦 Installing Node dependencies..."
npm install

# Build assets
echo "🔨 Building assets..."
npm run build

# Run database migrations
echo "🗄️ Running migrations..."
php artisan migrate --force

# Clear and cache configuration
echo "🧹 Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Cache configuration for production
echo "⚡ Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set proper permissions
echo "🔒 Setting permissions..."
sudo chown -R www-data:www-data /var/www/scenicroutes
sudo chmod -R 775 /var/www/scenicroutes/storage
sudo chmod -R 775 /var/www/scenicroutes/bootstrap/cache

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart php8.2-fpm
sudo systemctl restart scenicroutes-queue

echo "✅ Deployment completed successfully!"
echo "🌐 Your app is live at: https://scenicroutes.me"
```

**Make script executable:**
```bash
sudo chmod +x /var/www/scenicroutes/deploy.sh
```

### Manual Redeployment Steps

If you prefer manual control, run these commands after pushing updates:

```bash
# SSH into your server
ssh scenicroutes@YOUR_DROPLET_IP

# Navigate to app directory
cd /var/www/scenicroutes

# Pull latest changes
git pull origin graphhopper-api-production

# Update dependencies
composer install --optimize-autoloader --no-dev
npm install && npm run build

# Run migrations (if any)
php artisan migrate --force

# Clear and recache
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
sudo systemctl restart php8.2-fpm
sudo systemctl restart scenicroutes-queue
```

### Apply Production Changes (After Code Updates)

If you change routes, middleware, or any production-only behavior:

1. **Commit and push your changes** to the production branch:
   ```bash
   git add .
   git commit -m "Harden production routes"
   git push origin graphhopper-api-production
   ```

2. **Deploy on the server** (SSH into the droplet):
   ```bash
   cd /var/www/scenicroutes
   ./deploy.sh
   ```

3. **Verify the updated routes are live:**
   ```bash
   curl -I https://scenicroutes.me
   ```

### Setting Up Automated Deployment (Optional)

**Option 1: GitHub Actions**
Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ graphhopper-api-production ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.DROPLET_IP }}
        username: ${{ secrets.DROPLET_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/scenicroutes
          ./deploy.sh
```

**Option 2: Webhook Deployment**
Set up a webhook endpoint that triggers deployment when you push to the production branch.

---

## 🔧 Maintenance & Monitoring

### Daily Monitoring

**Check service status:**
```bash
sudo systemctl status nginx php8.2-fpm postgresql scenicroutes-queue
```

**Monitor logs:**
```bash
# Laravel logs
tail -f /var/www/scenicroutes/storage/logs/laravel.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Queue logs
sudo journalctl -u scenicroutes-queue -f
```

### Database Backups

**Create backup script:**
```bash
sudo nano /var/www/scenicroutes/backup.sh
```

**Add this content:**
```bash
#!/bin/bash

# Database backup
BACKUP_DIR="/var/www/scenicroutes/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/scenicroutes_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -U scenicroutes_user -h localhost scenicroutes > $BACKUP_FILE

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t *.sql | tail -n +8 | xargs -r rm

echo "Backup completed: $BACKUP_FILE"
```

**Make executable and set up cron:**
```bash
sudo chmod +x /var/www/scenicroutes/backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /var/www/scenicroutes/backup.sh
```

### SSL Certificate Renewal

**SSL certificates auto-renew, but you can test:**
```bash
sudo certbot renew
```

### Log Rotation

**Configure log rotation:**
```bash
sudo nano /etc/logrotate.d/scenicroutes
```

**Add this content:**
```
/var/www/scenicroutes/storage/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 www-data www-data
}
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Repository Cloning Issues**

**"Invalid username or token. Password authentication is not supported" Error:**

This is the most common issue! GitHub no longer accepts passwords for Git operations.

**Solution - Create and use a Personal Access Token:**

1. **Go to GitHub Personal Access Tokens:**
   - Visit: https://github.com/settings/tokens
   - Click "Generate new token (classic)"

2. **Configure the token:**
   - Name: "ScenicRoutes Production Server"
   - Expiration: Set to "No expiration" or choose a date
   - Scopes: Check ✅ "repo" (full control of private repositories)

3. **Generate and copy the token:**
   - Click "Generate token"
   - **IMPORTANT:** Copy the token immediately - you won't see it again!

4. **Use the token for cloning:**
   ```bash
   cd /var/www
   sudo git clone https://github.com/WatchDogee/ScenicRoutes_dev.git scenicroutes
   
   # When prompted:
   # Username: WatchDogee
   # Password: [paste your personal access token]
   ```

**"Unit scenicroutes-queue.service could not be found" Error:**

The systemd service file wasn't created or has the wrong name.

**Solution:**
```bash
# Check if service file exists
ls -la /etc/systemd/system/scenicroutes-queue.service

# If it doesn't exist, create it
sudo nano /etc/systemd/system/scenicroutes-queue.service

# Add this content:
[Unit]
Description=ScenicRoutes Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/scenicroutes
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3 --max-jobs=1000
Restart=always

[Install]
WantedBy=multi-user.target

# Save and exit, then:
sudo systemctl daemon-reload
sudo systemctl enable scenicroutes-queue
sudo systemctl start scenicroutes-queue
sudo systemctl status scenicroutes-queue
```
```bash
# Check PHP-FPM
sudo systemctl status php8.2-fpm
sudo systemctl restart php8.2-fpm

# Check Nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

**2. Database Connection Error**
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -U scenicroutes_user -d scenicroutes -h localhost
```

**3. Permission Errors**
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/scenicroutes
sudo chmod -R 775 /var/www/scenicroutes/storage
sudo chmod -R 775 /var/www/scenicroutes/bootstrap/cache
```

**4. Queue Not Processing**
```bash
# Check queue status
sudo systemctl status scenicroutes-queue

# If service not found, check if it was created
ls -la /etc/systemd/system/scenicroutes-queue.service

# If missing, recreate the service file
sudo nano /etc/systemd/system/scenicroutes-queue.service
# Add the service content from Step 11

# Reload systemd and enable/start
sudo systemctl daemon-reload
sudo systemctl enable scenicroutes-queue
sudo systemctl start scenicroutes-queue

# Restart queue
sudo systemctl restart scenicroutes-queue

# Check queue logs
sudo journalctl -u scenicroutes-queue -f
```

**5. SSL Issues**
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

**6. Certbot Command Not Found**

If you get "command not found" when running certbot, it means Certbot is not installed.

**Solution:**
```bash
# Install Certbot and the Nginx plugin
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Then try the certbot command again
sudo certbot --nginx -d scenicroutes.me -d www.scenicroutes.me
```

**7. SSL Certificate Authentication Failed (DNS Issues)**

If Certbot fails with "unauthorized" errors and mentions IP addresses that look like GitHub Pages IPs (185.199.x.x), it means your domain DNS is still pointing to GitHub Pages instead of your DigitalOcean droplet.

**Solution:**

1. **Check your current DNS records:**
   - The error shows your domain points to `185.199.110.153` (GitHub Pages)
   - You need it to point to your DigitalOcean droplet IP

2. **Update DNS records in Namecheap:**
   - Log into Namecheap → Domain List → Manage your domain
   - Go to Advanced DNS
   - **Remove any existing A records** for @ and www
   - **Add these A records:**
     ```
     Type: A
     Host: @
     Value: YOUR_DROPLET_IP  (replace with your actual droplet IP)
     TTL: 30 min

     Type: A
     Host: www
     Value: YOUR_DROPLET_IP  (replace with your actual droplet IP)
     TTL: 30 min
     ```

3. **Wait for DNS propagation:**
   - DNS changes can take 30 minutes to 24 hours
   - You can check propagation at: https://www.whatsmydns.net/

4. **Verify DNS is pointing correctly:**
   ```bash
   # Check what IP your domain resolves to
   nslookup scenicroutes.me
   nslookup www.scenicroutes.me
   ```

5. **Test HTTP access before SSL:**
   ```bash
   # Should return your Laravel app, not GitHub Pages
   curl -I http://scenicroutes.me
   ```

6. **Once DNS is correct, try SSL again:**
   ```bash
   sudo certbot --nginx -d scenicroutes.me -d www.scenicroutes.me
   ```

### Performance Optimization

**1. PHP Optimization**
```bash
# Increase PHP workers
sudo nano /etc/php/8.2/fpm/pool.d/www.conf
# Adjust pm.max_children based on your droplet size

sudo systemctl restart php8.2-fpm
```

**2. Nginx Optimization**
```bash
# Enable gzip compression
sudo nano /etc/nginx/nginx.conf
# Add gzip configuration

sudo systemctl reload nginx
```

**3. Database Optimization**
```bash
# Check slow queries
sudo -u postgres psql -d scenicroutes -c "SELECT * FROM pg_stat_activity;"

# Add indexes as needed
php artisan tinker
# Schema::table('table_name', function (Blueprint $table) { $table->index('column'); });
```

---

## 📊 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Droplet | $6/month | 1GB RAM, 1 vCPU, 25GB SSD |
| Domain (Namecheap) | $12/year | scenicroutes.me |
| SSL Certificate | Free | Let's Encrypt |
| Backups | $1/month | Optional but recommended |
| **Total** | **$7/month** | + domain registration |

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] Domain purchased and DNS configured
- [ ] GitHub Personal Access Token created (https://github.com/settings/tokens)
- [ ] GraphHopper API key obtained
- [ ] Stripe live keys configured
- [ ] Resend domain verified
- [ ] Production branch pushed to GitHub

### Server Setup
- [ ] Droplet created with Ubuntu 22.04
- [ ] SSH access configured
- [ ] Firewall configured
- [ ] PHP 8.2 installed with extensions
- [ ] Composer installed
- [ ] Node.js installed
- [ ] PostgreSQL installed and configured
- [ ] Nginx installed

### Application Deployment
- [ ] Code cloned from GitHub
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Database migrated
- [ ] Assets built
- [ ] Permissions set
- [ ] Nginx configured
- [ ] SSL certificate obtained

### Post-Deployment
- [ ] Application accessible at domain
- [ ] HTTPS working
- [ ] Database connections working
- [ ] Email sending working
- [ ] Payment processing working
- [ ] Queue worker running
- [ ] Backups configured
- [ ] Monitoring set up

### Redeployment Ready
- [ ] Deployment script created
- [ ] GitHub Actions configured (optional)
- [ ] SSH key configured for automated deployment

---

## 📞 Support & Next Steps

### After Initial Deployment
1. **Test all features** using the testing checklist
2. **Set up monitoring** (UptimeRobot, etc.)
3. **Configure automated backups**
4. **Test the redeployment process**
5. **Set up error tracking** (Sentry optional)

### For Updates
1. **Push changes** to `graphhopper-api-production` branch
2. **SSH into server** and run `./deploy.sh`
3. **Or wait** for automated deployment if configured
4. **Test the update** thoroughly

### Emergency Contacts
- **DigitalOcean Support**: For server issues
- **GitHub**: For repository issues
- **Stripe/Resend**: For payment/email issues

---

**🎉 Congratulations! Your ScenicRoutes application is now live on DigitalOcean!**

**Next Steps:**
1. Complete the deployment checklist
2. Test all functionality
3. Set up monitoring and alerts
4. Prepare for Android app deployment

**Need Help?** Check the troubleshooting section or review the logs for any issues.</content>
<parameter name="filePath">c:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev\docs\SCENIC_ROUTES_DIGITALOCEAN_DEPLOYMENT.md