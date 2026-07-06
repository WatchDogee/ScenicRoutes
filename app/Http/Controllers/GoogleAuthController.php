<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to Google OAuth
     */
    public function redirect()
    {
        try {
            return Socialite::driver('google')
                ->scopes(['openid', 'profile', 'email'])
                ->redirect();
        } catch (\Exception $e) {
            Log::error('Google OAuth redirect error: ' . $e->getMessage());
            return redirect('/login')->with('error', 'Failed to initiate Google sign in');
        }
    }

    /**
     * Handle Google OAuth callback
     */
    public function callback(Request $request)
    {
        try {
            $googleUser = Socialite::driver('google')->user();
            
            Log::info('Google OAuth callback', [
                'google_id' => $googleUser->id,
                'email' => $googleUser->email,
                'name' => $googleUser->name,
            ]);
            
            // Find or create user
            $user = User::where('google_id', $googleUser->id)
                ->orWhere('email', $googleUser->email)
                ->first();

            if ($user) {
                // Update existing user with Google info
                $user->update([
                    'google_id' => $googleUser->id,
                    'avatar' => $googleUser->avatar ?? $user->avatar,
                    'email_verified_at' => $user->email_verified_at ?? now(), // Google emails are verified
                ]);
                
                Log::info('Updated existing user with Google auth', ['user_id' => $user->id]);
            } else {
                // Create new user
                $username = $this->generateUsername($googleUser->name, $googleUser->email);
                
                $user = User::create([
                    'name' => $googleUser->name,
                    'email' => $googleUser->email,
                    'username' => $username,
                    'google_id' => $googleUser->id,
                    'avatar' => $googleUser->avatar,
                    'password' => bcrypt(Str::random(32)), // Random password for OAuth users
                    'email_verified_at' => now(), // Google emails are verified
                ]);
                
                Log::info('Created new user with Google auth', ['user_id' => $user->id]);
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
            Auth::login($user, true); // Remember user
            
            // Store token in session for API calls if needed
            session(['api_token' => $token]);
            
            return redirect()->intended('/map')->with('success', 'Successfully signed in with Google');

        } catch (\Exception $e) {
            Log::error('Google OAuth callback error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($request->expectsJson() || $request->has('mobile')) {
                return response()->json([
                    'message' => 'Authentication failed',
                    'error' => $e->getMessage()
                ], 500);
            }

            return redirect('/login')->with('error', 'Google authentication failed. Please try again.');
        }
    }

    /**
     * Generate unique username from name or email
     */
    private function generateUsername(string $name, string $email): string
    {
        // Try to use first part of name
        $baseUsername = Str::slug(Str::before($name, ' '));
        
        // If name is empty or too short, use email prefix
        if (empty($baseUsername) || strlen($baseUsername) < 3) {
            $baseUsername = Str::before($email, '@');
        }
        
        // Ensure minimum length
        if (strlen($baseUsername) < 3) {
            $baseUsername = 'user' . Str::random(4);
        }
        
        $username = $baseUsername;
        $counter = 1;

        // Ensure uniqueness
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
            
            // Prevent infinite loop
            if ($counter > 1000) {
                $username = $baseUsername . Str::random(6);
                break;
            }
        }

        return $username;
    }
}































