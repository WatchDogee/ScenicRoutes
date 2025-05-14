<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\PasswordReset;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:users,username', 
            'email' => 'required|email|max:255|unique:users',
            'password' => 'required|min:8|confirmed',
        ]);

        
        $username = $data['name'];

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => $username,
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
        \Log::info('Login attempt', [
            'has_email' => $request->has('email'),
            'has_login' => $request->has('login'),
            'input' => $request->only(['email', 'login', 'password'])
        ]);

        
        if ($request->has('email')) {
            
            $credentials = $request->validate([
                'email' => 'required|string',
                'password' => 'required',
            ]);

            \Log::info('Attempting login with email', ['email' => $credentials['email']]);

            if (!Auth::attempt($credentials)) {
                \Log::warning('Email login failed', ['email' => $credentials['email']]);
                return response()->json(['message' => 'Invalid credentials'], 401);
            }
        } else if ($request->has('login')) {
            
            $credentials = $request->validate([
                'login' => 'required|string',
                'password' => 'required',
            ]);

            $loginValue = $credentials['login'];
            $isEmail = filter_var($loginValue, FILTER_VALIDATE_EMAIL);

            if ($isEmail) {
                
                \Log::info('Attempting login with login field as email', ['email' => $loginValue]);

                $authData = [
                    'email' => $loginValue,
                    'password' => $credentials['password']
                ];
            } else {
                
                \Log::info('Attempting login with login field as username', ['username' => $loginValue]);

                $authData = [
                    'name' => $loginValue,
                    'password' => $credentials['password']
                ];
            }

            if (!Auth::attempt($authData)) {
                
                if ($isEmail) {
                    
                    \Log::info('Email login failed, trying with username', ['login' => $loginValue]);
                    $fallbackAuthData = [
                        'name' => $loginValue,
                        'password' => $credentials['password']
                    ];
                } else {
                    
                    \Log::info('Username login failed, trying with email', ['login' => $loginValue]);
                    $fallbackAuthData = [
                        'email' => $loginValue,
                        'password' => $credentials['password']
                    ];
                }

                if (!Auth::attempt($fallbackAuthData)) {
                    \Log::warning('Both login attempts failed', ['login' => $loginValue]);
                    return response()->json(['message' => 'Invalid credentials'], 401);
                }
            }
        } else {
            return response()->json(['message' => 'Email or login field is required'], 422);
        }

        $user = Auth::user();
        \Log::info('User authenticated', ['user_id' => $user->id, 'email' => $user->email]);

        
        if (!$user->hasVerifiedEmail()) {
            \Log::info('Email not verified', ['user_id' => $user->id, 'email' => $user->email]);
            return response()->json([
                'message' => 'Please verify your email address before logging in.',
                'email_verified' => false,
                'verification_needed' => true,
                'email' => $user->email
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        \Log::info('Login successful, token created', ['user_id' => $user->id]);

        return response()->json([
            'user' => $user,
            'token' => $token,
            'email_verified' => $user->hasVerifiedEmail()
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
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified'], 400);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification link sent successfully']);
    }

    public function verifyEmail($id, $hash)
    {
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
    }

    public function forgotPassword(Request $request)
    {
        \Log::info('Password reset request received', [
            'request_data' => $request->all(),
            'headers' => $request->headers->all()
        ]);

        try {
            $request->validate([
                'email' => 'required|email|exists:users,email',
            ]);

            \Log::info('Sending password reset link', ['email' => $request->email]);

            $status = Password::sendResetLink(
                $request->only('email')
            );

            \Log::info('Password reset status', ['status' => $status]);

            if ($status === Password::RESET_LINK_SENT) {
                return response()->json(['message' => 'Password reset link sent to your email']);
            }

            \Log::warning('Failed to send password reset link', ['status' => $status]);
            return response()->json(['message' => 'Unable to send password reset link: ' . trans($status)], 400);
        } catch (\Exception $e) {
            \Log::error('Exception in forgotPassword', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'An error occurred: ' . $e->getMessage()], 500);
        }
    }

    public function resetPassword(Request $request)
    {
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

        return response()->json(['message' => 'Unable to reset password'], 400);
    }
}