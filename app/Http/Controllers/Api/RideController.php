<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RideController extends Controller
{
    /**
     * Get all rides for authenticated user
     */
    public function index(Request $request)
    {
        $rides = Ride::where('user_id', $request->user()->id)
            ->orderBy('started_at', 'desc')
            ->get();
        
        return response()->json([
            'rides' => $rides
        ]);
    }

    /**
     * Store a newly recorded ride
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'uuid' => 'required|string|unique:rides,uuid',
            'linked_route_id' => 'nullable|string',
            'started_at' => 'required|date_format:Y-m-d H:i:s',
            'ended_at' => 'required|date_format:Y-m-d H:i:s|after:started_at',
            'distance_meters' => 'required|numeric|min:0',
            'duration_seconds' => 'required|integer|min:0',
            'average_speed' => 'required|numeric|min:0',
            'max_speed' => 'required|numeric|min:0',
            'points' => 'required|array',
        ]);
        
        $ride = Ride::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'synced' => true,
        ]);
        
        return response()->json($ride, Response::HTTP_CREATED);
    }

    /**
     * Get a specific ride
     */
    public function show(Request $request, Ride $ride)
    {
        // Ensure user owns this ride
        if ($ride->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }
        
        return response()->json($ride);
    }

    /**
     * Update a ride
     */
    public function update(Request $request, Ride $ride)
    {
        // Ensure user owns this ride
        if ($ride->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }
        
        $validated = $request->validate([
            'linked_route_id' => 'nullable|string',
            'synced' => 'boolean',
        ]);
        
        $ride->update($validated);
        
        return response()->json($ride);
    }

    /**
     * Delete a ride
     */
    public function destroy(Request $request, Ride $ride)
    {
        // Ensure user owns this ride
        if ($ride->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }
        
        $ride->delete();
        
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
    
    /**
     * Get unsynced rides for the app to sync
     */
    public function unsynced(Request $request)
    {
        $rides = Ride::where('user_id', $request->user()->id)
            ->where('synced', false)
            ->get();
        
        return response()->json([
            'rides' => $rides
        ]);
    }
}
