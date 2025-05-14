<?php

namespace App\Http\Controllers;

use App\Models\PointOfInterest;
use App\Models\PoiPhoto;
use App\Services\PointOfInterestService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PointOfInterestController extends Controller
{
    protected $poiService;
public function __construct(PointOfInterestService $poiService)
    {
        $this->poiService = $poiService;
    }
public function index(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        $radius = $request->input('radius', 10);
        $type = $request->input('type');
        $subtype = $request->input('subtype');

        if (!$lat || !$lon) {
            return response()->json(['error' => 'Missing coordinates'], 400);
        }

        $pois = $this->poiService->getPoisWithinRadius($lat, $lon, $radius, $type, $subtype);

        return response()->json($pois);
    }
public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:tourism,fuel,charging',
            'subtype' => 'required|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'description' => 'nullable|string',
            'properties' => 'nullable|array',
        ]);

        $poiData = [
            'name' => $data['name'],
            'type' => $data['type'],
            'subtype' => $data['subtype'],
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
            'description' => $data['description'] ?? null,
            'properties' => $data['properties'] ?? null,
        ];

        $poi = $this->poiService->savePoi($poiData, Auth::id());

        return response()->json($poi, 201);
    }
public function show($id)
    {
        $poi = PointOfInterest::with(['photos', 'user'])->findOrFail($id);

        return response()->json($poi);
    }
public function update(Request $request, $id)
    {
        $poi = PointOfInterest::findOrFail($id);

        
        if ($poi->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:tourism,fuel,charging',
            'subtype' => 'sometimes|string|max:255',
            'latitude' => 'sometimes|numeric',
            'longitude' => 'sometimes|numeric',
            'description' => 'nullable|string',
            'properties' => 'nullable|array',
        ]);

        $poi->update($data);

        return response()->json($poi);
    }
public function destroy($id)
    {
        $poi = PointOfInterest::findOrFail($id);

        
        if ($poi->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        
        foreach ($poi->photos as $photo) {
            Storage::disk('public')->delete($photo->photo_path);
        }

        $poi->delete();

        return response()->json(['message' => 'POI deleted successfully']);
    }
public function addPhoto(Request $request, $id)
    {
        $poi = PointOfInterest::findOrFail($id);

        $request->validate([
            'photo' => 'required|image|max:10240', 
            'caption' => 'nullable|string|max:255',
        ]);

        $path = $request->file('photo')->store('poi_photos', 'public');

        $photo = new PoiPhoto();
        $photo->point_of_interest_id = $poi->id;
        $photo->user_id = Auth::id();
        $photo->photo_path = $path;
        $photo->caption = $request->input('caption');
        $photo->save();

        return response()->json($photo, 201);
    }
public function fetchTourism(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        $radius = $request->input('radius', 10);
        $types = $request->input('types', []);

        if (!$lat || !$lon) {
            return response()->json(['error' => 'Missing coordinates'], 400);
        }

        $tourismObjects = $this->poiService->fetchTourismObjects($lat, $lon, $radius, $types);

        return response()->json($tourismObjects);
    }
public function fetchFuelStations(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        $radius = $request->input('radius', 10);

        if (!$lat || !$lon) {
            return response()->json(['error' => 'Missing coordinates'], 400);
        }

        $fuelStations = $this->poiService->fetchFuelStations($lat, $lon, $radius);

        return response()->json($fuelStations);
    }
public function fetchChargingStations(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        $radius = $request->input('radius', 10);

        if (!$lat || !$lon) {
            return response()->json(['error' => 'Missing coordinates'], 400);
        }

        $chargingStations = $this->poiService->fetchChargingStations($lat, $lon, $radius);

        return response()->json($chargingStations);
    }
public function importPois(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        $radius = $request->input('radius', 10);
        $types = $request->input('types', []);

        if (!$lat || !$lon) {
            return response()->json(['error' => 'Missing coordinates'], 400);
        }

        $importCount = 0;

        
        $tourismObjects = $this->poiService->fetchTourismObjects($lat, $lon, $radius, $types);
        foreach ($tourismObjects as $poi) {
            $this->poiService->savePoi($poi);
            $importCount++;
        }

        
        $fuelStations = $this->poiService->fetchFuelStations($lat, $lon, $radius);
        foreach ($fuelStations as $poi) {
            $this->poiService->savePoi($poi);
            $importCount++;
        }

        
        $chargingStations = $this->poiService->fetchChargingStations($lat, $lon, $radius);
        foreach ($chargingStations as $poi) {
            $this->poiService->savePoi($poi);
            $importCount++;
        }

        return response()->json([
            'message' => "Successfully imported $importCount POIs",
            'count' => $importCount
        ]);
    }
public function overpassProxy(Request $request)
    {
        $data = $request->input('data');

        if (!$data) {
            return response()->json(['error' => 'Missing query data'], 400);
        }

        try {
            
            $client = new \GuzzleHttp\Client();
            $response = $client->get('https://overpass-api.de/api/interpreter', [
                'query' => ['data' => $data],
                'timeout' => 30
            ]);

            
            $body = $response->getBody()->getContents();

            
            Log::info('Overpass API proxy response', [
                'status' => $response->getStatusCode(),
                'content_type' => $response->getHeaderLine('Content-Type'),
                'body_length' => strlen($body)
            ]);

            
            return response($body)
                ->header('Content-Type', $response->getHeaderLine('Content-Type'));

        } catch (\Exception $e) {
            Log::error('Overpass API proxy error', [
                'error' => $e->getMessage(),
                'query' => $data
            ]);

            return response()->json([
                'error' => 'Failed to fetch data from Overpass API',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
