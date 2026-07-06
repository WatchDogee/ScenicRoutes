<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        if (auth()->check()) {
            auth()->logout();
            if ($request->user()) {
                $request->user()->currentAccessToken()?->delete();
            }
        }
        $data = $request->validate([
            'username' => 'required|string|max:255|unique:users,username',
            'name' => 'nullable|string|max:255',
            'email' => 'required|email|max:255|unique:users',
            'password' => 'required|min:8|confirmed',
        ]);

        $user = User::create([
            'username' => $data['username'],
            'name' => $data['name'] ?? $data['username'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        event(new Registered($user));
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Registration successful! Please check your email to verify your account.',
            'email_verified' => false
        ]);
    }

    public function login(Request $request)
    {
        // Get login value from either field (FormData might send both)
        $loginValue = trim($request->input('login', '') ?: $request->input('email', ''));
        $password = trim($request->input('password', ''));

        // Validate required fields
        if (empty($loginValue)) {
            return response()->json([
                'message' => 'Email or username is required',
                'errors' => [
                    'login' => ['The email or username field is required.'],
                ],
            ], 422);
        }

        if (empty($password)) {
            return response()->json([
                'message' => 'Password is required',
                'errors' => [
                    'password' => ['The password field is required.'],
                ],
            ], 422);
        }

        $isEmail = filter_var($loginValue, FILTER_VALIDATE_EMAIL);

        // Primary auth attempt
        if ($isEmail) {
            $authData = [
                'email' => $loginValue,
                'password' => $password,
            ];
        } else {
            // Try username first (stored in username field)
            $authData = [
                'username' => $loginValue,
                'password' => $password,
            ];
        }

        if (!Auth::attempt($authData)) {
            // Fallback: if username failed, try name; if email failed, try username
            if (!$isEmail) {
                $fallbackAuthData = [
                    'name' => $loginValue,
                    'password' => $password,
                ];
            } else {
                $fallbackAuthData = [
                    'username' => $loginValue,
                    'password' => $password,
                ];
            }

            if (!Auth::attempt($fallbackAuthData)) {
                return response()->json(['message' => 'Invalid credentials'], 401);
            }
        }

        $user = Auth::user();
        if ($user->deletion_requested_at) {
            Auth::logout();
            return response()->json([
                'message' => 'Account deletion is pending. Please contact support if this is unexpected.',
                'deletion_pending' => true,
            ], 403);
        }
        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please verify your email address before logging in.',
                'email_verified' => false,
                'verification_needed' => true,
                'email' => $user->email,
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        
        // Load subscription relationship efficiently
        $user->load('subscription');
        
        // Return only essential user data to avoid loading all relationships
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'username' => $user->username,
            'profile_picture_url' => $user->profile_picture_url,
            'email_verified_at' => $user->email_verified_at,
            'subscription' => $user->subscription ? [
                'id' => $user->subscription->id,
                'plan' => $user->subscription->plan,
                'status' => $user->subscription->status,
                'billing_cycle' => $user->subscription->billing_cycle,
                'ends_at' => $user->subscription->ends_at,
            ] : null,
        ];

        return response()->json([
            'user' => $userData,
            'token' => $token,
            'email_verified' => true,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        Auth::guard('web')->logout();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function resendVerificationEmail(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['message' => 'User not found'], 404);
            }

            if ($user->hasVerifiedEmail()) {
                return response()->json(['message' => 'Email already verified'], 400);
            }

            $user->sendEmailVerificationNotification();

            return response()->json(['message' => 'Verification link sent successfully']);
        } catch (\Exception $e) {
            Log::error('Verification email error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'An error occurred sending the verification email. Please try again later.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error'
            ], 500);
        }
    }

    public function resendVerificationEmailPublic(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user) {
                // Return success message even if user doesn't exist (security best practice)
                return response()->json(['message' => 'If that email is registered and unverified, a verification link will be sent.']);
            }

            if ($user->hasVerifiedEmail()) {
                return response()->json(['message' => 'Email already verified'], 400);
            }

            $user->sendEmailVerificationNotification();

            return response()->json(['message' => 'Verification link sent successfully']);
        } catch (\Exception $e) {
            Log::error('Verification email error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'An error occurred sending the verification email. Please try again later.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error'
            ], 500);
        }
    }

    public function verifyEmail($id, $hash)
    {
        try {
            $user = User::findOrFail($id);

            if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
                return response()->json(['message' => 'Invalid verification link'], 400);
            }

            if ($user->hasVerifiedEmail()) {
                return response()->json(['message' => 'Email already verified']);
            }

            $user->markEmailAsVerified();
            return response()->json([
                'message' => 'Email verified successfully',
                'user' => $user,
                'email_verified' => true
            ]);
        } catch (\Exception $e) {
            Log::error('Email verification error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'An error occurred during email verification. Please try again later.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error'
            ], 500);
        }
    }

    public function forgotPassword(Request $request)
    {
        try {
            // Don't validate exists:users,email to prevent email enumeration
            $request->validate([
                'email' => 'required|email'
            ]);

            $user = \App\Models\User::where('email', $request->email)->first();
            if (!$user) {
                // Return success message even if user doesn't exist (security best practice)
                return response()->json([
                    'message' => 'If that email address exists, we will send a password reset link.'
                ], 200);
            }

            try {
                $status = Password::sendResetLink(
                    $request->only('email')
                );

                if ($status == Password::RESET_LINK_SENT) {
                    return response()->json([
                        'message' => 'If that email address exists, we will send a password reset link.'
                    ], 200);
                }
            } catch (\Exception $mailException) {
                // Log the error but don't reveal it to the user
                Log::error('Password reset email failed', [
                    'email' => $request->email,
                    'error' => $mailException->getMessage()
                ]);
            }

            // Always return success message (security best practice)
            return response()->json([
                'message' => 'If that email address exists, we will send a password reset link.'
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Invalid email address.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Forgot password error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'If that email address exists, we will send a password reset link.'
            ], 200);
        }
    }

    public function resetPassword(Request $request)
    {
        try {
            $request->validate([
                'token' => 'required',
                'email' => 'required|email',
                'password' => 'required|min:8|confirmed',
            ]);

            $status = Password::reset(
                $request->only('email', 'password', 'password_confirmation', 'token'),
                function ($user, $password) {
                    $user->forceFill([
                        'password' => Hash::make($password)
                    ])->save();

                    event(new PasswordReset($user));
                }
            );

            if ($status === Password::PASSWORD_RESET) {
                $user = User::where('email', $request->email)->first();

                if ($user) {
                    Auth::login($user);

                    $token = $user->createToken('auth_token')->plainTextToken;

                    return response()->json([
                        'message' => 'Password has been reset successfully',
                        'user' => $user,
                        'token' => $token,
                        'email_verified' => true
                    ]);
                }

                return response()->json(['message' => 'Password has been reset successfully']);
            }

            return response()->json([
                'message' => 'Invalid or expired reset token. Please request a new password reset link.'
            ], 400);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Reset password error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'An error occurred while resetting your password. Please try again.'
            ], 500);
        }
    }
}