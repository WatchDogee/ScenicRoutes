<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\RideController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\CollectionReviewController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\GetRoadsController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PointOfInterestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoadCommentController;
use App\Http\Controllers\RouteController;
use App\Http\Controllers\RouteShareController;
use App\Http\Controllers\SavedRoadController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TelemetryController;
use App\Http\Controllers\WeatherController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        return response()->json([
            'status' => 'ok',
            'database' => 'connected'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Database connection failed'
        ], 500);
    }
});

// Google Play Real-Time Developer Notifications webhook (public - authenticated by Google)
Route::post('/google-play/webhook', [\App\Http\Controllers\GooglePlayController::class, 'handleWebhook']);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.email.api');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.reset.api');
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed'])
    ->name('verification.verify.api');
Route::post('/email/resend-verification', [AuthController::class, 'resendVerificationEmailPublic'])
    ->middleware('throttle:6,1');
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
        ->with(['user:id,name'])
        ->get();

    return response()->json($roads);
});

Route::get('/public/users/{id}/collections', function ($id) {
    $user = \App\Models\User::findOrFail($id);
    $collections = \App\Models\Collection::where('user_id', $user->id)
        ->where('is_public', true)
        ->with(['user:id,name'])
        ->withCount('roads')
        ->get();

    return response()->json($collections);
});

Route::get('/public/collections/{id}', function ($id) {
    $collection = \App\Models\Collection::with([
        'user:id,name',
        'roads' => function($query) {
            $query->where('is_public', true);
        },
        'roads.user:id,name'
    ])->findOrFail($id);


    if (!$collection->is_public) {
        return response()->json(['error' => 'Collection not found'], 404);
    }

    return response()->json($collection);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerificationEmail'])
        ->middleware('throttle:6,1');
    Route::get('/user', function (Request $request) {
        $user = $request->user()->load('subscription');
        
        // Get tier information
        $tier = $user->getSubscriptionTier();
        
        // Add subscription expiration info
        // Only notify if subscription is actually ending (cancel_at_period_end = true)
        // or if it's already expired
        $subscriptionStatus = null;
        if ($user->subscription && $user->subscription->ends_at) {
            $subscription = $user->subscription;
            $endsAt = $subscription->ends_at;
            $now = now();
            
            // Only show notifications if subscription is cancelled (ending) or already expired
            $isActuallyEnding = $subscription->cancel_at_period_end || $subscription->status === 'cancelled' || $subscription->status === 'expired';
            
            if ($endsAt->isPast()) {
                // Expired - always notify
                $subscriptionStatus = [
                    'status' => 'expired',
                    'expired_at' => $endsAt->toIso8601String(),
                    'days_ago' => $now->diffInDays($endsAt),
                ];
            } elseif ($endsAt->isFuture() && $isActuallyEnding) {
                // Expiring soon - only if actually ending (not auto-renewing)
                $daysRemaining = $now->diffInDays($endsAt, false);
                // Only notify if within 30 days of expiration (not a full year)
                if ($daysRemaining <= 30 && $daysRemaining >= 0) {
                    $subscriptionStatus = [
                        'status' => 'expiring',
                        'expires_at' => $endsAt->toIso8601String(),
                        'days_remaining' => $daysRemaining,
                        'is_expiring_soon' => $daysRemaining <= 7, // Still mark as "soon" for 7 days or less
                    ];
                }
            }
        }
        
        $userData = $user->toArray();
        // Add tier information
        $userData['tier'] = $tier;
        if ($user->subscription) {
            $userData['subscription']['plan'] = $tier;
            $userData['subscription']['name'] = ucfirst($tier);
        }
        if ($subscriptionStatus) {
            $userData['subscription_status'] = $subscriptionStatus;
        }
        
        return $userData;
    });

    // User search and recommendations (must come before /users/{id} to avoid route conflicts)
    Route::get('/users/search', [\App\Http\Controllers\UserSearchController::class, 'search']);
    Route::get('/users/recommendations', [\App\Http\Controllers\UserSearchController::class, 'recommendations']);

    Route::get('/users/{id}', function (Request $request, $id) {
        $user = \App\Models\User::findOrFail($id);
        return response()->json($user);
    });

    Route::get('/users/{id}/stats', [ProfileController::class, 'getUserStats']);

    Route::post('/profile/picture', [ProfileController::class, 'updateProfilePicture']);
    Route::match(['post', 'patch'], '/profile', [ProfileController::class, 'update']);

    Route::get('/saved-roads', [SavedRoadController::class, 'index']);
    Route::get('/saved-routes', [SavedRoadController::class, 'routes']); // User's saved routes
    Route::post('/saved-roads', [SavedRoadController::class, 'store']);
    Route::get('/saved-roads/{id}', [SavedRoadController::class, 'show']);
    Route::put('/saved-roads/{id}', [SavedRoadController::class, 'update']);
    Route::delete('/saved-roads/{id}', [SavedRoadController::class, 'destroy']);

    Route::post('/saved-roads/{id}/review', [SavedRoadController::class, 'addReview']);
    Route::post('/saved-roads/{id}/reviews', [SavedRoadController::class, 'addReview']); // Alias for Android app
    Route::post('/saved-roads/{id}/comment', [SavedRoadController::class, 'addComment']);
    Route::post('/saved-roads/{id}/comments', [SavedRoadController::class, 'addComment']); // Alias for Android app
    Route::post('/saved-roads/{id}/toggle-public', [SavedRoadController::class, 'togglePublic']);

    // Road comments routes
    Route::get('/roads/{roadId}/comments', [RoadCommentController::class, 'index']);
    Route::middleware('auth:sanctum')->post('/roads/{roadId}/comments', [RoadCommentController::class, 'store']);
    Route::middleware('auth:sanctum')->delete('/roads/{roadId}/comments/{commentId}', [RoadCommentController::class, 'destroy']);

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
    Route::middleware('auth:sanctum')->post('/collections/{id}/save', [App\Http\Controllers\CollectionController::class, 'save']);

    // Account deletion
    Route::delete('/account', [\App\Http\Controllers\AccountController::class, 'destroy']);

    Route::middleware('auth:sanctum')->post('/collections/{id}/review', [CollectionReviewController::class, 'store']);
    Route::middleware('auth:sanctum')->post('/collections/{id}/reviews', [CollectionReviewController::class, 'store']); // Alias for Android app
    Route::get('/collections/{id}/reviews', [CollectionReviewController::class, 'index']);
    Route::middleware('auth:sanctum')->delete('/collections/{id}/reviews/{reviewId}', [CollectionReviewController::class, 'destroy']);
    Route::post('/collections/{id}/reorder', [CollectionController::class, 'reorderRoads']);
    Route::post('/collections/{id}/save-public-road', [CollectionController::class, 'savePublicRoad']);

    // Follow/Unfollow routes: POST to follow, DELETE to unfollow
    Route::post('/users/{id}/follow', [FollowController::class, 'follow']);
    Route::delete('/users/{id}/follow', [FollowController::class, 'unfollow']);
    if (!app()->environment('production')) {
        // Utility route: forcibly detach all follow relationships for the authenticated user (for debugging/fixing stuck follows)
        Route::post('/users/detach-all-following', [FollowController::class, 'detachAllFollowing']);
    }
    Route::get('/following', [FollowController::class, 'following']);
    Route::get('/followers', [FollowController::class, 'followers']);
    Route::get('/users/{id}/follow-status', [FollowController::class, 'status']);
    Route::get('/users/{id}/followers', [FollowController::class, 'userFollowers']);
    Route::get('/users/{id}/following', [FollowController::class, 'userFollowing']);
    Route::get('/feed', [FollowController::class, 'feed']);

    Route::get('/following/collections', [\App\Http\Controllers\CollectionSavedController::class, 'followingCollections']);
    Route::get('/saved-collections', [\App\Http\Controllers\CollectionSavedController::class, 'savedCollections']);
    Route::delete('/saved-collections/{id}', [App\Http\Controllers\CollectionSavedController::class, 'removeSavedCollection']);
});

