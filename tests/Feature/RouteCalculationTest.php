<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;

class RouteCalculationTest extends TestCase
{
    /**
     * Test basic route calculation with GraphHopper API
     */
    public function test_basic_route_calculation()
    {
        // Test coordinates: Riga to Liepaja (Latvia)
        $response = $this->postJson('/api/routes/graphhopper', [
            'start_lat' => 56.9496,
            'start_lon' => 24.1052,
            'end_lat' => 56.5047,
            'end_lon' => 21.0108,
            'curvature_level' => 'straightest',
            'waypoints' => [],
            'avoid_options' => [],
            'alternative_routes' => false
        ]);

        $response->assertStatus(200);
        
        $data = $response->json();
        
        // Should have either a route or routes array
        $this->assertTrue(
            isset($data['route']) || isset($data['routes']) || isset($data['coordinates']),
            'Response should contain route data. Got: ' . json_encode($data)
        );
        
        // If route exists, it should have coordinates
        if (isset($data['route'])) {
            $this->assertArrayHasKey('coordinates', $data['route'], 'Route should have coordinates');
            $this->assertNotEmpty($data['route']['coordinates'], 'Route coordinates should not be empty');
        } elseif (isset($data['routes']) && is_array($data['routes']) && count($data['routes']) > 0) {
            $this->assertArrayHasKey('coordinates', $data['routes'][0], 'First route should have coordinates');
        } elseif (isset($data['coordinates'])) {
            $this->assertNotEmpty($data['coordinates'], 'Coordinates should not be empty');
        }
    }

    /**
     * Test route calculation with avoid options
     */
    public function test_route_calculation_with_avoid_options()
    {
        $response = $this->postJson('/api/routes/graphhopper', [
            'start_lat' => 56.9496,
            'start_lon' => 24.1052,
            'end_lat' => 56.5047,
            'end_lon' => 21.0108,
            'curvature_level' => 'balanced',
            'waypoints' => [],
            'avoid_options' => ['highways', 'tolls'],
            'alternative_routes' => false
        ]);

        // Should succeed even with avoid options
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertFalse(isset($data['error']), 'Should not return error. Got: ' . json_encode($data));
    }

    /**
     * Test route calculation handles free plan gracefully
     */
    public function test_route_calculation_free_plan_fallback()
    {
        $response = $this->postJson('/api/routes/graphhopper', [
            'start_lat' => 57.1314,
            'start_lon' => 27.2658,
            'end_lat' => 56.9496,
            'end_lon' => 24.1052,
            'curvature_level' => 'straightest',
            'waypoints' => [],
            'avoid_options' => [],
            'alternative_routes' => false
        ]);

        // Should succeed (either with custom model or fallback to basic routing)
        $response->assertStatus(200);
        
        $data = $response->json();
        
        // Should not have error message about free plan
        if (isset($data['error'])) {
            $this->assertStringNotContainsString(
                'Free packages cannot use flexible mode',
                $data['error'],
                'Free plan error should be handled automatically'
            );
        }
    }
}
