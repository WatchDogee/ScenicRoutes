<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ElevationService;

class TestElevationService extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:elevation';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the ElevationService';

    /**
     * Execute the console command.
     */
    public function handle(ElevationService $elevationService)
    {
        $this->info('Testing ElevationService with sample road coordinates...');
        
        // Test coordinates (sample road)
        $coordinates = [
            [57.1, 27.1],  // Start point
            [57.15, 27.15],
            [57.2, 27.2],
            [57.25, 27.25],
            [57.3, 27.3],  // End point
        ];
        
        $this->info('Coordinates: ' . json_encode($coordinates));
        $this->newLine();
        
        // Get elevations
        $this->info('Fetching elevations...');
        $elevations = $elevationService->getElevations($coordinates);
        
        if ($elevations) {
            $this->info('Elevations received: ' . json_encode($elevations));
            $this->newLine();
            
            // Calculate elevation statistics
            $this->info('Calculating elevation statistics...');
            $stats = $elevationService->calculateElevationStats($elevations);
            
            $this->info('Elevation statistics:');
            $this->info('Elevation Gain: ' . $stats['elevation_gain'] . ' meters');
            $this->info('Elevation Loss: ' . $stats['elevation_loss'] . ' meters');
            $this->info('Max Elevation: ' . $stats['max_elevation'] . ' meters');
            $this->info('Min Elevation: ' . $stats['min_elevation'] . ' meters');
        } else {
            $this->error('Failed to fetch elevations.');
        }
        
        return 0;
    }
}
