# Google Authentication Setup Instructions

## ✅ Implementation Complete!

All code has been implemented. Now you need to:

## Step 1: Install Dependencies

```bash
composer require laravel/socialite
composer install
```

## Step 2: Run Migration

```bash
php artisan migrate
```

This will add `google_id` and `avatar` columns to the `users` table.

## Step 3: Configure Google OAuth

### 3.1 Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API** (or Google Identity API)
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: ScenicRoutes Web
   - **Authorized redirect URIs**:
     - `http://localhost:8000/auth/google/callback` (local development)
     - `https://yourdomain.com/auth/google/callback` (production)
   - **Authorized JavaScript origins**:
     - `http://localhost:8000` (local)
     - `https://yourdomain.com` (production)

6. Copy the **Client ID** and **Client Secret**

### 3.2 Add to `.env` File

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

For production, update `GOOGLE_REDIRECT_URI` to your production URL.

## Step 4: Test

1. Start your Laravel server: `php artisan serve`
2. Open the website and click "Sign in with Google"
3. You should be redirected to Google's consent screen
4. After granting permission, you should be redirected back and logged in

## Step 5: Verify

- Check that user is created in database with `google_id` set
- Check that user is logged in
- Check that `avatar` field is populated (if provided by Google)

## Troubleshooting

### Error: "Invalid redirect URI"
- Make sure the redirect URI in `.env` matches exactly what's configured in Google Console
- Check for trailing slashes

### Error: "Client ID not found"
- Verify `GOOGLE_CLIENT_ID` is set in `.env`
- Run `php artisan config:clear` to clear config cache

### Error: "Socialite driver [google] not supported"
- Make sure `laravel/socialite` is installed: `composer show laravel/socialite`
- Check `config/services.php` has Google configuration

## Next Steps (After Testing)

Once website Google auth is working, we'll implement Android version!





