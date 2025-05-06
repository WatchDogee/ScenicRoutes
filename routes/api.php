<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\GetRoadsController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\PointOfInterestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SavedRoadController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Health check route
Route::get('/health', function () {
    try {
        // Test database connection
        DB::connection()->getPdo();
        return response()->json([
            'status' => 'ok',
            'message' => 'API is running',
            'database' => 'connected',
            'database_name' => DB::connection()->getDatabaseName(),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Database connection failed',
            'error' => $e->getMessage(),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
        ], 500);
    }
});

// Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/email/verification-notification', [AuthController::class, 'resendVerificationEmail']);

// Password reset routes
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.email.api');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.reset.api');

// Public routes for user profiles and collections
Route::get('/public/users/{id}', function ($id) {
    $user = \App\Models\User::findOrFail($id);
    return response()->json($user);
});

// Get current user's reviews
Route::middleware('auth:sanctum')->get('/user/reviews', function (Request $request) {
    $reviews = \App\Models\Review::with(['road' => function($query) {
        $query->select('id', 'road_name', 'user_id');
    }])
    ->where('user_id', $request->user()->id)
    ->orderBy('created_at', 'desc')
    ->get();

    return response()->json($reviews);
});

// Public route for user's public roads
Route::get('/public/users/{id}/roads', function ($id) {
    $user = \App\Models\User::findOrFail($id);
    $roads = \App\Models\SavedRoad::where('user_id', $user->id)
        ->where('is_public', true)
        ->with(['user:id,name,profile_picture'])
        ->get();

    return response()->json($roads);
});

Route::get('/public/collections/{id}', function ($id) {
    $collection = \App\Models\Collection::with([
        'user:id,name,profile_picture',
        'roads' => function($query) {
            $query->where('is_public', true);
        },
        'roads.user:id,name,profile_picture'
    ])->findOrFail($id);

    // Only return public collections or if the user is the owner
    if (!$collection->is_public) {
        return response()->json(['error' => 'Collection not found'], 404);
    }

    return response()->json($collection);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Get user profile by ID
    Route::get('/users/{id}', function (Request $request, $id) {
        $user = \App\Models\User::findOrFail($id);
        return response()->json($user);
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

    // Collection routes
    Route::get('/collections', [CollectionController::class, 'index']);
    Route::post('/collections', [CollectionController::class, 'store']);
    Route::get('/collections/{id}', [CollectionController::class, 'show']);
    Route::put('/collections/{id}', [CollectionController::class, 'update']);
    Route::delete('/collections/{id}', [CollectionController::class, 'destroy']);
    Route::post('/collections/{id}/roads', [CollectionController::class, 'addRoad']);
    Route::delete('/collections/{id}/roads/{roadId}', [CollectionController::class, 'removeRoad']);
    Route::post('/collections/{id}/reorder', [CollectionController::class, 'reorderRoads']);

    // Follow system routes
    Route::post('/users/{id}/follow', [FollowController::class, 'follow']);
    Route::post('/users/{id}/unfollow', [FollowController::class, 'unfollow']);
    Route::get('/following', [FollowController::class, 'following']);
    Route::get('/followers', [FollowController::class, 'followers']);
    Route::get('/users/{id}/follow-status', [FollowController::class, 'status']);
    Route::get('/users/{id}/followers', [FollowController::class, 'userFollowers']);
    Route::get('/users/{id}/following', [FollowController::class, 'userFollowing']);
    Route::get('/feed', [FollowController::class, 'feed']);
});

// Public routes
Route::get('/public-roads', [SavedRoadController::class, 'publicRoads']);

// Leaderboard routes
Route::get('/leaderboard', [LeaderboardController::class, 'all']);
Route::get('/leaderboard/top-rated', [LeaderboardController::class, 'topRatedRoads']);
Route::get('/leaderboard/most-reviewed', [LeaderboardController::class, 'mostReviewedRoads']);
Route::get('/leaderboard/most-popular', [LeaderboardController::class, 'mostPopularRoads']);
Route::get('/leaderboard/most-active-users', [LeaderboardController::class, 'mostActiveUsers']);
Route::get('/leaderboard/most-followed-users', [LeaderboardController::class, 'mostFollowedUsers']);

// Public collections
Route::get('/public-collections', [CollectionController::class, 'publicCollections']);

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