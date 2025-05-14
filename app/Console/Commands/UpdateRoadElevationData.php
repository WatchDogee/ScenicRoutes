<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SavedRoad;
use App\Services\ElevationService;

class UpdateRoadElevationData extends Command
{
protected $signature = 'roads:update-elevation {--id=} {--all}';
protected $description = 'Update elevation data for existing roads';
public function handle(ElevationService $elevationService)
    {
        if (!$this->option('id') && !$this->option('all')) {
            $this->error('Please specify either --id=X or --all option.');
            return 1;
        }

        if ($this->option('id')) {
            $roadId = $this->option('id');
            $road = SavedRoad::find($roadId);
            
            if (!$road) {
                $this->error("Road with ID {$roadId} not found.");
                return 1;
            }
            
            $this->updateRoadElevation($road, $elevationService);
            $this->info("Updated elevation data for road ID {$roadId}.");
        } else {
            $roads = SavedRoad::whereNull('elevation_gain')
                ->orWhereNull('elevation_loss')
                ->orWhereNull('max_elevation')
                ->orWhereNull('min_elevation')
                ->get();
            
            $count = $roads->count();
            $this->info("Found {$count} roads without elevation data.");
            
            $bar = $this->output->createProgressBar($count);
            $bar->start();
            
            foreach ($roads as $road) {
                $this->updateRoadElevation($road, $elevationService);
                $bar->advance();
            }
            
            $bar->finish();
            $this->newLine();
            $this->info("Updated elevation data for {$count} roads.");
        }
        
        return 0;
    }
private function updateRoadElevation(SavedRoad $road, ElevationService $elevationService)
    {
        try {
            $coordinates = json_decode($road->road_coordinates, true);
            
            if (!$coordinates || !is_array($coordinates) || count($coordinates) < 2) {
                $this->warn("Road ID {$road->id} has invalid coordinates.");
                return;
            }
            
            $elevations = $elevationService->getElevations($coordinates);
            
            if (!$elevations) {
                $this->warn("Failed to fetch elevations for road ID {$road->id}.");
                return;
            }
            
            $elevationStats = $elevationService->calculateElevationStats($elevations);
            
            $road->elevation_gain = $elevationStats['elevation_gain'];
            $road->elevation_loss = $elevationStats['elevation_loss'];
            $road->max_elevation = $elevationStats['max_elevation'];
            $road->min_elevation = $elevationStats['min_elevation'];
            $road->save();
            
        } catch (\Exception $e) {
            $this->warn("Error updating elevation data for road ID {$road->id}: {$e->getMessage()}");
        }
    }
}
