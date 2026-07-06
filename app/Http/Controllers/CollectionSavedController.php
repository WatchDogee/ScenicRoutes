<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CollectionSavedController extends Controller
{

    public function followingCollections()
    {
        try {
            $user = Auth::user();
            $followingIds = $user->following()->pluck('users.id');
            $collections = Collection::whereIn('user_id', $followingIds)
                ->where('is_public', true)
                ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                    $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                        ->where('is_public', true)
                        ->limit(3); 
                }])
                ->withCount('roads')
                ->latest()
                ->get();
                
            return response()->json($collections);
        } catch (\Exception $e) {
            Log::error('Error fetching following collections', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch collections from followed users',
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function savedCollections(Request $request)
    {
        $user = $request->user();
        $savedIds = $user->savedCollections()
            ->wherePivot('user_id', $user->id)
            ->where('collections.user_id', '!=', $user->id)
            ->pluck('collections.id');

        $collections = \App\Models\Collection::whereIn('id', $savedIds)
            ->with('user')
            ->get();
            
        return response()->json($collections);
    }

    public function removeSavedCollection(Request $request, $id)
    {
        $user = $request->user();
        $user->savedCollections()->detach($id);
        return response()->json(['message' => 'Collection removed from your saved list.']);
    }
}
