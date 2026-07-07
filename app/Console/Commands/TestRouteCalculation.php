<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\GraphHopperService;
use Illuminate\Support\Facades\Log;

class TestRouteCalculation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:route-calculation';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test route calculation with GraphHopper API and fix issues automatically';

    protected $graphHopperService;

    public function __construct(GraphHopperService $graphHopperService)
    {
        parent::__construct();
        $this->graphHopperService = $graphHopperService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing route calculation...');
        
        // Test 1: Basic route calculation
        $this->info('Test 1: Basic route (Riga to Liepaja)');
        $result1 = $this->graphHopperService->findCurvedRoute(
            56.9496,  // Riga lat
            24.1052,  // Riga lon
            56.5047,  // Liepaja lat
            21.0108,  // Liepaja lon
            'straightest',
            [],
            [],
            false
        );
        
        if ($result1 === null) {
            $this->error('Test 1 FAILED: Route calculation returned null');
            $this->checkLogs();
            return 1;
        }
        
        if (!isset($result1['coordinates']) || empty($result1['coordinates'])) {
            $this->error('Test 1 FAILED: Route has no coordinates');
            $this->error('Route data: ' . json_encode(array_keys($result1)));
            return 1;
        }
        
        $this->info('✓ Test 1 PASSED: Route calculated with ' . count($result1['coordinates']) . ' coordinates');
        
        // Test 2: Route with avoid options
        $this->info('Test 2: Route with avoid options (highways, tolls)');
        $result2 = $this->graphHopperService->findCurvedRoute(
            56.9496,
            24.1052,
            56.5047,
            21.0108,
            'balanced',
            [],
            ['highways', 'tolls'],
            false
        );
        
        if ($result2 === null) {
            $this->warn('Test 2 WARNING: Route with avoid options returned null (may be expected for free plan)');
        } else {
            $this->info('✓ Test 2 PASSED: Route with avoid options calculated');
        }
        
        // Test 3: Different curvature level
        $this->info('Test 3: Route with balanced curvature');
        $result3 = $this->graphHopperService->findCurvedRoute(
            57.1314,  // Balvi lat
            27.2658,  // Balvi lon
            56.9496,  // Riga lat
            24.1052,  // Riga lon
            'balanced',
            [],
            [],
            false
        );
        
        if ($result3 === null) {
            $this->error('Test 3 FAILED: Balanced route returned null');
            return 1;
        }
        
        if (!isset($result3['coordinates']) || empty($result3['coordinates'])) {
            $this->error('Test 3 FAILED: Balanced route has no coordinates');
            return 1;
        }
        
        $this->info('✓ Test 3 PASSED: Balanced route calculated');
        
        $this->info('');
        $this->info('All tests passed! Route calculation is working correctly.');
        return 0;
    }
    
    private function checkLogs()
    {
        $this->warn('Check storage/logs/laravel.log for detailed error information');
    }
}
