# GitHub Actions Deployment Setup Guide

## Overview
Your GitHub Actions workflow is configured in `.github/workflows/deploy.yml` and will automatically deploy to production when you push to the `production` branch.

## Required GitHub Secrets

You need to configure these secrets in your GitHub repository:

### How to Add Secrets

1. Go to your GitHub repository: `https://github.com/WatchDogee/ScenicRoutes_dev`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret below

### Secrets to Configure

#### 1. **SSH_HOST**
- **Description:** Your DigitalOcean droplet IP address
- **How to get it:**
  ```bash
  # On your server, run:
  curl -4 ifconfig.me
  # Or check DigitalOcean dashboard → Droplets → Your Droplet IP
  ```
- **Example value:** `123.45.67.89` or `scenicroutes.me`

#### 2. **SSH_USER**
- **Description:** SSH username to connect to your server
- **Recommended value:** `deploy`
- **Note:** This should match the user in your GraphHopper and deployment scripts

#### 3. **SSH_PORT**
- **Description:** SSH port (default is 22)
- **Recommended value:** `22`
- **Security tip:** Consider changing to a non-standard port (e.g., 2222) for added security

#### 4. **SSH_KEY**
- **Description:** Private SSH key for authentication
- **How to set it up:**

##### Option A: Generate New Key (Recommended)

On your **local machine** (not the server):

```powershell
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/scenicroutes_deploy

# This creates two files:
# - ~/.ssh/scenicroutes_deploy (private key) - USE THIS FOR SECRET
# - ~/.ssh/scenicroutes_deploy.pub (public key) - COPY TO SERVER
```

View and copy the **private key**:
```powershell
cat ~/.ssh/scenicroutes_deploy
```

Copy the **entire output** including:
```
-----BEGIN OPENSSH PRIVATE KEY-----
[... key content ...]
-----END OPENSSH PRIVATE KEY-----
```

Add the **public key** to your server:
```powershell
# View public key
cat ~/.ssh/scenicroutes_deploy.pub

# Then on your server, run:
# mkdir -p ~/.ssh
# echo "YOUR_PUBLIC_KEY_CONTENT" >> ~/.ssh/authorized_keys
# chmod 600 ~/.ssh/authorized_keys
# chmod 700 ~/.ssh
```

##### Option B: Use Existing Key

If you already have SSH access to your server:

```powershell
# On your local machine, view your private key:
cat ~/.ssh/id_ed25519
# or
cat ~/.ssh/id_rsa

# Copy the ENTIRE private key including BEGIN/END lines
```

#### 5. **APP_DIR**
- **Description:** Full path to your application on the server
- **Value:** `/var/www/scenicroutes`
- **Note:** This must match where you cloned the repository

## Testing Your Setup

### 1. Verify Secrets Are Set

Go to: `https://github.com/WatchDogee/ScenicRoutes_dev/settings/secrets/actions`

You should see all 5 secrets listed (values are hidden for security).

### 2. Test SSH Connection Manually

On your local machine:

```powershell
# Test SSH connection (replace with your values)
ssh -i ~/.ssh/scenicroutes_deploy -p 22 deploy@YOUR_SERVER_IP

# If successful, you should be logged into your server
# Type 'exit' to disconnect
```

### 3. Trigger a Test Deployment

```powershell
# In your local repository:
git checkout production
git pull origin production

# Make a small change (or create a test commit)
git commit --allow-empty -m "Test GitHub Actions deployment"
git push origin production
```

Then:
1. Go to: `https://github.com/WatchDogee/ScenicRoutes_dev/actions`
2. You should see a new workflow running: "Deploy to Production"
3. Click on it to watch the live deployment logs

## Workflow Breakdown

### What Happens When You Push to Production

1. **Build Assets** (Job 1):
   - Checks out your code
   - Installs Node.js 20
   - Runs `npm ci` and `npm run build`
   - Uploads build artifacts

2. **Deploy** (Job 2):
   - Downloads build artifacts
   - Connects to your server via SSH
   - Pulls latest code from production branch
   - Installs PHP dependencies (Composer)
   - Runs database migrations
   - Clears and rebuilds Laravel cache
   - Reloads PHP-FPM and Nginx

### Deployment Steps on Server

```bash
cd /var/www/scenicroutes
git fetch --all --prune
git checkout production
git pull origin production
npm ci
npm run build
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo systemctl reload php8.3-fpm
sudo systemctl reload nginx
```

## Troubleshooting

### Error: "Permission denied (publickey)"

**Solution:**
1. Verify your SSH_KEY secret contains the **private key** (not public key)
2. Ensure the public key is added to `~/.ssh/authorized_keys` on the server
3. Check server permissions:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

### Error: "Host key verification failed"

**Solution:**
The workflow includes `ssh-keyscan` to handle this automatically, but if it persists:

```bash
# On your local machine:
ssh-keyscan -p 22 -H YOUR_SERVER_IP >> ~/.ssh/known_hosts
```

### Error: "git pull failed"

**Solution:**
Ensure your server has git configured and can pull from GitHub:

```bash
# On server:
cd /var/www/scenicroutes
sudo -u deploy git config --global user.name "Deploy User"
sudo -u deploy git config --global user.email "deploy@scenicroutes.me"

# If using private repo, ensure SSH keys are set up on server too
ssh -T git@github.com
```

### Error: "composer install failed"

