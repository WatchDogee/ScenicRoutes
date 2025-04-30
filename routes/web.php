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

Route::middleware('guest')->group(function () {
    Route::get('/login', function () {
        return Inertia::render('Auth/Login');
    })->name('login');

    Route::get('/register', function () {
        return Inertia::render('Auth/Register');
    })->name('register');

    // Password reset routes - moved outside of middleware group

    // Email verification route
    Route::get('/email/verify/{id}/{hash}', function ($id, $hash) {
        return Inertia::render('Auth/VerifyEmailPage', [
            'id' => $id,
            'hash' => $hash,
            'email' => request()->query('email'),
        ]);
    })->name('verification.verify');

    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register'])->name('register');
});

Route::middleware('auth')->group(function () {
    Route::get('/settings', function () {
        return Inertia::render('Settings', [
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    })->name('settings');

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/picture', [ProfileController::class, 'updateProfilePicture'])->name('profile.picture.update');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Password reset routes that work for both logged in and logged out users
// This route is now handled by the PasswordResetLinkController in auth.php

Route::get('/reset-password/{token}', function (Request $request, $token) {
    return Inertia::render('Auth/ResetPasswordPage', [
        'token' => $token,
        'email' => $request->email,
    ]);
})->name('password.reset');

require __DIR__.'/auth.php';
