<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\OfflineMapRegion;

class OfflineMapRegionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $regions = [
            [
                'region_id' => 'latvia',
                'name' => 'Latvia',
                'description' => 'Complete coverage of Latvia',
                'south' => 55.6,
                'west' => 20.8,
                'north' => 58.1,
                'east' => 28.2,
                'country_codes' => ['LV'],
                'zoom_levels' => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                'estimated_size_mb' => 150,
                'is_bundle' => false,
                'bundle_regions' => null,
                'is_active' => true,
                'display_order' => 1,
            ],
            [
                'region_id' => 'estonia',
                'name' => 'Estonia',
                'description' => 'Complete coverage of Estonia',
                'south' => 57.5,
                'west' => 21.8,
                'north' => 59.7,
                'east' => 28.2,
                'country_codes' => ['EE'],
                'zoom_levels' => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                'estimated_size_mb' => 120,
                'is_bundle' => false,
                'bundle_regions' => null,
                'is_active' => true,
                'display_order' => 2,
            ],
            [
                'region_id' => 'lithuania',
                'name' => 'Lithuania',
                'description' => 'Complete coverage of Lithuania',
                'south' => 53.9,
                'west' => 20.9,
                'north' => 56.5,
                'east' => 26.8,
                'country_codes' => ['LT'],
                'zoom_levels' => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                'estimated_size_mb' => 130,
                'is_bundle' => false,
                'bundle_regions' => null,
                'is_active' => true,
                'display_order' => 3,
            ],
            [
                'region_id' => 'baltic-states',
                'name' => 'Baltic States',
                'description' => 'Complete coverage of Latvia, Estonia, and Lithuania',
                'south' => 53.9,
                'west' => 20.8,
                'north' => 59.7,
                'east' => 28.2,
                'country_codes' => ['LV', 'EE', 'LT'],
                'zoom_levels' => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                'estimated_size_mb' => 400,
                'is_bundle' => true,
                'bundle_regions' => ['latvia', 'estonia', 'lithuania'],
                'is_active' => true,
                'display_order' => 4,
            ],
        ];

        foreach ($regions as $region) {
            OfflineMapRegion::updateOrCreate(
                ['region_id' => $region['region_id']],
                $region
            );
        }
    }
}
