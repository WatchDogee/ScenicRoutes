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
        $user = Auth::user();
        $collections = $user->collections()
            ->with(['user:id,name,profile_picture', 'tags', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating')
                    ->limit(3); 
            }])
            ->get();

        return response()->json($collections);
    }
public function publicCollections(Request $request)
    {
        $country = $request->input('country');
        $query = $request->input('query');
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
    }
public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_public' => 'boolean',
            'cover_image' => 'nullable|image|max:5120', 
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
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_public' => 'sometimes|boolean',
            'cover_image' => 'nullable|image|max:5120', 
        ]);

        
        if ($request->hasFile('cover_image')) {
            
            if ($collection->cover_image) {
                Storage::disk('public')->delete($collection->cover_image);
            }

            $path = $request->file('cover_image')->store('collection-covers', 'public');
            $collection->cover_image = $path;
        }

        $collection->fill($validatedData);
        $collection->save();

        return response()->json([
            'message' => 'Collection updated successfully',
            'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
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

        
        if ($collection->roads()->where('saved_road_id', $validatedData['road_id'])->exists()) {
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

            
            $maxOrder = $collection->roads()->max('order') ?? -1;
            $order = $maxOrder + 1;

            Log::info('Starting order', [
                'max_order' => $maxOrder,
                'new_order' => $order
            ]);

            
            foreach ($validatedData['road_ids'] as $roadId) {
                
                if ($collection->roads()->where('saved_road_id', $roadId)->exists()) {
                    Log::info('Road already in collection, skipping', [
                        'road_id' => $roadId
                    ]);
                    continue;
                }

                Log::info('Attaching road to collection', [
                    'road_id' => $roadId,
                    'order' => $order
                ]);

                $collection->roads()->attach($roadId, ['order' => $order++]);
            }

            
            $collection = Collection::with(['user:id,name,profile_picture', 'roads'])->find($id);

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
                'cover_image' => 'required|image|max:5120', 
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

            
            if ($collection->roads()->where('saved_road_id', $roadId)->exists()) {
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
    }
public function getCollectionsByTag(Request $request)
    {
        $tagId = $request->input('tag_id');
        $tagName = $request->input('tag_name');

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
    }
}
