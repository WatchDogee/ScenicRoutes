<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Public routes
Route::get('/map', function () {
    return Inertia::render('Map', [
        'auth' => [
            'user' => auth()->user()
        ]
    ]);
})->name('map');

// Debug route for elevation data
Route::get('/elevation-debug', function () {
    return Inertia::render('ElevationDebug');
})->name('elevation.debug');

// Test routes for modal testing
Route::get('/test-modal', function () {
    return Inertia::render('TestModal');
})->name('test.modal');

Route::get('/test-collection-modal', function () {
    return Inertia::render('TestCollectionModal');
})->name('test.collection.modal');

Route::get('/test-portal-modal', function () {
    return Inertia::render('TestPortalModal');
})->name('test.portal.modal');

// Direct email verification route outside of any middleware groups
Route::get('/direct-verify/{id}', function ($id) {
    $user = \App\Models\User::findOrFail($id);

    // Mark the email as verified
    $user->markEmailAsVerified();

    // Log the user in automatically
    \Illuminate\Support\Facades\Auth::loginUsingId($user->id);

    return Inertia::render('Auth/VerifyEmailPage', [
        'status' => 'success',
        'message' => 'Email verified successfully',
        'email' => $user->email,
    ]);
})->name('direct.verify');

Route::middleware('guest')->group(function () {
    Route::get('/login', function () {
        return Inertia::render('Auth/Login');
    })->name('login');

    Route::get('/register', function () {
        return Inertia::render('Auth/Register');
    })->name('register');

    // Password reset routes - moved outside of middleware group

    // Email verification route - completely simplified version with no hash check
    Route::get('/verify-email/{id}/{hash}', function ($id, $hash) {
        $user = \App\Models\User::findOrFail($id);

        // Skip hash validation completely

        // Check if the email is already verified
        if ($user->hasVerifiedEmail()) {
            return Inertia::render('Auth/VerifyEmailPage', [
                'status' => 'success',
                'message' => 'Email already verified',
                'email' => $user->email,
            ]);
        }

        // Mark the email as verified
        $user->markEmailAsVerified();

        // Log the user in automatically
        \Illuminate\Support\Facades\Auth::loginUsingId($user->id);

        // Generate a token for API access
        $token = $user->createToken('auth_token')->plainTextToken;

        return Inertia::render('Auth/VerifyEmailPage', [
            'status' => 'success',
            'message' => 'Email verified successfully',
            'email' => $user->email,
            'token' => $token,
            'user' => $user,
        ]);
    })->name('verification.verify');

    // API login route for email verification check - make sure it's accessible
    Route::post('/login-api', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register'])->name('register');
});

// Make settings page accessible without middleware
Route::get('/settings', function () {
    return Inertia::render('Settings', [
        'auth' => [
            'user' => auth()->user()
        ]
    ]);
})->name('settings');

Route::middleware('auth')->group(function () {

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // User profile page
    Route::get('/profile', function () {
        return Inertia::render('UserProfile', [
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    })->name('profile');

    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/picture', [ProfileController::class, 'updateProfilePicture'])->name('profile.picture.update');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});

Route::middleware('auth')->group(function () {
    // Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit'); // Commented out to avoid conflict
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Password reset routes that work for both logged in and logged out users
// This route is now handled by the PasswordResetLinkController in auth.php

Route::get('/reset-password/{token}', function (Request $request, $token) {
    return Inertia::render('Auth/ResetPasswordPage', [
        'token' => $token,
        'email' => $request->email,
    ]);
})->name('password.reset.custom');

// Health check route for Docker/Coolify
Route::get('/health', function () {
    return response('OK', 200);
});

// Debug route to check environment variables and server configuration
Route::get('/debug', function () {
    return response()->json([
        'app_url' => config('app.url'),
        'app_env' => config('app.env'),
        'server_info' => [
            'host' => request()->getHost(),
            'port' => request()->getPort(),
            'scheme' => request()->getScheme(),
            'path' => request()->getPathInfo(),
            'full_url' => request()->fullUrl(),
        ],
        'headers' => request()->headers->all(),
    ]);
});

require __DIR__.'/auth.php';
