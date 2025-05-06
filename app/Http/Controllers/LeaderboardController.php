<?php

namespace App\Http\Controllers;

use App\Models\SavedRoad;
use App\Models\User;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaderboardController extends Controller
{
    /**
     * Get top-rated roads.
     */
    public function topRatedRoads(Request $request)
    {
        $limit = $request->input('limit', 10);

        $roads = SavedRoad::where('is_public', true)
            ->whereNotNull('average_rating')
            ->with(['user:id,name,username,profile_picture'])
            ->withCount('reviews')
            ->orderBy('average_rating', 'desc')
            ->take($limit)
            ->get([
                'id', 'road_name', 'length', 'twistiness', 'corner_count',
                'average_rating', 'user_id', 'created_at', 'updated_at',
                'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation'
            ]);

        return response()->json($roads);
    }

    /**
     * Get most reviewed roads.
     */
    public function mostReviewedRoads(Request $request)
    {
        $limit = $request->input('limit', 10);

        $roads = SavedRoad::where('is_public', true)
            ->withCount('reviews')
            ->with(['user:id,name,username,profile_picture'])
            ->orderBy('reviews_count', 'desc')
            ->take($limit)
            ->get([
                'id', 'road_name', 'length', 'twistiness', 'corner_count',
                'average_rating', 'user_id', 'created_at', 'updated_at',
                'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation'
            ]);

        return response()->json($roads);
    }

    /**
     * Get most popular roads (based on views, if implemented).
     */
    public function mostPopularRoads(Request $request)
    {
        $limit = $request->input('limit', 10);

        // This assumes you have a 'views' column in your saved_roads table
        // If not, you could use reviews count as a proxy for popularity
        $roads = SavedRoad::where('is_public', true)
            ->withCount('reviews')
            ->with(['user:id,name,username,profile_picture'])
            ->orderBy('reviews_count', 'desc') // Replace with 'views' if available
            ->take($limit)
            ->get([
                'id', 'road_name', 'length', 'twistiness', 'corner_count',
                'average_rating', 'user_id', 'created_at', 'updated_at',
                'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation',
                'view_count' // Include this if it exists
            ]);

        return response()->json($roads);
    }

    /**
     * Get most active users (users with most public roads).
     */
    public function mostActiveUsers(Request $request)
    {
        $limit = $request->input('limit', 10);

        $users = User::withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->withCount('reviews')
            ->withCount('followers')
            ->withCount('following')
            ->withCount('collections')
            ->orderBy('saved_roads_count', 'desc')
            ->take($limit)
            ->get(['id', 'name', 'username', 'profile_picture', 'bio']);

        return response()->json($users);
    }

    /**
     * Get most followed users.
     */
    public function mostFollowedUsers(Request $request)
    {
        $limit = $request->input('limit', 10);

        $users = User::withCount('followers')
            ->withCount('following')
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->withCount('collections')
            ->withCount('reviews')
            ->orderBy('followers_count', 'desc')
            ->take($limit)
            ->get(['id', 'name', 'username', 'profile_picture', 'bio']);

        return response()->json($users);
    }

    /**
     * Get all leaderboard data in one request.
     */
    public function all(Request $request)
    {
        $limit = $request->input('limit', 5);

        return response()->json([
            'top_rated_roads' => $this->topRatedRoads($request)->original,
            'most_reviewed_roads' => $this->mostReviewedRoads($request)->original,
            'most_popular_roads' => $this->mostPopularRoads($request)->original,
            'most_active_users' => $this->mostActiveUsers($request)->original,
            'most_followed_users' => $this->mostFollowedUsers($request)->original,
        ]);
    }
}
