<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TagController extends Controller
{
    /**
     * Display a listing of the tags.
     */
    public function index()
    {
        $tags = Tag::all();
        return response()->json($tags);
    }

    /**
     * Store a newly created tag in storage.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|string|max:255',
        ]);

        // Generate a slug from the name
        $validatedData['slug'] = Str::slug($validatedData['name']);

        // Check if the slug already exists
        if (Tag::where('slug', $validatedData['slug'])->exists()) {
            return response()->json([
                'message' => 'A tag with this name already exists',
                'errors' => ['name' => ['A tag with this name already exists']]
            ], 422);
        }

        $tag = Tag::create($validatedData);

        return response()->json([
            'message' => 'Tag created successfully',
            'tag' => $tag
        ], 201);
    }

    /**
     * Display the specified tag.
     */
    public function show($id)
    {
        $tag = Tag::findOrFail($id);
        return response()->json($tag);
    }

    /**
     * Update the specified tag in storage.
     */
    public function update(Request $request, $id)
    {
        $tag = Tag::findOrFail($id);

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|string|max:255',
        ]);

        // Generate a new slug if the name has changed
        if ($tag->name !== $validatedData['name']) {
            $validatedData['slug'] = Str::slug($validatedData['name']);

            // Check if the new slug already exists (excluding the current tag)
            if (Tag::where('slug', $validatedData['slug'])->where('id', '!=', $id)->exists()) {
                return response()->json([
                    'message' => 'A tag with this name already exists',
                    'errors' => ['name' => ['A tag with this name already exists']]
                ], 422);
            }
        }

        $tag->update($validatedData);

        return response()->json([
            'message' => 'Tag updated successfully',
            'tag' => $tag
        ]);
    }

    /**
     * Remove the specified tag from storage.
     */
    public function destroy($id)
    {
        $tag = Tag::findOrFail($id);
        $tag->delete();

        return response()->json([
            'message' => 'Tag deleted successfully'
        ]);
    }

    /**
     * Get all roads with a specific tag.
     */
    public function getRoads($id)
    {
        $tag = Tag::findOrFail($id);
        $roads = $tag->roads()->with('user:id,name,profile_picture')->get();

        return response()->json($roads);
    }

    /**
     * Get all collections with a specific tag.
     */
    public function getCollections($id)
    {
        $tag = Tag::findOrFail($id);
        $collections = $tag->collections()->with('user:id,name,profile_picture')->get();

        return response()->json($collections);
    }

    /**
     * Add tags to a road.
     */
    public function addTagsToRoad(Request $request, $roadId)
    {
        $road = \App\Models\SavedRoad::findOrFail($roadId);

        // Check if the user owns this road
        if ($road->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'tags' => 'required|array',
            'tags.*' => 'exists:tags,id'
        ]);

        $road->tags()->sync($validatedData['tags'], false);

        return response()->json([
            'message' => 'Tags added to road successfully',
            'road' => $road->load('tags')
        ]);
    }

    /**
     * Add tags to a collection.
     */
    public function addTagsToCollection(Request $request, $collectionId)
    {
        $collection = \App\Models\Collection::findOrFail($collectionId);

        // Check if the user owns this collection
        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'tags' => 'required|array',
            'tags.*' => 'exists:tags,id'
        ]);

        $collection->tags()->sync($validatedData['tags'], false);

        return response()->json([
            'message' => 'Tags added to collection successfully',
            'collection' => $collection->load('tags')
        ]);
    }

    /**
     * Remove tags from a road.
     */
    public function removeTagsFromRoad(Request $request, $roadId)
    {
        $road = \App\Models\SavedRoad::findOrFail($roadId);

        // Check if the user owns this road
        if ($road->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'tags' => 'required|array',
            'tags.*' => 'exists:tags,id'
        ]);

        $road->tags()->detach($validatedData['tags']);

        return response()->json([
            'message' => 'Tags removed from road successfully',
            'road' => $road->load('tags')
        ]);
    }

    /**
     * Remove tags from a collection.
     */
    public function removeTagsFromCollection(Request $request, $collectionId)
    {
        $collection = \App\Models\Collection::findOrFail($collectionId);

        // Check if the user owns this collection
        if ($collection->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'tags' => 'required|array',
            'tags.*' => 'exists:tags,id'
        ]);

        $collection->tags()->detach($validatedData['tags']);

        return response()->json([
            'message' => 'Tags removed from collection successfully',
            'collection' => $collection->load('tags')
        ]);
    }
}
