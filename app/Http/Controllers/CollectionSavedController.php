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
public function savedCollections()
    {
        try {
            $user = Auth::user();
            
            
            
            
            
            return response()->json([]);
        } catch (\Exception $e) {
            Log::error('Error fetching saved collections', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch saved collections',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
