<?php
use App\Http\Controllers\GetRoadsController;
use App\Http\Controllers\SavedRoadController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;

// Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Saved roads routes
    Route::get('/saved-roads', [SavedRoadController::class, 'index']);
    Route::post('/saved-roads', [SavedRoadController::class, 'store']);
    Route::get('/saved-roads/{road}', [SavedRoadController::class, 'show']);
    Route::put('/saved-roads/{road}', [SavedRoadController::class, 'update']);
    Route::delete('/saved-roads/{road}', [SavedRoadController::class, 'destroy']);
    Route::post('/saved-roads/{road}/review', [SavedRoadController::class, 'addReview']);
    Route::post('/saved-roads/{road}/comment', [SavedRoadController::class, 'addComment']);
});

// Public routes
Route::get('/public-roads', [SavedRoadController::class, 'publicRoads']);