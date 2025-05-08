<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\CollectionReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CollectionReviewController extends Controller
{
    /**
     * Add or update a review for a collection.
     */
    public function store(Request $request, $id)
    {
        try {
            $collection = Collection::findOrFail($id);

            $validatedData = $request->validate([
                'rating' => 'required|integer|between:1,5',
                'comment' => 'nullable|string|max:500',
            ]);

            // Create or update the review
            $review = CollectionReview::updateOrCreate(
                [
                    'user_id' => Auth::id(),
                    'collection_id' => $collection->id
                ],
                [
                    'rating' => $validatedData['rating'],
                    'comment' => $validatedData['comment'] ?? null
                ]
            );

            // Update average rating and reviews count
            $avgRating = $collection->reviews()->avg('rating');
            $reviewsCount = $collection->reviews()->count();
            
            $collection->update([
                'average_rating' => $avgRating,
                'reviews_count' => $reviewsCount
            ]);

            // Refresh the collection data with updated relationships
            $collection = $collection->fresh([
                'user:id,name,profile_picture',
                'reviews.user:id,name,profile_picture',
                'tags',
                'roads' => function($query) {
                    $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating')
                        ->limit(3); // Just get a few roads for preview
                }
            ]);

            return response()->json([
                'message' => 'Review added successfully',
                'collection' => $collection
            ]);
        } catch (\Exception $e) {
            Log::error('Error adding collection review: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to add review'], 500);
        }
    }

    /**
     * Get all reviews for a collection.
     */
    public function index($id)
    {
        try {
            $collection = Collection::findOrFail($id);
            
            $reviews = $collection->reviews()
                ->with('user:id,name,profile_picture')
                ->orderBy('created_at', 'desc')
                ->get();
                
            return response()->json($reviews);
        } catch (\Exception $e) {
            Log::error('Error fetching collection reviews: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch reviews'], 500);
        }
    }

    /**
     * Delete a review.
     */
    public function destroy($id, $reviewId)
    {
        try {
            $review = CollectionReview::findOrFail($reviewId);
            
            // Check if the user is authorized to delete this review
            if ($review->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            
            $collection = $review->collection;
            $review->delete();
            
            // Update average rating and reviews count
            $avgRating = $collection->reviews()->avg('rating');
            $reviewsCount = $collection->reviews()->count();
            
            $collection->update([
                'average_rating' => $avgRating,
                'reviews_count' => $reviewsCount
            ]);
            
            return response()->json(['message' => 'Review deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting collection review: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete review'], 500);
        }
    }
}
