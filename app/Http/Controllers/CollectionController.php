<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\SavedRoad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class CollectionController extends Controller
{

    public function index(Request $request)
    {
        // CRITICAL FIX: /api/collections should ONLY return the current user's collections
        // This is the "My Collections" endpoint and must NOT expose other users' collections
        
        if (!auth()->check()) {
            // Unauthenticated users cannot access this endpoint
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $query = Collection::query()
            ->where('user_id', auth()->id()) // ONLY return current user's collections
            ->with(['user:id,name,profile_picture', 'tags'])
            ->withCount(['roads', 'reviews'])
            ->withAvg('reviews', 'rating');

        if ($request->has('username')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('username', 'like', '%' . $request->username . '%')
                  ->orWhere('name', 'like', '%' . $request->username . '%');
            });
        }

        if ($request->has('query')) {
            $searchTerm = $request->query;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', '%' . $searchTerm . '%')
                  ->orWhere('description', 'like', '%' . $searchTerm . '%');
            });
        }

        if ($request->has('tags')) {
            $tagIds = explode(',', $request->tags);
            $query->whereHas('tags', function ($q) use ($tagIds) {
                $q->whereIn('tags.id', $tagIds);
            });
        }

        if ($request->has('country')) {
            $query->where('country', $request->country);
        }

        $perPage = $request->input('per_page', 20);
        $collections = $query->latest()->paginate($perPage);

        return response()->json($collections);
    }

    public function publicCollections(Request $request)
    {
        try {
            $country = $request->input('country');
            $query = $request->input('query') ?? $request->input('search');
            $tagIds = $request->input('tags') ? explode(',', $request->input('tags')) : null;

            $collectionsQuery = Collection::where('is_public', true);

            if ($query) {
                $collectionsQuery->where(function($q) use ($query) {
                    $q->where('name', 'like', "%{$query}%")
                      ->orWhere('description', 'like', "%{$query}%");
                });
            }

            if ($tagIds) {
                $collectionsQuery->whereHas('tags', function($q) use ($tagIds) {
                    $q->whereIn('tags.id', $tagIds);
                });
            }

            if ($country) {
                $collectionsQuery->whereHas('roads', function($q) use ($country) {
                    $q->where('country', $country);
                });
            }

            $collections = $collectionsQuery
                ->with([
                    'user:id,name,profile_picture',
                    'tags',
                    'roads' => function($query) {
                        $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                            ->limit(3); 
                    }
                ])
                ->latest()
                ->paginate(10);

            return response()->json($collections);
        } catch (\Exception $e) {
            Log::error('CollectionController::publicCollections error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch collections', 'collections' => []], 500);
        }
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_public' => 'boolean',
            'cover_image' => 'nullable|image|max:5120', // 5MB max
            'road_ids' => 'nullable|array',
            'road_ids.*' => 'exists:saved_roads,id',
        ]);

        $collection = new Collection([
            'user_id' => Auth::id(),
            'name' => $validatedData['name'],
            'description' => $validatedData['description'] ?? null,
            'is_public' => $validatedData['is_public'] ?? false,
        ]);

        if ($request->hasFile('cover_image')) {
            $path = $request->file('cover_image')->store('collection-covers', 'public');
            $collection->cover_image = $path;
        }

        $collection->save();

        if (!empty($validatedData['road_ids'])) {
            $order = 0;
            foreach ($validatedData['road_ids'] as $roadId) {
                $collection->roads()->attach($roadId, ['order' => $order++]);
            }
        }

        return response()->json([
            'message' => 'Collection created successfully',
            'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
        ], 201);
    }

    public function show($id)
    {
        $collection = Collection::with([
            'user:id,name,profile_picture',
            'tags',
            'roads.user:id,name,profile_picture',
            'roads.tags',
            'roads.reviews' => function($query) {
                $query->latest()->limit(3);
            },
            'roads.reviews.user:id,name,profile_picture'
        ])->findOrFail($id);

        if (!$collection->is_public && $collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($collection);
    }

    public function update(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);

        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_public' => 'required|boolean',
            'tags' => 'nullable|string', 
        ]);

        $collection->name = $validatedData['name'];
        $collection->description = $validatedData['description'];
        $collection->is_public = $validatedData['is_public'];
        $collection->save();

        if ($request->has('tags')) {
            $tagIds = json_decode($request->input('tags'), true);
            if (is_array($tagIds)) {
                $collection->tags()->sync($tagIds);
            }
        }

        $collection = $collection->fresh(['user:id,name,profile_picture', 'roads', 'tags']);

        return response()->json([
            'message' => 'Collection updated successfully',
            'collection' => $collection
        ]);
    }

    public function destroy($id)
    {
        $collection = Collection::findOrFail($id);

        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($collection->cover_image) {
            Storage::disk('public')->delete($collection->cover_image);
        }

        $collection->delete();

        return response()->json(['message' => 'Collection deleted successfully']);
    }

    public function addRoad(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);

        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'road_id' => 'required|exists:saved_roads,id',
            'order' => 'nullable|integer',
        ]);

        if ($collection->roads()->where('road_id', $validatedData['road_id'])->exists()) {
            return response()->json(['error' => 'Road already in collection'], 422);
        }

        $order = $validatedData['order'] ?? $collection->roads()->max('order') + 1;

        $collection->roads()->attach($validatedData['road_id'], ['order' => $order]);

        return response()->json([
            'message' => 'Road added to collection successfully',
            'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
        ]);
    }

    public function addRoads(Request $request, $id)
    {
        try {
            Log::info('Adding roads to collection', [
                'collection_id' => $id,
                'request_data' => $request->all(),
                'user_id' => Auth::id()
            ]);

            $collection = Collection::findOrFail($id);

            Log::info('Collection found', [
                'collection' => $collection->toArray()
            ]);

            if ($collection->user_id !== Auth::id()) {
                Log::warning('Unauthorized attempt to add roads to collection', [
                    'collection_user_id' => $collection->user_id,
                    'auth_user_id' => Auth::id()
                ]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $validatedData = $request->validate([
                'road_ids' => 'required|array',
                'road_ids.*' => 'exists:saved_roads,id',
            ]);

            Log::info('Validated data', [
                'road_ids' => $validatedData['road_ids']
            ]);

            foreach ($validatedData['road_ids'] as $roadId) {
                if ($collection->roads()->where('road_id', $roadId)->exists()) {
                    Log::info('Road already in collection, skipping', [
                        'road_id' => $roadId
                    ]);
                    continue;
                }

                Log::info('Attaching road to collection', [
                    'road_id' => $roadId
                ]);

                $collection->roads()->attach($roadId);
            }

            // Reload collection with all relationships to match the show() method
            $collection = Collection::with([
                'user:id,name,profile_picture',
                'tags',
                'roads.user:id,name,profile_picture',
                'roads.tags',
                'roads.reviews' => function($query) {
                    $query->latest()->limit(3);
                },
                'roads.reviews.user:id,name,profile_picture'
            ])->find($id);

            Log::info('Roads added successfully', [
                'collection_id' => $id,
                'road_count' => $collection->roads->count()
            ]);

            return response()->json([
                'message' => 'Roads added to collection successfully',
                'collection' => $collection
            ]);
        } catch (\Exception $e) {
            Log::error('Error adding roads to collection', [
                'collection_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to add roads to collection',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function removeRoad(Request $request, $id, $roadId)
    {
        $collection = Collection::findOrFail($id);

        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $collection->roads()->detach($roadId);

        return response()->json([
            'message' => 'Road removed from collection successfully',
            'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
        ]);
    }

    public function reorderRoads(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);

        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'road_orders' => 'required|array',
            'road_orders.*.id' => 'required|exists:saved_roads,id',
            'road_orders.*.order' => 'required|integer',
        ]);

        foreach ($validatedData['road_orders'] as $roadOrder) {
            $collection->roads()->updateExistingPivot(
                $roadOrder['id'],
                ['order' => $roadOrder['order']]
            );
        }

        return response()->json([
            'message' => 'Roads reordered successfully',
            'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
        ]);
    }

    public function uploadCoverImage(Request $request, $id)
    {
        try {
            Log::info('Uploading cover image for collection', [
                'collection_id' => $id,
                'user_id' => Auth::id(),
                'has_file' => $request->hasFile('cover_image'),
                'content_type' => $request->header('Content-Type'),
                'all_headers' => $request->headers->all(),
                'all_files' => $request->allFiles(),
                'all_inputs' => $request->all()
            ]);

            $collection = Collection::findOrFail($id);

            if ($collection->user_id !== Auth::id()) {
                Log::warning('Unauthorized attempt to upload cover image', [
                    'collection_user_id' => $collection->user_id,
                    'auth_user_id' => Auth::id()
                ]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            if (!$request->hasFile('cover_image')) {
                Log::error('No cover image file in request', [
                    'collection_id' => $id,
                    'request_files' => $request->allFiles(),
                    'request_all' => $request->all()
                ]);
                return response()->json([
                    'error' => 'No cover image file found in request',
                    'message' => 'Please select an image file to upload'
                ], 400);
            }

            $validatedData = $request->validate([
                'cover_image' => 'required|image|max:5120', // 5MB max
            ]);

            $file = $request->file('cover_image');

            Log::info('Cover image file details', [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'error' => $file->getError()
            ]);

            if ($collection->cover_image) {
                Log::info('Deleting old cover image', [
                    'old_path' => $collection->cover_image
                ]);
                Storage::disk('public')->delete($collection->cover_image);
            }

            $path = $file->store('collection-covers', 'public');

            if (!$path) {
                Log::error('Failed to store cover image', [
                    'collection_id' => $id
                ]);
                return response()->json([
                    'error' => 'Failed to store cover image',
                    'message' => 'The server could not store the uploaded image'
                ], 500);
            }

            $collection->cover_image = $path;
            $collection->save();

            Log::info('Cover image uploaded successfully', [
                'collection_id' => $id,
                'image_path' => $path
            ]);

            return response()->json([
                'message' => 'Cover image uploaded successfully',
                'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error uploading cover image', [
                'collection_id' => $id,
                'errors' => $e->errors(),
            ]);

            return response()->json([
                'error' => 'Invalid image file',
                'message' => $e->getMessage(),
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error uploading cover image', [
                'collection_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to upload cover image',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function savePublicRoad(Request $request, $id)
    {
        try {
            $collection = Collection::findOrFail($id);

            if ($collection->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $validatedData = $request->validate([
                'road_id' => 'required|exists:saved_roads,id',
            ]);

            $roadId = $validatedData['road_id'];
            $road = \App\Models\SavedRoad::findOrFail($roadId);

            if (!$road->is_public) {
                return response()->json(['error' => 'This road is not public'], 403);
            }

            if ($collection->roads()->where('road_id', $roadId)->exists()) {
                return response()->json(['error' => 'This road is already in the collection'], 422);
            }

            $maxOrder = $collection->roads()->max('order') ?? 0;

            $collection->roads()->attach($roadId, ['order' => $maxOrder + 1]);

            return response()->json([
                'message' => 'Public road saved to collection successfully',
                'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
            ]);
        } catch (\Exception $e) {
            Log::error('Error saving public road to collection', [
                'collection_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to save public road to collection',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getCollectionsByCountry(Request $request)
    {
        try {
            $country = $request->input('country');

            if (!$country) {
                return response()->json(['error' => 'Country parameter is required'], 400);
            }

            $collections = Collection::where('is_public', true)
                ->whereHas('roads', function($query) use ($country) {
                    $query->where('country', $country)
                          ->where('is_public', true);
                })
                ->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                    $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                        ->limit(3); 
                }])
                ->latest()
                ->take(10)
                ->get();

            return response()->json($collections);
        } catch (\Exception $e) {
            Log::error('CollectionController::getCollectionsByCountry error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch collections by country', 'collections' => []], 500);
        }
    }


    public function getCollectionsByTag(Request $request)
    {
        try {
            $tagId = $request->input('tag_id');
            $tagName = $request->input('tag_name') ?? $request->input('tag');

            if (!$tagId && !$tagName) {
                return response()->json(['error' => 'Either tag_id or tag_name parameter is required'], 400);
            }

            $query = Collection::where('is_public', true);

            if ($tagId) {
                $query->whereHas('tags', function($q) use ($tagId) {
                    $q->where('tags.id', $tagId);
                });
            } else {
                $query->whereHas('tags', function($q) use ($tagName) {
                    $q->where('tags.name', 'like', "%{$tagName}%");
                });
            }

            $collections = $query->with(['user:id,name,username,profile_picture', 'tags', 'roads' => function($query) {
                    $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating', 'country', 'region')
                        ->limit(3); 
                }])
                    ->latest()
                    ->take(10)
                    ->get();

                return response()->json($collections);
        } catch (\Exception $e) {
            Log::error('CollectionController::getCollectionsByTag error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch collections by tag', 'collections' => []], 500);
        }
    }

    public function save($id)
    {
        $user = auth()->user();
        $collection = \App\Models\Collection::findOrFail($id);

        if ($collection->user_id == $user->id) {
            return response()->json(['message' => 'You cannot save your own collection.'], 403);
        }

        $user->savedCollections()->syncWithoutDetaching([$collection->id]);

        return response()->json(['message' => 'Collection saved successfully!', 'collection' => $collection]);
    }
}
