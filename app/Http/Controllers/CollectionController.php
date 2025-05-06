<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\SavedRoad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CollectionController extends Controller
{
    /**
     * Display a listing of the collections.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $collections = $user->collections()
            ->with(['user:id,name,profile_picture', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating')
                    ->limit(3); // Just get a few roads for preview
            }])
            ->get();

        return response()->json($collections);
    }

    /**
     * Display a listing of public collections.
     */
    public function publicCollections(Request $request)
    {
        $collections = Collection::where('is_public', true)
            ->with(['user:id,name,profile_picture', 'roads' => function($query) {
                $query->select('saved_roads.id', 'road_name', 'road_coordinates', 'length', 'average_rating')
                    ->limit(3); // Just get a few roads for preview
            }])
            ->latest()
            ->paginate(10);

        return response()->json($collections);
    }

    /**
     * Store a newly created collection.
     */
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

        // Handle cover image upload
        if ($request->hasFile('cover_image')) {
            $path = $request->file('cover_image')->store('collection-covers', 'public');
            $collection->cover_image = $path;
        }

        $collection->save();

        // Add roads to collection if provided
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

    /**
     * Display the specified collection.
     */
    public function show($id)
    {
        $collection = Collection::with([
            'user:id,name,profile_picture',
            'roads.user:id,name,profile_picture',
            'roads.reviews' => function($query) {
                $query->latest()->limit(3);
            },
            'roads.reviews.user:id,name,profile_picture'
        ])->findOrFail($id);

        // Check if user can view this collection
        if (!$collection->is_public && $collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($collection);
    }

    /**
     * Update the specified collection.
     */
    public function update(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);

        // Check if user owns this collection
        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_public' => 'sometimes|boolean',
            'cover_image' => 'nullable|image|max:5120', // 5MB max
        ]);

        // Handle cover image upload
        if ($request->hasFile('cover_image')) {
            // Delete old image if exists
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

    /**
     * Remove the specified collection.
     */
    public function destroy($id)
    {
        $collection = Collection::findOrFail($id);

        // Check if user owns this collection
        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Delete cover image if exists
        if ($collection->cover_image) {
            Storage::disk('public')->delete($collection->cover_image);
        }

        $collection->delete();

        return response()->json(['message' => 'Collection deleted successfully']);
    }

    /**
     * Add a road to a collection.
     */
    public function addRoad(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);

        // Check if user owns this collection
        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'road_id' => 'required|exists:saved_roads,id',
            'order' => 'nullable|integer',
        ]);

        // Check if road is already in collection
        if ($collection->roads()->where('saved_road_id', $validatedData['road_id'])->exists()) {
            return response()->json(['error' => 'Road already in collection'], 422);
        }

        // Get the order (use the highest existing order + 1 if not provided)
        $order = $validatedData['order'] ?? $collection->roads()->max('order') + 1;

        $collection->roads()->attach($validatedData['road_id'], ['order' => $order]);

        return response()->json([
            'message' => 'Road added to collection successfully',
            'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
        ]);
    }

    /**
     * Remove a road from a collection.
     */
    public function removeRoad(Request $request, $id, $roadId)
    {
        $collection = Collection::findOrFail($id);

        // Check if user owns this collection
        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $collection->roads()->detach($roadId);

        return response()->json([
            'message' => 'Road removed from collection successfully',
            'collection' => $collection->load(['user:id,name,profile_picture', 'roads'])
        ]);
    }

    /**
     * Reorder roads in a collection.
     */
    public function reorderRoads(Request $request, $id)
    {
        $collection = Collection::findOrFail($id);

        // Check if user owns this collection
        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'road_orders' => 'required|array',
            'road_orders.*.id' => 'required|exists:saved_roads,id',
            'road_orders.*.order' => 'required|integer',
        ]);

        // Update the order of each road
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
}
