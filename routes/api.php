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

// Public route for user's public collections
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
    Route::post('/collections/{id}/road', [CollectionController::class, 'addRoad']);
    Route::post('/collections/{id}/roads', [CollectionController::class, 'addRoads']);
    Route::post('/collections/{id}/cover-image', [CollectionController::class, 'uploadCoverImage']);
    Route::delete('/collections/{id}/roads/{roadId}', [CollectionController::class, 'removeRoad']);

    // Collection reviews
    Route::post('/collections/{id}/review', [CollectionReviewController::class, 'store']);
    Route::get('/collections/{id}/reviews', [CollectionReviewController::class, 'index']);
    Route::delete('/collections/{id}/reviews/{reviewId}', [CollectionReviewController::class, 'destroy']);
    Route::post('/collections/{id}/reorder', [CollectionController::class, 'reorderRoads']);
    Route::post('/collections/{id}/save-public-road', [CollectionController::class, 'savePublicRoad']);

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
Route::get('/public-roads/{id}', [SavedRoadController::class, 'showPublic']);
Route::get('/public-saved-roads', [SavedRoadController::class, 'publicIndex']);

// Public tag routes
Route::get('/tags', [\App\Http\Controllers\TagController::class, 'index']);
Route::get('/tags/{id}', [\App\Http\Controllers\TagController::class, 'show']);

// Debug endpoint to check all roads
Route::get('/debug/roads', function() {
    $roads = \App\Models\SavedRoad::select('id', 'road_name', 'country', 'region', 'is_public', 'length', 'corner_count', 'twistiness')
        ->where('is_public', true)
        ->get();

    return response()->json([
        'total_count' => $roads->count(),
        'roads' => $roads,
        'countries' => $roads->pluck('country')->unique()->values(),
        'regions' => $roads->pluck('region')->unique()->values(),
    ]);
});

// Debug endpoint to search roads by country, rating, and tags
Route::get('/debug/search', function(Request $request) {
    $country = $request->input('country');
    $region = $request->input('region');
    $minRating = $request->input('min_rating');
    $tags = $request->input('tags');

    // Log search parameters for debugging
    \Log::info('Debug search parameters', [
        'country' => $country,
        'region' => $region,
        'min_rating' => $minRating,
        'tags' => $tags
    ]);

    $query = \App\Models\SavedRoad::with(['tags'])
        ->where('is_public', true);

    // Filter by country
    if ($country) {
        $query->where(function($q) use ($country) {
            $q->whereRaw('LOWER(country) = ?', [strtolower($country)])
              ->orWhere('country', $country)
              ->orWhereRaw('country LIKE ?', ["%$country%"]);
        });
    }

    // Filter by region
    if ($region) {
        $query->where(function($q) use ($region) {
            $q->whereRaw('LOWER(region) = ?', [strtolower($region)])
              ->orWhere('region', $region)
              ->orWhereRaw('region LIKE ?', ["%$region%"]);
        });
    }

    // Filter by minimum rating
    if ($minRating) {
        $query->where('average_rating', '>=', $minRating)
              ->whereNotNull('average_rating')
              ->where('average_rating', '>', 0);
    }

    // Filter by tags
    if ($tags) {
        $tagArray = is_array($tags) ? $tags : explode(',', $tags);
        $query->whereHas('tags', function ($q) use ($tagArray) {
            $q->whereIn('tags.id', $tagArray)
              ->orWhereIn('tags.name', $tagArray);
        });
    }

    $roads = $query->get();

    // Always create a test road if requested or if no roads found
    $createTest = $request->has('create_test') && ($request->input('create_test') === 'true' || $request->input('create_test') === true);

    if (($roads->count() === 0 && $country) || $createTest) {
        $user = \App\Models\User::first();

        if ($user) {
            // Generate a unique name with timestamp to avoid duplicates
            $timestamp = date('His');
            $testRoad = new \App\Models\SavedRoad([
                'user_id' => $user->id,
                'road_name' => "Debug Test Road in " . ($region ? "$region, " : "") . $country . " ($timestamp)",
                'road_coordinates' => json_encode([
                    [56.9496, 24.1052], // Default coordinates
                    [56.9506, 24.1152],
                    [56.9516, 24.1252]
                ]),
                'twistiness' => 0.005,
                'corner_count' => 5,
                'length' => 5000, // 5km
                'is_public' => true,
                'description' => "This is a debug test road created via direct API request",
                'country' => $country,
                'region' => $region ?: 'Test Region',
                'elevation_gain' => 25,
                'elevation_loss' => 9,
                'max_elevation' => 135,
                'min_elevation' => 110
            ]);

            $testRoad->save();

            // Re-run the query to include the new road
            $roads = $query->get();
        }
    }

    return response()->json([
        'query' => [
            'country' => $country,
            'region' => $region,
            'min_rating' => $minRating,
            'tags' => $tags,
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings()
        ],
        'total_count' => $roads->count(),
        'roads' => $roads,
        'debug' => [
            'roads_with_ratings' => $roads->map(function($road) {
                return [
                    'id' => $road->id,
                    'name' => $road->road_name,
                    'average_rating' => $road->average_rating,
                    'tags' => $road->tags->pluck('name')
                ];
            })
        ]
    ]);
});

