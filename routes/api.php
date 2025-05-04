<?php
use App\Http\Controllers\GetRoadsController;
use App\Http\Controllers\SavedRoadController;
use App\Http\Controllers\PointOfInterestController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileController;
use Illuminate\Http\Request;

// Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/email/verification-notification', [AuthController::class, 'resendVerificationEmail']);

// Password reset routes
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.email');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.reset.api');

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

    // Photo management routes
    Route::post('/saved-roads/{roadId}/photos', [\App\Http\Controllers\RoadPhotoController::class, 'store']);
    Route::delete('/road-photos/{photoId}', [\App\Http\Controllers\RoadPhotoController::class, 'destroy']);
    Route::post('/reviews/{reviewId}/photos', [\App\Http\Controllers\ReviewPhotoController::class, 'store']);
    Route::delete('/review-photos/{photoId}', [\App\Http\Controllers\ReviewPhotoController::class, 'destroy']);

    // User settings routes
    Route::get('/settings', [\App\Http\Controllers\UserSettingController::class, 'index']);
    Route::post('/settings', [\App\Http\Controllers\UserSettingController::class, 'update']);
    Route::post('/settings/batch', [\App\Http\Controllers\UserSettingController::class, 'updateMultiple']);
});

// Public routes
Route::get('/public-roads', [SavedRoadController::class, 'publicRoads']);

// Points of Interest routes
Route::get('/pois', [PointOfInterestController::class, 'index']);
Route::get('/pois/{id}', [PointOfInterestController::class, 'show']);

// Fetch POIs from Overpass API
Route::get('/fetch-tourism', [PointOfInterestController::class, 'fetchTourism']);
Route::get('/fetch-fuel-stations', [PointOfInterestController::class, 'fetchFuelStations']);
Route::get('/fetch-charging-stations', [PointOfInterestController::class, 'fetchChargingStations']);

// Proxy route for Overpass API to avoid CORS issues
Route::get('/overpass-proxy', [PointOfInterestController::class, 'overpassProxy']);

// Protected POI routes
Route::middleware('auth:sanctum')->group(function () {
    // CRUD operations
    Route::post('/pois', [PointOfInterestController::class, 'store']);
    Route::put('/pois/{id}', [PointOfInterestController::class, 'update']);
    Route::delete('/pois/{id}', [PointOfInterestController::class, 'destroy']);

    // Photos and reviews
    Route::post('/pois/{id}/photos', [PointOfInterestController::class, 'addPhoto']);
    Route::post('/pois/{id}/reviews', [PointOfInterestController::class, 'addReview']);

    // Import POIs to database
    Route::post('/import-pois', [PointOfInterestController::class, 'importPois']);
});