<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class FollowController extends Controller
{
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

        
        if (!$user->isFollowing($userToUnfollow->id)) {
            return response()->json(['error' => 'You are not following this user'], 422);
        }

        
        $user->following()->detach($userToUnfollow->id);

        return response()->json([
            'message' => 'You have unfollowed ' . $userToUnfollow->name,
            'following' => false
        ]);
    }
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
            ->select('users.id', 'name', 'username', 'profile_picture')
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

        $following = $user->following()
            ->select('users.id', 'name', 'username', 'profile_picture')
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

        
        $roads = \App\Models\SavedRoad::whereIn('user_id', $followedUserIds)
            ->where('is_public', true)
            ->with(['user:id,name,profile_picture'])
            ->withCount('reviews')
            ->latest()
            ->take(10)
            ->get();

        
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
