<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SavedRoad;
use App\Models\Review;
use App\Models\Comment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class SavedRoadController extends Controller
{
    public function index()
    {
        return response()->json(auth()->user()->savedRoads);
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
            // Validate and parse input parameters with proper error handling
            $lat = filter_var($request->input('lat'), FILTER_VALIDATE_FLOAT);
            $lon = filter_var($request->input('lon'), FILTER_VALIDATE_FLOAT);
            $radius = filter_var($request->input('radius', 50), FILTER_VALIDATE_FLOAT);
            $lengthFilter = $request->input('length_filter', 'all');
            $curvinessFilter = $request->input('curviness_filter', 'all');
            $minRating = filter_var($request->input('min_rating', 0), FILTER_VALIDATE_FLOAT);
            $sortBy = $request->input('sort_by', 'rating');

            if ($lat === false || $lon === false || $radius === false) {
                return response()->json(['error' => 'Invalid coordinates or radius format'], 400);
            }

            // Cap radius at 200km
            $radius = min((float) $radius, 200);

            // Start building the query
            $query = SavedRoad::where('is_public', true)
                ->with([
                    'user:id,name,profile_picture',
                    'reviews.user:id,name,profile_picture',
                    'reviews.photos',
                    'comments.user:id,name,profile_picture',
                    'photos'
                ])
                ->withAvg('reviews', 'rating');

            // Get all roads first
            $roads = $query->get();

            // Filter roads based on coordinates and calculate distances
            $filteredRoads = $roads->filter(function ($road) use ($lat, $lon, $radius) {
                try {
                    $coordinates = json_decode($road->road_coordinates);
                    if (!$coordinates || empty($coordinates)) return false;

                    // Find the minimum distance from any point of the road to the search center
                    $minDistance = PHP_FLOAT_MAX;
                    foreach ($coordinates as $point) {
                        $distance = $this->calculateDistance($lat, $lon, $point[0], $point[1]);
                        $minDistance = min($minDistance, $distance);
                        }

                    // Store the minimum distance in the road object for sorting
                    $road->distance_to_search = $minDistance;

                    return $minDistance <= $radius;
                } catch (\Exception $e) {
                    \Log::error("Error processing road coordinates: " . $e->getMessage());
                    return false;
                }
            });

            // Apply length filter
            if ($lengthFilter !== 'all') {
                $filteredRoads = $filteredRoads->filter(function ($road) use ($lengthFilter) {
                    $lengthKm = $road->length / 1000;
                    switch ($lengthFilter) {
                        case 'short':
                            return $lengthKm < 5;
                        case 'medium':
                            return $lengthKm >= 5 && $lengthKm <= 15;
                        case 'long':
                            return $lengthKm > 15;
                        default:
                            return true;
                    }
                });
            }

            // Apply curviness filter
            if ($curvinessFilter !== 'all') {
                $filteredRoads = $filteredRoads->filter(function ($road) use ($curvinessFilter) {
                    switch ($curvinessFilter) {
                        case 'mellow':
                            return $road->twistiness <= 0.0035;
                        case 'moderate':
                            return $road->twistiness > 0.0035 && $road->twistiness <= 0.007;
                        case 'very':
                            return $road->twistiness > 0.007;
                        default:
                            return true;
                    }
                });
            }

            // Apply rating filter only if minRating is greater than 0
            if ($minRating > 0) {
                $filteredRoads = $filteredRoads->filter(function ($road) use ($minRating) {
                    return ($road->reviews_avg_rating ?? 0) >= $minRating;
                });
            }

            // Sort the results
            $sortedRoads = $filteredRoads->sortBy(function ($road) use ($sortBy) {
                switch ($sortBy) {
                    case 'rating':
                        return -($road->reviews_avg_rating ?? 0);
                    case 'reviews':
                        return -($road->reviews->count() ?? 0);
                    case 'recent':
                        return -strtotime($road->created_at);
                    case 'length':
                        return -$road->length;
                    case 'distance':
                        return $road->distance_to_search;
                    default:
                        // Default sort by distance and then rating
                        return [$road->distance_to_search, -($road->reviews_avg_rating ?? 0)];
                }
            });

            // Format the response
            $formattedRoads = $sortedRoads->map(function ($road) {
                return [
                    'id' => $road->id,
                    'road_name' => $road->road_name,
                    'road_coordinates' => $road->road_coordinates,
                    'description' => $road->description,
                    'twistiness' => $road->twistiness,
                    'corner_count' => $road->corner_count,
                    'length' => $road->length,
                    'is_public' => $road->is_public,
                    'created_at' => $road->created_at,
                    'distance' => round($road->distance_to_search, 1),
                    'user' => [
                        'id' => $road->user->id,
                        'name' => $road->user->name,
                        'profile_picture_url' => $road->user->profile_picture_url,
                    ],
                    'reviews' => $road->reviews->map(function ($review) {
                        return [
                            'id' => $review->id,
                            'rating' => $review->rating,
                            'comment' => $review->comment,
                            'created_at' => $review->created_at,
                            'updated_at' => $review->updated_at,
                            'user' => [
                                'id' => $review->user->id,
                                'name' => $review->user->name,
                                'profile_picture_url' => $review->user->profile_picture_url,
                            ],
                            'photos' => $review->photos ? $review->photos->map(function ($photo) {
                                return [
                                    'id' => $photo->id,
                                    'photo_url' => $photo->photo_url,
                                    'caption' => $photo->caption,
                                    'created_at' => $photo->created_at,
                                ];
                            }) : [],
                        ];
                    }),
                    'comments' => $road->comments->map(function ($comment) {
                        return [
                            'id' => $comment->id,
                            'comment' => $comment->comment,
                            'created_at' => $comment->created_at,
                            'updated_at' => $comment->updated_at,
                            'user' => [
                                'id' => $comment->user->id,
                                'name' => $comment->user->name,
                                'profile_picture_url' => $comment->user->profile_picture_url,
                            ],
                        ];
                    }),
                    'average_rating' => $road->reviews_avg_rating !== null ? (float) $road->reviews_avg_rating : null,
                    'photos' => $road->photos ? $road->photos->map(function ($photo) {
                        return [
                            'id' => $photo->id,
                            'photo_url' => $photo->photo_url,
                            'caption' => $photo->caption,
                            'created_at' => $photo->created_at,
                            'user_id' => $photo->user_id,
                        ];
                    }) : []
                ];
            });

            return response()->json($formattedRoads->values());

        } catch (\Exception $e) {
            \Log::error('Error in publicRoads: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json(['error' => 'Internal server error'], 500);
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
                'comment' => 'nullable|string|max:500'
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

        $comment = Comment::create([
            'user_id' => Auth::id(),
            'saved_road_id' => $road->id,
            'comment' => $request->comment
        ]);

        return response()->json(['message' => 'Comment added successfully']);
    }

    public function togglePublic(Request $request, $id)
    {
        $road = SavedRoad::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $road->update(['is_public' => !$road->is_public]);

        return response()->json([
            'message' => 'Road visibility updated successfully',
            'is_public' => $road->is_public
        ]);
    }

    public function show($id)
    {
        try {
            $road = SavedRoad::with([
                    'user:id,name,profile_picture',
                    'reviews.user:id,name,profile_picture',
                    'reviews.photos',
                    'comments.user:id,name,profile_picture',
                    'photos'
                ])
                ->withAvg('reviews', 'rating')
                ->findOrFail($id);

            // Ensure average_rating is properly formatted
            if ($road->reviews_avg_rating !== null) {
                $road->average_rating = (float) $road->reviews_avg_rating;
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
                'is_public' => 'nullable|boolean'
            ]);

            // Only update fields that are actually present in the request
            $updateData = array_filter($validatedData, function ($value) {
                return $value !== null;
            });

            $road->update($updateData);

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
            \Log::error('Error updating road: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json(['error' => 'Failed to update road.'], 500);
        }
    }
}