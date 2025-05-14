<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\CollectionReviewController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\GetRoadsController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PointOfInterestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SavedRoadController;
use App\Http\Controllers\WeatherController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;


Route::get('/health', function () {
    try {
        
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


Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/email/verification-notification', [AuthController::class, 'resendVerificationEmail']);


Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.email.api');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.reset.api');


Route::get('/public/users/{id}', function ($id) {
    $user = \App\Models\User::findOrFail($id);
    return response()->json($user);
});


Route::middleware('auth:sanctum')->get('/user/reviews', function (Request $request) {
    $reviews = \App\Models\Review::with(['road' => function($query) {
        $query->select('id', 'road_name', 'user_id');
    }])
    ->where('user_id', $request->user()->id)
    ->orderBy('created_at', 'desc')
    ->get();

    return response()->json($reviews);
});


Route::get('/public/users/{id}/roads', function ($id) {
    $user = \App\Models\User::findOrFail($id);
    $roads = \App\Models\SavedRoad::where('user_id', $user->id)
        ->where('is_public', true)
        ->with(['user:id,name,profile_picture'])
        ->get();

    return response()->json($roads);
});


Route::get('/public/users/{id}/collections', function ($id) {
    $user = \App\Models\User::findOrFail($id);
    $collections = \App\Models\Collection::where('user_id', $user->id)
        ->where('is_public', true)
        ->with(['user:id,name,profile_picture'])
        ->withCount('roads')
        ->get();

    return response()->json($collections);
});

Route::get('/public/collections/{id}', function ($id) {
    $collection = \App\Models\Collection::with([
        'user:id,name,profile_picture',
        'roads' => function($query) {
            $query->where('is_public', true);
        },
        'roads.user:id,name,profile_picture'
    ])->findOrFail($id);

    
    if (!$collection->is_public) {
        return response()->json(['error' => 'Collection not found'], 404);
    }

    return response()->json($collection);
});


Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    
    Route::get('/users/{id}', function (Request $request, $id) {
        $user = \App\Models\User::findOrFail($id);
        return response()->json($user);
    });

    
    Route::post('/profile/picture', [ProfileController::class, 'updateProfilePicture']);
    Route::match(['post', 'patch'], '/profile', [ProfileController::class, 'update']);

    
    Route::get('/saved-roads', [SavedRoadController::class, 'index']);
    Route::post('/saved-roads', [SavedRoadController::class, 'store']);
    Route::get('/saved-roads/{id}', [SavedRoadController::class, 'show']);
    Route::put('/saved-roads/{id}', [SavedRoadController::class, 'update']);
    Route::delete('/saved-roads/{id}', [SavedRoadController::class, 'destroy']);

    
    Route::post('/saved-roads/{id}/review', [SavedRoadController::class, 'addReview']);
    Route::post('/saved-roads/{id}/comment', [SavedRoadController::class, 'addComment']);
    Route::post('/saved-roads/{id}/toggle-public', [SavedRoadController::class, 'togglePublic']);

    
    Route::post('/saved-roads/{roadId}/photos', [\App\Http\Controllers\RoadPhotoController::class, 'store']);
    Route::delete('/road-photos/{photoId}', [\App\Http\Controllers\RoadPhotoController::class, 'destroy']);
    Route::post('/reviews/{reviewId}/photos', [\App\Http\Controllers\ReviewPhotoController::class, 'store']);
    Route::delete('/review-photos/{photoId}', [\App\Http\Controllers\ReviewPhotoController::class, 'destroy']);

    
    Route::get('/settings', [\App\Http\Controllers\UserSettingController::class, 'index']);
    Route::post('/settings', [\App\Http\Controllers\UserSettingController::class, 'update']);
    Route::post('/settings/batch', [\App\Http\Controllers\UserSettingController::class, 'updateMultiple']);

    
    Route::get('/collections', [CollectionController::class, 'index']);
    Route::post('/collections', [CollectionController::class, 'store']);
    Route::get('/collections/{id}', [CollectionController::class, 'show']);
    Route::put('/collections/{id}', [CollectionController::class, 'update']);
    Route::delete('/collections/{id}', [CollectionController::class, 'destroy']);
    Route::post('/collections/{id}/road', [CollectionController::class, 'addRoad']);
    Route::post('/collections/{id}/roads', [CollectionController::class, 'addRoads']);
    Route::post('/collections/{id}/cover-image', [CollectionController::class, 'uploadCoverImage']);
    Route::delete('/collections/{id}/roads/{roadId}', [CollectionController::class, 'removeRoad']);

    
    Route::post('/collections/{id}/review', [CollectionReviewController::class, 'store']);
    Route::get('/collections/{id}/reviews', [CollectionReviewController::class, 'index']);
    Route::delete('/collections/{id}/reviews/{reviewId}', [CollectionReviewController::class, 'destroy']);
    Route::post('/collections/{id}/reorder', [CollectionController::class, 'reorderRoads']);
    Route::post('/collections/{id}/save-public-road', [CollectionController::class, 'savePublicRoad']);

    
    Route::post('/users/{id}/follow', [FollowController::class, 'follow']);
    Route::post('/users/{id}/unfollow', [FollowController::class, 'unfollow']);
    Route::get('/following', [FollowController::class, 'following']);
    Route::get('/followers', [FollowController::class, 'followers']);
    Route::get('/users/{id}/follow-status', [FollowController::class, 'status']);
    Route::get('/users/{id}/followers', [FollowController::class, 'userFollowers']);
    Route::get('/users/{id}/following', [FollowController::class, 'userFollowing']);
    Route::get('/feed', [FollowController::class, 'feed']);

    
    Route::get('/following/collections', [\App\Http\Controllers\CollectionSavedController::class, 'followingCollections']);
    Route::get('/saved-collections', [\App\Http\Controllers\CollectionSavedController::class, 'savedCollections']);
});


