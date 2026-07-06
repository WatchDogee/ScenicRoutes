# ScenicRoutes Redeployment Quick Reference

## 🚀 Quick Redeploy After Code Changes

### Prerequisites
- [ ] Code pushed to `graphhopper-api-production` branch
- [ ] SSH access to production server configured

### Option 1: Automated Script (Recommended)
```bash
# SSH into your server
ssh scenicroutes@YOUR_DROPLET_IP

# Run deployment script
cd /var/www/scenicroutes
./deploy-production.sh
```

### Option 2: Manual Steps
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

# Run migrations (if any schema changes)
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

## 🔍 Post-Deployment Verification

### Check Services
```bash
sudo systemctl status nginx
sudo systemctl status php8.2-fpm
sudo systemctl status postgresql
sudo systemctl status scenicroutes-queue
```

### Check Application
```bash
# Test homepage
curl -I https://scenicroutes.me

# Check Laravel logs
tail -f /var/www/scenicroutes/storage/logs/laravel.log

# Test database connection
php artisan tinker --execute="DB::select('SELECT version()')"
```

### Check Queue Status
```bash
# View queue status
php artisan queue:status

# Monitor queue processing
sudo journalctl -u scenicroutes-queue -f
```

## 🚨 Troubleshooting Common Issues

### 502 Bad Gateway
```bash
sudo systemctl restart php8.2-fpm
sudo nginx -t && sudo systemctl reload nginx
```

### Permission Errors
```bash
sudo chown -R www-data:www-data /var/www/scenicroutes
sudo chmod -R 775 /var/www/scenicroutes/storage
```

### Queue Not Processing
```bash
sudo systemctl restart scenicroutes-queue
php artisan queue:clear
```

### Database Connection Issues
```bash
sudo systemctl status postgresql
# If down: sudo systemctl start postgresql
```

## 📊 Monitoring Commands

### Real-time Monitoring
```bash
# Laravel logs
tail -f /var/www/scenicroutes/storage/logs/laravel.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Queue logs
sudo journalctl -u scenicroutes-queue -f

# System resources
htop
```

### Health Checks
```bash
# Application health
curl https://scenicroutes.me/api/health

# Database connectivity
php artisan tinker --execute="echo 'Database: ' . (DB::connection()->getPdo() ? 'Connected' : 'Failed')"

# Queue health
php artisan queue:status
```

## 🔄 Rollback (If Needed)

### Quick Rollback
```bash
cd /var/www/scenicroutes

# Revert to previous commit
git log --oneline -5  # Find the commit to revert to
git reset --hard COMMIT_HASH

# Redeploy
./deploy-production.sh
```

### Database Rollback
```bash
# If migration needs rollback
php artisan migrate:rollback --step=1

# Or restore from backup
# (Backups are in /var/www/scenicroutes/backups/)
```

## 📈 Performance Monitoring

### Check Response Times
```bash
# Nginx response times
sudo tail -f /var/log/nginx/access.log | awk '{print $NF}'
```

### Database Performance
```bash
# Active connections
sudo -u postgres psql -d scenicroutes -c "SELECT count(*) FROM pg_stat_activity;"

# Slow queries (if you have query logging enabled)
sudo -u postgres psql -d scenicroutes -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 5;"
```

## 🛠️ Maintenance Tasks

### Weekly Tasks
- [ ] Check disk usage: `df -h`
- [ ] Review error logs
- [ ] Verify backup integrity
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`

### Monthly Tasks
- [ ] SSL certificate renewal check: `sudo certbot certificates`
- [ ] Database optimization
- [ ] Log rotation verification

## 📞 Emergency Contacts

- **Server Issues**: DigitalOcean Support
- **Application Issues**: Check logs first, then review recent commits
- **Database Issues**: Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-15-main.log`
- **Payment Issues**: Check Stripe/Resend dashboards

## 🎯 Success Metrics

After each deployment, verify:
- [ ] Homepage loads in <3 seconds
- [ ] User registration works
- [ ] Route creation works
- [ ] Payment processing works
- [ ] Email delivery works
- [ ] No new errors in logs
- [ ] Queue processing normally

---

**Remember**: Always test thoroughly in a staging environment before deploying to production!