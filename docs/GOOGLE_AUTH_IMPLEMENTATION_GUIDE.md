# Google Authentication Implementation Guide

## Overview
This guide explains how to implement Google OAuth authentication for both the **Laravel website** and **Android app**, allowing users to sign in with their Google account.

---

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Website   │────────▶│   Backend    │────────▶│   Google    │
│  (React)    │         │  (Laravel)   │         │   OAuth     │
└─────────────┘         └──────────────┘         └─────────────┘
                              ▲
                              │
┌─────────────┐               │
│   Android   │───────────────┘
│    App      │
└─────────────┘
```

**Flow:**
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. User grants permission
4. Google returns authorization code
5. Backend exchanges code for access token
6. Backend fetches user info from Google
7. Backend creates/updates user and returns JWT token
8. Client stores token and user is logged in

---

## Part 1: Backend Implementation (Laravel)

### Step 1: Install Laravel Socialite

```bash
composer require laravel/socialite
```

### Step 2: Configure Google OAuth

**1. Create Google OAuth App:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create new project or select existing
- Enable Google+ API
- Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
- Configure:
  - **Application type**: Web application
  - **Authorized redirect URIs**: 
    - `http://localhost:8000/auth/google/callback` (local)
    - `https://yourdomain.com/auth/google/callback` (production)
  - **Authorized JavaScript origins**:
    - `http://localhost:8000` (local)
    - `https://yourdomain.com` (production)

**2. Add to `.env`:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

**3. Add to `config/services.php`:**
```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URI'),
],
```

### Step 3: Database Migration

Add `google_id` and `avatar` columns to users table:

```php
// database/migrations/YYYY_MM_DD_add_google_auth_to_users.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique()->after('email');
            $table->string('avatar')->nullable()->after('google_id');
            $table->boolean('email_verified')->default(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_id', 'avatar']);
        });
    }
};
```

### Step 4: Update User Model

```php
// app/Models/User.php
protected $fillable = [
    'name',
    'email',
    'password',
    'google_id',      // Add this
    'avatar',         // Add this
    'email_verified_at',
];

// Add method to check if user has Google account
public function hasGoogleAccount(): bool
{
    return !is_null($this->google_id);
}
```

### Step 5: Create Google Auth Controller

```php
// app/Http/Controllers/GoogleAuthController.php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to Google OAuth
     */
    public function redirect()
    {
        return Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->redirect();
    }

    /**
     * Handle Google OAuth callback
     */
    public function callback(Request $request)
    {
        try {
            $googleUser = Socialite::driver('google')->user();
            
            // Find or create user
            $user = User::where('google_id', $googleUser->id)
                ->orWhere('email', $googleUser->email)
                ->first();

            if ($user) {
                // Update existing user
                $user->update([
                    'google_id' => $googleUser->id,
                    'avatar' => $googleUser->avatar,
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ]);
            } else {
                // Create new user
                $user = User::create([
                    'name' => $googleUser->name,
                    'email' => $googleUser->email,
                    'username' => $this->generateUsername($googleUser->name, $googleUser->email),
                    'google_id' => $googleUser->id,
                    'avatar' => $googleUser->avatar,
                    'password' => bcrypt(Str::random(32)), // Random password for OAuth users
                    'email_verified_at' => now(), // Google emails are verified
                ]);
            }

            // Generate API token for mobile/API access
            $token = $user->createToken('auth_token')->plainTextToken;

            // Return response based on request type
            if ($request->expectsJson() || $request->has('mobile')) {
                // API/Mobile response
                return response()->json([
                    'user' => $user,
                    'token' => $token,
                    'message' => 'Login successful',
                ]);
            }

            // Web response - login and redirect
            Auth::login($user);
            return redirect()->intended('/map');

        } catch (\Exception $e) {
            \Log::error('Google OAuth error: ' . $e->getMessage());
            
            if ($request->expectsJson() || $request->has('mobile')) {
                return response()->json([
                    'message' => 'Authentication failed',
                    'error' => $e->getMessage()
                ], 500);
            }

            return redirect('/login')->with('error', 'Google authentication failed');
        }
    }

    /**
     * Generate unique username from name or email
     */
    private function generateUsername(string $name, string $email): string
    {
        $baseUsername = Str::slug(Str::before($name, ' '));
        $username = $baseUsername;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        return $username;
    }
}
```

### Step 6: Add API Routes

```php
// routes/api.php

// Google OAuth routes
Route::get('/auth/google', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
```

### Step 7: Add Web Routes (for website)

```php
// routes/web.php

Route::get('/auth/google', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
```

---

## Part 2: Website Implementation (React/Inertia)

### Step 1: Create Google Login Button Component

```jsx
// resources/js/Components/GoogleLoginButton.jsx
import { Inertia } from '@inertiajs/inertia';

export default function GoogleLoginButton({ className = '' }) {
    const handleGoogleLogin = () => {
        // Redirect to backend Google OAuth endpoint
        window.location.href = '/auth/google';
    };

    return (
        <button
            onClick={handleGoogleLogin}
            className={`flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${className}`}
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
            </svg>
            <span className="text-gray-700 font-medium">
                Continue with Google
            </span>
        </button>
    );
}
```

