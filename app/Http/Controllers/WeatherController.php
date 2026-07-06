<?php

namespace App\Http\Controllers;

use App\Models\SavedRoad;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WeatherController extends Controller
{
    protected $weatherService;

    public function __construct(WeatherService $weatherService)
    {
        $this->weatherService = $weatherService;
    }


    public function getWeatherByCoordinates(Request $request)
    {
        $lat = $request->input('lat');
        $lon = $request->input('lon');
        $units = $request->input('units', 'metric');

        if (!$lat || !$lon) {
            return response()->json(['error' => 'Missing coordinates'], 400);
        }

        $weather = $this->weatherService->getCurrentWeather($lat, $lon, $units);

        if (!$weather) {
            return response()->json([
                'error' => 'Unable to fetch weather data'
            ], 200);
        }

        return response()->json($weather);
    }

    public function clearWeatherCache()
    {
        try {
            Cache::tags(['weather'])->flush();
            return response()->json(['message' => 'Weather cache cleared successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to clear weather cache'], 500);
        }
    }


    public function getWeatherForRoad($id, Request $request)
    {
        $road = SavedRoad::find($id);

        if (!$road) {
            return response()->json(['error' => 'Road not found'], 404);
        }

        $coordinates = json_decode($road->road_coordinates, true);

        if (empty($coordinates)) {
            return response()->json(['error' => 'Road has no coordinates'], 400);
        }

        $midPoint = $coordinates[floor(count($coordinates) / 2)];
        $lat = null;
        $lon = null;

        if (is_array($midPoint)) {
            $lat = $midPoint[0];
            $lon = $midPoint[1];
        } else if (is_object($midPoint)) {
            if (isset($midPoint->lng)) {
                $lat = $midPoint->lat;
                $lon = $midPoint->lng;
            } else if (isset($midPoint->lon)) {
                $lat = $midPoint->lat;
                $lon = $midPoint->lon;
            }
        }

        if (!$lat || !$lon) {
            return response()->json(['error' => 'Invalid coordinate format'], 400);
        }

        $units = $request->input('units', 'metric');
        $weather = $this->weatherService->getCurrentWeather($lat, $lon, $units);

        if (!$weather) {
            return response()->json([
                'error' => 'Unable to fetch weather data'
            ], 200);
        }

        return response()->json($weather);
    }
}
