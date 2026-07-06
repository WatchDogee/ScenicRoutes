<?php

namespace App\Http\Controllers;

use App\Models\RoadComment;
use App\Models\SavedRoad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class RoadCommentController extends Controller
{
    /**
     * Get all comments for a road in chronological order
     */
    public function index($roadId)
    {
        try {
            $road = SavedRoad::findOrFail($roadId);
            
            $comments = $road->roadComments()
                ->with('user:id,name,profile_picture')
                ->orderBy('created_at', 'asc')
                ->get();
            
            return response()->json($comments);
        } catch (\Exception $e) {
            Log::error('Error fetching road comments: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch comments'], 500);
        }
    }

    /**
     * Store a new comment on a road
     */
    public function store(Request $request, $roadId)
    {
        try {
            $road = SavedRoad::findOrFail($roadId);
            
            $validatedData = $request->validate([
                'comment' => 'required|string|max:1000',
            ]);

            $userId = Auth::id();
            if (!$userId) {
                return response()->json(['error' => 'Authentication required'], 401);
            }

            $comment = RoadComment::create([
                'road_id' => $road->id,
                'user_id' => $userId,
                'comment' => $validatedData['comment']
            ]);

            // Load the user relationship
            $comment = $comment->load('user:id,name,profile_picture');

            return response()->json([
                'message' => 'Comment added successfully',
                'comment' => $comment
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'messages' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error adding road comment: ' . $e->getMessage(), [
                'exception' => $e,
                'road_id' => $roadId,
                'user_id' => Auth::id()
            ]);
            return response()->json(['error' => 'Failed to add comment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete a comment (only by the author)
     */
    public function destroy($roadId, $commentId)
    {
        try {
            $comment = RoadComment::findOrFail($commentId);
            
            // Verify the comment belongs to the road
            if ($comment->road_id != $roadId) {
                return response()->json(['error' => 'Comment not found on this road'], 404);
            }
            
            // Verify user is the author
            if ($comment->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            
            $comment->delete();
            
            return response()->json(['message' => 'Comment deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting road comment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete comment'], 500);
        }
    }
}
