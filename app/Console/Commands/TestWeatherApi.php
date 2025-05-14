<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TestWeatherApi extends Command
{
protected $signature = 'weather:test';
protected $description = 'Test the OpenWeatherMap API connection';
public function handle()
    {
        $this->info('Testing OpenWeatherMap API connection...');
        
        
        $apiKey = config('services.openweathermap.key') ?: env('OPENWEATHERMAP_API_KEY');
        
        if (empty($apiKey)) {
            $this->error('No API key found. Please check your .env file or services.php configuration.');
            return 1;
        }
        
        $this->info('API key found: ' . substr($apiKey, 0, 4) . '...' . substr($apiKey, -4));
        
        
        $lat = 56.9496;
        $lon = 24.1052;
        $units = 'metric';
        
        $this->info("Testing with coordinates: {$lat}, {$lon}");
        
        try {
            $url = "https://api.openweathermap.org/data/2.5/weather";
            $this->info("Making request to: {$url}");
            
            $response = Http::get($url, [
                'lat' => $lat,
                'lon' => $lon,
                'units' => $units,
                'appid' => $apiKey
            ]);
            
            $this->info("Response status: " . $response->status());
            
            if ($response->successful()) {
                $data = $response->json();
                $this->info("API call successful!");
                $this->info("Weather: " . ($data['weather'][0]['main'] ?? 'Unknown'));
                $this->info("Description: " . ($data['weather'][0]['description'] ?? 'Unknown'));
                $this->info("Temperature: " . ($data['main']['temp'] ?? 'Unknown') . "°C");
                $this->info("Location: " . ($data['name'] ?? 'Unknown') . ", " . ($data['sys']['country'] ?? 'Unknown'));
                
                $this->info("\nFull response:");
                $this->line(json_encode($data, JSON_PRETTY_PRINT));
                
                return 0;
            } else {
                $this->error("API call failed with status code: " . $response->status());
                $this->error("Response body: " . $response->body());
                
                return 1;
            }
        } catch (\Exception $e) {
            $this->error("Exception occurred: " . $e->getMessage());
            $this->error("Trace: " . $e->getTraceAsString());
            
            return 1;
        }
    }
}
