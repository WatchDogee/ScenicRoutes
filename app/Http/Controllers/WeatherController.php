<?php

namespace App\Http\Controllers;

use App\Models\SavedRoad;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WeatherController extends Controller
{
    protected $weatherService;
public function __construct(WeatherService $weatherService)
    {
        $this->weatherService = $weatherService;
    }
public function getWeatherByCoordinates(Request $request)
    {
        try {
            $request->validate([
                'lat' => 'required|numeric',
                'lon' => 'required|numeric',
                'units' => 'nullable|string|in:metric,imperial,standard'
            ]);

            $lat = $request->input('lat');
            $lon = $request->input('lon');
            $units = $request->input('units', 'metric');

            \Log::info('Weather request received', [
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units,
                'authenticated' => $request->user() ? 'yes' : 'no'
            ]);

            $weather = $this->weatherService->getCurrentWeather($lat, $lon, $units);

            if (!$weather) {
                \Log::error('Weather service returned null', [
                    'lat' => $lat,
                    'lon' => $lon,
                    'units' => $units
                ]);

                
                return response()->json([
                    'error' => 'weather_unavailable',
                    'message' => 'Weather data is currently unavailable',
                    'details' => 'The weather service is temporarily unavailable. Please try again later.'
                ], 200); 
            }

            \Log::info('Weather data returned successfully', [
                'data_size' => strlen(json_encode($weather))
            ]);

            return response()->json($weather);
        } catch (\Exception $e) {
            \Log::error('Exception in getWeatherByCoordinates: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json(['error' => 'An error occurred: ' . $e->getMessage()], 500);
        }
    }
public function clearWeatherCache(Request $request)
    {
        try {
            $request->validate([
                'lat' => 'nullable|numeric',
                'lon' => 'nullable|numeric',
                'units' => 'nullable|string|in:metric,imperial,standard'
            ]);

            $lat = $request->input('lat');
            $lon = $request->input('lon');
            $units = $request->input('units', 'metric');
            $all = $request->input('all', false);

            \Log::info('Weather cache clear request received', [
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units,
                'all' => $all,
                'authenticated' => $request->user() ? 'yes' : 'no'
            ]);

            if ($all) {
                $result = $this->weatherService->clearAllWeatherCache();
                return response()->json([
                    'success' => $result,
                    'message' => 'All weather cache cleared'
                ]);
            } else if ($lat && $lon) {
                $result = $this->weatherService->clearWeatherCache($lat, $lon, $units);
                return response()->json([
                    'success' => $result,
                    'message' => 'Weather cache cleared for location',
                    'location' => [
                        'lat' => $lat,
                        'lon' => $lon,
                        'units' => $units
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing parameters. Provide lat/lon or all=true'
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Error clearing weather cache: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear weather cache: ' . $e->getMessage()
            ], 500);
        }
    }
public function getWeatherForRoad(Request $request, $id)
    {
        try {
            \Log::info('Road weather request received', [
                'road_id' => $id,
                'units' => $request->input('units', 'metric'),
                'authenticated' => $request->user() ? 'yes' : 'no'
            ]);

            $road = SavedRoad::findOrFail($id);
            \Log::info('Road found', [
                'road_name' => $road->road_name,
                'has_coordinates' => !empty($road->road_coordinates)
            ]);

            
            $coordinates = json_decode($road->road_coordinates, true);

            if (empty($coordinates)) {
                \Log::error('Road has no coordinates', ['road_id' => $id]);
                return response()->json(['error' => 'Road has no coordinates'], 400);
            }

            \Log::info('Road coordinates parsed', [
                'count' => count($coordinates),
                'sample' => json_encode(array_slice($coordinates, 0, 2))
            ]);

            
            $midIndex = intval(count($coordinates) / 2);
            $midPoint = $coordinates[$midIndex];

            \Log::info('Using middle point for weather', [
                'mid_index' => $midIndex,
                'mid_point' => json_encode($midPoint)
            ]);

            
            if (is_array($midPoint) && count($midPoint) >= 2 && !isset($midPoint['lat'])) {
                $lat = $midPoint[0];
                $lon = $midPoint[1];
                \Log::info('Using array format coordinates', ['lat' => $lat, 'lon' => $lon]);
            } else if (isset($midPoint['lat']) && isset($midPoint['lng'])) {
                $lat = $midPoint['lat'];
                $lon = $midPoint['lng'];
                \Log::info('Using object format coordinates with lng', ['lat' => $lat, 'lon' => $lon]);
            } else if (isset($midPoint['lat']) && isset($midPoint['lon'])) {
                $lat = $midPoint['lat'];
                $lon = $midPoint['lon'];
                \Log::info('Using object format coordinates with lon', ['lat' => $lat, 'lon' => $lon]);
            } else {
                \Log::error('Invalid coordinate format', ['mid_point' => json_encode($midPoint)]);
                return response()->json(['error' => 'Invalid coordinate format'], 400);
            }

            
            $units = $request->input('units', 'metric');
            if ($request->user() && isset($request->user()->settings['measurement_units'])) {
                $units = $request->user()->settings['measurement_units'] === 'imperial' ? 'imperial' : 'metric';
            }

            \Log::info('Fetching weather for road coordinates', [
                'road_id' => $id,
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units
            ]);

            $weather = $this->weatherService->getCurrentWeather($lat, $lon, $units);

            if (!$weather) {
                \Log::error('Failed to fetch weather data for road', [
                    'road_id' => $id,
                    'lat' => $lat,
                    'lon' => $lon
                ]);

                
                return response()->json([
                    'road_id' => $road->id,
                    'road_name' => $road->road_name,
                    'error' => 'weather_unavailable',
                    'message' => 'Weather data is currently unavailable',
                    'details' => 'The weather service is temporarily unavailable. Please try again later.'
                ], 200); 
            }

            \Log::info('Weather data fetched successfully for road', [
                'road_id' => $id,
                'data_size' => strlen(json_encode($weather))
            ]);

            return response()->json([
                'road_id' => $road->id,
                'road_name' => $road->road_name,
                'weather' => $weather,
                'coordinates' => [
                    'lat' => $lat,
                    'lon' => $lon
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Exception in getWeatherForRoad: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'road_id' => $id
            ]);
            return response()->json(['error' => 'Failed to fetch road weather data: ' . $e->getMessage()], 500);
        }
    }
}
