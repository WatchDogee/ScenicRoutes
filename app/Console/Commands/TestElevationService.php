<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ElevationService;

class TestElevationService extends Command
{
protected $signature = 'test:elevation';
protected $description = 'Test the ElevationService';
public function handle(ElevationService $elevationService)
    {
        $this->info('Testing ElevationService with sample road coordinates...');
        
        
        $coordinates = [
            [57.1, 27.1],  
            [57.15, 27.15],
            [57.2, 27.2],
            [57.25, 27.25],
            [57.3, 27.3],  
        ];
        
        $this->info('Coordinates: ' . json_encode($coordinates));
        $this->newLine();
        
        
        $this->info('Fetching elevations...');
        $elevations = $elevationService->getElevations($coordinates);
        
        if ($elevations) {
            $this->info('Elevations received: ' . json_encode($elevations));
            $this->newLine();
            
            
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
