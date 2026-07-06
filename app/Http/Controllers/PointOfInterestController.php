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

        Log::info('POI Controller: Fetching tourism', [
            'lat' => $lat,
            'lon' => $lon,
            'radius' => $radius
        ]);

        $tourismObjects = $this->poiService->fetchTourismObjects($lat, $lon, $radius, $types);

        Log::info('POI Controller: Tourism objects returned', [
            'count' => count($tourismObjects)
        ]);

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

        Log::info('POI Controller: Fetching fuel stations', [
            'lat' => $lat,
            'lon' => $lon,
            'radius' => $radius
        ]);

        $fuelStations = $this->poiService->fetchFuelStations($lat, $lon, $radius);

        Log::info('POI Controller: Fuel stations returned', [
            'count' => count($fuelStations)
        ]);

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

        Log::info('POI Controller: Fetching charging stations', [
            'lat' => $lat,
            'lon' => $lon,
            'radius' => $radius
        ]);

        $chargingStations = $this->poiService->fetchChargingStations($lat, $lon, $radius);

        Log::info('POI Controller: Charging stations returned', [
            'count' => count($chargingStations)
        ]);

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
            // Overpass API works better with GET request and URL-encoded query in URL
            $url = "https://overpass-api.de/api/interpreter?data=" . urlencode($data);
            
            $client = new \GuzzleHttp\Client();
            $response = $client->get($url, [
                'timeout' => 30
            ]);

            $body = $response->getBody()->getContents();

            return response($body)
                ->header('Content-Type', $response->getHeaderLine('Content-Type'));

        } catch (\Exception $e) {
            \Log::error('Overpass API proxy error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch data from Overpass API',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