**Solution:**
```bash
# On server, verify Composer is installed:
which composer
composer --version

# If missing:
cd ~
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
```

### Error: "php artisan migrate failed"

**Solution:**
1. Check database connection in `.env` on server
2. Verify PostgreSQL is running: `sudo systemctl status postgresql`
3. Test database connection:
   ```bash
   cd /var/www/scenicroutes
   php artisan tinker
   DB::connection()->getPdo();
   ```

### Error: "sudo: no tty present"

**Solution:**
The deploy user needs passwordless sudo for service reloads. On server:

```bash
# Add deploy user to sudoers
sudo visudo

# Add this line at the end:
deploy ALL=(ALL) NOPASSWD: /bin/systemctl reload php8.3-fpm, /bin/systemctl reload nginx
```

## Security Best Practices

### 1. Use Deploy Keys Instead of Personal Keys

For better security, use a deploy key specific to this repository:

1. Generate a key just for deployment:
   ```powershell
   ssh-keygen -t ed25519 -C "deploy@scenicroutes" -f ~/.ssh/scenicroutes_deploy_key
   ```

2. Add public key to server's `~/.ssh/authorized_keys`

3. Use the private key as `SSH_KEY` secret

4. Restrict the key to specific commands (optional):
   ```bash
   # On server, in ~/.ssh/authorized_keys, prefix the key with:
   command="/usr/local/bin/deploy.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...
   ```

### 2. Change Default SSH Port

```bash
# On server:
sudo nano /etc/ssh/sshd_config

# Change:
# Port 22
# to:
Port 2222

sudo systemctl restart sshd
```

Then update `SSH_PORT` secret to `2222`.

### 3. Use SSH Key Passphrases

When generating keys, set a passphrase for extra security (note: this requires using `ssh-agent` or GitHub's encrypted secrets).

### 4. Limit Deploy User Permissions

```bash
# On server, ensure deploy user only has access to app directory:
sudo chown -R deploy:www-data /var/www/scenicroutes
sudo chmod 755 /var/www/scenicroutes

# Limit sudo access (see troubleshooting section above)
```

## Manual Deployment (Fallback)

If GitHub Actions fails, you can deploy manually:

```bash
# SSH to server
ssh deploy@YOUR_SERVER_IP

# Navigate to app directory
cd /var/www/scenicroutes

# Pull latest changes
git pull origin production

# Install dependencies
composer install --no-dev --optimize-autoloader
npm ci
npm run build

# Run migrations
php artisan migrate --force

# Clear and cache
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
sudo systemctl reload php8.3-fpm
sudo systemctl reload nginx
```

## Monitoring Deployments

### View Deployment Logs

1. **GitHub Actions Logs:**
   - Go to: `https://github.com/WatchDogee/ScenicRoutes_dev/actions`
   - Click on any workflow run to see detailed logs

2. **Server Logs:**
   ```bash
   # Laravel application logs
   tail -f /var/www/scenicroutes/storage/logs/laravel.log

   # Nginx access logs
   sudo tail -f /var/log/nginx/access.log

   # Nginx error logs
   sudo tail -f /var/log/nginx/error.log

   # PHP-FPM logs
   sudo tail -f /var/log/php8.3-fpm.log
   ```

### Set Up Notifications

Add Slack or Discord notifications to your workflow:

```yaml
# Add to .github/workflows/deploy.yml at the end of deploy job:
      - name: Notify deployment success
        if: success()
        run: |
          curl -X POST -H 'Content-type: application/json' \
          --data '{"text":"✅ Production deployment successful!"}' \
          ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify deployment failure
        if: failure()
        run: |
          curl -X POST -H 'Content-type: application/json' \
          --data '{"text":"❌ Production deployment failed!"}' \
          ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Quick Reference

### GitHub Secrets Summary

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `SSH_HOST` | `123.45.67.89` or `scenicroutes.me` | Server IP or domain |
| `SSH_USER` | `deploy` | SSH username |
| `SSH_PORT` | `22` | SSH port |
| `SSH_KEY` | `-----BEGIN OPENSSH...` | Private SSH key (full content) |
| `APP_DIR` | `/var/www/scenicroutes` | Application directory path |

### Common Commands

```powershell
# View workflow runs
gh run list --repo WatchDogee/ScenicRoutes_dev

# Watch latest run
gh run watch --repo WatchDogee/ScenicRoutes_dev

# Manually trigger deployment
gh workflow run deploy.yml --repo WatchDogee/ScenicRoutes_dev

# View logs for specific run
gh run view RUN_ID --log --repo WatchDogee/ScenicRoutes_dev
```

## Next Steps

1. ✅ **Set up all 5 GitHub secrets** (see above)
2. ✅ **Test SSH connection** manually from your local machine
3. ✅ **Push a test commit** to production branch
4. ✅ **Monitor deployment** in GitHub Actions tab
5. ✅ **Verify deployment** by visiting your site
6. 📊 **Set up monitoring** (optional: add notifications)
7. 🔒 **Enhance security** (change SSH port, use deploy keys)

## Support

If you encounter issues:

1. Check GitHub Actions logs for error messages
2. SSH to server and check Laravel logs
3. Verify all secrets are correctly set
4. Test SSH connection manually
5. Ensure server has all required dependencies

For specific errors, search the **Troubleshooting** section above.

---

**Last Updated:** December 27, 2025

