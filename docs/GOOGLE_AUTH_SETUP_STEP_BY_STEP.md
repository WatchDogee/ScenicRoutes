# Google Authentication Setup - Step by Step Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `ScenicRoutes` (or any name you prefer)
5. Click **"Create"**
6. Wait for project creation (usually a few seconds)
7. Select your new project from the dropdown

## Step 2: Enable Google+ API / Google Identity API

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"** (or search "API Library" in the search bar)
2. Search for **"Google+ API"** or **"Google Identity API"**
3. Click on **"Google Identity API"** (recommended) or **"Google+ API"**
4. Click **"Enable"**
5. Wait for it to enable (usually instant)

## Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"** (or search "Credentials")
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, configure the OAuth consent screen first (see Step 4 below)
5. Select **"Web application"** as the application type
6. Give it a name: `ScenicRoutes Web`
7. **Authorized JavaScript origins** - Add:
   ```
   http://localhost:8000
   ```
   (For production, also add: `https://yourdomain.com`)
8. **Authorized redirect URIs** - Click **"+ ADD URI"** and add:
   ```
   http://localhost:8000/auth/google/callback
   ```
   (For production, also add: `https://yourdomain.com/auth/google/callback`)
9. Click **"CREATE"**
10. **IMPORTANT**: A popup will appear with your credentials:
    - **Client ID**: Copy this (looks like: `123456789-abc.apps.googleusercontent.com`)
    - **Client Secret**: Copy this (looks like: `GOCSPX-xxxxxxxxxxxxx`)
    - **Save these somewhere safe!** You'll need them in the next step.

## Step 4: Configure OAuth Consent Screen (If Not Done)

If you were prompted to configure the consent screen:

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace account, then use "Internal")
3. Click **"CREATE"**
4. Fill in the required fields:
   - **App name**: `ScenicRoutes`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"SAVE AND CONTINUE"**
6. On **"Scopes"** page, click **"SAVE AND CONTINUE"** (no need to add scopes, defaults are fine)
7. On **"Test users"** page (if External), you can add test emails or click **"SAVE AND CONTINUE"**
8. On **"Summary"** page, review and click **"BACK TO DASHBOARD"**

## Step 5: Add Credentials to Laravel .env File

1. Open your `.env` file in the project root
2. Add these lines (replace with your actual values from Step 3):

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

**Example:**
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

3. Save the `.env` file

## Step 6: Clear Laravel Config Cache

Run this command to make sure Laravel picks up the new environment variables:

```bash
php artisan config:clear
```

## Step 7: Test Google Authentication

1. Start your Laravel server:
   ```bash
   php artisan serve
   ```

2. Open your browser and go to: `http://localhost:8000`

3. Open the login modal (if you have one) or navigate to a page with the Google login button

4. Click **"Continue with Google"**

5. You should be redirected to Google's consent screen

6. Select your Google account

7. Click **"Allow"** or **"Continue"**

8. You should be redirected back to your app and logged in!

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Solution**: Make sure the redirect URI in `.env` exactly matches what's in Google Console
- Check for trailing slashes: `http://localhost:8000/auth/google/callback` (no trailing slash)
- Make sure you added it to **"Authorized redirect URIs"** in Google Console

### Error: "invalid_client"
- **Solution**: 
  - Double-check your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
  - Make sure there are no extra spaces or quotes
  - Run `php artisan config:clear`

### Error: "access_denied"
- **Solution**: User clicked "Cancel" on Google consent screen. This is normal.

### Error: "Socialite driver [google] not supported"
- **Solution**: 
  - Make sure `laravel/socialite` is installed: `composer show laravel/socialite`
  - Check `config/services.php` has the Google configuration
  - Run `php artisan config:clear`

### Google Consent Screen Shows "This app isn't verified"
- **This is normal** for apps in development/testing
- Click **"Advanced"** → **"Go to ScenicRoutes (unsafe)"** to continue
- For production, you'll need to submit your app for verification (free, but takes time)

## Production Setup

When deploying to production:

1. In Google Console, add your production URLs:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/auth/google/callback`

2. Update `.env`:
   ```env
   GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
   ```

3. Run `php artisan config:clear` on production server

## Quick Checklist

- [ ] Google Cloud project created
- [ ] Google Identity API enabled
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URI added: `http://localhost:8000/auth/google/callback`
- [ ] JavaScript origin added: `http://localhost:8000`
- [ ] OAuth consent screen configured
- [ ] Credentials added to `.env` file
- [ ] `php artisan config:clear` run
- [ ] Tested login flow

## Need Help?

If you encounter any issues:
1. Check the error message in browser console (F12)
2. Check Laravel logs: `storage/logs/laravel.log`
3. Verify all URLs match exactly (no trailing slashes, correct protocol http/https)