// Leaderboard routes
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

// Public collections
Route::get('/public-collections', [CollectionController::class, 'publicCollections']);
Route::get('/collections-by-country', [CollectionController::class, 'getCollectionsByCountry']);
Route::get('/collections-by-tag', [CollectionController::class, 'getCollectionsByTag']);

// Location routes
Route::get('/countries', [LocationController::class, 'getCountries']);
Route::get('/regions', [LocationController::class, 'getRegions']);
Route::get('/country-stats', [LocationController::class, 'getCountryStats']);

// Points of Interest routes
Route::get('/pois', [PointOfInterestController::class, 'index']);
Route::get('/pois/{id}', [PointOfInterestController::class, 'show']);

// Fetch POIs from Overpass API
Route::get('/fetch-tourism', [PointOfInterestController::class, 'fetchTourism']);
Route::get('/fetch-fuel-stations', [PointOfInterestController::class, 'fetchFuelStations']);
Route::get('/fetch-charging-stations', [PointOfInterestController::class, 'fetchChargingStations']);

// Proxy route for Overpass API to avoid CORS issues
Route::get('/overpass-proxy', [PointOfInterestController::class, 'overpassProxy']);

// Weather routes - public access without authentication requirement
Route::get('/weather', [WeatherController::class, 'getWeatherByCoordinates']);
Route::get('/roads/{id}/weather', [WeatherController::class, 'getWeatherForRoad']);
Route::post('/weather/clear-cache', [WeatherController::class, 'clearWeatherCache']);

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

    // Protected tag routes
    Route::post('/tags', [\App\Http\Controllers\TagController::class, 'store']);
    Route::put('/tags/{id}', [\App\Http\Controllers\TagController::class, 'update']);
    Route::delete('/tags/{id}', [\App\Http\Controllers\TagController::class, 'destroy']);

    // Tag relationships
    Route::get('/tags/{id}/roads', [\App\Http\Controllers\TagController::class, 'getRoads']);
    Route::get('/tags/{id}/collections', [\App\Http\Controllers\TagController::class, 'getCollections']);

    // Add/remove tags to/from roads and collections
    Route::post('/saved-roads/{id}/tags', [\App\Http\Controllers\TagController::class, 'addTagsToRoad']);
    Route::delete('/saved-roads/{id}/tags', [\App\Http\Controllers\TagController::class, 'removeTagsFromRoad']);
    Route::post('/collections/{id}/tags', [\App\Http\Controllers\TagController::class, 'addTagsToCollection']);
    Route::delete('/collections/{id}/tags', [\App\Http\Controllers\TagController::class, 'removeTagsFromCollection']);
});