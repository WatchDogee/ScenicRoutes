<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TagController extends Controller
{

    public function index()
    {
        $tags = Tag::all();
        return response()->json($tags);
    }

    public function store(Request $request)
    {
        return response()->json([
            'message' => 'Creating custom tags is not allowed. Please use one of the predefined tags.',
            'errors' => ['name' => ['Custom tag creation is disabled']]
        ], 403);

    }
    public function show($id)
    {
        $tag = Tag::findOrFail($id);
        return response()->json($tag);
    }

    public function update(Request $request, $id)
    {
        $tag = Tag::findOrFail($id);

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|string|max:255',
        ]);

        if ($tag->name !== $validatedData['name']) {
            $validatedData['slug'] = Str::slug($validatedData['name']);

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

    public function destroy($id)
    {
        $tag = Tag::findOrFail($id);
        $tag->delete();

        return response()->json([
            'message' => 'Tag deleted successfully'
        ]);
    }

    public function getRoads($id)
    {
        $tag = Tag::findOrFail($id);
        $roads = $tag->roads()->with('user:id,name,profile_picture')->get();

        return response()->json($roads);
    }


    public function getCollections($id)
    {
        $tag = Tag::findOrFail($id);
        $collections = $tag->collections()->with('user:id,name,profile_picture')->get();

        return response()->json($collections);
    }

    public function addTagsToRoad(Request $request, $roadId)
    {
        try {
            $road = \App\Models\SavedRoad::findOrFail($roadId);

            if ($road->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $validatedData = $request->validate([
                'tags' => 'required|array',
            ]);

            // Handle both tag names (strings) and tag IDs (integers)
            $tagIds = [];
            foreach ($validatedData['tags'] as $tag) {
                if (is_numeric($tag)) {
                    // It's a tag ID
                    $tagIds[] = (int)$tag;
                } else {
                    // It's a tag name - find or create the tag
                    $tagModel = Tag::firstOrCreate(
                        ['name' => $tag],
                        ['slug' => Str::slug($tag), 'type' => 'user']
                    );
                    $tagIds[] = $tagModel->id;
                }
            }

            // Validate all tag IDs exist
            $existingTags = Tag::whereIn('id', $tagIds)->pluck('id')->toArray();
            $invalidTags = array_diff($tagIds, $existingTags);
            if (!empty($invalidTags)) {
                return response()->json(['error' => 'Some tags do not exist'], 422);
            }

            $road->tags()->sync($tagIds, false);

            return response()->json([
                'message' => 'Tags added to road successfully',
                'road' => $road->load('tags')
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to add tags to road',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function addTagsToCollection(Request $request, $collectionId)
    {
        try {
            $collection = \App\Models\Collection::findOrFail($collectionId);

            if ($collection->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $validatedData = $request->validate([
                'tags' => 'required|array',
            ]);

            // Handle both tag names (strings) and tag IDs (integers)
            $tagIds = [];
            foreach ($validatedData['tags'] as $tag) {
                if (is_numeric($tag)) {
                    // It's a tag ID
                    $tagIds[] = (int)$tag;
                } else {
                    // It's a tag name - find or create the tag
                    $tagModel = Tag::firstOrCreate(
                        ['name' => $tag],
                        ['slug' => Str::slug($tag), 'type' => 'user']
                    );
                    $tagIds[] = $tagModel->id;
                }
            }

            // Validate all tag IDs exist
            $existingTags = Tag::whereIn('id', $tagIds)->pluck('id')->toArray();
            $invalidTags = array_diff($tagIds, $existingTags);
            if (!empty($invalidTags)) {
                return response()->json(['error' => 'Some tags do not exist'], 422);
            }

            $collection->tags()->sync($tagIds, false);

            return response()->json([
                'message' => 'Tags added to collection successfully',
                'collection' => $collection->load('tags')
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to add tags to collection',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function removeTagsFromRoad(Request $request, $roadId)
    {
        try {
            $road = \App\Models\SavedRoad::findOrFail($roadId);

            if ($road->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $validatedData = $request->validate([
                'tags' => 'required|array',
            ]);

            // Handle both tag names (strings) and tag IDs (integers)
            $tagIds = [];
            foreach ($validatedData['tags'] as $tag) {
                if (is_numeric($tag)) {
                    $tagIds[] = (int)$tag;
                } else {
                    $tagModel = Tag::where('name', $tag)->first();
                    if ($tagModel) {
                        $tagIds[] = $tagModel->id;
                    }
                }
            }

            if (!empty($tagIds)) {
                $road->tags()->detach($tagIds);
            }

            return response()->json([
                'message' => 'Tags removed from road successfully',
                'road' => $road->load('tags')
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to remove tags from road',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function removeTagsFromCollection(Request $request, $collectionId)
    {
        try {
            $collection = \App\Models\Collection::findOrFail($collectionId);

            if ($collection->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            $validatedData = $request->validate([
                'tags' => 'required|array',
            ]);

            // Handle both tag names (strings) and tag IDs (integers)
            $tagIds = [];
            foreach ($validatedData['tags'] as $tag) {
                if (is_numeric($tag)) {
                    $tagIds[] = (int)$tag;
                } else {
                    $tagModel = Tag::where('name', $tag)->first();
                    if ($tagModel) {
                        $tagIds[] = $tagModel->id;
                    }
                }
            }

            if (!empty($tagIds)) {
                $collection->tags()->detach($tagIds);
            }

            return response()->json([
                'message' => 'Tags removed from collection successfully',
                'collection' => $collection->load('tags')
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to remove tags from collection',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
