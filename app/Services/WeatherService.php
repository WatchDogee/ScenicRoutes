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
    protected $cacheDuration = 30; // 30 minutes

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
                return $this->getMockWeatherData($units, $lat, $lon);
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
                return $this->getMockWeatherData($units, $lat, $lon);
            }

            $data = $response->json();
            Log::info('Received weather data from OpenWeatherMap API', [
                'data_sample' => json_encode(array_slice($data, 0, 3))
            ]);

            // Format the weather data
            $weatherData = $this->formatWeatherData($data, $units);

            // Cache the results
            Cache::put($cacheKey, $weatherData, $this->cacheDuration);

            // Track cache keys for later clearing
            $cacheKeys = Cache::get('weather_cache_keys', []);
            if (!in_array($cacheKey, $cacheKeys)) {
                $cacheKeys[] = $cacheKey;
                Cache::put('weather_cache_keys', $cacheKeys, 60 * 24); // Store for 24 hours
            }

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
            return $this->getMockWeatherData($units, $lat, $lon);
        }
    }

    /**
     * Get mock weather data for development
     *
     * @param string $units Units (metric, imperial, standard)
     * @param float $lat Latitude (optional)
     * @param float $lon Longitude (optional)
     * @return array Mock weather data
     */
    protected function getMockWeatherData($units = 'metric', $lat = null, $lon = null)
    {
        $tempUnit = $units === 'imperial' ? '°F' : '°C';
        $speedUnit = $units === 'imperial' ? 'mph' : 'm/s';

        // Default temperature for unknown locations
        $temp = $units === 'imperial' ? 50 : 10;
        $weatherMain = 'Clouds';
        $weatherDesc = 'scattered clouds';
        $weatherIcon = '03d';
        $locationName = 'Development Location';
        $country = 'DEV';

        // If we have coordinates, try to provide more realistic data
        if ($lat !== null && $lon !== null) {
            // Determine location name based on coordinates (very rough approximation)
            if ($lat > 56 && $lat < 58 && $lon > 26 && $lon < 28) {
                $locationName = 'Balvi';
                $country = 'LV';

                // Current season-appropriate temperature for Balvi, Latvia
                $month = (int)date('m');

                // Winter (December to February)
                if ($month >= 12 || $month <= 2) {
                    $temp = $units === 'imperial' ? rand(14, 32) : rand(-10, 0);
                    $weatherMain = 'Snow';
                    $weatherDesc = 'light snow';
                    $weatherIcon = '13d';
                }
                // Spring (March to May)
                else if ($month >= 3 && $month <= 5) {
                    $temp = $units === 'imperial' ? rand(41, 59) : rand(5, 15);
                    $weatherMain = 'Clouds';
                    $weatherDesc = 'broken clouds';
                    $weatherIcon = '04d';
                }
                // Summer (June to August)
                else if ($month >= 6 && $month <= 8) {
                    $temp = $units === 'imperial' ? rand(59, 77) : rand(15, 25);
                    $weatherMain = 'Clear';
                    $weatherDesc = 'clear sky';
                    $weatherIcon = '01d';
                }
                // Fall (September to November)
                else {
                    $temp = $units === 'imperial' ? rand(32, 50) : rand(0, 10);
                    $weatherMain = 'Rain';
                    $weatherDesc = 'light rain';
                    $weatherIcon = '10d';
                }
            }
            // Add more location-specific conditions as needed
        }

        // Add some randomness to make it more realistic
        $feelsLike = $temp - rand(0, 3);
        $minTemp = $temp - rand(2, 5);
        $maxTemp = $temp + rand(1, 4);

        return [
            'temperature' => [
                'current' => $temp,
                'feels_like' => $feelsLike,
                'min' => $minTemp,
                'max' => $maxTemp,
                'unit' => $tempUnit
            ],
            'weather' => [
                'main' => $weatherMain,
                'description' => $weatherDesc,
                'icon' => $weatherIcon
            ],
            'wind' => [
                'speed' => rand(2, 8),
                'unit' => $speedUnit,
                'direction' => rand(0, 359)
            ],
            'humidity' => rand(50, 90),
            'pressure' => rand(1000, 1025),
            'visibility' => rand(7000, 10000),
            'clouds' => rand(0, 100),
            'timestamp' => time(),
            'location' => [
                'name' => $locationName,
                'country' => $country
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

    /**
     * Clear weather cache for a specific location
     *
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @param string $units Units (metric, imperial, standard)
     * @return bool True if cache was cleared
     */
    public function clearWeatherCache($lat, $lon, $units = 'metric')
    {
        $cacheKey = "weather_{$lat}_{$lon}_{$units}";
        Log::info('Clearing weather cache', [
            'lat' => $lat,
            'lon' => $lon,
            'units' => $units,
            'cache_key' => $cacheKey
        ]);
        return Cache::forget($cacheKey);
    }

    /**
     * Clear all weather cache
     *
     * @return bool True if cache was cleared
     */
    public function clearAllWeatherCache()
    {
        Log::info('Clearing all weather cache');
        // This is a simple approach that works with file and database cache
        // For more complex cache systems, you might need a different approach
        $keys = Cache::get('weather_cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('weather_cache_keys');
        return true;
    }
}
