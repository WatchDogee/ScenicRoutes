<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FounderController;

use App\Http\Controllers\FounderPageController;

Route::get('/founder', [FounderPageController::class, 'show']);
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/founder/checkout', [FounderController::class, 'createCheckoutSession']);
    Route::get('/founder/success', [FounderController::class, 'handleSuccess']);
    Route::get('/founder/cancel', function () {
        return redirect('/dashboard')->with('status', 'Founder payment cancelled.');
    });
});
