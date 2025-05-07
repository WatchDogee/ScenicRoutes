<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class FollowController extends Controller
{
    /**
     * Follow a user.
     */
    public function follow(Request $request, $id)
    {
        $user = Auth::user();
        $userToFollow = User::findOrFail($id);

        // Check if trying to follow self
        if ($user->id === $userToFollow->id) {
            return response()->json(['error' => 'You cannot follow yourself'], 422);
        }

        // Check if already following
        if ($user->isFollowing($userToFollow->id)) {
            return response()->json(['error' => 'You are already following this user'], 422);
        }

        // Add the follow relationship
        $user->following()->attach($userToFollow->id);

        return response()->json([
            'message' => 'You are now following ' . $userToFollow->name,
            'following' => true
        ]);
    }

    /**
     * Unfollow a user.
     */
    public function unfollow(Request $request, $id)
    {
        $user = Auth::user();
        $userToUnfollow = User::findOrFail($id);

        // Check if actually following
        if (!$user->isFollowing($userToUnfollow->id)) {
            return response()->json(['error' => 'You are not following this user'], 422);
        }

        // Remove the follow relationship
        $user->following()->detach($userToUnfollow->id);

        return response()->json([
            'message' => 'You have unfollowed ' . $userToUnfollow->name,
            'following' => false
        ]);
    }

    /**
     * Get users that the authenticated user is following.
     */
    public function following(Request $request)
    {
        $user = Auth::user();
        $following = $user->following()
            ->select('users.id', 'name', 'username', 'profile_picture')
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->paginate(20);

        return response()->json($following);
    }

    /**
     * Get users that are following the authenticated user.
     */
    public function followers(Request $request)
    {
        $user = Auth::user();
        $followers = $user->followers()
            ->select('users.id', 'name', 'username', 'profile_picture')
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->paginate(20);

        return response()->json($followers);
    }

    /**
     * Get the follow status between the authenticated user and another user.
     */
    public function status(Request $request, $id)
    {
        $user = Auth::user();
        $otherUser = User::findOrFail($id);

        // Get follower and following counts
        $followersCount = $otherUser->followers()->count();
        $followingCount = $otherUser->following()->count();

        return response()->json([
            'following' => $user->isFollowing($otherUser->id),
            'followed_by' => $otherUser->isFollowing($user->id),
            'followers_count' => $followersCount,
            'following_count' => $followingCount
        ]);
    }

    /**
     * Get followers of a specific user.
     */
    public function userFollowers(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Check if the authenticated user is the requested user or if the profile is public
        if (Auth::id() != $user->id) {
            // In the future, you might want to add privacy settings
            // For now, we'll allow viewing followers for any user
        }

        $followers = $user->followers()
            ->select('users.id', 'name', 'username', 'profile_picture')
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->get();

        return response()->json($followers);
    }

    /**
     * Get users that a specific user is following.
     */
    public function userFollowing(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Check if the authenticated user is the requested user or if the profile is public
        if (Auth::id() != $user->id) {
            // In the future, you might want to add privacy settings
            // For now, we'll allow viewing following for any user
        }

        $following = $user->following()
            ->select('users.id', 'name', 'username', 'profile_picture')
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->get();

        return response()->json($following);
    }

    /**
     * Get content from followed users (roads, collections).
     */
    public function feed(Request $request)
    {
        $user = Auth::user();
        $followedUserIds = $user->following()->pluck('users.id');

        // Get public roads from followed users
        $roads = \App\Models\SavedRoad::whereIn('user_id', $followedUserIds)
            ->where('is_public', true)
            ->with(['user:id,name,profile_picture'])
            ->withCount('reviews')
            ->latest()
            ->take(10)
            ->get();

        // Get public collections from followed users
        $collections = \App\Models\Collection::whereIn('user_id', $followedUserIds)
            ->where('is_public', true)
            ->with(['user:id,name,profile_picture', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating')
                    ->limit(3);
            }])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'roads' => $roads,
            'collections' => $collections
        ]);
    }
}
