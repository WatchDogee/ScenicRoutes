# 🔐 ScenicRoutes Local Development Environment Backup
**Created:** January 15, 2026
**Environment:** Local Development
**Database:** PostgreSQL (Sceniclocal_dev)

## 📋 Complete .env Configuration

```dotenv
APP_NAME=ScenicRoutes
APP_ENV=local
APP_KEY=base64:3EIJm73DxMzzma1h3SUNRZ2x6LMyuMNMFL5jAF+mPEE=
APP_DEBUG=true
APP_URL=http://localhost:8000
LARAVEL_CLOUD=false

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file
# APP_MAINTENANCE_STORE=database

PHP_CLI_SERVER_WORKERS=4

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

#DB_CONNECTION=pgsql
#DB_HOST=127.0.0.1
#DB_PORT=5432
#DB_DATABASE=scenicroutes
#DB_USERNAME=scenicroutes_user
#DB_PASSWORD=graphhopper

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5433
DB_DATABASE=Sceniclocal_dev
DB_USERNAME=postgres
DB_PASSWORD=admin

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=localhost:8000

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=s3
QUEUE_CONNECTION=sync

CACHE_STORE=file
# CACHE_PREFIX=

MEMCACHED_HOST=127.0.0.1

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_SCHEME=null
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=5ce90ea3069338
MAIL_PASSWORD=f294a079c194ea
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=auto
AWS_BUCKET=scenicroutes-bucket
AWS_ENDPOINT=
AWS_USE_PATH_STYLE_ENDPOINT=true

VITE_APP_NAME="${APP_NAME}"
VITE_API_URL=https://scenicroutes.me

GRAPHHOPPER_URL=http://localhost:8989
GRAPHHOPPER_PROFILE=car
GRAPHOPPER_API_KEY=842a5e34-89e5-4bcb-882d-93875c6a5ba4

STRIPE_KEY=pk_test_51SWKHbGqHGi2wqq2GFgVFbx9E76C9eNEhrKmu9x1Un4rk9wKBqJMIENsB9HgqAcyyGu5aAlIcPTMEMsL7qMEq07f00QAEXAA25
STRIPE_SECRET=sk_test_51SWKHbGqHGi2wqq2aisj4qij7jLAJtSpGoQXt4IkbNjg9ySXR01uyQrMEJ7fZa4RICnILLrQdwy1XT3qebZhzQqy00xFDfPt4q
STRIPE_WEBHOOK_SECRET=wwhsec_6ae5625232119fef217b13f07ef17560bef4065aac0068ef4cfdd4ce7477eec4
STRIPE_WEBHOOK_TOLERANCE=300

STRIPE_PRICE_PRO_YEARLY=price_1SWKhcGqHGi2wqq2Ogi5FzhG
STRIPE_PRICE_PRO_MONTHLY=price_1SWKh9GqHGi2wqq2IKZwlxCE
STRIPE_PRICE_PREMIUM_YEARLY=price_1SWKgYGqHGi2wqq277UxTWyQ
STRIPE_PRICE_PREMIUM_MONTHLY=price_1SWKfkGqHGi2wqq2YmT2Eds2

FRONTEND_URL=https://scenicroutes.me

VITE_STRIPE_KEY=pk_test_51SWKHbGqHGi2wqq2GFgVFbx9E76C9eNEhrKmu9x1Un4rk9wKBqJMIENsB9HgqAcyyGu5aAlIcPTMEMsL7qMEq07f00QAEXAA25
```

## 🗄️ Database Configuration

### Current Active Database (Local Development)
- **Connection:** PostgreSQL (pgsql)
- **Host:** 127.0.0.1
- **Port:** 5433
- **Database:** Sceniclocal_dev
- **Username:** postgres
- **Password:** admin

### Production Database (Commented Out)
- **Connection:** PostgreSQL (pgsql)
- **Host:** 127.0.0.1
- **Port:** 5432
- **Database:** scenicroutes
- **Username:** scenicroutes_user
- **Password:** graphhopper

## 👥 Test User Accounts

All test users have the password: `Password123!`

### 1. Free User (No Subscription)
- **Name:** Test Free User
- **Username:** test_free
- **Email:** test_free@example.com
- **Subscription:** None

### 2. Premium User
- **Name:** Test Premium User
- **Username:** test_premium
- **Email:** test_premium@example.com
- **Subscription:** Premium (Active)

### 3. Pro User
- **Name:** Test Pro User
- **Username:** test_pro
- **Email:** test_pro@example.com
- **Subscription:** Pro (Active)

## 🔑 API Keys & Services

### Stripe (Test Environment)
- **Publishable Key:** pk_test_51SWKHbGqHGi2wqq2GFgVFbx9E76C9eNEhrKmu9x1Un4rk9wKBqJMIENsB9HgqAcyyGu5aAlIcPTMEMsL7qMEq07f00QAEXAA25
- **Secret Key:** sk_test_51SWKHbGqHGi2wqq2aisj4qij7jLAJtSpGoQXt4IkbNjg9ySXR01uyQrMEJ7fZa4RICnILLrQdwy1XT3qebZhzQqy00xFDfPt4q
- **Webhook Secret:** whsec_6ae5625232119fef217b13f07ef17560bef4065aac0068ef4cfdd4ce7477eec4

### GraphHopper
- **URL:** http://localhost:8989
- **Profile:** car
- **API Key:** 842a5e34-89e5-4bcb-882d-93875c6a5ba4

### Mailtrap (Email Testing)
- **Host:** sandbox.smtp.mailtrap.io
- **Port:** 2525
- **Username:** 5ce90ea3069338
- **Password:** f294a079c194ea

### AWS S3 (Empty - Not Configured)
- **Access Key:** (empty)
- **Secret Key:** (empty)
- **Bucket:** scenicroutes-bucket

## 🚀 Service URLs

- **Laravel Backend:** http://localhost:8000
- **GraphHopper API:** http://localhost:8989
- **Frontend (Configured for):** https://scenicroutes.me

## 📝 Notes

- **Environment:** Local development with debug enabled
- **Database:** PostgreSQL running on port 5433 (non-standard)
- **Sessions:** File-based (not Redis)
- **Cache:** File-based (not Redis)
- **Stripe:** Test environment keys
- **All migrations run:** 21 migrations completed, 33 tables created
- **Seeders run:** Test users, predefined tags, and offline map regions created

## 🔄 To Restore This Environment

1. Copy the .env configuration above to your `.env` file
2. Run: `php artisan migrate` (if database is empty)
3. Run: `php artisan db:seed` (to create test users)
4. Start services: `php artisan serve` and GraphHopper

---
**⚠️ SECURITY WARNING:** This file contains sensitive credentials. Keep it secure and never commit to version control!
