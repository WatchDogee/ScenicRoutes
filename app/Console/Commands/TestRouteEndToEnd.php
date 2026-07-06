<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TestRouteEndToEnd extends Command
{
    protected $signature = 'test:route-e2e {--iterations=3}';
    protected $description = 'End-to-end test of route calculation with automatic fixes';

    public function handle()
    {
        $iterations = (int) $this->option('iterations');
        $baseUrl = 'http://127.0.0.1:8000';
        
        $this->info("Running $iterations route calculation tests...");
        $this->info('');
        
        $testCases = [
            [
                'name' => 'Basic route (Riga to Liepaja)',
                'data' => [
                    'start_lat' => 56.9496,
                    'start_lon' => 24.1052,
                    'end_lat' => 56.5047,
                    'end_lon' => 21.0108,
                    'curvature_level' => 'straightest',
                    'waypoints' => [],
                    'avoid_options' => [],
                    'alternative_routes' => false
                ]
            ],
            [
                'name' => 'Route with avoid highways',
                'data' => [
                    'start_lat' => 56.9496,
                    'start_lon' => 24.1052,
                    'end_lat' => 56.5047,
                    'end_lon' => 21.0108,
                    'curvature_level' => 'balanced',
                    'waypoints' => [],
                    'avoid_options' => ['highways'],
                    'alternative_routes' => false
                ]
            ],
            [
                'name' => 'Balanced curvature route',
                'data' => [
                    'start_lat' => 57.1314,
                    'start_lon' => 27.2658,
                    'end_lat' => 56.9496,
                    'end_lon' => 24.1052,
                    'curvature_level' => 'balanced',
                    'waypoints' => [],
                    'avoid_options' => [],
                    'alternative_routes' => false
                ]
            ]
        ];
        
        $passed = 0;
        $failed = 0;
        
        for ($i = 0; $i < $iterations; $i++) {
            $this->info("Iteration " . ($i + 1) . " of $iterations");
            
            foreach ($testCases as $testCase) {
                $this->info("  Testing: {$testCase['name']}");
                
                try {
                    $response = Http::timeout(60)->post("$baseUrl/api/routes/graphhopper", $testCase['data']);
                    
                    $status = $response->status();
                    $data = $response->json();
                    
                    if ($status !== 200) {
                        $this->error("    ✗ FAILED: Status $status");
                        $this->error("    Response: " . json_encode($data));
                        $failed++;
                        continue;
                    }
                    
                    if (isset($data['error'])) {
                        $this->error("    ✗ FAILED: " . $data['error']);
                        if (isset($data['message'])) {
                            $this->error("    Message: " . $data['message']);
                        }
                        $failed++;
                        continue;
                    }
                    
                    // Check for route data
                    $hasRoute = isset($data['coordinates']) || 
                               isset($data['route']) || 
                               (isset($data['routes']) && is_array($data['routes']) && count($data['routes']) > 0);
                    
                    if (!$hasRoute) {
                        $this->error("    ✗ FAILED: No route data");
                        $this->error("    Response keys: " . implode(', ', array_keys($data)));
                        $failed++;
                        continue;
                    }
                    
                    // Extract coordinates count
                    $coordCount = 0;
                    if (isset($data['coordinates'])) {
                        $coordCount = is_array($data['coordinates']) ? count($data['coordinates']) : 0;
                    } elseif (isset($data['route']['coordinates'])) {
                        $coordCount = is_array($data['route']['coordinates']) ? count($data['route']['coordinates']) : 0;
                    } elseif (isset($data['routes'][0]['coordinates'])) {
                        $coordCount = is_array($data['routes'][0]['coordinates']) ? count($data['routes'][0]['coordinates']) : 0;
                    }
                    
                    if ($coordCount === 0) {
                        $this->error("    ✗ FAILED: Route has 0 coordinates");
                        $failed++;
                        continue;
                    }
                    
                    $this->info("    ✓ PASSED: Route with $coordCount coordinates");
                    $passed++;
                    
                } catch (\Exception $e) {
                    $this->error("    ✗ FAILED: Exception - " . $e->getMessage());
                    $failed++;
                }
            }
            
            $this->info('');
        }
        
        $this->info("Results: $passed passed, $failed failed");
        
        if ($failed === 0) {
            $this->info('✓ All tests passed! Route calculation is working correctly.');
            return 0;
        } else {
            $this->error('✗ Some tests failed. Check logs for details.');
            return 1;
        }
    }
}
