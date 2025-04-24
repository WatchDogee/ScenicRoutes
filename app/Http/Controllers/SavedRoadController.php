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

            if ($lat === false || $lon === false || $radius === false) {
                return response()->json(['error' => 'Invalid coordinates or radius format'], 400);
            }

            // Cap radius at 200km
            $radius = min((float) $radius, 200);

            // Calculate the bounding box
            $earthRadius = 6371; // Earth's radius in kilometers
            $latDelta = rad2deg($radius / $earthRadius);
            $lonDelta = rad2deg($radius / $earthRadius / cos(deg2rad($lat)));

            $minLat = $lat - $latDelta;
            $maxLat = $lat + $latDelta;
            $minLon = $lon - $lonDelta;
            $maxLon = $lon + $lonDelta;

            // Get public roads with their relationships
            $roads = SavedRoad::where('is_public', true)
                ->with(['user:id,name', 'reviews', 'comments.user:id,name'])
                ->withAvg('reviews', 'rating')
                ->get();

            // Filter roads based on coordinates
            $filteredRoads = $roads->filter(function ($road) use ($minLat, $maxLat, $minLon, $maxLon) {
                try {
                    $coordinates = json_decode($road->road_coordinates, true);
                    
                    if (!is_array($coordinates) || empty($coordinates)) {
                        \Log::warning("Invalid coordinates format for road ID: " . $road->id);
                        return false;
                    }

                    // Check if any point of the road is within the bounding box
                    foreach ($coordinates as $coord) {
                        if (!is_array($coord) || count($coord) < 2) {
                            continue;
                        }

                        $pointLat = (float) $coord[0];
                        $pointLon = (float) $coord[1];

                        if (!is_finite($pointLat) || !is_finite($pointLon)) {
                            continue;
                        }

                        if ($pointLat >= $minLat && $pointLat <= $maxLat && 
                            $pointLon >= $minLon && $pointLon <= $maxLon) {
                            return true;
                        }
                    }

                    return false;
                } catch (\Exception $e) {
                    \Log::error("Error processing road ID: " . $road->id . " - " . $e->getMessage());
                    return false;
                }
            });

            // Format the response
            $formattedRoads = $filteredRoads->map(function ($road) {
                return [
                    'id' => $road->id,
                    'road_name' => $road->road_name,
                    'road_coordinates' => $road->road_coordinates,
                    'description' => $road->description,
                    'twistiness' => $road->twistiness,
                    'corner_count' => $road->corner_count,
                    'length' => $road->length,
                    'is_public' => $road->is_public,
                    'user' => [
                        'id' => $road->user->id,
                        'name' => $road->user->name,
                    ],
                    'reviews' => $road->reviews,
                    'comments' => $road->comments,
                    'reviews_avg_rating' => $road->reviews_avg_rating
                ];
            });

            return response()->json($formattedRoads->values());

        } catch (\Exception $e) {
            \Log::error('Error in publicRoads: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json(['error' => 'Internal server error'], 500);
        }
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
            $road = $road->fresh(['reviews.user:id,name', 'comments.user:id,name']);

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
        $road = SavedRoad::with(['user:id,name,profile_picture', 'reviews.user:id,name', 'comments.user:id,name'])
            ->findOrFail($id);
        return response()->json($road);
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
            $road = $road->fresh(['user:id,name', 'reviews.user:id,name', 'comments.user:id,name']);

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