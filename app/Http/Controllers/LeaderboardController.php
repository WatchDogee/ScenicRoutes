<?php

namespace App\Http\Controllers;

use App\Models\Collection;
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
     * Get featured collections (curator collections).
     */
    public function featuredCollections(Request $request)
    {
        $limit = $request->input('limit', 10);

        $collections = Collection::where('is_public', true)
            ->where('is_featured', true)
            ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                    ->limit(3); // Just get a few roads for preview
            }])
            ->latest()
            ->take($limit)
            ->get();

        return response()->json($collections);
    }

    /**
     * Get most popular collections (collections with most roads).
     */
    public function popularCollections(Request $request)
    {
        $limit = $request->input('limit', 10);

        $collections = Collection::where('is_public', true)
            ->withCount('roads')
            ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                    ->limit(3); // Just get a few roads for preview
            }])
            ->orderBy('roads_count', 'desc')
            ->take($limit)
            ->get();

        return response()->json($collections);
    }

    /**
     * Get most diverse collections (collections with roads from multiple countries).
     */
    public function diverseCollections(Request $request)
    {
        $limit = $request->input('limit', 10);

        // Get collections with the count of distinct countries
        $collections = Collection::where('is_public', true)
            ->withCount(['roads' => function($query) {
                $query->where('is_public', true);
            }])
            ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                    ->limit(3); // Just get a few roads for preview
            }])
            ->get();

        // Calculate the number of unique countries in each collection
        $collections = $collections->map(function($collection) {
            $countries = $collection->roads->pluck('country')->filter()->unique();
            $collection->countries_count = $countries->count();
            return $collection;
        })->sortByDesc('countries_count')
          ->take($limit)
          ->values();

        return response()->json($collections);
    }

    /**
     * Get top curators (users with featured collections or high-quality collections).
     */
    public function topCurators(Request $request)
    {
        $limit = $request->input('limit', 10);

        // Get users with featured collections
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

    /**
     * Get popular roads by country.
     */
    public function popularRoadsByCountry(Request $request)
    {
        $limit = $request->input('limit', 5);
        $country = $request->input('country');

        $query = SavedRoad::where('is_public', true)
            ->with(['user:id,name,username,profile_picture', 'reviews'])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating');

        if ($country) {
            $query->where('country', $country);
        }

        $roads = $query->orderBy('average_rating', 'desc')
            ->orderBy('reviews_count', 'desc')
            ->take($limit * 10) // Get more roads to ensure we have enough for each country
            ->get();

        // Group roads by country
        $roadsByCountry = $roads->groupBy('country');

        // Format the response
        $result = [];
        foreach ($roadsByCountry as $country => $countryRoads) {
            if (!$country) continue; // Skip roads with no country

            $result[] = [
                'country' => $country,
                'roads' => $countryRoads->take($limit)
            ];
        }

        return response()->json($result);
    }

    /**
     * Get countries with the most roads.
     */
    public function countriesWithMostRoads(Request $request)
    {
        $limit = $request->input('limit', 10);

        // Get count of roads by country
        $countries = SavedRoad::where('is_public', true)
            ->select('country')
            ->selectRaw('COUNT(*) as road_count')
            ->groupBy('country')
            ->havingRaw('country IS NOT NULL AND country != ""')
            ->orderBy('road_count', 'desc')
            ->take($limit)
            ->get();

        return response()->json($countries);
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
            'popular_roads_by_country' => $this->popularRoadsByCountry($request)->original,
            'countries_with_most_roads' => $this->countriesWithMostRoads($request)->original,
            'most_active_users' => $this->mostActiveUsers($request)->original,
            'most_followed_users' => $this->mostFollowedUsers($request)->original,
            'featured_collections' => $this->featuredCollections($request)->original,
        ]);
    }
}
