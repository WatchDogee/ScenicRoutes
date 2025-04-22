<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SavedRoad;

class SavedRoadController extends Controller
{
    public function index()
    {
        return auth()->user()->savedRoads()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'road_name' => 'required|string|max:255',
            'coordinates' => 'required|array',
        ]);

        $road = auth()->user()->savedRoads()->create($data);
        return response()->json($road, 201);
    }

    public function destroy(SavedRoad $road)
    {
        $road->delete();
        return response()->json(['message' => 'Road deleted successfully.']);
    }
}