// Road network search (Overpass API - actual roads, not saved roads)
Route::get('/roads', [App\Http\Controllers\GetRoadsController::class, 'search']);

// Community/public saved roads
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

// Route calculation endpoints (unlimited for all tiers - feature-based limits only)
// Note: These endpoints are optionally authenticated - they work without auth for testing/debugging
// but require auth for production features like saved roads, usage tracking, etc.
Route::post('/routes/calculate', [RouteController::class, 'graphhopper']); // Fixed: use graphhopper method
Route::post('/routes/curved', [RouteController::class, 'graphhopper']); // Use graphhopper for curved routes too
Route::post('/routes/straightest', [RouteController::class, 'straightest']);
Route::post('/routes/compare-strategies', [RouteController::class, 'compareStrategies']);
Route::post('/routes/strategy1', [RouteController::class, 'strategy1']);
Route::post('/routes/strategy2', [RouteController::class, 'strategy2']);
Route::post('/routes/graphhopper/segment-curvature', [RouteController::class, 'graphhopperSegmentCurvature']);
Route::post('/routes/graphhopper', [RouteController::class, 'graphhopper']);
Route::middleware('auth:sanctum')->post('/routes/round-trip', [RouteController::class, 'roundTrip']);

if (!app()->environment('production')) {
    // Test endpoint (no limit)
    Route::get('/routes/graphhopper/test', [RouteController::class, 'graphhopperTest']);
}

// Route sharing endpoints
Route::post('/routes/share', [RouteShareController::class, 'createShare']);
Route::post('/routes/shared/{token}/share', [RouteShareController::class, 'recordShare']);
Route::get('/routes/shared/{token}/stats', [RouteShareController::class, 'getStats']);
Route::delete('/routes/shared/{token}', [RouteShareController::class, 'deleteShare']);
Route::get('/routes/shared/{token}/qr', [RouteShareController::class, 'generateQR']);

// Telemetry
Route::post('/telemetry/events', [TelemetryController::class, 'store']);

