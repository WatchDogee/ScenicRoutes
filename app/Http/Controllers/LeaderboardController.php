<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\SavedRoad;
use App\Models\User;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeaderboardController extends Controller
{
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
public function mostPopularRoads(Request $request)
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
                'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation',
                'view_count' 
            ]);

        return response()->json($roads);
    }
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
public function featuredCollections(Request $request)
    {
        $limit = $request->input('limit', 10);

        $collections = Collection::where('is_public', true)
            ->where('is_featured', true)
            ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                    ->limit(3); 
            }])
            ->latest()
            ->take($limit)
            ->get();

        return response()->json($collections);
    }
public function popularCollections(Request $request)
    {
        $limit = $request->input('limit', 10);

        $collections = Collection::where('is_public', true)
            ->withCount('roads')
            ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                    ->limit(3); 
            }])
            ->orderBy('roads_count', 'desc')
            ->take($limit)
            ->get();

        return response()->json($collections);
    }
public function diverseCollections(Request $request)
    {
        $limit = $request->input('limit', 10);

        
        $collections = Collection::where('is_public', true)
            ->withCount(['roads' => function($query) {
                $query->where('is_public', true);
            }])
            ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                    ->limit(3); 
            }])
            ->get();

        
        $collections = $collections->map(function($collection) {
            $countries = $collection->roads->pluck('country')->filter()->unique();
            $collection->countries_count = $countries->count();
            return $collection;
        })->sortByDesc('countries_count')
          ->take($limit)
          ->values();

        return response()->json($collections);
    }
public function topCurators(Request $request)
    {
        $limit = $request->input('limit', 10);

        
        $users = User::withCount(['collections' => function($query) {
                $query->where('is_public', true)
                      ->where('is_featured', true);
            }])
            ->withCount(['collections as public_collections_count' => function($query) {
                $query->where('is_public', true);
            }])
            ->withCount('followers')
            ->withCount('following')
            ->withCount(['savedRoads' => function($query) {
                $query->where('is_public', true);
            }])
            ->orderBy('collections_count', 'desc')
            ->take($limit)
            ->get(['id', 'name', 'username', 'profile_picture', 'bio']);

        return response()->json($users);
    }
public function popularRoadsByCountry(Request $request)
    {
        try {
            $limit = $request->input('limit', 5);
            $country = $request->input('country');

            $query = SavedRoad::where('is_public', true)
                ->with(['user:id,name,username,profile_picture'])
                ->withCount('reviews');

            
            $dbDriver = DB::connection()->getDriverName();

            if ($dbDriver === 'pgsql') {
                
                $query->leftJoin('reviews', 'saved_roads.id', '=', 'reviews.saved_road_id')
                    ->select('saved_roads.*')
                    ->selectRaw('AVG(reviews.rating) as reviews_avg_rating')
                    ->groupBy('saved_roads.id');
            } else {
                
                $query->withAvg('reviews', 'rating');
            }

            if ($country) {
                $query->where('country', $country);
            }

            
            $query->whereNotNull('country')
                ->where('country', '!=', '');

            $roads = $query->orderBy($dbDriver === 'pgsql' ? 'reviews_avg_rating' : 'reviews_avg_rating', 'desc')
                ->orderBy('reviews_count', 'desc')
                ->take($limit * 10) 
                ->get();

            
            $roadsByCountry = $roads->groupBy('country');

            
            $result = [];
            foreach ($roadsByCountry as $countryName => $countryRoads) {
                if (!$countryName) continue; 

                $result[] = [
                    'country' => $countryName,
                    'roads' => $countryRoads->take($limit)
                ];
            }

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Error fetching popular roads by country', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to fetch popular roads by country',
                'message' => $e->getMessage()
            ], 500);
        }
    }
public function countriesWithMostRoads(Request $request)
    {
        try {
            $limit = $request->input('limit', 10);

            
            $dbDriver = DB::connection()->getDriverName();

            
            $query = SavedRoad::where('is_public', true)
                ->select('country')
                ->selectRaw('COUNT(*) as road_count')
                ->groupBy('country')
                ->whereNotNull('country');

            
            if ($dbDriver === 'pgsql') {
                
                $query->whereRaw("country != ''");
            } else {
                
                $query->whereRaw("country != ''");
            }

            $countries = $query->orderBy('road_count', 'desc')
                ->take($limit)
                ->get();

            return response()->json($countries);
        } catch (\Exception $e) {
            Log::error('Error fetching countries with most roads', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to fetch countries with most roads',
                'message' => $e->getMessage()
            ], 500);
        }
    }
public function topRatedCollections(Request $request)
    {
        $limit = $request->input('limit', 10);

        $collections = Collection::where('is_public', true)
            ->whereNotNull('average_rating')
            ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                    ->limit(3); 
            }])
            ->withCount('reviews')
            ->orderBy('average_rating', 'desc')
            ->take($limit)
            ->get();

        return response()->json($collections);
    }
public function all(Request $request)
    {
        try {
            $limit = $request->input('limit', 5);
            $result = [];

            
            try {
                $result['top_rated_roads'] = $this->topRatedRoads($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching top_rated_roads for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['top_rated_roads'] = [];
            }

            try {
                $result['most_reviewed_roads'] = $this->mostReviewedRoads($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching most_reviewed_roads for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['most_reviewed_roads'] = [];
            }

            try {
                $result['most_popular_roads'] = $this->mostPopularRoads($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching most_popular_roads for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['most_popular_roads'] = [];
            }

            try {
                $result['popular_roads_by_country'] = $this->popularRoadsByCountry($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching popular_roads_by_country for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['popular_roads_by_country'] = [];
            }

            try {
                $result['countries_with_most_roads'] = $this->countriesWithMostRoads($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching countries_with_most_roads for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['countries_with_most_roads'] = [];
            }

            try {
                $result['most_active_users'] = $this->mostActiveUsers($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching most_active_users for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['most_active_users'] = [];
            }

            try {
                $result['most_followed_users'] = $this->mostFollowedUsers($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching most_followed_users for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['most_followed_users'] = [];
            }

            try {
                $result['featured_collections'] = $this->featuredCollections($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching featured_collections for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['featured_collections'] = [];
            }

            try {
                $result['top_rated_collections'] = $this->topRatedCollections($request)->original;
            } catch (\Exception $e) {
                Log::error('Error fetching top_rated_collections for leaderboard', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $result['top_rated_collections'] = [];
            }

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Error fetching leaderboard data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to fetch leaderboard data',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