Route::get('/public-roads', [SavedRoadController::class, 'publicRoads']);
Route::get('/public-roads/{id}', [SavedRoadController::class, 'showPublic']);
Route::get('/public-saved-roads', [SavedRoadController::class, 'publicIndex']);


Route::get('/tags', [\App\Http\Controllers\TagController::class, 'index']);
Route::get('/tags/{id}', [\App\Http\Controllers\TagController::class, 'show']);




Route::get('/leaderboard', [LeaderboardController::class, 'all']);
Route::get('/leaderboard/top-rated', [LeaderboardController::class, 'topRatedRoads']);
Route::get('/leaderboard/most-reviewed', [LeaderboardController::class, 'mostReviewedRoads']);
Route::get('/leaderboard/most-popular', [LeaderboardController::class, 'mostPopularRoads']);
Route::get('/leaderboard/most-active-users', [LeaderboardController::class, 'mostActiveUsers']);
Route::get('/leaderboard/most-followed-users', [LeaderboardController::class, 'mostFollowedUsers']);
Route::get('/leaderboard/featured-collections', [LeaderboardController::class, 'featuredCollections']);
Route::get('/leaderboard/top-rated-collections', [LeaderboardController::class, 'topRatedCollections']);
Route::get('/leaderboard/popular-roads-by-country', [LeaderboardController::class, 'popularRoadsByCountry']);
Route::get('/leaderboard/countries-with-most-roads', [LeaderboardController::class, 'countriesWithMostRoads']);


Route::get('/public-collections', [CollectionController::class, 'publicCollections']);
Route::get('/collections-by-country', [CollectionController::class, 'getCollectionsByCountry']);
Route::get('/collections-by-tag', [CollectionController::class, 'getCollectionsByTag']);


Route::get('/countries', [LocationController::class, 'getCountries']);
Route::get('/regions', [LocationController::class, 'getRegions']);
Route::get('/country-stats', [LocationController::class, 'getCountryStats']);


Route::get('/pois', [PointOfInterestController::class, 'index']);
Route::get('/pois/{id}', [PointOfInterestController::class, 'show']);


Route::get('/fetch-tourism', [PointOfInterestController::class, 'fetchTourism']);
Route::get('/fetch-fuel-stations', [PointOfInterestController::class, 'fetchFuelStations']);
Route::get('/fetch-charging-stations', [PointOfInterestController::class, 'fetchChargingStations']);


Route::get('/overpass-proxy', [PointOfInterestController::class, 'overpassProxy']);


Route::get('/weather', [WeatherController::class, 'getWeatherByCoordinates']);
Route::get('/roads/{id}/weather', [WeatherController::class, 'getWeatherForRoad']);
Route::post('/weather/clear-cache', [WeatherController::class, 'clearWeatherCache']);


Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('/pois', [PointOfInterestController::class, 'store']);
    Route::put('/pois/{id}', [PointOfInterestController::class, 'update']);
    Route::delete('/pois/{id}', [PointOfInterestController::class, 'destroy']);

    
    Route::post('/pois/{id}/photos', [PointOfInterestController::class, 'addPhoto']);

    
    Route::post('/import-pois', [PointOfInterestController::class, 'importPois']);

    
    Route::post('/tags', [\App\Http\Controllers\TagController::class, 'store']);
    Route::put('/tags/{id}', [\App\Http\Controllers\TagController::class, 'update']);
    Route::delete('/tags/{id}', [\App\Http\Controllers\TagController::class, 'destroy']);

    
    Route::get('/tags/{id}/roads', [\App\Http\Controllers\TagController::class, 'getRoads']);
    Route::get('/tags/{id}/collections', [\App\Http\Controllers\TagController::class, 'getCollections']);

    
    Route::post('/saved-roads/{id}/tags', [\App\Http\Controllers\TagController::class, 'addTagsToRoad']);
    Route::delete('/saved-roads/{id}/tags', [\App\Http\Controllers\TagController::class, 'removeTagsFromRoad']);
    Route::post('/collections/{id}/tags', [\App\Http\Controllers\TagController::class, 'addTagsToCollection']);
    Route::delete('/collections/{id}/tags', [\App\Http\Controllers\TagController::class, 'removeTagsFromCollection']);
});