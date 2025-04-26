<?php
use App\Http\Controllers\GetRoadsController;
use App\Http\Controllers\SavedRoadController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileController;
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

    // Profile routes
    Route::post('/profile/picture', [ProfileController::class, 'updateProfilePicture']);
    Route::match(['post', 'patch'], '/profile', [ProfileController::class, 'update']);

    // Saved roads management
    Route::get('/saved-roads', [SavedRoadController::class, 'index']);
    Route::post('/saved-roads', [SavedRoadController::class, 'store']);
    Route::get('/saved-roads/{id}', [SavedRoadController::class, 'show']);
    Route::put('/saved-roads/{id}', [SavedRoadController::class, 'update']);
    Route::delete('/saved-roads/{id}', [SavedRoadController::class, 'destroy']);
    
    // Community interaction routes
    Route::post('/saved-roads/{id}/review', [SavedRoadController::class, 'addReview']);
    Route::post('/saved-roads/{id}/comment', [SavedRoadController::class, 'addComment']);
    Route::post('/saved-roads/{id}/toggle-public', [SavedRoadController::class, 'togglePublic']);
});

// Public routes
Route::get('/public-roads', [SavedRoadController::class, 'publicRoads']);