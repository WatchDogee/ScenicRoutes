<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SavedRoad;

class FixTestRoads extends Command
{
protected $signature = 'roads:fix-test';
protected $description = 'Fix test roads with missing data';
public function handle()
    {
        $this->info('Checking for test roads with missing data...');

        
        $testRoads = SavedRoad::where('road_name', 'like', '%Test%')
            ->where(function($query) {
                $query->whereNull('length')
                    ->orWhereNull('corner_count')
                    ->orWhereNull('twistiness')
                    ->orWhereNull('elevation_gain')
                    ->orWhereNull('elevation_loss')
                    ->orWhereNull('max_elevation')
                    ->orWhereNull('min_elevation');
            })
            ->get();

        if ($testRoads->count() === 0) {
            $this->info('No test roads with missing data found.');

            
            $allTestRoads = SavedRoad::where('road_name', 'like', '%Test%')->get();
            $this->info('Total test roads found: ' . $allTestRoads->count());

            if ($allTestRoads->count() > 0) {
                $this->table(
                    ['ID', 'Name', 'Length', 'Corners', 'Twistiness', 'Elevation Gain', 'Elevation Loss'],
                    $allTestRoads->map(function ($road) {
                        return [
                            'id' => $road->id,
                            'name' => $road->road_name,
                            'length' => $road->length,
                            'corners' => $road->corner_count,
                            'twistiness' => $road->twistiness,
                            'elevation_gain' => $road->elevation_gain,
                            'elevation_loss' => $road->elevation_loss
                        ];
                    })
                );
            }

            return 0;
        }

        $this->info('Found ' . $testRoads->count() . ' test roads with missing data.');

        $bar = $this->output->createProgressBar($testRoads->count());
        $bar->start();

        foreach ($testRoads as $road) {
            
            if ($road->length === null) {
                $road->length = 5000; 
            }

            if ($road->corner_count === null) {
                $road->corner_count = 5;
            }

            if ($road->twistiness === null) {
                $road->twistiness = 0.005;
            }

            if ($road->elevation_gain === null) {
                $road->elevation_gain = 25;
            }

            if ($road->elevation_loss === null) {
                $road->elevation_loss = 9;
            }

            if ($road->max_elevation === null) {
                $road->max_elevation = 135;
            }

            if ($road->min_elevation === null) {
                $road->min_elevation = 110;
            }

            $road->save();
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Fixed ' . $testRoads->count() . ' test roads.');

        return 0;
    }
}
