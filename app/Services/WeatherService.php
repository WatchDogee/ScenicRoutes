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
        // Get API key from config instead of env directly for better caching
        $this->apiKey = config('services.openweathermap.key', '237f9c50425060ad469fb28f0e1488e2');

        // Log the API key being used (first 4 and last 4 characters only for security)
        $keyLength = strlen($this->apiKey);
        $maskedKey = substr($this->apiKey, 0, 4) . '...' . substr($this->apiKey, -4);
        \Log::info('Using OpenWeatherMap API key', ['key' => $maskedKey, 'length' => $keyLength]);

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
            // Check if API key is valid
            if (empty($this->apiKey) || $this->apiKey === '237f9c50425060ad469fb28f0e1488e2') {
                // Return a mock weather data for development
                Log::warning('Using mock weather data because API key is not set or is using the default value');
                return $this->getMockWeatherData($units);
            }

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

                // Return mock data instead of null
                return $this->getMockWeatherData($units);
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

            // Return mock data instead of null
            return $this->getMockWeatherData($units);
        }
    }

    /**
     * Get mock weather data for development
     *
     * @param string $units Units (metric, imperial, standard)
     * @return array Mock weather data
     */
    protected function getMockWeatherData($units = 'metric')
    {
        $tempUnit = $units === 'imperial' ? '°F' : '°C';
        $speedUnit = $units === 'imperial' ? 'mph' : 'm/s';
        $temp = $units === 'imperial' ? 72 : 22;

        return [
            'temperature' => [
                'current' => $temp,
                'feels_like' => $temp - 2,
                'min' => $temp - 5,
                'max' => $temp + 5,
                'unit' => $tempUnit
            ],
            'weather' => [
                'main' => 'Clear',
                'description' => 'clear sky',
                'icon' => '01d'
            ],
            'wind' => [
                'speed' => 5,
                'unit' => $speedUnit,
                'direction' => 180
            ],
            'humidity' => 65,
            'pressure' => 1013,
            'visibility' => 10000,
            'clouds' => 0,
            'timestamp' => time(),
            'location' => [
                'name' => 'Development Location',
                'country' => 'DEV'
            ]
        ];
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
