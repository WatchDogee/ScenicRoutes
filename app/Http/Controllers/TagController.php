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
        $road = \App\Models\SavedRoad::findOrFail($roadId);

        
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
public function addTagsToCollection(Request $request, $collectionId)
    {
        $collection = \App\Models\Collection::findOrFail($collectionId);

        
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
public function removeTagsFromRoad(Request $request, $roadId)
    {
        $road = \App\Models\SavedRoad::findOrFail($roadId);

        
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
public function removeTagsFromCollection(Request $request, $collectionId)
    {
        $collection = \App\Models\Collection::findOrFail($collectionId);

        
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
