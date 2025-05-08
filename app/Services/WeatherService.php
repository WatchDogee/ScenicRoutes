<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class WeatherService
{
    /**
     * OpenWeatherMap API key
     *
     * @var string
     */
    protected $apiKey;

    /**
     * API base URL
     *
     * @var string
     */
    protected $baseUrl;

    /**
     * Cache duration in minutes
     *
     * @var int
     */
    protected $cacheDuration = 60; // 1 hour

    /**
     * Create a new service instance.
     */
    public function __construct()
    {
        // Use the API key directly from .env for now
        $this->apiKey = '237f9c50425060ad469fb28f0e1488e2';

        // Log the API key being used (first 4 and last 4 characters only for security)
        $keyLength = strlen($this->apiKey);
        $maskedKey = substr($this->apiKey, 0, 4) . '...' . substr($this->apiKey, -4);
        \Log::info('Using hardcoded API key', ['key' => $maskedKey, 'length' => $keyLength]);

        // Set base URL
        $this->baseUrl = 'https://api.openweathermap.org/data/2.5';
        \Log::info('Weather service initialized', ['base_url' => $this->baseUrl]);
    }

    /**
     * Get current weather for a location
     *
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @param string $units Units (metric, imperial, standard)
     * @return array|null Weather data or null on failure
     */
    public function getCurrentWeather($lat, $lon, $units = 'metric')
    {
        // Generate cache key based on coordinates and units
        $cacheKey = "weather_{$lat}_{$lon}_{$units}";

        // Check cache first
        if (Cache::has($cacheKey)) {
            Log::info('Returning cached weather data', [
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units
            ]);
            return Cache::get($cacheKey);
        }

        try {
            // Log API request details
            Log::info('Fetching weather data from OpenWeatherMap API', [
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units,
                'api_key_length' => strlen($this->apiKey),
                'base_url' => $this->baseUrl
            ]);

            $url = "{$this->baseUrl}/weather";
            $params = [
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units,
                'appid' => $this->apiKey
            ];

            Log::info('Making HTTP request to OpenWeatherMap', [
                'url' => $url,
                'params' => array_merge($params, ['appid' => '***hidden***'])
            ]);

            $response = Http::get($url, $params);

            if (!$response->successful()) {
                Log::error('Failed to fetch weather data from OpenWeatherMap API', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'url' => $url,
                    'params' => array_merge($params, ['appid' => '***hidden***'])
                ]);
                return null;
            }

            $data = $response->json();
            Log::info('Received weather data from OpenWeatherMap API', [
                'data_sample' => json_encode(array_slice($data, 0, 3))
            ]);

            // Format the weather data
            $weatherData = $this->formatWeatherData($data, $units);

            // Cache the results
            Cache::put($cacheKey, $weatherData, $this->cacheDuration);

            return $weatherData;
        } catch (\Exception $e) {
            Log::error('Exception when fetching weather data: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units
            ]);
            return null;
        }
    }

    /**
     * Format the weather data for easier consumption
     *
     * @param array $data Raw weather data
     * @param string $units Units used
     * @return array Formatted weather data
     */
    protected function formatWeatherData($data, $units)
    {
        $tempUnit = $units === 'imperial' ? '°F' : '°C';
        $speedUnit = $units === 'imperial' ? 'mph' : 'm/s';

        return [
            'temperature' => [
                'current' => round($data['main']['temp']),
                'feels_like' => round($data['main']['feels_like']),
                'min' => round($data['main']['temp_min']),
                'max' => round($data['main']['temp_max']),
                'unit' => $tempUnit
            ],
            'weather' => [
                'main' => $data['weather'][0]['main'] ?? 'Unknown',
                'description' => $data['weather'][0]['description'] ?? 'Unknown weather',
                'icon' => $data['weather'][0]['icon'] ?? '01d'
            ],
            'wind' => [
                'speed' => $data['wind']['speed'] ?? 0,
                'unit' => $speedUnit,
                'direction' => $data['wind']['deg'] ?? 0
            ],
            'humidity' => $data['main']['humidity'] ?? 0,
            'pressure' => $data['main']['pressure'] ?? 0,
            'visibility' => $data['visibility'] ?? 0,
            'clouds' => $data['clouds']['all'] ?? 0,
            'timestamp' => $data['dt'] ?? time(),
            'location' => [
                'name' => $data['name'] ?? 'Unknown',
                'country' => $data['sys']['country'] ?? 'Unknown'
            ]
        ];
    }

    /**
     * Get weather icon URL
     *
     * @param string $iconCode Icon code from OpenWeatherMap
     * @param int $size Icon size (1x, 2x, 4x)
     * @return string Icon URL
     */
    public function getWeatherIconUrl($iconCode, $size = '2x')
    {
        return "https://openweathermap.org/img/wn/{$iconCode}@{$size}.png";
    }
}
