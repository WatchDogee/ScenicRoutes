<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\SavedRoad;
use App\Models\Collection;
use App\Models\Review;
use App\Models\Comment;
use App\Models\Tag;

class SocialFeaturesTestDataSeeder extends Seeder
{
    /**
     * Create test data for social features testing.
     */
    public function run(): void
    {
        // Get test users
        $freeUser = User::where('email', 'test_free@example.com')->first();
        $premiumUser = User::where('email', 'test_premium@example.com')->first();
        $proUser = User::where('email', 'test_pro@example.com')->first();

        if (!$freeUser || !$premiumUser || !$proUser) {
            $this->command->error('Test users not found. Please run TestSubscriptionUsersSeeder first.');
            return;
        }

        // Sample road coordinates (curved roads in different regions)
        $sampleRoads = [
            [
                'name' => 'Alpine Pass Route',
                'coordinates' => [[47.3769, 8.5417], [46.5197, 9.3794], [46.2044, 6.1432]],
                'country' => 'Switzerland',
                'region' => 'Alps',
                'description' => 'Beautiful alpine pass with stunning mountain views and challenging curves.',
                'twistiness' => 8.5,
                'corner_count' => 45,
                'length' => 120.5,
            ],
            [
                'name' => 'Coastal Highway',
                'coordinates' => [[44.8378, -0.5792], [45.1885, -0.6067], [45.4969, -0.6332]],
                'country' => 'France',
                'region' => 'Aquitaine',
                'description' => 'Scenic coastal route with ocean views and smooth curves.',
                'twistiness' => 7.2,
                'corner_count' => 32,
                'length' => 85.3,
            ],
            [
                'name' => 'Mountain Twist',
                'coordinates' => [[46.9481, 7.4474], [46.5197, 9.3794], [46.2044, 6.1432]],
                'country' => 'Switzerland',
                'region' => 'Bernese Oberland',
                'description' => 'Challenging mountain road with tight hairpins and elevation changes.',
                'twistiness' => 9.1,
                'corner_count' => 58,
                'length' => 95.7,
            ],
            [
                'name' => 'Forest Trail',
                'coordinates' => [[48.8566, 2.3522], [49.1193, 2.2614], [49.4431, 2.8268]],
                'country' => 'France',
                'region' => 'Île-de-France',
                'description' => 'Peaceful forest road perfect for a relaxing ride.',
                'twistiness' => 6.5,
                'corner_count' => 28,
                'length' => 65.2,
            ],
            [
                'name' => 'Desert Highway',
                'coordinates' => [[36.1699, -115.1398], [36.1881, -115.1765], [36.2144, -115.2231]],
                'country' => 'USA',
                'region' => 'Nevada',
                'description' => 'Long straight sections with occasional curves through desert landscape.',
                'twistiness' => 5.8,
                'corner_count' => 18,
                'length' => 150.0,
            ],
        ];

        // Create saved roads for each user
        $this->command->info('Creating saved roads...');
        
        $freeUserRoads = [];
        $premiumUserRoads = [];
        $proUserRoads = [];

        foreach ($sampleRoads as $index => $roadData) {
            // Free user gets first 2 roads
            if ($index < 2) {
                $road = SavedRoad::create([
                    'user_id' => $freeUser->id,
                    'road_name' => $roadData['name'],
                    'road_coordinates' => json_encode($roadData['coordinates']),
                    'country' => $roadData['country'],
                    'region' => $roadData['region'],
                    'description' => $roadData['description'],
                    'twistiness' => $roadData['twistiness'],
                    'corner_count' => $roadData['corner_count'],
                    'length' => $roadData['length'],
                    'is_public' => true,
                    'average_rating' => 4.2 + ($index * 0.1),
                    'elevation_gain' => 500 + ($index * 100),
                    'elevation_loss' => 450 + ($index * 90),
                    'max_elevation' => 1500 + ($index * 200),
                    'min_elevation' => 800 + ($index * 100),
                ]);
                $freeUserRoads[] = $road;
            }

            // Premium user gets roads 1-3
            if ($index >= 1 && $index < 4) {
                $road = SavedRoad::create([
                    'user_id' => $premiumUser->id,
                    'road_name' => $roadData['name'] . ' (Premium)',
                    'road_coordinates' => json_encode($roadData['coordinates']),
                    'country' => $roadData['country'],
                    'region' => $roadData['region'],
                    'description' => $roadData['description'],
                    'twistiness' => $roadData['twistiness'],
                    'corner_count' => $roadData['corner_count'],
                    'length' => $roadData['length'],
                    'is_public' => true,
                    'average_rating' => 4.5 + ($index * 0.1),
                    'elevation_gain' => 600 + ($index * 100),
                    'elevation_loss' => 550 + ($index * 90),
                    'max_elevation' => 1600 + ($index * 200),
                    'min_elevation' => 900 + ($index * 100),
                ]);
                $premiumUserRoads[] = $road;
            }

            // Pro user gets all roads
            $road = SavedRoad::create([
                'user_id' => $proUser->id,
                'road_name' => $roadData['name'] . ' (Pro)',
                'road_coordinates' => json_encode($roadData['coordinates']),
                'country' => $roadData['country'],
                'region' => $roadData['region'],
                'description' => $roadData['description'],
                'twistiness' => $roadData['twistiness'],
                'corner_count' => $roadData['corner_count'],
                'length' => $roadData['length'],
                'is_public' => true,
                'average_rating' => 4.7 + ($index * 0.1),
                'elevation_gain' => 700 + ($index * 100),
                'elevation_loss' => 650 + ($index * 90),
                'max_elevation' => 1700 + ($index * 200),
                'min_elevation' => 1000 + ($index * 100),
            ]);
            $proUserRoads[] = $road;
        }

        $this->command->info('Created ' . count($freeUserRoads) . ' roads for Free user');
        $this->command->info('Created ' . count($premiumUserRoads) . ' roads for Premium user');
        $this->command->info('Created ' . count($proUserRoads) . ' roads for Pro user');

        // Create collections
        $this->command->info('Creating collections...');

        // Free user collection
        $freeCollection = Collection::create([
            'user_id' => $freeUser->id,
            'name' => 'My Favorite Alpine Routes',
            'description' => 'A collection of my favorite mountain passes and alpine roads.',
            'is_public' => true,
        ]);
        // Add roads to collection
        if (count($freeUserRoads) > 0) {
            $freeCollection->roads()->attach($freeUserRoads[0]->id);
            if (count($freeUserRoads) > 1) {
                $freeCollection->roads()->attach($freeUserRoads[1]->id);
            }
        }

        // Premium user collections
        $premiumCollection1 = Collection::create([
            'user_id' => $premiumUser->id,
            'name' => 'European Scenic Routes',
            'description' => 'Best scenic routes across Europe for motorcycle touring.',
            'is_public' => true,
        ]);
        if (count($premiumUserRoads) > 0) {
            foreach ($premiumUserRoads as $index => $road) {
                $premiumCollection1->roads()->attach($road->id);
            }
        }

        $premiumCollection2 = Collection::create([
            'user_id' => $premiumUser->id,
            'name' => 'Private Collection',
            'description' => 'My personal favorite routes (private).',
            'is_public' => false,
        ]);

        // Pro user collections
        $proCollection1 = Collection::create([
            'user_id' => $proUser->id,
            'name' => 'World\'s Best Motorcycle Roads',
            'description' => 'A curated collection of the most amazing motorcycle routes worldwide.',
            'is_public' => true,
        ]);
        if (count($proUserRoads) > 0) {
            foreach ($proUserRoads as $index => $road) {
                $proCollection1->roads()->attach($road->id);
            }
        }

        $proCollection2 = Collection::create([
            'user_id' => $proUser->id,
            'name' => 'Challenging Routes',
            'description' => 'Routes for experienced riders seeking technical challenges.',
            'is_public' => true,
        ]);
        if (count($proUserRoads) >= 2) {
            $proCollection2->roads()->attach($proUserRoads[0]->id);
            $proCollection2->roads()->attach($proUserRoads[2]->id);
        }

        $this->command->info('Created collections for all users');

        // Create some reviews
        $this->command->info('Creating reviews...');

        // Free user reviews Pro user's road
        if (count($proUserRoads) > 0) {
            Review::create([
                'user_id' => $freeUser->id,
                'saved_road_id' => $proUserRoads[0]->id,
                'rating' => 5,
                'comment' => 'Amazing road! The curves are perfect and the scenery is breathtaking.',
            ]);
        }

        // Premium user reviews Pro user's road
        if (count($proUserRoads) > 0) {
            Review::create([
                'user_id' => $premiumUser->id,
                'saved_road_id' => $proUserRoads[0]->id,
                'rating' => 4,
                'comment' => 'Great route, but can be busy during peak season.',
            ]);
        }

        // Pro user reviews Premium user's road
        if (count($premiumUserRoads) > 0) {
            Review::create([
                'user_id' => $proUser->id,
                'saved_road_id' => $premiumUserRoads[0]->id,
                'rating' => 5,
                'comment' => 'One of my favorite routes! Highly recommended.',
            ]);
        }

        // Update average ratings
        foreach ($proUserRoads as $road) {
            $avgRating = $road->reviews()->avg('rating');
            if ($avgRating) {
                $road->update(['average_rating' => round($avgRating, 2)]);
            }
        }

        foreach ($premiumUserRoads as $road) {
            $avgRating = $road->reviews()->avg('rating');
            if ($avgRating) {
                $road->update(['average_rating' => round($avgRating, 2)]);
            }
        }

        $this->command->info('Created reviews and updated ratings');

        // Create some comments
        $this->command->info('Creating comments...');

        if (count($proUserRoads) > 0) {
            Comment::create([
                'user_id' => $freeUser->id,
                'saved_road_id' => $proUserRoads[0]->id,
                'comment' => 'When is the best time to ride this route?',
            ]);

            Comment::create([
                'user_id' => $premiumUser->id,
                'saved_road_id' => $proUserRoads[0]->id,
                'comment' => 'Early morning is best - less traffic and better lighting for photos!',
            ]);
        }

        $this->command->info('Created comments');

        $this->command->info('✅ Social features test data created successfully!');
        $this->command->info('Free user: ' . count($freeUserRoads) . ' roads, 1 collection');
        $this->command->info('Premium user: ' . count($premiumUserRoads) . ' roads, 2 collections');
        $this->command->info('Pro user: ' . count($proUserRoads) . ' roads, 2 collections');
    }
}

