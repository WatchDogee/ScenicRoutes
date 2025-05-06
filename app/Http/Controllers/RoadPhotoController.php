<?php

namespace App\Http\Controllers;

use App\Models\RoadPhoto;
use App\Models\SavedRoad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class RoadPhotoController extends Controller
{
    /**
     * Store a newly created photo in storage.
     */
    public function store(Request $request, $roadId)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            'caption' => 'nullable|string|max:255',
        ]);

        $road = SavedRoad::findOrFail($roadId);

        // Check if the user is authorized to add photos to this road
        // Allow if user is the owner or if the road is public
        if (!$road->is_public && $road->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized - you can only add photos to your own roads or public roads'], 403);
        }

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('road-photos', 'public');

            $photo = new RoadPhoto([
                'saved_road_id' => $roadId,
                'user_id' => Auth::id(),
                'photo_path' => $path,
                'caption' => $request->caption,
            ]);

            $photo->save();

            // Load the road with its photos
            $road = $road->fresh(['photos']);

            return response()->json([
                'message' => 'Photo uploaded successfully',
                'photo' => $photo,
                'road' => $road
            ]);
        }

        return response()->json(['message' => 'No photo uploaded'], 400);
    }

    /**
     * Remove the specified photo from storage.
     */
    public function destroy($photoId)
    {
        $photo = RoadPhoto::findOrFail($photoId);

        // Check if the user is authorized to delete this photo
        if ($photo->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Delete the file from storage
        if (Storage::disk('public')->exists($photo->photo_path)) {
            Storage::disk('public')->delete($photo->photo_path);
        }

        $photo->delete();

        return response()->json(['message' => 'Photo deleted successfully']);
    }
}
