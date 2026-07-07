<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SavedRoad;
use App\Models\Review;
use App\Models\Comment;
use App\Services\ElevationService;
use App\Services\GeocodingService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SavedRoadController extends Controller
{

    protected $elevationService;
    protected $geocodingService;

    public function __construct(ElevationService $elevationService, GeocodingService $geocodingService)
    {
        $this->elevationService = $elevationService;
        $this->geocodingService = $geocodingService;
    }

    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json(['error' => 'Authentication required'], 401);
            }

            // Load saved roads AND routes (include both)
            try {
                // Check if route_type column exists
                $hasRouteTypeColumn = Schema::hasColumn('saved_roads', 'route_type');
                
                $query = \App\Models\SavedRoad::where('user_id', $user->id);
                
                // No filtering - include both roads and routes
                
                // Build select array - exclude road_coordinates from list to reduce response size
                // Coordinates are only needed when viewing individual road details
                // Check if user wants coordinates included (for backward compatibility)
                $includeCoordinates = $request->query('include_coordinates', false);
                
                $selectFields = ['id', 'road_name', 'twistiness', 'corner_count', 'length', 'user_id', 'description', 'is_public', 'average_rating', 'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation', 'country', 'region', 'created_at', 'updated_at'];
                if ($hasRouteTypeColumn) {
                    $selectFields[] = 'route_type';
                }
                if ($includeCoordinates) {
                    $selectFields[] = 'road_coordinates';
                }
                
                $savedRoads = $query->select($selectFields)
                    ->orderBy('created_at', 'desc')
                    ->get();
                
                // Try to load relationships separately to avoid errors
                // Skip user relationship if it causes issues
                try {
                    $savedRoads->load('tags:id,name,slug');
                } catch (\Exception $relError) {
                    Log::warning('Could not load tags for saved roads', [
                        'error' => $relError->getMessage()
                    ]);
                    // Continue without tags - not critical
                }
                
                // Add user info manually to avoid relationship issues
                foreach ($savedRoads as $road) {
                    if (!$road->user) {
                        $road->user = [
                            'id' => $user->id,
                            'name' => $user->name,
                            'username' => $user->username,
                            'profile_picture' => $user->profile_picture
                        ];
                    }
                }

                Log::info('User saved roads fetched', [
                    'user_id' => $user->id,
                    'count' => $savedRoads->count()
                ]);

                return response()->json($savedRoads);
            } catch (\Exception $e) {
                Log::error('Error fetching saved roads', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json(['error' => 'Failed to load saved roads', 'message' => $e->getMessage()], 500);
            }
        } catch (\Exception $e) {
            Log::error('Failed to fetch user saved roads', [
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to fetch saved roads',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's saved routes (routes, not roads)
     */
    public function routes(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json(['error' => 'Authentication required'], 401);
            }

            // Load saved routes (route_type = 'route')
            // Check if route_type column exists
            $hasRouteTypeColumn = Schema::hasColumn('saved_roads', 'route_type');
            
            $query = \App\Models\SavedRoad::where('user_id', $user->id);
            
            // Only filter by route_type if column exists, otherwise return empty (no routes saved yet)
            if ($hasRouteTypeColumn) {
                $query->where('route_type', 'route');
            } else {
                // Column doesn't exist - return empty array
                return response()->json([]);
            }
            
            // Build select array - exclude road_coordinates from list to reduce response size
            $includeCoordinates = $request->query('include_coordinates', false);
            
            $selectFields = ['id', 'road_name', 'twistiness', 'corner_count', 'length', 'user_id', 'description', 'is_public', 'average_rating', 'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation', 'country', 'region', 'created_at', 'updated_at'];
            if ($hasRouteTypeColumn) {
                $selectFields[] = 'route_type';
            }
            if ($includeCoordinates) {
                $selectFields[] = 'road_coordinates';
            }
            
            $savedRoutes = $query->select($selectFields)
                ->orderBy('created_at', 'desc')
                ->get();
            
            Log::info('User saved routes fetched', [
                'user_id' => $user->id,
                'count' => $savedRoutes->count()
            ]);

            return response()->json($savedRoutes);
        } catch (\Exception $e) {
            Log::error('Failed to fetch user saved routes', [
                'user_id' => $request->user()->id ?? null,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'error' => 'Failed to fetch saved routes',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function publicIndex(Request $request)
    {
        try {
            // Exclude road_coordinates from list to reduce response size
            // Coordinates are only needed when viewing individual road details
            $includeCoordinates = $request->query('include_coordinates', false);
            
            $selectFields = ['id', 'road_name', 'twistiness', 'corner_count', 'length', 'user_id', 'description', 'is_public', 'average_rating', 'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation', 'country', 'region', 'created_at'];
            if ($includeCoordinates) {
                $selectFields[] = 'road_coordinates';
            }
            
            // Simplified query to avoid relationship issues
            $roads = SavedRoad::where('is_public', true)
                ->select($selectFields)
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('Public saved roads fetched', [
                'count' => $roads->count(),
                'road_ids' => $roads->pluck('id')->toArray(),
                'road_names' => $roads->pluck('road_name')->toArray()
            ]);

            return response()->json($roads);
        } catch (\Exception $e) {
            Log::error('Failed to fetch public saved roads', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to fetch public roads',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        // Support both web app format (coordinates) and Android app format (geometry)
        $data = $request->validate([
            'road_name' => 'required|string|max:255',
            'route_type' => 'nullable|string|in:road,route,ride', // 'road', 'route', or 'ride'
            // Web app format
            'coordinates' => 'nullable|array',
            'twistiness' => 'nullable|numeric',
            'corner_count' => 'nullable|integer',
            'length' => 'nullable|numeric',
            // Android app format
            'geometry' => 'nullable|array',
            'distance' => 'nullable|numeric',
            'duration' => 'nullable|integer',
            'start_location' => 'nullable|string|max:255',
            'end_location' => 'nullable|string|max:255',
            // Common fields
            'elevation_gain' => 'nullable|numeric',
            'elevation_loss' => 'nullable|numeric',
            'max_elevation' => 'nullable|numeric',
            'min_elevation' => 'nullable|numeric',
            'description' => 'nullable|string|max:1000',
            'is_public' => 'nullable|boolean',
            'tags' => 'nullable', // Can be string (web) or array (Android)
        ]);

        // Normalize data from Android app format to database format
        if (isset($data['geometry']) && !isset($data['coordinates'])) {
            $data['coordinates'] = $data['geometry'];
            unset($data['geometry']);
        }

        // Ensure coordinates field exists
        if (!isset($data['coordinates'])) {
            return response()->json(['error' => 'Either coordinates or geometry field is required'], 422);
        }

        $data['road_coordinates'] = json_encode($data['coordinates']);
        unset($data['coordinates']);

        // Convert Android app distance (km) to web app length (meters)
        if (isset($data['distance']) && !isset($data['length'])) {
            $data['length'] = $data['distance'] * 1000; // Convert km to meters
            unset($data['distance']);
        }

        // Calculate length from coordinates if not provided
        if (!isset($data['length']) || empty($data['length'])) {
            try {
                $coordinates = json_decode($data['road_coordinates'], true);
                if (is_array($coordinates) && count($coordinates) > 1) {
                    $totalLength = 0;
                    for ($i = 0; $i < count($coordinates) - 1; $i++) {
                        $lat1 = $coordinates[$i][0];
                        $lon1 = $coordinates[$i][1];
                        $lat2 = $coordinates[$i + 1][0];
                        $lon2 = $coordinates[$i + 1][1];
                        
                        // Haversine formula to calculate distance in meters
                        $earthRadius = 6371000; // meters
                        $dLat = deg2rad($lat2 - $lat1);
                        $dLon = deg2rad($lon2 - $lon1);
                        $a = sin($dLat / 2) * sin($dLat / 2) +
                             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
                             sin($dLon / 2) * sin($dLon / 2);
                        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                        $totalLength += $earthRadius * $c;
                    }
                    $data['length'] = $totalLength;
                    Log::info('Calculated length from coordinates', [
                        'length_meters' => $totalLength,
                        'length_km' => round($totalLength / 1000, 2),
                        'coordinate_count' => count($coordinates)
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to calculate length from coordinates', ['error' => $e->getMessage()]);
            }
        }

        // Get authenticated user first (needed for public/private check)
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        // Check user subscription tier
        $subscription = \App\Models\Subscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->where(function($query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->latest('created_at')
            ->first();
        
        $tier = $subscription?->plan ?? 'free';
        $hasPremium = in_array($tier, ['premium', 'pro']);
        
        // Default: Premium users = private, Free users = public
        // User can override by explicitly setting is_public
        if (!isset($data['is_public'])) {
            // No explicit setting - use default based on tier
            $data['is_public'] = $hasPremium ? false : true;
        } else {
            // User explicitly set is_public
            $requestedPublic = filter_var($data['is_public'], FILTER_VALIDATE_BOOLEAN);
            
            if ($requestedPublic === false) {
                // User wants private - check if they have premium
                if (!$hasPremium) {
                    Log::info('User attempted to make road private but lacks premium subscription', [
                        'user_id' => $user->id,
                        'tier' => $tier
                    ]);
                    $data['is_public'] = true; // Force public for free users
                } else {
                    $data['is_public'] = false; // Allow private for premium users
                }
            } else {
                // User wants public - always allowed
                $data['is_public'] = true;
            }
        }

        try {
            $coordinates = json_decode($data['road_coordinates'], true);
            $elevations = $this->elevationService->getElevations($coordinates);

            if ($elevations) {
                $elevationStats = $this->elevationService->calculateElevationStats($elevations);
                $data = array_merge($data, $elevationStats);
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to get elevation data for saved road', ['error' => $e->getMessage()]);
        }

        try {
            $coordinates = json_decode($data['road_coordinates'], true);
            $locationInfo = $this->geocodingService->determineRoadLocation($coordinates);

            if ($locationInfo) {
                $data['country'] = $locationInfo['country'];
                $data['region'] = $locationInfo['region'];
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to get location info for saved road', ['error' => $e->getMessage()]);
        }
        
        // Ensure user_id is set explicitly
        $data['user_id'] = $user->id;
        
        // Default route_type to 'road' if not provided (for backward compatibility)
        // Only set default if route_type is truly missing or null, not if it's 'route'
        if (!isset($data['route_type']) || $data['route_type'] === null || $data['route_type'] === '') {
            $data['route_type'] = 'road';
        }
        
        Log::info('Saving road/route', [
            'user_id' => $user->id,
            'road_name' => $data['road_name'] ?? 'N/A',
            'route_type' => $data['route_type'] ?? 'N/A',
            'has_coordinates' => isset($data['road_coordinates'])
        ]);
        
        // Create the saved road
        $road = \App\Models\SavedRoad::create($data);
        
        Log::info('Road/route saved successfully', [
            'road_id' => $road->id,
            'route_type' => $road->route_type ?? 'N/A'
        ]);

        // Handle tags - support both string (web) and array (Android)
        $tagsInput = $request->input('tags');
        if (!empty($tagsInput)) {
            if (is_string($tagsInput)) {
                // Web app format: comma-separated string
                $tagIds = explode(',', $tagsInput);
            } elseif (is_array($tagsInput)) {
                // Android app format: array of IDs
                $tagIds = $tagsInput;
            } else {
                $tagIds = [];
            }

            if (!empty($tagIds)) {
                $road->tags()->sync($tagIds);
            }
        }

        // Load relationships if they exist
        try {
            $road->load('tags');
        } catch (\Exception $e) {
            Log::warning('Could not load tags for saved road', ['error' => $e->getMessage()]);
        }
        
        // Add user info manually
        $road->user = [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'profile_picture' => $user->profile_picture
        ];

        return response()->json($road, 201);
    }

    public function destroy($id)
    {
        try {
            $road = SavedRoad::where('id', $id)
                ->where('user_id', auth()->id())
                ->firstOrFail();

            if ($road->photos()->count() > 0) {
                foreach ($road->photos as $photo) {
                    try {
                        if (\Storage::disk('public')->exists($photo->photo_path)) {
                            \Storage::disk('public')->delete($photo->photo_path);
                        }
                        $photo->delete();
                    } catch (\Exception $photoEx) {
                    }
                }
            }

            if ($road->reviews()->count() > 0) {
                foreach ($road->reviews as $review) {
                    try {
                        if (method_exists($review, 'photos') && $review->photos()->count() > 0) {
                            foreach ($review->photos as $photo) {
                                try {
                                    if (\Storage::disk('public')->exists($photo->photo_path)) {
                                        \Storage::disk('public')->delete($photo->photo_path);
                                    }
                                    $photo->delete();
                                } catch (\Exception $photoEx) {
                                }
                            }
                        }
                        $review->delete();
                    } catch (\Exception $reviewEx) {
                    }
                }
            }

            if ($road->comments()->count() > 0) {
                $road->comments()->delete();
            }

            if (method_exists($road, 'tags') && $road->tags()->count() > 0) {
                $road->tags()->detach();
            }

            if (method_exists($road, 'collections') && $road->collections()->count() > 0) {
                $road->collections()->detach();
            }

            $road->delete();

            return response()->json(['message' => 'Road deleted successfully.'], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Road not found or you do not have permission to delete it.'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete road: ' . $e->getMessage()], 500);
        }
    }

    public function publicRoads(Request $request)
    {
        try {
            $searchQuery = $request->input('query');
            $country = $request->input('country');
            $region = $request->input('region');
            $minRating = $request->input('min_rating');
            $tags = $request->input('tags');
            $debug = $request->input('debug', false);

            $lat = $request->input('lat');
            $lon = $request->input('lon');
            $radius = $request->input('radius');

            $query = SavedRoad::with(['user', 'reviews', 'tags'])
                ->where('is_public', true);

            if ($lat && $lon && $radius) {
                try {
                    $latRadius = $radius / 111;
                    $lonRadius = $radius / (111 * cos(deg2rad($lat)));

                    $minLat = $lat - $latRadius;
                    $maxLat = $lat + $latRadius;
                    $minLon = $lon - $lonRadius;
                    $maxLon = $lon + $lonRadius;

                    $databaseDriver = DB::connection()->getDriverName();

                    if ($databaseDriver === 'pgsql') {

                        $query->whereRaw("
                            EXISTS (
                                SELECT 1 FROM jsonb_array_elements(road_coordinates::jsonb) as coords
                                WHERE
                                    (coords->0)::float BETWEEN ? AND ?
                                    AND (coords->1)::float BETWEEN ? AND ?
                            )
                        ", [$minLat, $maxLat, $minLon, $maxLon]);
                    } 
                } catch (\Exception $e) {
                }
            }

            if ($country) {
                $query->where(function($q) use ($country) {
                    $q->whereRaw('LOWER(country) = ?', [strtolower($country)])
                      ->orWhereRaw('LOWER(country) LIKE ?', ['%' . strtolower($country) . '%']);
                });
            }

            if ($region) {
                $query->where(function($q) use ($region) {
                    $q->whereRaw('LOWER(region) = ?', [strtolower($region)])
                      ->orWhereRaw('LOWER(region) LIKE ?', ['%' . strtolower($region) . '%']);
                });
            }

            if ($minRating) {
                $query->where('average_rating', '>=', $minRating)
                      ->whereNotNull('average_rating')
                      ->where('average_rating', '>', 0);
            }

            if ($tags) {
                $tagArray = is_array($tags) ? $tags : explode(',', $tags);

                $query->whereHas('tags', function ($q) use ($tagArray) {
                    $q->whereIn('tags.id', $tagArray);
                }, '=', count($tagArray)); 
            }

            if ($searchQuery) {
                $normalizedQuery = strtolower(trim($searchQuery));
                if ($normalizedQuery !== '') {
                    $query->whereRaw('LOWER(road_name) LIKE ?', ['%' . $normalizedQuery . '%']);
                }
            }

            // Exclude road_coordinates from search results to reduce response size
            // Coordinates are only needed when viewing individual road details
            $includeCoordinates = $request->query('include_coordinates', false);
            $selectFields = ['id', 'road_name', 'twistiness', 'corner_count', 'length', 'user_id', 'description', 'is_public', 'average_rating', 'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation', 'country', 'region', 'created_at', 'updated_at'];
            if ($includeCoordinates) {
                $selectFields[] = 'road_coordinates';
            }
            // Check if route_type column exists
            $hasRouteTypeColumn = Schema::hasColumn('saved_roads', 'route_type');
            if ($hasRouteTypeColumn) {
                $selectFields[] = 'route_type';
            }
            
            $roads = $query->select($selectFields)->get();

            $countries = SavedRoad::where('is_public', true)
                ->distinct()
                ->pluck('country')
                ->filter()
                ->values();
            $regions = SavedRoad::where('is_public', true)
                ->when($country, function ($query) use ($country) {
                    return $query->where('country', $country);
                })
                ->distinct()
                ->pluck('region')
                ->filter()
                ->values();



            return response()->json([
                'roads' => $roads,
                'countries' => $countries,
                'regions' => $regions,
                'total_count' => $roads->count(),

            ]);
        } catch (\Exception $e) {

            return response()->json([
                'error' => 'Failed to fetch public roads',
                'message' => 'An error occurred while searching for roads. Please try again with different search criteria.',

            ], 500);
        }
    }



    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; // Earth's radius in kilometers

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat/2) * sin($dLat/2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon/2) * sin($dLon/2);

        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        return $earthRadius * $c;
    }

    public function addReview(Request $request, $id)
    {
        try {
            $road = SavedRoad::findOrFail($id);

            $validatedData = $request->validate([
                'rating' => 'required|integer|between:1,5',
                'comment' => 'nullable|string|max:500',
                'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120', 
                'photos.*' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120', 
                'caption' => 'nullable|string|max:255', 
                'captions.*' => 'nullable|string|max:255' 
            ]);

            $review = Review::updateOrCreate(
                [
                    'user_id' => Auth::id(),
                    'saved_road_id' => $road->id
                ],
                [
                    'rating' => $validatedData['rating'],
                    'comment' => $validatedData['comment'] ?? null
                ]
            );

            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('review-photos', 'public');

                $photo = new \App\Models\ReviewPhoto([
                    'review_id' => $review->id,
                    'user_id' => Auth::id(),
                    'photo_path' => $path,
                    'caption' => $validatedData['caption'] ?? null,
                ]);

                $photo->save();
            }

            if ($request->hasFile('photos')) {
                $photos = $request->file('photos');
                $captions = $request->input('captions', []);

                foreach ($photos as $index => $photoFile) {
                    $path = $photoFile->store('review-photos', 'public');
                    $caption = isset($captions[$index]) ? $captions[$index] : null;

                    $photo = new \App\Models\ReviewPhoto([
                        'review_id' => $review->id,
                        'photo_path' => $path,
                        'caption' => $caption,
                    ]);

                    $photo->save();
                }
            }

            $avgRating = $road->reviews()->avg('rating');
            $road->update(['average_rating' => $avgRating]);

            $road = $road->fresh([
                'user:id,name,username',
                'reviews.user:id,name,username',
                'reviews.photos',
                'comments.user:id,name,username',
                'photos'
            ]);

            return response()->json([
                'message' => 'Review added successfully',
                'road' => $road
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Road not found for review', [
                'road_id' => $id,
                'user_id' => Auth::id()
            ]);
            return response()->json(['error' => 'Road not found'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Review validation failed', [
                'road_id' => $id,
                'user_id' => Auth::id(),
                'errors' => $e->errors()
            ]);
            return response()->json(['error' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Failed to add review', [
                'road_id' => $id,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to add review',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function addComment(Request $request, $id)
    {
        $road = SavedRoad::findOrFail($id);

        $request->validate([
            'comment' => 'required|string|max:500'
        ]);

        Comment::create([
            'user_id' => Auth::id(),
            'saved_road_id' => $road->id,
            'comment' => $request->comment
        ]);

        return response()->json(['message' => 'Comment added successfully']);
    }

    public function togglePublic($id)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['error' => 'Authentication required'], 401);
            }

            $road = SavedRoad::where('id', $id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            $newPublicStatus = !$road->is_public;
            
            // If trying to make private, check premium subscription
            if ($newPublicStatus === false) {
                $subscription = \App\Models\Subscription::where('user_id', $user->id)
                    ->where('status', 'active')
                    ->where(function($query) {
                        $query->whereNull('ends_at')
                            ->orWhere('ends_at', '>', now());
                    })
                    ->latest('created_at')
                    ->first();
                
                $tier = $subscription?->plan ?? 'free';
                $hasAccess = in_array($tier, ['premium', 'pro']);
                
                if (!$hasAccess) {
                    Log::info('User attempted to make road private but lacks premium subscription', [
                        'user_id' => $user->id,
                        'tier' => $tier,
                        'road_id' => $id
                    ]);
                    return response()->json([
                        'error' => 'Premium subscription required',
                        'message' => 'Making roads private requires Premium or Pro subscription. Please upgrade to access this feature.',
                        'tier' => $tier
                    ], 403);
                }
            }
            
            $road->is_public = $newPublicStatus;
            $road->save();

            $updatedRoad = SavedRoad::find($id);

            return response()->json([
                'message' => 'Road visibility updated successfully',
                'is_public' => $updatedRoad->is_public,
                'road_name' => $updatedRoad->road_name,
                'country' => $updatedRoad->country,
                'region' => $updatedRoad->region
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update road visibility', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to update road visibility',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            Log::info('Fetching road details', [
                'road_id' => $id,
                'user_id' => $user?->id,
                'authenticated' => $user !== null
            ]);
            
            // First, try to find the road without relationships to check access
            $roadQuery = SavedRoad::where('id', $id)
                ->where(function($query) use ($user) {
                    // User owns the road OR road is public
                    if ($user) {
                        $query->where('user_id', $user->id)
                              ->orWhere('is_public', true);
                    } else {
                        // If not authenticated, only public roads
                        $query->where('is_public', true);
                    }
                });
            
            $road = $roadQuery->first();

            if (!$road) {
                Log::warning('Road not found or not accessible', [
                    'road_id' => $id,
                    'user_id' => $user?->id
                ]);
                return response()->json([
                    'error' => 'Road not found or is private',
                    'message' => 'The road may have been deleted or is not publicly accessible.'
                ], 404);
            }

            // Now load relationships with error handling
            try {
                $road->load([
                    'user:id,name,username,profile_picture',
                    'reviews' => function($query) {
                        $query->with(['user:id,name,username,profile_picture', 'photos']);
                    },
                    'comments' => function($query) {
                        $query->with(['user:id,name,username,profile_picture']);
                    },
                    'photos',
                    'tags'
                ]);
            } catch (\Exception $relError) {
                Log::warning('Error loading some relationships, continuing with partial data', [
                    'road_id' => $id,
                    'error' => $relError->getMessage(),
                    'trace' => $relError->getTraceAsString()
                ]);
                // Try to load relationships individually
                try {
                    $road->load('user:id,name,username');
                } catch (\Exception $e) {
                    Log::warning('Could not load user relationship', ['error' => $e->getMessage()]);
                }
                try {
                    $road->load('reviews');
                } catch (\Exception $e) {
                    Log::warning('Could not load reviews relationship', ['error' => $e->getMessage()]);
                }
                try {
                    $road->load('comments');
                } catch (\Exception $e) {
                    Log::warning('Could not load comments relationship', ['error' => $e->getMessage()]);
                }
            }

            // Load average rating
            try {
                $road->loadAvg('reviews', 'rating');
                if ($road->reviews_avg_rating !== null) {
                    $road->average_rating = (float) $road->reviews_avg_rating;
                }
            } catch (\Exception $e) {
                Log::warning('Could not load average rating', ['error' => $e->getMessage()]);
            }

            Log::info('Successfully fetched road details', [
                'road_id' => $id,
                'road_name' => $road->road_name,
                'has_user' => $road->user !== null,
                'reviews_count' => $road->reviews?->count() ?? 0,
                'comments_count' => $road->comments?->count() ?? 0
            ]);

            return response()->json($road);
        } catch (\Exception $e) {
            Log::error('Failed to fetch road details', [
                'road_id' => $id,
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch road details',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function showPublic($id)
    {
        try {
            Log::info('Fetching public road details', ['road_id' => $id]);
            
            // First check if road exists and is public
            $road = SavedRoad::where('is_public', true)
                ->where('id', $id)
                ->first();

            if (!$road) {
                Log::warning('Public road not found', ['road_id' => $id]);
                return response()->json(['error' => 'Road not found or is not public'], 404);
            }

            // Now load relationships with error handling
            try {
                $road->load([
                    'user:id,name,username,profile_picture',
                    'reviews' => function($query) {
                        $query->with(['user:id,name,username,profile_picture', 'photos']);
                    },
                    'comments' => function($query) {
                        $query->with(['user:id,name,username,profile_picture']);
                    },
                    'photos',
                    'tags'
                ]);
            } catch (\Exception $relError) {
                Log::warning('Error loading some relationships for public road, continuing with partial data', [
                    'road_id' => $id,
                    'error' => $relError->getMessage(),
                    'trace' => $relError->getTraceAsString()
                ]);
                // Try to load relationships individually
                try {
                    $road->load('user:id,name,username');
                } catch (\Exception $e) {
                    Log::warning('Could not load user relationship', ['error' => $e->getMessage()]);
                }
                try {
                    $road->load('reviews');
                } catch (\Exception $e) {
                    Log::warning('Could not load reviews relationship', ['error' => $e->getMessage()]);
                }
                try {
                    $road->load('comments');
                } catch (\Exception $e) {
                    Log::warning('Could not load comments relationship', ['error' => $e->getMessage()]);
                }
            }

            // Load average rating
            try {
                $road->loadAvg('reviews', 'rating');
                if ($road->reviews_avg_rating !== null) {
                    $road->average_rating = (float) $road->reviews_avg_rating;
                }
            } catch (\Exception $e) {
                Log::warning('Could not load average rating', ['error' => $e->getMessage()]);
            }

            Log::info('Successfully fetched public road details', [
                'road_id' => $id,
                'road_name' => $road->road_name,
                'has_user' => $road->user !== null,
                'reviews_count' => $road->reviews?->count() ?? 0,
                'comments_count' => $road->comments?->count() ?? 0
            ]);

            return response()->json($road);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Public road not found (ModelNotFoundException)', ['road_id' => $id]);
            return response()->json(['error' => 'Road not found or is not public'], 404);
        } catch (\Exception $e) {
            Log::error('Failed to fetch public road details', [
                'road_id' => $id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to fetch road details',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $road = SavedRoad::where('id', $id)
                ->where('user_id', auth()->id())
                ->firstOrFail();

            $validatedData = $request->validate([
                'road_name' => 'nullable|string|max:255',
                'description' => 'nullable|string|max:1000',
                'road_coordinates' => 'nullable|string',
                'twistiness' => 'nullable|numeric',
                'corner_count' => 'nullable|integer',
                'length' => 'nullable|numeric',
                'is_public' => 'nullable|boolean',
                'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'tags' => 'nullable|string'
            ]);

            $updateData = array_filter($validatedData, function ($value, $key) {
                return $value !== null && $key !== 'photo' && $key !== 'tags';
            }, ARRAY_FILTER_USE_BOTH);

            if (isset($updateData['is_public'])) {
                $newPublicStatus = filter_var($updateData['is_public'], FILTER_VALIDATE_BOOLEAN);
                
                // If trying to make private, check premium subscription
                if ($newPublicStatus === false) {
                    $user = $request->user();
                    if ($user) {
                        $subscription = \App\Models\Subscription::where('user_id', $user->id)
                            ->where('status', 'active')
                            ->where(function($query) {
                                $query->whereNull('ends_at')
                                    ->orWhere('ends_at', '>', now());
                            })
                            ->latest('created_at')
                            ->first();
                        
                        $tier = $subscription?->plan ?? 'free';
                        $hasAccess = in_array($tier, ['premium', 'pro']);
                        
                        if (!$hasAccess) {
                            Log::info('User attempted to make road private but lacks premium subscription', [
                                'user_id' => $user->id,
                                'tier' => $tier,
                                'road_id' => $id
                            ]);
                            return response()->json([
                                'error' => 'Premium subscription required',
                                'message' => 'Making roads private requires Premium or Pro subscription. Please upgrade to access this feature.',
                                'tier' => $tier
                            ], 403);
                        }
                    }
                }
                
                $updateData['is_public'] = $newPublicStatus;
            }

            $road->update($updateData);

            if ($request->has('tags')) {
                try {
                    $tagIds = json_decode($request->tags, true);

                    if (is_array($tagIds)) {
                        $road->tags()->sync($tagIds);
                    }
                } catch (\Exception $e) {
                }
            }

            if ($request->hasFile('photo')) {
                try {
                    $path = $request->file('photo')->store('road-photos', 'public');

                    $photo = new \App\Models\RoadPhoto([
                        'saved_road_id' => $road->id,
                        'user_id' => auth()->id(),
                        'photo_path' => $path,
                        'caption' => $request->input('caption')
                    ]);

                    $photo->save();
                } catch (\Exception $e) {
                }
            }

            $road = $road->fresh([
                'user:id,name,profile_picture',
                'reviews.user:id,name,profile_picture',
                'reviews.photos',
                'comments.user:id,name,profile_picture',
                'photos',
                'tags'
            ]);

            return response()->json([
                'message' => 'Road updated successfully.',
                'road' => $road
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Road not found or you do not have permission to edit it.'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update road.'], 500);
        }
    }
}