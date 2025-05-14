<?php

namespace App\Console\Commands;

use App\Models\Collection;
use Illuminate\Console\Command;

class MarkCollectionsAsFeatured extends Command
{
protected $signature = 'collections:feature
                            {count=3 : Number of collections to feature}
                            {--min_roads=3 : Minimum number of roads in a collection}
                            {--min_rating=4 : Minimum average rating of roads in a collection}
                            {--reset : Reset all featured collections before marking new ones}
                            {--quality : Select collections based on quality metrics instead of random selection}';
protected $description = 'Mark collections as featured based on various criteria';
public function handle()
    {
        $count = (int) $this->argument('count');
        $minRoads = (int) $this->option('min_roads');
        $minRating = (float) $this->option('min_rating');
        $resetAll = $this->option('reset');
        $useQualityMetrics = $this->option('quality');

        if ($resetAll) {
            
            Collection::where('is_featured', true)->update(['is_featured' => false]);
            $this->info("Reset all previously featured collections.");
        }

        
        $query = Collection::where('is_public', true)
            ->whereHas('roads', function($query) use ($minRoads) {
                $query->selectRaw('COUNT(*) as road_count')
                    ->havingRaw('road_count >= ?', [$minRoads]);
            })
            ->with(['user', 'tags', 'roads']);

        
        if ($useQualityMetrics) {
            
            $collections = $query->get();
            $this->info("Found {$collections->count()} public collections with at least $minRoads roads");

            
            $featuredCollections = $collections->filter(function ($collection) use ($minRating) {
                
                $totalRating = 0;
                $ratedRoads = 0;

                foreach ($collection->roads as $road) {
                    if ($road->average_rating > 0) {
                        $totalRating += $road->average_rating;
                        $ratedRoads++;
                    }
                }

                $averageRating = $ratedRoads > 0 ? $totalRating / $ratedRoads : 0;

                
                $collection->calculated_average_rating = $averageRating;

                return $averageRating >= $minRating;
            });

            $this->info("Found {$featuredCollections->count()} collections with average road rating >= $minRating");

            
            $featuredCollections = $featuredCollections->sortByDesc('calculated_average_rating');

            
            $collectionsToMark = $featuredCollections->take($count);
        } else {
            
            $collectionsToMark = $query->inRandomOrder()->take($count)->get();
        }

        if ($collectionsToMark->isEmpty()) {
            $this->error("No public collections found that match the criteria.");
            return 1;
        }

        $markedCount = 0;
        foreach ($collectionsToMark as $collection) {
            $collection->is_featured = true;
            $collection->save();

            if ($useQualityMetrics) {
                $this->info("Marked collection '{$collection->name}' by {$collection->user->name} as featured (Avg Rating: {$collection->calculated_average_rating})");
            } else {
                $this->info("Marked collection '{$collection->name}' by {$collection->user->name} as featured.");
            }

            $markedCount++;
        }

        $this->info("Successfully marked {$markedCount} collections as featured.");

        return 0;
    }
}
