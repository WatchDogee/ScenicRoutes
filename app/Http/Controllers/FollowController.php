<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class FollowController extends Controller
{
    // Utility: forcibly detach all follow relationships for a user (for debugging/fixing stuck follows)
    public function detachAllFollowing(Request $request)
    {
        $user = Auth::user();
        $count = $user->following()->count();
        $user->following()->detach();
        Log::info("Detached all following relationships", [
            'user_id' => $user->id,
            'detached_count' => $count
        ]);
        return response()->json(['message' => "Detached $count following relationships."]);
    }

    public function follow(Request $request, $id)
    {
        $user = Auth::user();
        $userToFollow = User::findOrFail($id);

        if ($user->id === $userToFollow->id) {
            return response()->json(['error' => 'You cannot follow yourself'], 422);
        }

        if ($user->isFollowing($userToFollow->id)) {
            return response()->json(['error' => 'You are already following this user'], 422);
        }

        $user->following()->attach($userToFollow->id);

        return response()->json([
            'message' => 'You are now following ' . $userToFollow->name,
            'following' => true
        ]);
    }


    public function unfollow(Request $request, $id)
    {
        $user = Auth::user();
        $userToUnfollow = User::findOrFail($id);

        Log::info("Unfollow request", [
            'user_id' => $user->id,
            'target_user_id' => $userToUnfollow->id,
            'is_following' => $user->isFollowing($userToUnfollow->id)
        ]);

        if (!$user->isFollowing($userToUnfollow->id)) {
            Log::warning("Unfollow failed: not following", [
                'user_id' => $user->id,
                'target_user_id' => $userToUnfollow->id
            ]);
            return response()->json(['error' => 'You are not following this user'], 422);
        }

        $detached = $user->following()->detach($userToUnfollow->id);
        Log::info("Detach result", [
            'user_id' => $user->id,
            'target_user_id' => $userToUnfollow->id,
            'detached' => $detached
        ]);

        Log::info("Unfollowed successfully", [
            'user_id' => $user->id,
            'target_user_id' => $userToUnfollow->id
        ]);

        return response()->json([
            'message' => 'You have unfollowed ' . $userToUnfollow->name,
            'following' => false
        ]);
    }

    public function following(Request $request)
    {
        $user = Auth::user();
        
        // Check if profile_picture column exists before selecting
        $hasProfilePictureColumn = \Illuminate\Support\Facades\Schema::hasColumn('users', 'profile_picture');
        $selectFields = ['users.id', 'name', 'username'];
        if ($hasProfilePictureColumn) {
            $selectFields[] = 'profile_picture';
        }
        
        $following = $user->following()
            ->select($selectFields)
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->paginate(20);

        Log::info("Following list requested", [
            'user_id' => $user->id,
            'count' => $following->count(),
            'total' => $following->total()
        ]);

        return response()->json($following);
    }

    public function followers(Request $request)
    {
        $user = Auth::user();
        
        // Check if profile_picture column exists before selecting
        $hasProfilePictureColumn = \Illuminate\Support\Facades\Schema::hasColumn('users', 'profile_picture');
        $selectFields = ['users.id', 'name', 'username'];
        if ($hasProfilePictureColumn) {
            $selectFields[] = 'profile_picture';
        }
        
        $followers = $user->followers()
            ->select($selectFields)
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->paginate(20);

        return response()->json($followers);
    }

    public function status(Request $request, $id)
    {
        $user = Auth::user();
        $otherUser = User::findOrFail($id);

        $followersCount = $otherUser->followers()->count();
        $followingCount = $otherUser->following()->count();

        return response()->json([
            'following' => $user->isFollowing($otherUser->id),
            'followed_by' => $otherUser->isFollowing($user->id),
            'followers_count' => $followersCount,
            'following_count' => $followingCount
        ]);
    }

    public function userFollowers(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if (Auth::id() != $user->id) {
        }

        $followers = $user->followers()
            ->select('users.id', 'name', 'username')
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->get();

        return response()->json($followers);
    }

    public function userFollowing(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if (Auth::id() != $user->id) {
        }

        // Check if profile_picture column exists before selecting
        $hasProfilePictureColumn = \Illuminate\Support\Facades\Schema::hasColumn('users', 'profile_picture');
        $selectFields = ['users.id', 'name', 'username'];
        if ($hasProfilePictureColumn) {
            $selectFields[] = 'profile_picture';
        }
        
        $following = $user->following()
            ->select($selectFields)
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->get();

        return response()->json($following);
    }

    public function feed(Request $request)
    {
        $user = Auth::user();
        $followedUserIds = $user->following()->pluck('users.id');

        Log::info("Feed requested", [
            'user_id' => $user->id,
            'following_count' => $followedUserIds->count(),
            'followed_user_ids' => $followedUserIds->toArray()
        ]);

        // Only select essential fields to minimize JSON payload
        $roads = \App\Models\SavedRoad::whereIn('user_id', $followedUserIds)
            ->where('is_public', true)
            ->select('id', 'user_id', 'road_name', 'length', 'average_rating', 'updated_at')
            ->with(['user:id,name,username'])
            ->withCount('reviews')
            ->latest()
            ->take(10)
            ->get();

        // Only select essential fields for collections and limit roads
        $collections = \App\Models\Collection::whereIn('user_id', $followedUserIds)
            ->where('is_public', true)
            ->select('id', 'user_id', 'name', 'description', 'updated_at')
            ->with(['user:id,name', 'roads' => function($query) {
                // Only select minimal fields from roads
                $query->select('saved_roads.id', 'road_name', 'length')
                    ->limit(3);
            }])
            ->latest()
            ->take(5)
            ->get();

        Log::info("Feed response", [
            'user_id' => $user->id,
            'roads_count' => $roads->count(),
            'collections_count' => $collections->count()
        ]);

        return response()->json([
            'roads' => $roads,
            'collections' => $collections
        ]);
    }
}
