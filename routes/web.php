<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\GoogleAuthController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;

Route::get('/', function () {
    return redirect()->route('map');
});

Route::get('/map', function () {
    return Inertia::render('Map', [
        'auth' => [
            'user' => auth()->user()
        ]
    ]);
})->name('map');

if (!app()->environment('production')) {
    Route::get('/map/debug-route', function () {
        return Inertia::render('DebugRoute');
    })->name('debug-route');

    Route::get('/map/debug-route-advanced', function () {
        return Inertia::render('DebugRouteAdvanced');
    })->name('debug-route-advanced');

    Route::get('/direct-verify/{id}', function ($id) {
        $user = \App\Models\User::findOrFail($id);

        $user->markEmailAsVerified();

        \Illuminate\Support\Facades\Auth::loginUsingId($user->id);

        return Inertia::render('Auth/VerifyEmailPage', [
            'status' => 'success',
            'message' => 'Email verified successfully',
            'email' => $user->email,
        ]);
    })->name('direct.verify');
}

Route::get('/login', function () {
    // Keep /login inaccessible; all login flows live inside the map modal
    return redirect()->route('map');
})->name('login');

Route::get('/register', function () {
    return Inertia::render('Auth/Register');
})->name('register');

Route::get('/forgot-password', function () {
    return Inertia::render('Auth/ForgotPasswordPage');
})->name('password.request');

Route::get('/recover-password', function () {
    return Inertia::render('Auth/ForgotPasswordPage');
})->name('recover.password');

Route::get('/verify-email/{id}/{hash}', function ($id, $hash) {
    $user = \App\Models\User::findOrFail($id);

    if ($user->hasVerifiedEmail()) {
        return Inertia::render('Auth/VerifyEmailPage', [
            'status' => 'success',
            'message' => 'Email already verified',
            'email' => $user->email,
        ]);
    }

    $user->markEmailAsVerified();
    \Illuminate\Support\Facades\Auth::loginUsingId($user->id);
    $token = $user->createToken('auth_token')->plainTextToken;

    return Inertia::render('Auth/VerifyEmailPage', [
        'status' => 'success',
        'message' => 'Email verified successfully',
        'email' => $user->email,
        'token' => $token,
        'user' => $user,
    ]);
})->name('verification.verify');

Route::post('/login-api', [AuthController::class, 'login']);

// Google OAuth routes
Route::get('/auth/google', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');

Route::get('/settings', function () {
    // Redirect to map since settings modal is available there
    return redirect()->route('map');
})->name('settings');

Route::get('/subscription', function () {
    return Inertia::render('Subscription', [
        'auth' => [
            'user' => auth()->user()
        ]
    ]);
})->name('subscription');

Route::get('/privacy-policy', function () {
    return response()->file(public_path('privacy-policy.html'), [
        'Content-Type' => 'text/html; charset=UTF-8'
    ]);
})->name('privacy-policy');

Route::get('/usage-stats', function () {
    return Inertia::render('UsageStats', [
        'auth' => [
            'user' => auth()->user()
        ]
    ]);
})->name('usage-stats');

Route::middleware('auth')->group(function () {

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/profile', function () {
        return Inertia::render('UserProfile', [
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    })->name('profile');

    Route::get('/my-roads', function () {
        return Inertia::render('MyRoads', [
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    })->name('my-roads');

    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/picture', [ProfileController::class, 'updateProfilePicture'])->name('profile.picture.update');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});

Route::middleware('auth')->group(function () {
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/reset-password/{token}', function (Request $request, $token) {
    return Inertia::render('Auth/ResetPasswordPage', [
        'token' => $token,
        'email' => $request->email,
    ]);
})->name('password.reset');

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

require __DIR__.'/auth.php';
