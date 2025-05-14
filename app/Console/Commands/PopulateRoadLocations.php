<?php

namespace App\Console\Commands;

use App\Models\SavedRoad;
use App\Services\GeocodingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PopulateRoadLocations extends Command
{
protected $signature = 'roads:populate-locations {--limit=} {--force}';
protected $description = 'Populate country and region fields for existing roads';
protected $geocodingService;
public function __construct(GeocodingService $geocodingService)
    {
        parent::__construct();
        $this->geocodingService = $geocodingService;
    }
public function handle()
    {
        $limit = $this->option('limit');
        $force = $this->option('force');

        $query = SavedRoad::query();

        
        if (!$force) {
            $query->whereNull('country');
        }

        
        if ($limit) {
            $query->limit((int) $limit);
        }

        $roads = $query->get();
        $total = $roads->count();

        if ($total === 0) {
            $this->info('No roads found that need location data.');
            return 0;
        }

        $this->info("Processing {$total} roads...");
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $updated = 0;
        $failed = 0;

        foreach ($roads as $road) {
            try {
                $this->info("Processing road ID {$road->id}");

                
                $coordinates = json_decode($road->road_coordinates);

                
                if ($coordinates === null) {
                    $this->warn("JSON decode failed for road ID {$road->id}, trying alternative parsing");

                    
                    if (is_string($road->road_coordinates) && strpos($road->road_coordinates, 'a:') === 0) {
                        $coordinates = @unserialize($road->road_coordinates);
                        $this->info("Unserialized coordinates for road ID {$road->id}");
                    } else {
                        
                        $lines = explode("\n", $road->road_coordinates);
                        if (count($lines) > 0) {
                            $coordinates = [];
                            foreach ($lines as $line) {
                                $parts = explode(',', $line);
                                if (count($parts) >= 2) {
                                    $coordinates[] = [(float)trim($parts[0]), (float)trim($parts[1])];
                                }
                            }
                            $this->info("Parsed " . count($coordinates) . " coordinates from CSV-like format");
                        }
                    }
                }

                
                if (is_object($coordinates)) {
                    $coordinates = json_decode(json_encode($coordinates), true);
                    $this->info("Converted object to array for road ID {$road->id}");
                }

                if (empty($coordinates)) {
                    $this->error("Road ID {$road->id} has no valid coordinates. Raw data: " . substr($road->road_coordinates, 0, 100) . "...");
                    $failed++;
                    $bar->advance();
                    continue;
                }

                $this->info("Found " . count($coordinates) . " coordinates for road ID {$road->id}");
                $this->info("First coordinate: " . json_encode($coordinates[0]));

                $locationInfo = $this->geocodingService->determineRoadLocation($coordinates);

                if ($locationInfo && isset($locationInfo['country'])) {
                    $this->info("Found location: {$locationInfo['country']}, {$locationInfo['region']}");
                    $road->country = $locationInfo['country'];
                    $road->region = $locationInfo['region'] ?? null;
                    $road->save();
                    $updated++;
                } else {
                    $failed++;
                    $this->warn("Could not determine location for road ID {$road->id}");
                    Log::warning("Could not determine location for road ID {$road->id}");
                }
            } catch (\Exception $e) {
                $failed++;
                $this->error("Error processing road ID {$road->id}: " . $e->getMessage());
                Log::error("Error processing road ID {$road->id}: " . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'road_coordinates' => substr($road->road_coordinates, 0, 200)
                ]);
            }

            $bar->advance();

            
            usleep(200000); 
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("Completed! Updated {$updated} roads. Failed: {$failed}");

        return 0;
    }
}
