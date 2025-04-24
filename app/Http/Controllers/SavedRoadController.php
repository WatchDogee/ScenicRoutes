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

    public function destroy(SavedRoad $road)
    {
        $road->delete();
        return response()->json(['message' => 'Road deleted successfully.']);
    }

    public function publicRoads(Request $request)
    {
        $query = SavedRoad::where('is_public', true)
            ->with(['user:id,name', 'reviews', 'comments.user:id,name'])
            ->withAvg('reviews', 'rating');

        if ($request->has('lat') && $request->has('lon')) {
            $lat = $request->input('lat');
            $lon = $request->input('lon');
            $radius = $request->input('radius', 50); // Default 50km radius

            // Calculate the bounding box for the given radius
            $earthRadius = 6371; // Earth's radius in kilometers
            $latDelta = rad2deg($radius / $earthRadius);
            $lonDelta = rad2deg($radius / $earthRadius / cos(deg2rad($lat)));

            $minLat = $lat - $latDelta;
            $maxLat = $lat + $latDelta;
            $minLon = $lon - $lonDelta;
            $maxLon = $lon + $lonDelta;

            // Filter roads within the bounding box
            $query->where(function ($q) use ($minLat, $maxLat, $minLon, $maxLon) {
                // Extract the first coordinate pair from the JSON array
                $q->whereRaw('JSON_EXTRACT(road_coordinates, "$[0][0]") BETWEEN ? AND ?', [$minLat, $maxLat])
                  ->whereRaw('JSON_EXTRACT(road_coordinates, "$[0][1]") BETWEEN ? AND ?', [$minLon, $maxLon]);
            });
        }

        $roads = $query->get()->map(function ($road) {
            $road->average_rating = $road->reviews_avg_rating;
            return $road;
        });

        return response()->json($roads);
    }

    public function addReview(Request $request, $id)
    {
        $road = SavedRoad::findOrFail($id);
        
        $request->validate([
            'rating' => 'required|integer|between:1,5'
        ]);

        $review = Review::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'saved_road_id' => $road->id
            ],
            ['rating' => $request->rating]
        );

        // Update average rating
        $avgRating = $road->reviews()->avg('rating');
        $road->update(['average_rating' => $avgRating]);

        return response()->json(['message' => 'Review added successfully']);
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

    public function show(SavedRoad $road)
    {
        return response()->json($road);
    }

    public function update(Request $request, SavedRoad $road)
    {
        $data = $request->validate([
            'road_name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'road_coordinates' => 'nullable|array',
            'pictures' => 'nullable|array',
        ]);

        if (isset($data['road_coordinates'])) {
            $data['road_coordinates'] = json_encode($data['road_coordinates']);
        }

        $road->update($data);

        return response()->json(['message' => 'Road updated successfully.', 'road' => $road]);
    }
}