// GPX Export/Import
Route::post('/routes/export/gpx', [\App\Http\Controllers\RouteExportController::class, 'exportRoute']);
Route::post('/routes/import/gpx', [\App\Http\Controllers\RouteExportController::class, 'importGPX']);
Route::post('/routes/import/gpx-url', [\App\Http\Controllers\RouteExportController::class, 'importGPXFromUrl']);

// Offline Maps - Regions list is public
Route::get('/offline-maps/regions', [\App\Http\Controllers\OfflineMapController::class, 'getRegions']);

Route::middleware('auth:sanctum')->group(function () {
    // Offline Maps
    Route::get('/offline-maps/downloads', [\App\Http\Controllers\OfflineMapController::class, 'getUserDownloads']);
    Route::get('/offline-maps/saved', [\App\Http\Controllers\OfflineMapController::class, 'getUserSavedRegions']);
    Route::post('/offline-maps/save', [\App\Http\Controllers\OfflineMapController::class, 'saveRegion']);
    Route::post('/offline-maps/custom', [\App\Http\Controllers\OfflineMapController::class, 'saveCustomRegion']);
    Route::post('/offline-maps/route', [\App\Http\Controllers\OfflineMapController::class, 'saveRouteOfflineMap']);
    Route::post('/offline-maps/download', [\App\Http\Controllers\OfflineMapController::class, 'downloadRegion']);
    Route::post('/offline-maps/downloads', [\App\Http\Controllers\OfflineMapController::class, 'reportDownloadedRegion']);
    Route::post('/offline-maps/downloads/{id}/complete', [\App\Http\Controllers\OfflineMapController::class, 'completeDownload']);
    Route::delete('/offline-maps/downloads/{id}', [\App\Http\Controllers\OfflineMapController::class, 'deleteDownload']);
    Route::delete('/offline-maps/saved/{id}', [\App\Http\Controllers\OfflineMapController::class, 'deleteSavedRegion']);
    Route::get('/offline-maps/storage', [\App\Http\Controllers\OfflineMapController::class, 'getStorageUsage']);
    Route::get('/offline-maps/limits', [\App\Http\Controllers\OfflineMapController::class, 'checkLimits']);

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

    // GPX Export for saved roads and collections (requires auth)
    Route::get('/routes/export/saved-road/{id}', [\App\Http\Controllers\RouteExportController::class, 'exportSavedRoad']);
    Route::get('/routes/export/collection/{id}', [\App\Http\Controllers\RouteExportController::class, 'exportCollection']);

    // Subscription routes (plans are public, others require auth)
    Route::get('/subscriptions/current', [\App\Http\Controllers\SubscriptionController::class, 'getCurrent']);
        Route::post('/subscriptions/verify', [\App\Http\Controllers\SubscriptionController::class, 'verifySubscription']);
    Route::post('/subscriptions/checkout', [\App\Http\Controllers\SubscriptionController::class, 'createCheckout']);
    Route::post('/subscriptions/upgrade', [\App\Http\Controllers\SubscriptionController::class, 'upgrade']);
    Route::post('/subscriptions/cancel', [\App\Http\Controllers\SubscriptionController::class, 'cancel']);
    Route::post('/subscriptions/resume', [\App\Http\Controllers\SubscriptionController::class, 'resume']);
    Route::post('/subscriptions/payment-method', [\App\Http\Controllers\SubscriptionController::class, 'updatePaymentMethod']);
    Route::get('/subscriptions/usage', [\App\Http\Controllers\SubscriptionController::class, 'getUsage']);
    
    // Google Play billing endpoints
    Route::post('/google-play/verify', [\App\Http\Controllers\GooglePlayController::class, 'verifyPurchase']);
    Route::post('/google-play/sync', [\App\Http\Controllers\GooglePlayController::class, 'syncSubscription']);
    
    // Route usage check
    Route::get('/route-usage/check', function (Request $request) {
        $subscriptionService = app(\App\Services\SubscriptionService::class);
        return response()->json($subscriptionService->canCalculateRoute($request->user()));
    });

    // Google Play Billing
    Route::post('/billing/play/verify', [\App\Http\Controllers\PlayBillingController::class, 'verify']);
    Route::get('/billing/entitlements', [\App\Http\Controllers\PlayBillingController::class, 'getEntitlements']);
    Route::get('/billing/entitlements/{key}', [\App\Http\Controllers\PlayBillingController::class, 'hasEntitlement']);
    Route::post('/billing/restore', [\App\Http\Controllers\PlayBillingController::class, 'restore']);
    
    // Ride Recording
    Route::apiResource('rides', RideController::class);
    Route::get('/rides/unsynced', [RideController::class, 'unsynced']);
});

// Public subscription plans endpoint (no auth required)
Route::get('/subscriptions/plans', [\App\Http\Controllers\SubscriptionController::class, 'getPlans']);

// Webhooks (no auth required, use signature verification)
Route::post('/subscriptions/webhook', [\App\Http\Controllers\SubscriptionController::class, 'handleWebhook']);
Route::post('/webhooks/stripe', [\App\Http\Controllers\StripeWebhookController::class, 'handle']);