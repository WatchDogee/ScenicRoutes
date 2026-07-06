<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\SavedRoad;
use App\Models\Collection;
use App\Models\Review;
use App\Models\Comment;

class EnrichedSocialDataSeeder extends Seeder
{
    /**
     * Seed additional roads, collections, reviews, and comments
     * for test users: test_free, test_premium, test_pro.
     */
    public function run(): void
    {
        $freeUser = User::where('email', 'test_free@example.com')->first();
        $premiumUser = User::where('email', 'test_premium@example.com')->first();
        $proUser = User::where('email', 'test_pro@example.com')->first();

        if (!$freeUser || !$premiumUser || !$proUser) {
            $this->command->error('Test users not found. Run TestSubscriptionUsersSeeder first.');
            return;
        }

        $this->command->info('Seeding enriched social data...');

        // Additional sample roads
        $extraRoads = [
            [
                'name' => 'Northern Ridge Loop',
                'coordinates' => [[47.0, 8.2], [47.2, 8.4], [47.4, 8.6]],
                'country' => 'Switzerland',
                'region' => 'Lucerne',
                'description' => 'Flowing ridge roads with panoramic views.',
                'twistiness' => 7.9,
                'corner_count' => 36,
                'length' => 72.4,
            ],
            [
                'name' => 'Atlantic Cliffs Drive',
                'coordinates' => [[51.8, -10.3], [52.1, -9.9], [52.4, -9.5]],
                'country' => 'Ireland',
                'region' => 'Munster',
                'description' => 'Windy coastal segments hugging dramatic cliffs.',
                'twistiness' => 8.2,
                'corner_count' => 41,
                'length' => 88.7,
            ],
            [
                'name' => 'Red Canyon Sweepers',
                'coordinates' => [[36.1, -112.1], [36.4, -112.4], [36.6, -112.7]],
                'country' => 'USA',
                'region' => 'Arizona',
                'description' => 'Long sweepers through canyon landscapes.',
                'twistiness' => 6.8,
                'corner_count' => 24,
                'length' => 110.3,
            ],
        ];

        $freeUserNewRoads = [];
        $premiumUserNewRoads = [];
        $proUserNewRoads = [];

        // Assign extra roads to each user (distinct names per user)
        foreach ($extraRoads as $r) {
            $freeUserNewRoads[] = SavedRoad::create([
                'user_id' => $freeUser->id,
                'road_name' => $r['name'] . ' (Free Extra)',
                'road_coordinates' => json_encode($r['coordinates']),
                'country' => $r['country'],
                'region' => $r['region'],
                'description' => $r['description'],
                'twistiness' => $r['twistiness'],
                'corner_count' => $r['corner_count'],
                'length' => $r['length'],
                'is_public' => true,
                'average_rating' => 4.1,
                'elevation_gain' => 450,
                'elevation_loss' => 420,
                'max_elevation' => 1400,
                'min_elevation' => 700,
            ]);

            $premiumUserNewRoads[] = SavedRoad::create([
                'user_id' => $premiumUser->id,
                'road_name' => $r['name'] . ' (Premium Extra)',
                'road_coordinates' => json_encode($r['coordinates']),
                'country' => $r['country'],
                'region' => $r['region'],
                'description' => $r['description'],
                'twistiness' => $r['twistiness'],
                'corner_count' => $r['corner_count'],
                'length' => $r['length'],
                'is_public' => true,
                'average_rating' => 4.3,
                'elevation_gain' => 520,
                'elevation_loss' => 480,
                'max_elevation' => 1500,
                'min_elevation' => 800,
            ]);

            $proUserNewRoads[] = SavedRoad::create([
                'user_id' => $proUser->id,
                'road_name' => $r['name'] . ' (Pro Extra)',
                'road_coordinates' => json_encode($r['coordinates']),
                'country' => $r['country'],
                'region' => $r['region'],
                'description' => $r['description'],
                'twistiness' => $r['twistiness'],
                'corner_count' => $r['corner_count'],
                'length' => $r['length'],
                'is_public' => true,
                'average_rating' => 4.6,
                'elevation_gain' => 600,
                'elevation_loss' => 560,
                'max_elevation' => 1650,
                'min_elevation' => 900,
            ]);
        }

        $this->command->info('Extra roads created: Free=' . count($freeUserNewRoads) . ', Premium=' . count($premiumUserNewRoads) . ', Pro=' . count($proUserNewRoads));

        // Additional collections per user
        $freeExtra = Collection::create([
            'user_id' => $freeUser->id,
            'name' => 'Weekend Scenic Loops',
            'description' => 'Short scenic loops perfect for quick rides.',
            'is_public' => true,
        ]);
        foreach ($freeUserNewRoads as $road) { $freeExtra->roads()->attach($road->id); }

        $premiumExtra = Collection::create([
            'user_id' => $premiumUser->id,
            'name' => 'Premium Coastlines',
            'description' => 'Favorite coastal rides with premium vistas.',
            'is_public' => true,
        ]);
        foreach ($premiumUserNewRoads as $road) { $premiumExtra->roads()->attach($road->id); }

        $proExtra = Collection::create([
            'user_id' => $proUser->id,
            'name' => 'Pro Canyon Series',
            'description' => 'Technical canyon routes for experienced riders.',
            'is_public' => true,
        ]);
        foreach ($proUserNewRoads as $road) { $proExtra->roads()->attach($road->id); }

        $this->command->info('Extra collections created for all users');

        // Reviews across users on newly added roads
        foreach ($proUserNewRoads as $i => $road) {
            Review::create([
                'user_id' => $freeUser->id,
                'saved_road_id' => $road->id,
                'rating' => 4 + ($i % 2),
                'comment' => 'Loved the flow and scenery on this segment.',
            ]);
            Review::create([
                'user_id' => $premiumUser->id,
                'saved_road_id' => $road->id,
                'rating' => 5,
                'comment' => 'Fantastic ride, highly recommend at sunrise.',
            ]);
            $avg = $road->reviews()->avg('rating');
            if ($avg) { $road->update(['average_rating' => round($avg, 2)]); }
        }

        foreach ($premiumUserNewRoads as $road) {
            Review::create([
                'user_id' => $proUser->id,
                'saved_road_id' => $road->id,
                'rating' => 5,
                'comment' => 'Great corners and perfect surface.',
            ]);
            $avg = $road->reviews()->avg('rating');
            if ($avg) { $road->update(['average_rating' => round($avg, 2)]); }
        }

        // Comments threads
        foreach ($freeUserNewRoads as $road) {
            Comment::create([
                'user_id' => $premiumUser->id,
                'saved_road_id' => $road->id,
                'comment' => 'Watch out for gravel near the ridge.',
            ]);
            Comment::create([
                'user_id' => $proUser->id,
                'saved_road_id' => $road->id,
                'comment' => 'Late afternoon light makes this route shine.',
            ]);
        }

        $this->command->info('Reviews and comments added');

        // Ensure follow relationships so feed is populated
        $this->command->info('Creating follow relationships...');
        // test_premium follows test_pro and test_free
        $premiumUser->following()->syncWithoutDetaching([$proUser->id, $freeUser->id]);
        // test_free follows test_pro
        $freeUser->following()->syncWithoutDetaching([$proUser->id]);
        // test_pro follows test_premium
        $proUser->following()->syncWithoutDetaching([$premiumUser->id]);
        $this->command->info('Follow relationships created.');

        $this->command->info('✅ Enriched social data seeding complete.');
    }
}
