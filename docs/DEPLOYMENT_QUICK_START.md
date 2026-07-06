# 🚀 GitHub Actions Deployment - Quick Start

## ⚡ TL;DR - Fast Setup

```powershell
# 1. Set up SSH keys and configure server
.\setup-deployment-keys.ps1 -ServerIP YOUR_SERVER_IP

# 2. Set all GitHub secrets at once
.\set-github-secrets.ps1

# 3. Verify everything is configured
.\verify-github-secrets.ps1

# 4. Deploy!
git checkout production
git push origin production
```

## 📋 Required Secrets

| Secret | Example | Get From |
|--------|---------|----------|
| `SSH_HOST` | `123.45.67.89` | DigitalOcean dashboard |
| `SSH_USER` | `deploy` | Your server username |
| `SSH_PORT` | `22` | Usually 22 (default SSH port) |
| `SSH_KEY` | `-----BEGIN...` | Generate with `setup-deployment-keys.ps1` |
| `APP_DIR` | `/var/www/scenicroutes` | Where you cloned the repo |

## 🛠️ Quick Commands

### Setup
```powershell
# Generate SSH keys for deployment
.\setup-deployment-keys.ps1 -ServerIP 123.45.67.89

# Set all secrets interactively
.\set-github-secrets.ps1

# Verify setup
.\verify-github-secrets.ps1
```

### Manual Secret Management
```powershell
# Set individual secret
gh secret set SSH_HOST --repo WatchDogee/ScenicRoutes_dev

# List all secrets
gh secret list --repo WatchDogee/ScenicRoutes_dev

# Remove a secret
gh secret remove SSH_HOST --repo WatchDogee/ScenicRoutes_dev
```

### Deployment
```powershell
# Deploy to production
git checkout production
git pull origin production
git commit --allow-empty -m "Deploy"
git push origin production

# Watch deployment
gh run watch --repo WatchDogee/ScenicRoutes_dev

# View recent deployments
gh run list --repo WatchDogee/ScenicRoutes_dev --limit 5
```

### Monitoring
```powershell
# View workflow runs
gh run list --repo WatchDogee/ScenicRoutes_dev

# View specific run logs
gh run view RUN_ID --log --repo WatchDogee/ScenicRoutes_dev

# Re-run failed deployment
gh run rerun RUN_ID --repo WatchDogee/ScenicRoutes_dev
```

## 🔧 Troubleshooting

### "Permission denied (publickey)"
```powershell
# Regenerate keys
.\setup-deployment-keys.ps1 -ServerIP YOUR_IP

# Make sure public key is on server:
# SSH to server and run:
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### "Git pull failed"
```bash
# On server:
cd /var/www/scenicroutes
sudo chown -R deploy:www-data .
sudo -u deploy git config --global user.name "Deploy"
sudo -u deploy git config --global user.email "deploy@scenicroutes.me"
```

### "Composer install failed"
```bash
# On server, verify Composer:
composer --version

# If missing, install:
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### View Logs
```bash
# On server:
tail -f /var/www/scenicroutes/storage/logs/laravel.log
sudo tail -f /var/log/nginx/error.log
```

## 📚 Resources

- **Full Guide:** [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)
- **Workflow File:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- **GitHub Actions:** https://github.com/WatchDogee/ScenicRoutes_dev/actions

## 🎯 Deployment Flow

1. **Push to production branch** → Triggers GitHub Actions
2. **Build assets** → Compiles frontend (Node.js)
3. **Deploy to server** → SSH connection established
4. **Pull latest code** → Updates repository
5. **Install dependencies** → Composer + NPM
6. **Run migrations** → Database updates
7. **Clear cache** → Laravel optimization
8. **Restart services** → PHP-FPM + Nginx
9. **✅ Deployment complete!**

## ⚙️ What Gets Deployed

- ✅ Backend code (PHP/Laravel)
- ✅ Frontend assets (Vue.js)
- ✅ Database migrations
- ✅ Composer dependencies
- ✅ NPM packages
- ✅ Environment configs (cached)

## 🔒 Security Tips

1. **Use dedicated deploy keys** (not your personal SSH key)
2. **Change SSH port** from 22 to something else (e.g., 2222)
3. **Limit deploy user permissions** (only access to app directory)
4. **Use environment-specific .env** (separate prod/dev configs)
5. **Enable GitHub branch protection** for production branch

## 📊 Monitoring

### View Deployment Status
- **GitHub:** https://github.com/WatchDogee/ScenicRoutes_dev/actions
- **Server Logs:** `/var/www/scenicroutes/storage/logs/laravel.log`
- **Web Server:** `https://scenicroutes.me`

### Health Checks
```bash
# On server:
sudo systemctl status nginx
sudo systemctl status php8.3-fpm
sudo systemctl status postgresql
sudo systemctl status graphhopper
```

## 🚨 Emergency Rollback

```bash
# SSH to server
ssh deploy@YOUR_SERVER_IP

# Rollback to previous commit
cd /var/www/scenicroutes
git log --oneline -5  # See recent commits
git reset --hard COMMIT_HASH  # Rollback to specific commit
composer install --no-dev
npm ci && npm run build
php artisan migrate
php artisan config:cache
sudo systemctl reload php8.3-fpm
```

## 📞 Support

- **Issue:** Something not working?
- **Check:** [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) troubleshooting section
- **Logs:** GitHub Actions logs + server logs
- **Verify:** Run `.\verify-github-secrets.ps1`

---

**Last Updated:** December 27, 2025

