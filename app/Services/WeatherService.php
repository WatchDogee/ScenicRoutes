<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class WeatherService
{
protected $apiKey;
protected $baseUrl;
protected $cacheDuration = 30;
public function __construct()
    {
        
        $this->apiKey = config('services.openweathermap.key', '237f9c50425060ad469fb28f0e1488e2');

        
        $keyLength = strlen($this->apiKey);
        $maskedKey = substr($this->apiKey, 0, 4) . '...' . substr($this->apiKey, -4);
        \Log::info('Using OpenWeatherMap API key', ['key' => $maskedKey, 'length' => $keyLength]);

        
        $this->baseUrl = 'https://api.openweathermap.org/data/2.5';
        \Log::info('Weather service initialized', ['base_url' => $this->baseUrl]);
    }
public function getCurrentWeather($lat, $lon, $units = 'metric')
    {
        
        $cacheKey = "weather_{$lat}_{$lon}_{$units}";

        
        if (Cache::has($cacheKey)) {
            Log::info('Returning cached weather data', [
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units
            ]);
            return Cache::get($cacheKey);
        }

        try {
            
            if (empty($this->apiKey) || $this->apiKey === '237f9c50425060ad469fb28f0e1488e2') {
                
                Log::warning('Using mock weather data because API key is not set or is using the default value');
                return $this->getMockWeatherData($units, $lat, $lon);
            }

            
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

                
                return $this->getMockWeatherData($units, $lat, $lon);
            }

            $data = $response->json();
            Log::info('Received weather data from OpenWeatherMap API', [
                'data_sample' => json_encode(array_slice($data, 0, 3))
            ]);

            
            $weatherData = $this->formatWeatherData($data, $units);

            
            Cache::put($cacheKey, $weatherData, $this->cacheDuration);

            
            $cacheKeys = Cache::get('weather_cache_keys', []);
            if (!in_array($cacheKey, $cacheKeys)) {
                $cacheKeys[] = $cacheKey;
                Cache::put('weather_cache_keys', $cacheKeys, 60 * 24); 
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

            
            return $this->getMockWeatherData($units, $lat, $lon);
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

                
                if ($month >= 12 || $month <= 2) {
                    $temp = $units === 'imperial' ? rand(14, 32) : rand(-10, 0);
                    $weatherMain = 'Snow';
                    $weatherDesc = 'light snow';
                    $weatherIcon = '13d';
                }
                
                else if ($month >= 3 && $month <= 5) {
                    $temp = $units === 'imperial' ? rand(41, 59) : rand(5, 15);
                    $weatherMain = 'Clouds';
                    $weatherDesc = 'broken clouds';
                    $weatherIcon = '04d';
                }
                
                else if ($month >= 6 && $month <= 8) {
                    $temp = $units === 'imperial' ? rand(59, 77) : rand(15, 25);
                    $weatherMain = 'Clear';
                    $weatherDesc = 'clear sky';
                    $weatherIcon = '01d';
                }
                
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
        Log::info('Clearing all weather cache');
        
        
        $keys = Cache::get('weather_cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('weather_cache_keys');
        return true;
    }
}
