<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SavedRoad;
use App\Models\User;
use App\Services\ElevationService;

class CreateTestRoad extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:create-road';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a test road with elevation data';

    /**
     * Execute the console command.
     */
    public function handle(ElevationService $elevationService)
    {
        $this->info('Creating a test road with elevation data...');
        
        // Get the first user
        $user = User::first();
        if (!$user) {
            $this->error('No users found in the database.');
            return 1;
        }
        
        // Test coordinates (sample road)
        $coordinates = [
            [57.1, 27.1],  // Start point
            [57.15, 27.15],
            [57.2, 27.2],
            [57.25, 27.25],
            [57.3, 27.3],  // End point
        ];
        
        // Get elevations
        $this->info('Fetching elevations...');
        $elevations = $elevationService->getElevations($coordinates);
        
        if (!$elevations) {
            $this->error('Failed to fetch elevations.');
            return 1;
        }
        
        // Calculate elevation statistics
        $elevationStats = $elevationService->calculateElevationStats($elevations);
        $this->info('Elevation statistics calculated: ' . json_encode($elevationStats));
        
        // Create the road
        $road = new SavedRoad();
        $road->user_id = $user->id;
        $road->road_name = 'Test Road with Elevation Data';
        $road->road_coordinates = json_encode($coordinates);
        $road->twistiness = 0.001;
        $road->corner_count = 5;
        $road->length = 10000;
        $road->is_public = true;
        $road->elevation_gain = $elevationStats['elevation_gain'];
        $road->elevation_loss = $elevationStats['elevation_loss'];
        $road->max_elevation = $elevationStats['max_elevation'];
        $road->min_elevation = $elevationStats['min_elevation'];
        
        $road->save();
        
        $this->info('Test road created with ID: ' . $road->id);
        
        return 0;
    }
}
