<?php

namespace App\Http\Controllers;

use App\Models\RoadPhoto;
use App\Models\SavedRoad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class RoadPhotoController extends Controller
{
public function store(Request $request, $roadId)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', 
            'caption' => 'nullable|string|max:255',
        ]);

        $road = SavedRoad::findOrFail($roadId);

        
        
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

            
            $road = $road->fresh(['photos']);

            return response()->json([
                'message' => 'Photo uploaded successfully',
                'photo' => $photo,
                'road' => $road
            ]);
        }

        return response()->json(['message' => 'No photo uploaded'], 400);
    }
public function destroy($photoId)
    {
        $photo = RoadPhoto::findOrFail($photoId);

        
        if ($photo->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        
        if (Storage::disk('public')->exists($photo->photo_path)) {
            Storage::disk('public')->delete($photo->photo_path);
        }

        $photo->delete();

        return response()->json(['message' => 'Photo deleted successfully']);
    }
}
