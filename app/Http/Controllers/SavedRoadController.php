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
protected $elevationService;
protected $geocodingService;
public function __construct(ElevationService $elevationService, GeocodingService $geocodingService)
    {
        $this->elevationService = $elevationService;
        $this->geocodingService = $geocodingService;
    }

    public function index()
    {
        try {
            
            \Log::info('Fetching saved roads for user', [
                'user_id' => auth()->id(),
                'user_name' => auth()->user()->name
            ]);

            
            
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
public function publicIndex()
    {
        try {
            \Log::info('Fetching public roads for non-authenticated user');

            
            $roads = SavedRoad::where('is_public', true)
                ->with([
                    'user:id,name,profile_picture',
                    'reviews.user:id,name,profile_picture',
                    'reviews.photos',
                    'photos',
                    'tags'
                ])
                ->withCount('reviews')
                ->orderBy('created_at', 'desc')
                ->get();

            \Log::info('Public roads fetched successfully', [
                'count' => $roads->count()
            ]);

            return response()->json($roads);
        } catch (\Exception $e) {
            \Log::error('Error fetching public roads: ' . $e->getMessage(), [
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
        $data = $request->validate([
            'road_name' => 'required|string|max:255',
            'coordinates' => 'required|array',
            'twistiness' => 'nullable|numeric',
            'corner_count' => 'nullable|integer',
            'length' => 'nullable|numeric',
            'elevation_gain' => 'nullable|numeric',
            'elevation_loss' => 'nullable|numeric',
            'max_elevation' => 'nullable|numeric',
            'min_elevation' => 'nullable|numeric',
            'description' => 'nullable|string|max:1000',
            'is_public' => 'nullable|boolean',
            'tags' => 'nullable|string',
        ]);

        
        $data['road_coordinates'] = json_encode($data['coordinates']);
        unset($data['coordinates']); 

        
        $data['is_public'] = $data['is_public'] ?? false;

        
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
            
        }

        
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
            
        }

        
        $road = auth()->user()->savedRoads()->create($data);

        
        if (!empty($request->input('tags'))) {
            $tagIds = explode(',', $request->input('tags'));
            if (!empty($tagIds)) {
                $road->tags()->sync($tagIds);
            }
        }

        
        $road->load('tags');

        return response()->json($road, 201);
    }

    public function destroy($id)
    {
        try {
            \Log::info('Attempting to delete road', [
                'road_id' => $id,
                'user_id' => auth()->id()
            ]);

            $road = SavedRoad::where('id', $id)
                ->where('user_id', auth()->id())
                ->firstOrFail();

            \Log::info('Road found, deleting related records', [
                'road_id' => $id,
                'road_name' => $road->road_name
            ]);

            
            
            if ($road->photos()->count() > 0) {
                \Log::info('Deleting road photos', [
                    'road_id' => $id,
                    'photos_count' => $road->photos()->count()
                ]);

                
                foreach ($road->photos as $photo) {
                    try {
                        
                        if (\Storage::disk('public')->exists($photo->photo_path)) {
                            \Storage::disk('public')->delete($photo->photo_path);
                        }
                        $photo->delete();
                    } catch (\Exception $photoEx) {
                        \Log::error('Error deleting road photo', [
                            'photo_id' => $photo->id,
                            'error' => $photoEx->getMessage(),
                            'trace' => $photoEx->getTraceAsString()
                        ]);
                        
                    }
                }
            }

            
            if ($road->reviews()->count() > 0) {
                \Log::info('Deleting road reviews', [
                    'road_id' => $id,
                    'reviews_count' => $road->reviews()->count()
                ]);

                
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
                                    \Log::error('Error deleting review photo', [
                                        'photo_id' => $photo->id,
                                        'error' => $photoEx->getMessage()
                                    ]);
                                }
                            }
                        }
                        $review->delete();
                    } catch (\Exception $reviewEx) {
                        \Log::error('Error deleting review', [
                            'review_id' => $review->id,
                            'error' => $reviewEx->getMessage(),
                            'trace' => $reviewEx->getTraceAsString()
                        ]);
                    }
                }
            }

            
            if ($road->comments()->count() > 0) {
                \Log::info('Deleting road comments', [
                    'road_id' => $id,
                    'comments_count' => $road->comments()->count()
                ]);
                $road->comments()->delete();
            }

            
            if (method_exists($road, 'tags') && $road->tags()->count() > 0) {
                \Log::info('Detaching road tags', [
                    'road_id' => $id,
                    'tags_count' => $road->tags()->count()
                ]);
                $road->tags()->detach();
            }

            
            if (method_exists($road, 'collections') && $road->collections()->count() > 0) {
                \Log::info('Detaching road from collections', [
                    'road_id' => $id,
                    'collections_count' => $road->collections()->count()
                ]);
                $road->collections()->detach();
            }

            
            \Log::info('Deleting road record', ['road_id' => $id]);
            $road->delete();

            \Log::info('Road deleted successfully', ['road_id' => $id]);
            return response()->json(['message' => 'Road deleted successfully.'], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::error('Road not found or user not authorized to delete', [
                'road_id' => $id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Road not found or you do not have permission to delete it.'], 404);
        } catch (\Exception $e) {
            \Log::error('Failed to delete road', [
                'road_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Failed to delete road: ' . $e->getMessage()], 500);
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

            
            $lat = $request->input('lat');
            $lon = $request->input('lon');
            $radius = $request->input('radius');

            \Log::info('Public roads search parameters', [
                'country' => $country,
                'region' => $region,
                'min_rating' => $minRating,
                'tags' => $tags,
                'lat' => $lat,
                'lon' => $lon,
                'radius' => $radius,
                'debug' => $debug
            ]);

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

                    \Log::info('Searching roads within bounding box', [
                        'center' => [$lat, $lon],
                        'radius_km' => $radius,
                        'bounding_box' => [
                            'minLat' => $minLat,
                            'maxLat' => $maxLat,
                            'minLon' => $minLon,
                            'maxLon' => $maxLon
                        ]
                    ]);

                    
                    $databaseDriver = DB::connection()->getDriverName();
                    \Log::info('Database driver: ' . $databaseDriver);

                    if ($databaseDriver === 'pgsql') {
                        
                        \Log::info('Using PostgreSQL jsonb_array_elements for geographic filtering');

                        
                        
                        $query->whereRaw("
                            EXISTS (
                                SELECT 1 FROM jsonb_array_elements(road_coordinates::jsonb) as coords
                                WHERE
                                    (coords->0)::float BETWEEN ? AND ?
                                    AND (coords->1)::float BETWEEN ? AND ?
                            )
                        ", [$minLat, $maxLat, $minLon, $maxLon]);
                    } else {
                        
                        \Log::info('Using MySQL JSON_EXTRACT for geographic filtering');

                        
                        $query->whereRaw('
                            JSON_EXTRACT(road_coordinates, "$[0][0]") BETWEEN ? AND ?
                            AND JSON_EXTRACT(road_coordinates, "$[0][1]") BETWEEN ? AND ?
                        ', [$minLat, $maxLat, $minLon, $maxLon]);
                    }
                } catch (\Exception $e) {
                    \Log::error('Error in geographic search: ' . $e->getMessage(), [
                        'trace' => $e->getTraceAsString(),
                        'database_driver' => $databaseDriver ?? 'unknown'
                    ]);

                    
                    if ($country) {
                        \Log::info('Falling back to country-based search', ['country' => $country]);
                    } else {
                        
                        try {
                            \Log::info('Attempting to determine country from coordinates', [
                                'lat' => $lat,
                                'lon' => $lon
                            ]);

                            
                            
                            \Log::info('Returning all public roads as fallback');
                        } catch (\Exception $geoEx) {
                            \Log::error('Error determining country from coordinates: ' . $geoEx->getMessage());
                        }
                    }
                }
            }

            
            if ($country) {
                $query->where(function($q) use ($country) {
                    $q->where('country', $country)
                      ->orWhereRaw('LOWER(country) = ?', [strtolower($country)])
                      ->orWhereRaw('country LIKE ?', ["%$country%"]);
                });
            }

            if ($region) {
                $query->where(function($q) use ($region) {
                    $q->where('region', $region)
                      ->orWhereRaw('LOWER(region) = ?', [strtolower($region)])
                      ->orWhereRaw('region LIKE ?', ["%$region%"]);
                });
            }

            if ($minRating) {
                $query->where('average_rating', '>=', $minRating)
                      ->whereNotNull('average_rating')
                      ->where('average_rating', '>', 0);
            }

            
            if ($tags) {
                \Log::info('Filtering by tags', ['tags' => $tags]);

                
                $tagArray = is_array($tags) ? $tags : explode(',', $tags);

                
                $query->whereHas('tags', function ($q) use ($tagArray) {
                    $q->whereIn('tags.id', $tagArray);
                }, '=', count($tagArray)); 
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



            return response()->json([
                'roads' => $roads,
                'countries' => $countries,
                'regions' => $regions,
                'total_count' => $roads->count(),

            ]);
        } catch (\Exception $e) {
            
            $databaseDriver = 'unknown';
            try {
                $databaseDriver = DB::connection()->getDriverName();
            } catch (\Exception $dbEx) {
                
            }

            \Log::error('Error in publicRoads: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'database_driver' => $databaseDriver,
                'search_params' => [
                    'country' => $country ?? null,
                    'region' => $region ?? null,
                    'lat' => $lat ?? null,
                    'lon' => $lon ?? null,
                    'radius' => $radius ?? null,
                    'tags' => $tags ?? null
                ]
            ]);

            
            return response()->json([
                'error' => 'Failed to fetch public roads',
                'message' => 'An error occurred while searching for roads. Please try again with different search criteria.',

            ], 500);
        }
    }



    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; 

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

            
            \Log::info('Review created/updated', [
                'review_id' => $review->id,
                'road_id' => $road->id,
                'user_id' => Auth::id(),
                'rating' => $validatedData['rating']
            ]);

            
            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('review-photos', 'public');

                $photo = new \App\Models\ReviewPhoto([
                    'review_id' => $review->id,
                    'user_id' => Auth::id(),
                    'photo_path' => $path,
                    'caption' => $validatedData['caption'] ?? null,
                ]);

                $photo->save();
                \Log::info('Single photo uploaded with review', [
                    'review_id' => $review->id,
                    'photo_id' => $photo->id,
                    'photo_path' => $path
                ]);
            }

            
            if ($request->hasFile('photos')) {
                $photos = $request->file('photos');
                $captions = $request->input('captions', []);

                \Log::info('Multiple photos upload detected', [
                    'review_id' => $review->id,
                    'photos_count' => count($photos)
                ]);

                foreach ($photos as $index => $photoFile) {
                    $path = $photoFile->store('review-photos', 'public');
                    $caption = isset($captions[$index]) ? $captions[$index] : null;

                    $photo = new \App\Models\ReviewPhoto([
                        'review_id' => $review->id,
                        'photo_path' => $path,
                        'caption' => $caption,
                    ]);

                    $photo->save();
                    \Log::info('Multiple photo uploaded with review', [
                        'review_id' => $review->id,
                        'photo_index' => $index,
                        'photo_id' => $photo->id,
                        'photo_path' => $path,
                        'caption' => $caption
                    ]);
                }
            }

            
            $avgRating = $road->reviews()->avg('rating');
            $road->update(['average_rating' => $avgRating]);

            
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
            \Log::error('Validation error adding review: ' . json_encode($e->errors()));
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
            
            \Log::info('Toggling road public status', [
                'road_id' => $id,
                'user_id' => Auth::id()
            ]);

            $road = SavedRoad::where('id', $id)
                ->where('user_id', Auth::id())
                ->firstOrFail();

            
            \Log::info('Road found for toggle', [
                'road_id' => $road->id,
                'road_name' => $road->road_name,
                'current_is_public' => $road->is_public,
                'will_be_set_to' => !$road->is_public
            ]);

            
            $newPublicStatus = !$road->is_public;
            $road->is_public = $newPublicStatus;
            $road->save();

            
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

            
            if ($road->reviews_avg_rating !== null) {
                $road->average_rating = (float) $road->reviews_avg_rating;
            }



            return response()->json($road);
        } catch (\Exception $e) {
            
            \Log::error('Error in show method: ' . $e->getMessage());

            try {
                $road = SavedRoad::with([
                        'user:id,name,profile_picture',
                        'reviews.user:id,name,profile_picture',
                        'comments.user:id,name,profile_picture'
                    ])
                    ->withAvg('reviews', 'rating')
                    ->findOrFail($id);

                
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
                'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'tags' => 'nullable|string'
            ]);

            
            $updateData = array_filter($validatedData, function ($value, $key) {
                return $value !== null && $key !== 'photo' && $key !== 'tags';
            }, ARRAY_FILTER_USE_BOTH);

            
            if (isset($updateData['is_public'])) {
                $updateData['is_public'] = filter_var($updateData['is_public'], FILTER_VALIDATE_BOOLEAN);
            }

            $road->update($updateData);

            
            if ($request->has('tags')) {
                try {
                    \Log::info('Tags received in request', [
                        'road_id' => $road->id,
                        'tags_raw' => $request->tags
                    ]);

                    $tagIds = json_decode($request->tags, true);

                    \Log::info('Tags after JSON decode', [
                        'road_id' => $road->id,
                        'decoded_tags' => $tagIds,
                        'is_array' => is_array($tagIds)
                    ]);

                    if (is_array($tagIds)) {
                        \Log::info('Updating road tags', [
                            'road_id' => $road->id,
                            'tag_ids' => $tagIds
                        ]);

                        
                        $road->tags()->sync($tagIds);

                        
                        $syncedTags = $road->tags()->pluck('id')->toArray();
                        \Log::info('Tags after sync', [
                            'road_id' => $road->id,
                            'synced_tag_ids' => $syncedTags
                        ]);
                    } else {
                        \Log::warning('Invalid tags format', [
                            'road_id' => $road->id,
                            'tags' => $request->tags
                        ]);
                    }
                } catch (\Exception $e) {
                    \Log::error('Error updating road tags: ' . $e->getMessage(), [
                        'road_id' => $road->id,
                        'trace' => $e->getTraceAsString()
                    ]);
                    
                }
            } else {
                \Log::info('No tags provided in request', [
                    'road_id' => $road->id,
                    'request_has_tags' => $request->has('tags'),
                    'all_request_keys' => array_keys($request->all())
                ]);
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
            \Log::error('Error updating road: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to update road.'], 500);
        }
    }
}