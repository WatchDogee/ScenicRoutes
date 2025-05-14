<?php

use App\Http\Controllers\ProfileController;
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

Route::middleware('guest')->group(function () {
    Route::get('/login', function () {
        return Inertia::render('Auth/Login');
    })->name('login');

    Route::get('/register', function () {
        return Inertia::render('Auth/Register');
    })->name('register');

    

    
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
    Route::post('/register', [AuthController::class, 'register'])->name('register');
});


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
    
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});



Route::get('/forgot-password-direct', function () {
    return Inertia::render('Auth/ForgotPasswordPage');
})->name('password.request.direct');


Route::get('/recover-password', function () {
    return Inertia::render('Auth/StandalonePasswordRecovery');
})->name('password.recover');

Route::get('/reset-password/{token}', function (Request $request, $token) {
    return Inertia::render('Auth/ResetPasswordPage', [
        'token' => $token,
        'email' => $request->email,
    ]);
})->name('password.reset.custom');


Route::get('/health', function () {
    return response('OK', 200);
});





require __DIR__.'/auth.php';
