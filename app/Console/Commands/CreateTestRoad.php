<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SavedRoad;
use App\Models\User;
use App\Services\ElevationService;

class CreateTestRoad extends Command
{
protected $signature = 'test:create-road {--country=Latvia} {--region=Riga}';
protected $description = 'Create a test road with elevation data and location information';
public function handle(ElevationService $elevationService)
    {
        $this->info('Creating a test road with elevation data...');

        
        $user = User::first();
        if (!$user) {
            $this->error('No users found in the database.');
            return 1;
        }

        
        $coordinates = [
            [57.1, 27.1],  
            [57.15, 27.15],
            [57.2, 27.2],
            [57.25, 27.25],
            [57.3, 27.3],  
        ];

        
        $this->info('Fetching elevations...');
        $elevations = $elevationService->getElevations($coordinates);

        if (!$elevations) {
            $this->error('Failed to fetch elevations.');
            return 1;
        }

        
        $elevationStats = $elevationService->calculateElevationStats($elevations);
        $this->info('Elevation statistics calculated: ' . json_encode($elevationStats));

        
        $road = new SavedRoad();
        $road->user_id = $user->id;
        
        $country = $this->option('country');
        $region = $this->option('region');

        $road->road_name = "Test Road in $region, $country";
        $road->road_coordinates = json_encode($coordinates);
        $road->twistiness = 0.001;
        $road->corner_count = 5;
        $road->length = 10000;
        $road->is_public = true;
        $road->country = $country;
        $road->region = $region;
        $road->elevation_gain = $elevationStats['elevation_gain'];
        $road->elevation_loss = $elevationStats['elevation_loss'];
        $road->max_elevation = $elevationStats['max_elevation'];
        $road->min_elevation = $elevationStats['min_elevation'];

        $road->save();

        $this->info('Test road created with ID: ' . $road->id);
        $this->info('Country: ' . $road->country);
        $this->info('Region: ' . $road->region);

        return 0;
    }
}
