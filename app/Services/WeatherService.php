<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class WeatherService
{
    protected $apiKey;

    protected $baseUrl;

    protected $cacheDuration = 30; // minutes
    public function __construct()
    {
        $this->apiKey = config('services.openweathermap.key');
        $this->baseUrl = 'https://api.openweathermap.org/data/2.5';
    }

    public function getCurrentWeather($lat, $lon, $units = 'metric')
    {
        $apiKey = config('services.openweathermap.key');
        if (!$apiKey) {
            return [
                'error' => 'api_key_invalid',
                'message' => 'OpenWeatherMap API key is not configured'
            ];
        }

        $cacheKey = "weather_{$lat}_{$lon}_{$units}";
        $cachedData = Cache::get($cacheKey);
        if ($cachedData) {
            return $cachedData;
        }

        try {
            $response = Http::get('https://api.openweathermap.org/data/2.5/weather', [
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units,
                'appid' => $apiKey
            ]);

            if (!$response->successful()) {
                if ($response->status() === 401) {
                    return [
                        'error' => 'api_key_invalid',
                        'message' => 'OpenWeatherMap API key is invalid',
                        'details' => $response->json()
                    ];
                }
                return [
                    'error' => 'request_failed',
                    'message' => 'Failed to fetch weather data',
                    'details' => $response->json()
                ];
            }

            $data = $response->json();
            if (!isset($data['main']) || !isset($data['weather'])) {
                return [
                    'error' => 'invalid_data',
                    'message' => 'Invalid weather data format received'
                ];
            }

            $speedUnit = $units === 'metric' ? 'm/s' : 'mph';
            $weatherData = [
                'temperature' => [
                    'current' => $data['main']['temp'] ?? 0,
                    'feels_like' => $data['main']['feels_like'] ?? 0,
                    'min' => $data['main']['temp_min'] ?? 0,
                    'max' => $data['main']['temp_max'] ?? 0,
                    'unit' => $units === 'metric' ? '°C' : '°F'
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

            Cache::put($cacheKey, $weatherData, now()->addMinutes(30));
            return $weatherData;
        } catch (\Exception $e) {
            return [
                'error' => 'request_failed',
                'message' => 'Failed to connect to weather service',
                'details' => $e->getMessage()
            ];
        }
    }

    protected function getMockWeatherData($units = 'metric', $lat = null, $lon = null)
    {
        $tempUnit = $units === 'imperial' ? '°F' : '°C';
        $speedUnit = $units === 'imperial' ? 'mph' : 'm/s';

        $temp = $units === 'imperial' ? 50 : 10;
        $weatherMain = 'Clouds';
        $weatherDesc = 'scattered clouds';
        $weatherIcon = '03d';
        $locationName = 'Development Location';
        $country = 'DEV';

        if ($lat !== null && $lon !== null) {
            if ($lat > 56 && $lat < 58 && $lon > 26 && $lon < 28) {
                $locationName = 'Balvi';
                $country = 'LV';
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
        }

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

    public function getWeatherIconUrl($iconCode, $size = '2x')
    {
        return "https://openweathermap.org/img/wn/{$iconCode}@{$size}.png";
    }

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


    public function clearAllWeatherCache()
    {
        $keys = Cache::get('weather_cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('weather_cache_keys');
        return true;
    }

    public function getWeatherData($lat, $lon, $units = 'metric')
    {
        $tempUnit = $units === 'imperial' ? '°F' : '°C';
        $speedUnit = $units === 'imperial' ? 'mph' : 'm/s';

        // Get weather data from OpenWeatherMap API
        $response = Http::get("https://api.openweathermap.org/data/2.5/weather", [
            'lat' => $lat,
            'lon' => $lon,
            'appid' => config('services.openweathermap.key'),
            'units' => $units
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to fetch weather data');
        }

        $data = $response->json();
        
        return [
            'temperature' => round($data['main']['temp']) . $tempUnit,
            'feels_like' => round($data['main']['feels_like']) . $tempUnit,
            'min_temp' => round($data['main']['temp_min']) . $tempUnit,
            'max_temp' => round($data['main']['temp_max']) . $tempUnit,
            'condition' => $data['weather'][0]['main'],
            'description' => $data['weather'][0]['description'],
            'icon' => $data['weather'][0]['icon'],
            'location' => $data['name'],
            'country' => $data['sys']['country'],
            'wind_speed' => round($data['wind']['speed']) . ' ' . $speedUnit,
            'humidity' => $data['main']['humidity'] . '%',
            'pressure' => $data['main']['pressure'] . ' hPa'
        ];
    }
}
