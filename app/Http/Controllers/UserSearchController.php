<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserSearchController extends Controller
{
    /**
     * Search for users
     */
    public function search(Request $request)
    {
        try {
            $query = $request->input('query', '') ?? $request->input('q', '');
            $country = $request->input('country', '');
            $region = $request->input('region', '');
            $sortBy = $request->input('sort_by', 'popular'); // popular, newest, most_roads, most_followers
            $limit = $request->input('limit', 20);
            $currentUserId = Auth::id();

            $users = User::query()
                ->select('users.id', 'users.name', 'users.username', 'users.created_at')
                ->withCount([
                    'savedRoads as public_roads_count' => function($q) {
                        $q->where('is_public', true);
                    }
                ])
                ->withCount('followers as followers_count')
                ->withCount('following as following_count')
                ->withCount([
                    'collections as collections_count' => function($q) {
                        $q->where('is_public', true);
                    }
                ]);

            // Search by name, username, or email
            if ($query) {
                $users->where(function($q) use ($query) {
                    $q->where('name', 'LIKE', "%{$query}%")
                      ->orWhere('username', 'LIKE', "%{$query}%")
                      ->orWhere('email', 'LIKE', "%{$query}%");
                });
            }

            // Filter by country/region based on saved roads
            if ($country || $region) {
                $users->whereHas('savedRoads', function($q) use ($country, $region) {
                    $q->where('is_public', true);
                    if ($country) {
                        $q->where('country', $country);
                    }
                    if ($region) {
                        $q->where('region', $region);
                    }
                });
            }

            // Exclude current user
            if ($currentUserId) {
                $users->where('users.id', '!=', $currentUserId);
            }

            // Get results first (withCount creates aliases)
            $results = $users->get();

            // Sort in PHP (PostgreSQL doesn't allow alias in ORDER BY)
            switch ($sortBy) {
                case 'newest':
                    $results = $results->sortByDesc('created_at')->values();
                    break;
                case 'most_roads':
                    $results = $results->sortByDesc('public_roads_count')->values();
                    break;
                case 'most_followers':
                    $results = $results->sortByDesc('followers_count')->values();
                    break;
                case 'popular':
                default:
                    // Popular = combination of followers and roads
                    $results = $results->sortByDesc(function($user) {
                        return ($user->followers_count ?? 0) * 2 + ($user->public_roads_count ?? 0);
                    })->values();
                    break;
            }

            // Apply limit after sorting
            $results = $results->take($limit);

            // Remove sensitive fields from public response
            $results = $results->map(function($user) {
                unset($user->email);
                return $user;
            });

            // Add follow status if authenticated
            if ($currentUserId) {
                $currentUser = User::find($currentUserId);
                if ($currentUser) {
                    $results->each(function($user) use ($currentUser) {
                        $user->is_following = $currentUser->isFollowing($user->id);
                    });
                }
            }

            return response()->json([
                'users' => $results,
                'total' => $results->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('UserSearchController::search error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to search users',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user recommendations
     */
    public function recommendations(Request $request)
    {
        try {
            $currentUser = Auth::user();
            if (!$currentUser) {
                return response()->json(['users' => []]);
            }

            $limit = $request->input('limit', 10);
            $type = $request->input('type', 'all'); // all, similar_interests, same_location, popular

            $recommendations = collect();

            // 1. Similar Interests - Users with similar saved roads/collections
            if ($type === 'all' || $type === 'similar_interests') {
                $similarUsers = $this->getSimilarInterestUsers($currentUser, $limit);
                $recommendations = $recommendations->merge($similarUsers);
            }

            // 2. Same Location - Users from same country/region
            if ($type === 'all' || $type === 'same_location') {
                $locationUsers = $this->getSameLocationUsers($currentUser, $limit);
                $recommendations = $recommendations->merge($locationUsers);
            }

            // 3. Popular Users - Most followed users
            if ($type === 'all' || $type === 'popular') {
                $popularUsers = $this->getPopularUsers($currentUser, $limit);
                $recommendations = $recommendations->merge($popularUsers);
            }

            // Remove duplicates and users already followed
            $followedIds = $currentUser->following()->pluck('users.id')->toArray();
            $recommendations = $recommendations
                ->unique('id')
                ->reject(function($user) use ($followedIds, $currentUser) {
                    return in_array($user->id, $followedIds) || $user->id === $currentUser->id;
                })
                ->take($limit)
                ->values();

            // Add follow status
            /** @var \App\Models\User $user */
            $recommendations = $recommendations->map(function($user) use ($currentUser) {
                $user->is_following = $currentUser->isFollowing($user->id);
                return $user;
            });

            return response()->json([
                'users' => $recommendations,
                'type' => $type
            ]);
        } catch (\Exception $e) {
            \Log::error('UserSearchController::recommendations error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to get user recommendations',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get users with similar interests (similar roads/collections)
     */
    private function getSimilarInterestUsers($currentUser, $limit)
    {
        // Get current user's public roads
        $userRoadIds = $currentUser->savedRoads()
            ->where('is_public', true)
            ->pluck('id');

        if ($userRoadIds->isEmpty()) {
            return collect();
        }

        // Find users who have saved similar roads
        $similarUsers = User::query()
            ->select('users.id', 'users.name', 'users.username')
            ->where('users.id', '!=', $currentUser->id)
            ->whereHas('savedRoads', function($q) use ($userRoadIds) {
                $q->whereIn('saved_roads.id', $userRoadIds)
                  ->where('is_public', true);
            })
            ->withCount([
                'savedRoads as public_roads_count' => function($q) {
                    $q->where('is_public', true);
                },
                'followers as followers_count'
            ])
            ->whereNotIn('users.id', $currentUser->following()->pluck('users.id'))
            ->orderBy('public_roads_count', 'desc')
            ->limit($limit)
            ->get();

        return $similarUsers;
    }

    /**
     * Get users from same location
     */
    private function getSameLocationUsers($currentUser, $limit)
    {
        // Get current user's most common country/region from their roads
        $userLocation = DB::table('saved_roads')
            ->where('user_id', $currentUser->id)
            ->where('is_public', true)
            ->whereNotNull('country')
            ->select('country', DB::raw('count(*) as count'))
            ->groupBy('country')
            ->orderBy('count', 'desc')
            ->first();

        if (!$userLocation) {
            return collect();
        }

        $locationUsers = User::query()
            ->select('users.id', 'users.name', 'users.username')
            ->where('users.id', '!=', $currentUser->id)
            ->whereHas('savedRoads', function($q) use ($userLocation) {
                $q->where('country', $userLocation->country)
                  ->where('is_public', true);
            })
            ->withCount([
                'savedRoads as public_roads_count' => function($q) {
                    $q->where('is_public', true);
                },
                'followers as followers_count'
            ])
            ->whereNotIn('users.id', $currentUser->following()->pluck('users.id'))
            ->orderBy('public_roads_count', 'desc')
            ->limit($limit)
            ->get();

        return $locationUsers;
    }

    /**
     * Get popular users (most followed)
     */
    private function getPopularUsers($currentUser, $limit)
    {
        $popularUsers = User::query()
            ->select('users.id', 'users.name', 'users.username')
            ->where('users.id', '!=', $currentUser->id)
            ->withCount([
                'savedRoads as public_roads_count' => function($q) {
                    $q->where('is_public', true);
                },
                'followers as followers_count',
                'following as following_count'
            ])
            ->whereNotIn('users.id', $currentUser->following()->pluck('users.id'))
            ->orderBy('followers_count', 'desc')
            ->orderBy('public_roads_count', 'desc')
            ->limit($limit)
            ->get()
            ->filter(function($user) {
                return $user->followers_count > 0;
            });

        return $popularUsers;
    }
}