### Step 2: Integrate into Login/Register Pages

```jsx
// resources/js/Pages/Auth/Login.jsx
import GoogleLoginButton from '@/Components/GoogleLoginButton';

export default function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
                {/* Regular login form */}
                <form>
                    {/* Email, password fields */}
                </form>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or</span>
                    </div>
                </div>

                {/* Google Login Button */}
                <GoogleLoginButton />
            </div>
        </div>
    );
}
```

### Step 3: Handle OAuth Callback (if needed)

The callback is handled server-side, but you can add a loading state:

```jsx
// resources/js/Pages/Auth/GoogleCallback.jsx
import { useEffect } from 'react';
import { usePage } from '@inertiajs/inertia-react';

export default function GoogleCallback() {
    const { flash } = usePage().props;

    useEffect(() => {
        // The backend handles the OAuth and redirects
        // This page is just for loading state
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Completing Google sign in...</p>
            </div>
        </div>
    );
}
```

---

## Part 3: Android Implementation (Kotlin)

### Step 1: Add Google Sign-In Dependency

```kotlin
// android-native/app/build.gradle.kts
dependencies {
    // ... existing dependencies
    
    // Google Sign-In
    implementation("com.google.android.gms:play-services-auth:20.7.0")
}
```

### Step 2: Get Google OAuth Client ID for Android

**1. In Google Cloud Console:**
- Create **Android** OAuth 2.0 Client ID
- Enter your app's package name: `com.scenicroutes.app`
- Get SHA-1 fingerprint:
  ```bash
  # Debug keystore
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  
  # Release keystore (when ready)
  keytool -list -v -keystore your-release-key.keystore
  ```
- Add SHA-1 to Google Console

**2. Add to `strings.xml`:**
```xml
<string name="google_client_id">YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com</string>
```

### Step 3: Create Google Auth Repository

```kotlin
// android-native/app/src/main/java/com/scenicroutes/app/data/repository/GoogleAuthRepository.kt
package com.scenicroutes.app.data.repository

import android.content.Context
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import com.scenicroutes.app.R
import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.model.AuthResponse
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.tasks.await

class GoogleAuthRepository(private val context: Context) {
    private val apiService: ApiService = NetworkModule.apiService
    private val clientId = context.getString(R.string.google_client_id)
    
    private val googleSignInClient: GoogleSignInClient by lazy {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(clientId)
            .requestEmail()
            .requestProfile()
            .build()
        
        GoogleSignIn.getClient(context, gso)
    }
    
    /**
     * Get Google Sign-In Intent
     */
    fun getSignInIntent() = googleSignInClient.signInIntent
    
    /**
     * Handle Google Sign-In result
     */
    suspend fun handleSignInResult(task: Task<GoogleSignInAccount>): Result<AuthResponse> {
        return try {
            val account = task.getResult(ApiException::class.java)
            account?.let { 
                // Exchange Google token for backend token
                exchangeGoogleToken(it.idToken ?: return Result.failure(Exception("No ID token")))
            } ?: Result.failure(Exception("Sign in failed"))
        } catch (e: ApiException) {
            Result.failure(e)
        }
    }
    
    /**
     * Exchange Google ID token for backend JWT token
     */
    private suspend fun exchangeGoogleToken(idToken: String): Result<AuthResponse> {
        return try {
            val response = apiService.googleAuth(idToken)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(response.message() ?: "Authentication failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign out from Google
     */
    suspend fun signOut() {
        googleSignInClient.signOut().await()
    }
}
```

### Step 4: Add API Endpoint for Android

```kotlin
// android-native/app/src/main/java/com/scenicroutes/app/data/api/ApiClient.kt

@POST("auth/google/mobile")
suspend fun googleAuth(
    @Body request: GoogleAuthRequest
): Response<AuthResponse>

data class GoogleAuthRequest(
    @SerializedName("id_token")
    val idToken: String
)
```

### Step 5: Add Backend Endpoint for Mobile

```php
// app/Http/Controllers/GoogleAuthController.php

/**
 * Handle Google Sign-In from mobile app
 */
public function mobileAuth(Request $request)
{
    $request->validate([
        'id_token' => 'required|string',
    ]);

    try {
        // Verify Google ID token
        $client = new \Google_Client(['client_id' => config('services.google.client_id')]);
        $payload = $client->verifyIdToken($request->id_token);

        if (!$payload) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $googleId = $payload['sub'];
        $email = $payload['email'];
        $name = $payload['name'] ?? $email;
        $avatar = $payload['picture'] ?? null;

        // Find or create user
        $user = User::where('google_id', $googleId)
            ->orWhere('email', $email)
            ->first();

        if ($user) {
            $user->update([
                'google_id' => $googleId,
                'avatar' => $avatar,
                'email_verified_at' => $user->email_verified_at ?? now(),
            ]);
        } else {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'username' => $this->generateUsername($name, $email),
                'google_id' => $googleId,
                'avatar' => $avatar,
                'password' => bcrypt(Str::random(32)),
                'email_verified_at' => now(),
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Login successful',
        ]);

    } catch (\Exception $e) {
        \Log::error('Google mobile auth error: ' . $e->getMessage());
        return response()->json([
            'message' => 'Authentication failed',
            'error' => $e->getMessage()
        ], 500);
    }
}
```

