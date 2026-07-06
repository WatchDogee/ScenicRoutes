<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TestRouteApi extends Command
{
    protected $signature = 'test:route-api';
    protected $description = 'Test route calculation API endpoint';

    public function handle()
    {
        $this->info('Testing route calculation API endpoint...');
        
        // Start Laravel server if not running (we'll test against it)
        $baseUrl = 'http://127.0.0.1:8000';
        
        $this->info("Testing against: $baseUrl");
        
        // Test 1: Basic route via API
        $this->info('Test 1: POST /api/routes/graphhopper');
        
        try {
            $response = Http::timeout(60)->post("$baseUrl/api/routes/graphhopper", [
                'start_lat' => 56.9496,
                'start_lon' => 24.1052,
                'end_lat' => 56.5047,
                'end_lon' => 21.0108,
                'curvature_level' => 'straightest',
                'waypoints' => [],
                'avoid_options' => [],
                'alternative_routes' => false
            ]);
            
            $status = $response->status();
            $data = $response->json();
            
            $this->info("Response status: $status");
            
            if ($status !== 200) {
                $this->error('Test 1 FAILED: Status ' . $status);
                $this->error('Response: ' . json_encode($data, JSON_PRETTY_PRINT));
                return 1;
            }
            
            if (isset($data['error'])) {
                $this->error('Test 1 FAILED: API returned error');
                $this->error('Error: ' . $data['error']);
                if (isset($data['message'])) {
                    $this->error('Message: ' . $data['message']);
                }
                if (isset($data['debug'])) {
                    $this->error('Debug: ' . json_encode($data['debug'], JSON_PRETTY_PRINT));
                }
                return 1;
            }
            
            // Check for route data
            $hasRoute = isset($data['route']) || isset($data['routes']) || isset($data['coordinates']);
            
            if (!$hasRoute) {
                $this->error('Test 1 FAILED: No route data in response');
                $this->error('Response keys: ' . implode(', ', array_keys($data)));
                return 1;
            }
            
            $this->info('✓ Test 1 PASSED: API returned route data');
            
            // Test 2: With avoid options
            $this->info('Test 2: Route with avoid options');
            $response2 = Http::timeout(60)->post("$baseUrl/api/routes/graphhopper", [
                'start_lat' => 56.9496,
                'start_lon' => 24.1052,
                'end_lat' => 56.5047,
                'end_lon' => 21.0108,
                'curvature_level' => 'balanced',
                'waypoints' => [],
                'avoid_options' => ['highways'],
                'alternative_routes' => false
            ]);
            
            if ($response2->status() === 200 && !isset($response2->json()['error'])) {
                $this->info('✓ Test 2 PASSED: Route with avoid options');
            } else {
                $this->warn('Test 2: ' . $response2->status() . ' - ' . json_encode($response2->json()));
            }
            
            $this->info('');
            $this->info('API endpoint tests completed successfully!');
            return 0;
            
        } catch (\Exception $e) {
            $this->error('Test FAILED with exception: ' . $e->getMessage());
            $this->error('Make sure Laravel server is running: php artisan serve');
            return 1;
        }
    }
}
