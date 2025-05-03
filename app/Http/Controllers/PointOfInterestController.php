<?php

namespace App\Http\Controllers;

use App\Models\PointOfInterest;
use App\Models\PoiPhoto;
use App\Models\PoiReview;
use App\Services\PointOfInterestService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PointOfInterestController extends Controller
{
    protected $poiService;

    /**
     * Create a new controller instance.
     */
    public function __construct(PointOfInterestService $poiService)
    {
        $this->poiService = $poiService;
    }

    /**
     * Get POIs within a radius
     */
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

    /**
     * Store a new POI
     */
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

    /**
     * Display a specific POI
     */
    public function show($id)
    {
        $poi = PointOfInterest::with(['photos', 'reviews.user', 'user'])->findOrFail($id);

        return response()->json($poi);
    }

    /**
     * Update a POI
     */
    public function update(Request $request, $id)
    {
        $poi = PointOfInterest::findOrFail($id);

        // Check if user is authorized to update this POI
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

    /**
     * Delete a POI
     */
    public function destroy($id)
    {
        $poi = PointOfInterest::findOrFail($id);

        // Check if user is authorized to delete this POI
        if ($poi->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Delete associated photos from storage
        foreach ($poi->photos as $photo) {
            Storage::disk('public')->delete($photo->photo_path);
        }

        $poi->delete();

        return response()->json(['message' => 'POI deleted successfully']);
    }

    /**
     * Add a photo to a POI
     */
    public function addPhoto(Request $request, $id)
    {
        $poi = PointOfInterest::findOrFail($id);

        $request->validate([
            'photo' => 'required|image|max:10240', // 10MB max
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

    /**
     * Add a review to a POI
     */
    public function addReview(Request $request, $id)
    {
        $poi = PointOfInterest::findOrFail($id);

        $data = $request->validate([
            'rating' => 'required|numeric|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        // Check if user already reviewed this POI
        $existingReview = PoiReview::where('point_of_interest_id', $poi->id)
            ->where('user_id', Auth::id())
            ->first();

        if ($existingReview) {
            $existingReview->rating = $data['rating'];
            $existingReview->comment = $data['comment'] ?? null;
            $existingReview->save();
            $review = $existingReview;
        } else {
            $review = new PoiReview();
            $review->point_of_interest_id = $poi->id;
            $review->user_id = Auth::id();
            $review->rating = $data['rating'];
            $review->comment = $data['comment'] ?? null;
            $review->save();
        }

        return response()->json($review, 201);
    }

    /**
     * Fetch tourism objects from Overpass API
     */
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

    /**
     * Fetch fuel stations from Overpass API
     */
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

    /**
     * Fetch EV charging stations from Overpass API
     */
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

    /**
     * Import POIs from Overpass API to database
     */
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

        // Import tourism objects
        $tourismObjects = $this->poiService->fetchTourismObjects($lat, $lon, $radius, $types);
        foreach ($tourismObjects as $poi) {
            $this->poiService->savePoi($poi);
            $importCount++;
        }

        // Import fuel stations
        $fuelStations = $this->poiService->fetchFuelStations($lat, $lon, $radius);
        foreach ($fuelStations as $poi) {
            $this->poiService->savePoi($poi);
            $importCount++;
        }

        // Import charging stations
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

    /**
     * Proxy requests to Overpass API to avoid CORS issues
     */
    public function overpassProxy(Request $request)
    {
        $data = $request->input('data');

        if (!$data) {
            return response()->json(['error' => 'Missing query data'], 400);
        }

        try {
            // Use Guzzle to make the request to Overpass API
            $client = new \GuzzleHttp\Client();
            $response = $client->get('https://overpass-api.de/api/interpreter', [
                'query' => ['data' => $data],
                'timeout' => 30
            ]);

            // Get the response body
            $body = $response->getBody()->getContents();

            // Log the response for debugging
            Log::info('Overpass API proxy response', [
                'status' => $response->getStatusCode(),
                'content_type' => $response->getHeaderLine('Content-Type'),
                'body_length' => strlen($body)
            ]);

            // Return the response with the same content type
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