### Step 6: Create Google Login UI Component

```kotlin
// android-native/app/src/main/java/com/scenicroutes/app/ui/screens/profile/GoogleLoginButton.kt
package com.scenicroutes.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.repository.GoogleAuthRepository
import kotlinx.coroutines.launch

@Composable
fun GoogleLoginButton(
    onAuthSuccess: (String) -> Unit,
    onAuthError: (String) -> Unit
) {
    val context = LocalContext.current
    val googleAuthRepo = remember { GoogleAuthRepository(context) }
    val coroutineScope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }

    OutlinedButton(
        onClick = {
            if (!isLoading) {
                isLoading = true
                coroutineScope.launch {
                    try {
                        // Start Google Sign-In
                        val signInIntent = googleAuthRepo.getSignInIntent()
                        // Note: This requires Activity context, so we'll handle it differently
                        // See GoogleLoginActivity below
                    } catch (e: Exception) {
                        isLoading = false
                        onAuthError(e.message ?: "Google sign-in failed")
                    }
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        enabled = !isLoading
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp
            )
        } else {
            // Google icon (you can add a vector drawable)
            Icon(
                imageVector = Icons.Default.AccountCircle,
                contentDescription = "Google",
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Continue with Google")
        }
    }
}
```

### Step 7: Create Google Login Activity

```kotlin
// android-native/app/src/main/java/com/scenicroutes/app/GoogleSignInActivity.kt
package com.scenicroutes.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import com.scenicroutes.app.data.repository.GoogleAuthRepository
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class GoogleSignInActivity : ComponentActivity() {
    private lateinit var googleAuthRepo: GoogleAuthRepository
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        googleAuthRepo = GoogleAuthRepository(this)
        
        // Start Google Sign-In
        val signInIntent = googleAuthRepo.getSignInIntent()
        startActivityForResult(signInIntent, RC_SIGN_IN)
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == RC_SIGN_IN) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            handleSignInResult(task)
        }
    }
    
    private fun handleSignInResult(task: Task<GoogleSignInAccount>) {
        lifecycleScope.launch {
            try {
                val result = googleAuthRepo.handleSignInResult(task)
                result.fold(
                    onSuccess = { authResponse ->
                        // Return result to calling activity
                        val resultIntent = Intent().apply {
                            putExtra("token", authResponse.token)
                            putExtra("user", authResponse.user)
                        }
                        setResult(RESULT_OK, resultIntent)
                        finish()
                    },
                    onFailure = { error ->
                        setResult(RESULT_CANCELED, Intent().apply {
                            putExtra("error", error.message)
                        })
                        finish()
                    }
                )
            } catch (e: Exception) {
                setResult(RESULT_CANCELED, Intent().apply {
                    putExtra("error", e.message)
                })
                finish()
            }
        }
    }
    
    companion object {
        const val RC_SIGN_IN = 9001
    }
}
```

### Step 8: Integrate into Profile Screen

```kotlin
// android-native/app/src/main/java/com/scenicroutes/app/ui/screens/profile/ProfileScreen.kt

// In LoginScreen composable:
GoogleLoginButton(
    onAuthSuccess = { token ->
        // Save token and update user state
        viewModel.handleGoogleAuth(token)
    },
    onAuthError = { error ->
        viewModel.setError(error)
    }
)
```

---

## Part 4: Security Considerations

### 1. Token Validation
- Always verify Google ID tokens on the backend
- Never trust client-side token validation
- Use HTTPS for all OAuth flows

### 2. User Linking
- If user signs in with Google but email already exists with password:
  - Option A: Link accounts (add `google_id` to existing account)
  - Option B: Require password confirmation
  - Option C: Show error and ask to use password login

### 3. Email Verification
- Google-authenticated users are automatically verified
- Set `email_verified_at` when creating OAuth users

### 4. Password Handling
- OAuth users don't need passwords
- Generate random password for database constraints
- Prevent password reset for OAuth-only users

---

## Part 5: Testing

### Website Testing:
1. Click "Sign in with Google"
2. Should redirect to Google
3. After consent, should redirect back and log in
4. Check user in database has `google_id` set

### Android Testing:
1. Click "Continue with Google"
2. Google Sign-In dialog appears
3. After selection, should receive token
4. User should be logged in

---

## Summary

**Backend:**
- ✅ Install Laravel Socialite
- ✅ Configure Google OAuth credentials
- ✅ Add `google_id` and `avatar` to users table
- ✅ Create `GoogleAuthController` with web and mobile endpoints

**Website:**
- ✅ Create `GoogleLoginButton` component
- ✅ Add to login/register pages
- ✅ Handle OAuth callback

**Android:**
- ✅ Add Google Sign-In SDK
- ✅ Create `GoogleAuthRepository`
- ✅ Create `GoogleSignInActivity`
- ✅ Integrate into login UI

This implementation provides a seamless Google authentication experience across both platforms! 🚀





