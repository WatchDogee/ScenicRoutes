<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SavedRoad;

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

    public function publicRoads()
    {
        return SavedRoad::where('is_public', true)->with('reviews', 'comments')->get();
    }

    public function addReview(Request $request, SavedRoad $road)
    {
        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $road->reviews()->create([
            'user_id' => auth()->id(),
            'rating' => $data['rating'],
        ]);

        $road->average_rating = $road->reviews()->avg('rating');
        $road->save();

        return response()->json(['message' => 'Review added successfully.']);
    }

    public function addComment(Request $request, SavedRoad $road)
    {
        $data = $request->validate([
            'comment' => 'required|string|max:500',
        ]);

        $road->comments()->create([
            'user_id' => auth()->id(),
            'comment' => $data['comment'],
        ]);

        return response()->json(['message' => 'Comment added successfully.']);
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