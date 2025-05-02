<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\ReviewPhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ReviewPhotoController extends Controller
{
    /**
     * Store a newly created photo in storage.
     */
    public function store(Request $request, $reviewId)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            'caption' => 'nullable|string|max:255',
        ]);

        $review = Review::findOrFail($reviewId);

        // Check if the user is authorized to add photos to this review
        if ($review->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('review-photos', 'public');

            $photo = new ReviewPhoto([
                'review_id' => $reviewId,
                'photo_path' => $path,
                'caption' => $request->caption,
            ]);

            $photo->save();

            // Load the review with its photos
            $review = $review->fresh(['photos']);

            return response()->json([
                'message' => 'Photo uploaded successfully',
                'photo' => $photo,
                'review' => $review
            ]);
        }

        return response()->json(['message' => 'No photo uploaded'], 400);
    }

    /**
     * Remove the specified photo from storage.
     */
    public function destroy($photoId)
    {
        $photo = ReviewPhoto::findOrFail($photoId);
        $review = $photo->review;

        // Check if the user is authorized to delete this photo
        if ($review->user_id !== Auth::id()) {
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
