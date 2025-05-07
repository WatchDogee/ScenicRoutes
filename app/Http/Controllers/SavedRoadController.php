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

class SavedRoadController extends Controller
{
    /**
     * The elevation service instance.
     */
    protected $elevationService;

    /**
     * The geocoding service instance.
     */
    protected $geocodingService;

    /**
     * Create a new controller instance.
     *
     * @param  \App\Services\ElevationService  $elevationService
     * @param  \App\Services\GeocodingService  $geocodingService
     * @return void
     */
    public function __construct(ElevationService $elevationService, GeocodingService $geocodingService)
    {
        $this->elevationService = $elevationService;
        $this->geocodingService = $geocodingService;
    }

    public function index()
    {
        try {
            // Log the authenticated user
            \Log::info('Fetching saved roads for user', [
                'user_id' => auth()->id(),
                'user_name' => auth()->user()->name
            ]);

            // Get all roads (both public and private) for the authenticated user
            // Include relationships needed for display
            $roads = auth()->user()->savedRoads()
                ->with([
                    'reviews.user:id,name,profile_picture',
                    'reviews.photos',
                    'photos',
                    'tags'
                ])
                ->withCount('reviews')
                ->orderBy('created_at', 'desc')
                ->get();

            // Log the number of roads found
            \Log::info('Saved roads fetched successfully', [
                'count' => $roads->count(),
                'road_ids' => $roads->pluck('id')->toArray()
            ]);

            return response()->json($roads);
        } catch (\Exception $e) {
            \Log::error('Error fetching saved roads: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to fetch saved roads',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'road_name' => 'required|string|max:255',
            'coordinates' => 'required|array',
            'twistiness' => 'nullable|numeric',
            'corner_count' => 'nullable|integer',
            'length' => 'nullable|numeric',
        ]);

        // Serialize coordinates to JSON
        $data['road_coordinates'] = json_encode($data['coordinates']);
        unset($data['coordinates']); // Remove the original 'coordinates' key

        // Explicitly set is_public to false for new roads
        $data['is_public'] = false;

        // Get elevation data and calculate statistics
        try {
            $coordinates = json_decode($data['road_coordinates'], true);
            Log::info('Fetching elevation data for road', [
                'road_name' => $data['road_name'],
                'coordinates_count' => count($coordinates),
                'sample_coordinates' => array_slice($coordinates, 0, 3)
            ]);

            $elevations = $this->elevationService->getElevations($coordinates);

            if ($elevations) {
                Log::info('Elevation data received', [
                    'elevations_count' => count($elevations),
                    'sample_elevations' => array_slice($elevations, 0, 5)
                ]);

                $elevationStats = $this->elevationService->calculateElevationStats($elevations);
                Log::info('Elevation statistics calculated', [
                    'stats' => $elevationStats
                ]);

                $data = array_merge($data, $elevationStats);
            } else {
                Log::warning('No elevation data received for road', [
                    'road_name' => $data['road_name']
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error getting elevation data: ' . $e->getMessage(), [
                'road_name' => $data['road_name'],
                'trace' => $e->getTraceAsString()
            ]);
            // Continue without elevation data if there's an error
        }

        // Determine country and region for the road
        try {
            $coordinates = json_decode($data['road_coordinates'], true);
            Log::info('Determining location for road', [
                'road_name' => $data['road_name'],
                'coordinates_count' => count($coordinates)
            ]);

            $locationInfo = $this->geocodingService->determineRoadLocation($coordinates);

            if ($locationInfo) {
                Log::info('Location data received', [
                    'location_info' => $locationInfo
                ]);

                $data['country'] = $locationInfo['country'];
                $data['region'] = $locationInfo['region'];
            } else {
                Log::warning('No location data received for road', [
                    'road_name' => $data['road_name']
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error determining road location: ' . $e->getMessage(), [
                'road_name' => $data['road_name'],
                'trace' => $e->getTraceAsString()
            ]);
            // Continue without location data if there's an error
        }

        $road = auth()->user()->savedRoads()->create($data);
        return response()->json($road, 201);
    }

    public function destroy($id)
    {
        try {
            $road = SavedRoad::where('id', $id)
                ->where('user_id', auth()->id())
                ->firstOrFail();

            $road->reviews()->delete();
            $road->comments()->delete();
            $road->delete();

            return response()->json(['message' => 'Road deleted successfully.'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete road.'], 500);
        }
    }

    public function publicRoads(Request $request)
    {
        try {
            $country = $request->input('country');
            $region = $request->input('region');
            $minRating = $request->input('min_rating');
            $tags = $request->input('tags');
            $debug = $request->input('debug', false);

            \Log::info('Public roads search parameters', [
                'country' => $country,
                'region' => $region,
                'min_rating' => $minRating,
                'tags' => $tags,
                'debug' => $debug
            ]);

            $query = SavedRoad::with(['user', 'reviews', 'tags'])
                ->where('is_public', true);

            if ($country) {
                $query->where('country', $country);
            }
            if ($region) {
                $query->where('region', $region);
            }
            if ($minRating) {
                $query->where('average_rating', '>=', $minRating)
                      ->whereNotNull('average_rating')
                      ->where('average_rating', '>', 0);
            }
            if ($tags) {
                $tagArray = is_array($tags) ? $tags : explode(',', $tags);
                $query->whereHas('tags', function ($q) use ($tagArray) {
                    $q->whereIn('id', $tagArray)
                      ->orWhereIn('name', $tagArray);
                });
            }

            $roads = $query->get();

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

            $debugInfo = [];
            if ($debug) {
                $debugInfo = [
                    'query' => [
                        'country' => $country,
                        'region' => $region,
                        'min_rating' => $minRating,
                        'tags' => $tags
                    ],
                    'total_count' => $roads->count(),
                    'roads' => $roads->map(function ($road) {
                        return [
                            'id' => $road->id,
                            'name' => $road->road_name,
                            'country' => $road->country,
                            'region' => $road->region,
                            'average_rating' => $road->average_rating,
                            'reviews_count' => $road->reviews->count(),
                            'tags' => $road->tags->pluck('name')
                        ];
                    })
                ];
            }

            return response()->json([
                'roads' => $roads,
                'countries' => $countries,
                'regions' => $regions,
                'total_count' => $roads->count(),
                'debug' => $debugInfo
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in publicRoads: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'An error occurred while fetching public roads'], 500);
        }
    }

    private function createTestRoad($country = 'Latvia', $region = 'Riga')
    {
        try {
            $user = \App\Models\User::first();
            if (!$user) {
                \Log::error('No user found for creating test road');
                return;
            }

            \Log::info('Creating test road', [
                'country' => $country,
                'region' => $region,
                'user_id' => $user->id
            ]);

            // Create the test road
            $testRoad = new SavedRoad([
                'user_id' => $user->id,
                'road_name' => "Test Road in " . ($region ? "$region, " : "") . ($country ?: "Unknown Country"),
                'road_coordinates' => json_encode([
                    [56.9496, 24.1052],
                    [56.9506, 24.1152],
                    [56.9516, 24.1252]
                ]),
                'twistiness' => 0.005,
                'corner_count' => 5,
                'length' => 5000,
                'is_public' => true,
                'description' => "This is a test road created via API request for search functionality",
                'country' => $country ?: 'Latvia',
                'region' => $region ?: 'Riga',
                'elevation_gain' => 25,
                'elevation_loss' => 9,
                'max_elevation' => 135,
                'min_elevation' => 110
            ]);

            $testRoad->save();
            \Log::info('Test road saved', ['road_id' => $testRoad->id]);

            // Create multiple test reviews with different ratings
            $ratings = [4, 5, 4]; // Create 3 reviews with ratings 4, 5, and 4
            foreach ($ratings as $rating) {
                $review = new Review([
                    'user_id' => $user->id,
                    'saved_road_id' => $testRoad->id,
                    'rating' => $rating,
                    'comment' => "Test review with rating $rating"
                ]);
                $review->save();
                \Log::info('Test review created', [
                    'review_id' => $review->id,
                    'rating' => $review->rating
                ]);
            }

            // Create and attach multiple tags
            $tags = ['scenic', 'twisty', 'mountain'];
            foreach ($tags as $tagName) {
                $tag = \App\Models\Tag::firstOrCreate(['name' => $tagName]);
                $testRoad->tags()->attach($tag->id);
                \Log::info('Test tag attached', [
                    'tag_id' => $tag->id,
                    'tag_name' => $tag->name
                ]);
            }

            // Verify the data was created correctly
            $road = SavedRoad::with(['reviews', 'tags'])
                ->where('id', $testRoad->id)
                ->first();

            \Log::info('Test road verification', [
                'road_id' => $road->id,
                'country' => $road->country,
                'region' => $road->region,
                'reviews_count' => $road->reviews->count(),
                'average_rating' => $road->reviews->avg('rating'),
                'tags_count' => $road->tags->count(),
                'tag_names' => $road->tags->pluck('name')
            ]);

        } catch (\Exception $e) {
            \Log::error('Error creating test road: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
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
                'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120', // Allow photo upload with review
                'caption' => 'nullable|string|max:255' // Caption for the photo
            ]);

            // Create or update the review
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

            // Handle photo upload if provided
            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('review-photos', 'public');

                $photo = new \App\Models\ReviewPhoto([
                    'review_id' => $review->id,
                    'photo_path' => $path,
                    'caption' => $validatedData['caption'] ?? null,
                ]);

                $photo->save();
            }

            // Update average rating
            $avgRating = $road->reviews()->avg('rating');
            $road->update(['average_rating' => $avgRating]);

            // Refresh the road data with updated relationships
            $road = $road->fresh([
                'user:id,name,profile_picture',
                'reviews.user:id,name,profile_picture',
                'reviews.photos',
                'comments.user:id,name,profile_picture',
                'photos'
            ]);

            return response()->json([
                'message' => 'Review added successfully',
                'road' => $road
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Road not found'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => $e->errors()], 422);
        } catch (\Exception $e) {
            \Log::error('Error adding review: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json(['error' => 'Failed to add review'], 500);
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
            // Log the request
            \Log::info('Toggling road public status', [
                'road_id' => $id,
                'user_id' => Auth::id()
            ]);

            $road = SavedRoad::where('id', $id)
                ->where('user_id', Auth::id())
                ->firstOrFail();

            // Log the current state
            \Log::info('Road found for toggle', [
                'road_id' => $road->id,
                'road_name' => $road->road_name,
                'current_is_public' => $road->is_public,
                'will_be_set_to' => !$road->is_public
            ]);

            // Toggle the is_public flag
            $newPublicStatus = !$road->is_public;
            $road->is_public = $newPublicStatus;
            $road->save();

            // Verify the update was successful
            $updatedRoad = SavedRoad::find($id);

            \Log::info('Road public status updated', [
                'road_id' => $updatedRoad->id,
                'road_name' => $updatedRoad->road_name,
                'is_public' => $updatedRoad->is_public,
                'update_successful' => $updatedRoad->is_public === $newPublicStatus
            ]);

            return response()->json([
                'message' => 'Road visibility updated successfully',
                'is_public' => $updatedRoad->is_public,
                'road_name' => $updatedRoad->road_name,
                'country' => $updatedRoad->country,
                'region' => $updatedRoad->region
            ]);
        } catch (\Exception $e) {
            \Log::error('Error toggling road public status: ' . $e->getMessage(), [
                'road_id' => $id,
                'user_id' => Auth::id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to update road visibility',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $road = SavedRoad::with([
                    'user:id,name,profile_picture',
                    'reviews.user:id,name,profile_picture',
                    'reviews.photos',
                    'comments.user:id,name,profile_picture',
                    'photos',
                    'tags'
                ])
                ->withAvg('reviews', 'rating')
                ->findOrFail($id);

            // Ensure average_rating is properly formatted
            if ($road->reviews_avg_rating !== null) {
                $road->average_rating = (float) $road->reviews_avg_rating;
            }

            // Log review photos for debugging
            foreach ($road->reviews as $review) {
                \Log::info("Review {$review->id} photos count: " . $review->photos->count());
                foreach ($review->photos as $photo) {
                    \Log::info("Photo {$photo->id} path: {$photo->photo_path}, URL: {$photo->photo_url}");
                }
            }

            return response()->json($road);
        } catch (\Exception $e) {
            // If there's an error with the photos relationships, try without them
            \Log::error('Error in show method: ' . $e->getMessage());

            try {
                $road = SavedRoad::with([
                        'user:id,name,profile_picture',
                        'reviews.user:id,name,profile_picture',
                        'comments.user:id,name,profile_picture'
                    ])
                    ->withAvg('reviews', 'rating')
                    ->findOrFail($id);

                // Ensure average_rating is properly formatted
                if ($road->reviews_avg_rating !== null) {
                    $road->average_rating = (float) $road->reviews_avg_rating;
                }

                return response()->json($road);
            } catch (\Exception $e) {
                \Log::error('Error in fallback show method: ' . $e->getMessage());
                return response()->json(['error' => 'Failed to fetch road details'], 500);
            }
        }
    }

    /**
     * Display a public road without authentication requirement.
     */
    public function showPublic($id)
    {
        try {
            $road = SavedRoad::with([
                    'user:id,name,profile_picture',
                    'reviews.user:id,name,profile_picture',
                    'reviews.photos',
                    'comments.user:id,name,profile_picture',
                    'photos',
                    'tags'
                ])
                ->withAvg('reviews', 'rating')
                ->where('is_public', true)
                ->findOrFail($id);

            // Ensure average_rating is properly formatted
            if ($road->reviews_avg_rating !== null) {
                $road->average_rating = (float) $road->reviews_avg_rating;
            }

            return response()->json($road);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Road not found or is not public'], 404);
        } catch (\Exception $e) {
            \Log::error('Error in showPublic method: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch road details'], 500);
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
                'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120'
            ]);

            // Only update fields that are actually present in the request
            $updateData = array_filter($validatedData, function ($value, $key) {
                return $value !== null && $key !== 'photo';
            }, ARRAY_FILTER_USE_BOTH);

            // Handle boolean conversion for is_public
            if (isset($updateData['is_public'])) {
                $updateData['is_public'] = filter_var($updateData['is_public'], FILTER_VALIDATE_BOOLEAN);
            }

            $road->update($updateData);

            // Handle photo upload if provided
            if ($request->hasFile('photo')) {
                try {
                    // Store the photo
                    $path = $request->file('photo')->store('road-photos', 'public');

                    // Create a new road photo
                    $photo = new \App\Models\RoadPhoto([
                        'saved_road_id' => $road->id,
                        'user_id' => auth()->id(),
                        'photo_path' => $path,
                        'caption' => $request->input('caption')
                    ]);

                    $photo->save();

                    \Log::info('Road photo added successfully', [
                        'road_id' => $road->id,
                        'photo_id' => $photo->id,
                        'path' => $path
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Error uploading road photo: ' . $e->getMessage(), [
                        'road_id' => $road->id,
                        'trace' => $e->getTraceAsString()
                    ]);
                    // Continue without failing the whole request
                }
            }

            // Load the relationships before returning
            $road = $road->fresh([
                'user:id,name,profile_picture',
                'reviews.user:id,name,profile_picture',
                'reviews.photos',
                'comments.user:id,name,profile_picture',
                'photos'
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
            \Log::error('Error updating road: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to update road.'], 500);
        }
    }
}