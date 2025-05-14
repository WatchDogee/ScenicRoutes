<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\ReviewPhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ReviewPhotoController extends Controller
{
public function store(Request $request, $reviewId)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', 
            'caption' => 'nullable|string|max:255',
        ]);

        $review = Review::findOrFail($reviewId);

        
        if ($review->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('review-photos', 'public');

            $photo = new ReviewPhoto([
                'review_id' => $reviewId,
                'user_id' => Auth::id(),
                'photo_path' => $path,
                'caption' => $request->caption,
            ]);

            $photo->save();

            
            $review = $review->fresh(['photos']);

            return response()->json([
                'message' => 'Photo uploaded successfully',
                'photo' => $photo,
                'review' => $review
            ]);
        }

        return response()->json(['message' => 'No photo uploaded'], 400);
    }
public function destroy($photoId)
    {
        $photo = ReviewPhoto::findOrFail($photoId);
        $review = $photo->review;

        
        if ($review->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        
        if (Storage::disk('public')->exists($photo->photo_path)) {
            Storage::disk('public')->delete($photo->photo_path);
        }

        $photo->delete();

        return response()->json(['message' => 'Photo deleted successfully']);
    }
}
