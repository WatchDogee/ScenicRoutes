<?php

namespace Database\Seeders;

use App\Models\Collection;
use App\Models\Review;
use App\Models\Ride;
use App\Models\SavedRoad;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Faker\Factory as Faker;

class PlayStoreMockSeeder extends Seeder
{
    private const MARKER = 'seed_playstore_';
    private const DEMO_EMAIL = 'alex.berger@example.com';
    private const DEMO_USERNAME = 'alex_berger';
    private const DEMO_PASSWORD = 'DemoPass123!';

    public function run(): void
    {
        $faker = Faker::create();

        DB::transaction(function () use ($faker) {
            $demoUser = User::firstOrCreate(
                ['email' => self::DEMO_EMAIL],
                [
                    'name' => 'Alex Berger',
                    'username' => self::DEMO_USERNAME,
                    'password' => Hash::make(self::DEMO_PASSWORD),
                    'email_verified_at' => now(),
                    'google_id' => self::MARKER . 'alex',
                ]
            );

            if (!$demoUser->email_verified_at) {
                $demoUser->forceFill(['email_verified_at' => now()])->save();
            }

            $extraUsers = [
                ['name' => 'Lena Fischer', 'username' => 'lena_fischer', 'email' => 'lena.fischer@example.com', 'marker' => self::MARKER . 'lena'],
                ['name' => 'Jonas Weber', 'username' => 'jonas_weber', 'email' => 'jonas.weber@example.com', 'marker' => self::MARKER . 'jonas'],
                ['name' => 'Sofia Rossi', 'username' => 'sofia_rossi', 'email' => 'sofia.rossi@example.com', 'marker' => self::MARKER . 'sofia'],
                ['name' => 'Theo Laurent', 'username' => 'theo_laurent', 'email' => 'theo.laurent@example.com', 'marker' => self::MARKER . 'theo'],
                ['name' => 'Mila Novak', 'username' => 'mila_novak', 'email' => 'mila.novak@example.com', 'marker' => self::MARKER . 'mila'],
                ['name' => 'Eva Schmid', 'username' => 'eva_schmid', 'email' => 'eva.schmid@example.com', 'marker' => self::MARKER . 'eva'],
                ['name' => 'Marius Klein', 'username' => 'marius_klein', 'email' => 'marius.klein@example.com', 'marker' => self::MARKER . 'marius'],
                ['name' => 'Nora Keller', 'username' => 'nora_keller', 'email' => 'nora.keller@example.com', 'marker' => self::MARKER . 'nora'],
                ['name' => 'Felix Brandt', 'username' => 'felix_brandt', 'email' => 'felix.brandt@example.com', 'marker' => self::MARKER . 'felix'],
                ['name' => 'Elisa Koenig', 'username' => 'elisa_koenig', 'email' => 'elisa.koenig@example.com', 'marker' => self::MARKER . 'elisa'],
                ['name' => 'Marco Bianchi', 'username' => 'marco_bianchi', 'email' => 'marco.bianchi@example.com', 'marker' => self::MARKER . 'marco'],
                ['name' => 'Pauline Dupont', 'username' => 'pauline_dupont', 'email' => 'pauline.dupont@example.com', 'marker' => self::MARKER . 'pauline'],
            ];

            $followerOnlyUsers = [
                ['name' => 'Niklas Vogel', 'username' => 'niklas_vogel', 'email' => 'niklas.vogel@example.com', 'marker' => self::MARKER . 'niklas'],
                ['name' => 'Isabel Hartmann', 'username' => 'isabel_hartmann', 'email' => 'isabel.hartmann@example.com', 'marker' => self::MARKER . 'isabel'],
                ['name' => 'Tomislav Petrov', 'username' => 'tomislav_petrov', 'email' => 'tomislav.petrov@example.com', 'marker' => self::MARKER . 'tomislav'],
                ['name' => 'Helena Kruger', 'username' => 'helena_kruger', 'email' => 'helena.kruger@example.com', 'marker' => self::MARKER . 'helena'],
                ['name' => 'Robert Stein', 'username' => 'robert_stein', 'email' => 'robert.stein@example.com', 'marker' => self::MARKER . 'robert'],
                ['name' => 'Greta Hoffmann', 'username' => 'greta_hoffmann', 'email' => 'greta.hoffmann@example.com', 'marker' => self::MARKER . 'greta'],
                ['name' => 'Julian Meier', 'username' => 'julian_meier', 'email' => 'julian.meier@example.com', 'marker' => self::MARKER . 'julian'],
                ['name' => 'Chiara Romano', 'username' => 'chiara_romano', 'email' => 'chiara.romano@example.com', 'marker' => self::MARKER . 'chiara'],
                ['name' => 'Arthur Lehmann', 'username' => 'arthur_lehmann', 'email' => 'arthur.lehmann@example.com', 'marker' => self::MARKER . 'arthur'],
                ['name' => 'Clara Weiss', 'username' => 'clara_weiss', 'email' => 'clara.weiss@example.com', 'marker' => self::MARKER . 'clara'],
                ['name' => 'Leon Wagner', 'username' => 'leon_wagner', 'email' => 'leon.wagner@example.com', 'marker' => self::MARKER . 'leon'],
                ['name' => 'Hannah Roth', 'username' => 'hannah_roth', 'email' => 'hannah.roth@example.com', 'marker' => self::MARKER . 'hannah'],
                ['name' => 'Matteo Costa', 'username' => 'matteo_costa', 'email' => 'matteo.costa@example.com', 'marker' => self::MARKER . 'matteo'],
                ['name' => 'Claire Moreau', 'username' => 'claire_moreau', 'email' => 'claire.moreau@example.com', 'marker' => self::MARKER . 'claire'],
            ];

            $users = [$demoUser];
            foreach ($extraUsers as $userData) {
                $users[] = User::firstOrCreate(
                    ['email' => $userData['email']],
                    [
                        'name' => $userData['name'],
                        'username' => $userData['username'],
                        'password' => Hash::make(self::DEMO_PASSWORD),
                        'email_verified_at' => now(),
                        'google_id' => $userData['marker'],
                    ]
                );
            }

            $followerUsers = [];
            foreach ($followerOnlyUsers as $userData) {
                $followerUsers[] = User::firstOrCreate(
                    ['email' => $userData['email']],
                    [
                        'name' => $userData['name'],
                        'username' => $userData['username'],
                        'password' => Hash::make(self::DEMO_PASSWORD),
                        'email_verified_at' => now(),
                        'google_id' => $userData['marker'],
                    ]
                );
            }

            $roads = [
                [
                    'name' => 'Black Forest Panorama',
                    'route_type' => 'road',
                    'coordinates' => [[48.4719, 8.0567], [48.5300, 8.2000], [48.5700, 8.3200]],
                    'country' => 'Germany',
                    'region' => 'Baden-Wuerttemberg',
                    'description' => 'Forest ridge sweepers with smooth asphalt and lookout stops.',
                ],
                [
                    'name' => 'Rhine Valley Sweep',
                    'route_type' => 'route',
                    'coordinates' => [[50.1090, 7.2430], [50.1700, 7.4200], [50.2400, 7.6100]],
                    'country' => 'Germany',
                    'region' => 'Rhineland-Palatinate',
                    'description' => 'Vineyard curves along the Rhine with castle views.',
                ],
                [
                    'name' => 'Bavarian Lakes Circuit',
                    'route_type' => 'road',
                    'coordinates' => [[47.6600, 11.1100], [47.7100, 11.2600], [47.7600, 11.3700]],
                    'country' => 'Germany',
                    'region' => 'Bavaria',
                    'description' => 'Bright lake views and flowing countryside bends.',
                ],
                [
                    'name' => 'Alpine Passfahrt',
                    'route_type' => 'route',
                    'coordinates' => [[47.2680, 11.4000], [47.1400, 11.7200], [47.0100, 12.1000]],
                    'country' => 'Austria',
                    'region' => 'Tyrol',
                    'description' => 'High alpine pass with tight switchbacks and dramatic peaks.',
                ],
                [
                    'name' => 'Dolomites Ridge Run',
                    'route_type' => 'road',
                    'coordinates' => [[46.4100, 11.8800], [46.4600, 12.0500], [46.5200, 12.2200]],
                    'country' => 'Italy',
                    'region' => 'Trentino-Alto Adige',
                    'description' => 'Cliffside corners and panoramic Dolomites horizons.',
                ],
                [
                    'name' => 'Alsace Vineyard Route',
                    'route_type' => 'route',
                    'coordinates' => [[48.1700, 7.2600], [48.2100, 7.3400], [48.2600, 7.4400]],
                    'country' => 'France',
                    'region' => 'Alsace',
                    'description' => 'Rolling vineyard lanes with village views.',
                ],
                [
                    'name' => 'Swiss Lake Vista Loop',
                    'route_type' => 'road',
                    'coordinates' => [[47.0500, 8.3000], [47.1000, 8.5200], [47.0200, 8.7600]],
                    'country' => 'Switzerland',
                    'region' => 'Central Switzerland',
                    'description' => 'Crystal lake vistas and perfect late afternoon light.',
                ],
                [
                    'name' => 'Bohemian Ridge Drive',
                    'route_type' => 'route',
                    'coordinates' => [[50.6500, 14.0000], [50.7100, 14.1800], [50.7600, 14.3600]],
                    'country' => 'Czech Republic',
                    'region' => 'Bohemia',
                    'description' => 'Mountain ridges with long arcs and forest scenery.',
                ],
                [
                    'name' => 'Harz Mountain Run',
                    'route_type' => 'road',
                    'coordinates' => [[51.7900, 10.6200], [51.7700, 10.7800], [51.7300, 10.9400]],
                    'country' => 'Germany',
                    'region' => 'Harz',
                    'description' => 'Tight forest bends with sudden elevation changes.',
                ],
                [
                    'name' => 'Mosel River Curve',
                    'route_type' => 'route',
                    'coordinates' => [[49.7500, 6.6400], [49.8100, 6.8800], [49.8500, 7.0800]],
                    'country' => 'Germany',
                    'region' => 'Mosel',
                    'description' => 'River-side curves and vineyard terraces.',
                ],
                [
                    'name' => 'Tyrolean Pass Drift',
                    'route_type' => 'road',
                    'coordinates' => [[47.3400, 11.8700], [47.2600, 12.0600], [47.2100, 12.2400]],
                    'country' => 'Austria',
                    'region' => 'Tyrol',
                    'description' => 'High altitude sweepers with crisp mountain air.',
                ],
                [
                    'name' => 'Provence Hill Run',
                    'route_type' => 'route',
                    'coordinates' => [[43.9400, 5.1000], [44.0200, 5.2800], [44.0900, 5.4400]],
                    'country' => 'France',
                    'region' => 'Provence',
                    'description' => 'Lavender hills and warm sunset light.',
                ],
                [
                    'name' => 'Saxon Switzerland Loop',
                    'route_type' => 'road',
                    'coordinates' => [[50.9300, 14.0400], [50.9800, 14.1400], [51.0200, 14.2400]],
                    'country' => 'Germany',
                    'region' => 'Saxony',
                    'description' => 'Sandstone cliffs with sweeping turns and overlooks.',
                ],
                [
                    'name' => 'Lake Como Ridge',
                    'route_type' => 'route',
                    'coordinates' => [[46.0200, 9.1200], [46.0500, 9.2000], [46.0800, 9.3100]],
                    'country' => 'Italy',
                    'region' => 'Lombardy',
                    'description' => 'Lake vistas and hairpins above Como.',
                ],
                [
                    'name' => 'Carinthian Sweep',
                    'route_type' => 'road',
                    'coordinates' => [[46.6900, 14.3100], [46.6400, 14.4600], [46.5900, 14.6000]],
                    'country' => 'Austria',
                    'region' => 'Carinthia',
                    'description' => 'Wide bends through alpine valleys.',
                ],
                [
                    'name' => 'Black Forest North Run',
                    'route_type' => 'route',
                    'coordinates' => [[48.7800, 8.2000], [48.8300, 8.3500], [48.8800, 8.5200]],
                    'country' => 'Germany',
                    'region' => 'Baden-Wuerttemberg',
                    'description' => 'Fast curves through dark pine forests.',
                ],
                [
                    'name' => 'Alpine Meadow Pass',
                    'route_type' => 'road',
                    'coordinates' => [[46.8800, 10.9800], [46.8300, 11.1300], [46.7900, 11.2600]],
                    'country' => 'Italy',
                    'region' => 'South Tyrol',
                    'description' => 'High meadows and tight switchbacks.',
                ],
                [
                    'name' => 'Loire Valley Cruise',
                    'route_type' => 'route',
                    'coordinates' => [[47.3300, 0.6500], [47.3700, 0.8400], [47.4200, 1.0200]],
                    'country' => 'France',
                    'region' => 'Loire',
                    'description' => 'Smooth river bends with château views.',
                ],
                [
                    'name' => 'Bavarian Highlands',
                    'route_type' => 'road',
                    'coordinates' => [[47.7000, 11.4000], [47.6400, 11.5200], [47.6000, 11.6600]],
                    'country' => 'Germany',
                    'region' => 'Bavaria',
                    'description' => 'Highland sweepers with alpine backdrops.',
                ],
                [
                    'name' => 'Tuscany Ridge Road',
                    'route_type' => 'route',
                    'coordinates' => [[43.3500, 11.3300], [43.4200, 11.5000], [43.4800, 11.6600]],
                    'country' => 'Italy',
                    'region' => 'Tuscany',
                    'description' => 'Cypress hills and golden farmland.',
                ],
            ];

            $savedRoads = [];
            foreach ($roads as $index => $road) {
                if ($index < 5) {
                    $owner = $demoUser;
                } elseif ($index < 10) {
                    $owner = $users[1];
                } elseif ($index < 15) {
                    $owner = $users[2];
                } else {
                    $owner = $users[$faker->numberBetween(0, count($users) - 1)];
                }
                $savedRoads[] = SavedRoad::create([
                    'user_id' => $owner->id,
                    'road_name' => $road['name'],
                    'route_type' => $road['route_type'],
                    'road_coordinates' => json_encode($road['coordinates']),
                    'country' => $road['country'],
                    'region' => $road['region'],
                    'description' => $road['description'],
                    'twistiness' => $faker->randomFloat(1, 6.2, 9.6),
                    'corner_count' => $faker->numberBetween(18, 60),
                    'length' => $faker->numberBetween(6800, 145000),
                    'is_public' => true,
                    'average_rating' => $faker->randomFloat(2, 4.1, 5.0),
                    'elevation_gain' => $faker->numberBetween(120, 1200),
                    'elevation_loss' => $faker->numberBetween(100, 1100),
                    'max_elevation' => $faker->numberBetween(300, 1800),
                    'min_elevation' => $faker->numberBetween(20, 200),
                ]);
            }

            $demoCollection = Collection::create([
                'user_id' => $demoUser->id,
                'name' => 'European Scenic Favorites',
                'description' => 'Curated highlights across Central Europe.',
                'is_public' => true,
                'average_rating' => 4.8,
                'reviews_count' => 3,
            ]);

            $demoCollection->roads()->attach(collect($savedRoads)->take(4)->pluck('id')->all());

            $extraCollections = [
                [
                    'user' => $users[1],
                    'name' => 'Coastal Legends',
                    'description' => 'Sea views, cliffs, and flowing sweepers.',
                ],
                [
                    'user' => $users[2],
                    'name' => 'Forest Escape',
                    'description' => 'Quiet forest rides with smooth surfaces.',
                ],
                [
                    'user' => $users[3],
                    'name' => 'Alpine Switchbacks',
                    'description' => 'High mountain passes and tight turns.',
                ],
                [
                    'user' => $users[4],
                    'name' => 'Wine Country Loops',
                    'description' => 'Vineyards, villages, and gentle climbs.',
                ],
                [
                    'user' => $users[5],
                    'name' => 'Weekend Escapes',
                    'description' => 'Short trips perfect for half-day rides.',
                ],
                [
                    'user' => $users[6],
                    'name' => 'Highland Highlights',
                    'description' => 'Wide vistas and fast, open sweepers.',
                ],
                [
                    'user' => $users[7],
                    'name' => 'Ridge & River Mix',
                    'description' => 'A balanced mix of ridge climbs and river bends.',
                ],
                [
                    'user' => $users[8],
                    'name' => 'Alpine Sunrises',
                    'description' => 'Morning rides with crisp alpine air.',
                ],
                [
                    'user' => $users[9],
                    'name' => 'Canyon & Coast',
                    'description' => 'Switchbacks paired with sea views.',
                ],
            ];

            foreach ($extraCollections as $collectionData) {
                $collection = Collection::create([
                    'user_id' => $collectionData['user']->id,
                    'name' => $collectionData['name'],
                    'description' => $collectionData['description'],
                    'is_public' => true,
                    'average_rating' => $faker->randomFloat(2, 4.2, 5.0),
                    'reviews_count' => $faker->numberBetween(1, 8),
                ]);
                $collection->roads()->attach(collect($savedRoads)->shuffle()->take(3)->pluck('id')->all());
            }

            foreach ($savedRoads as $road) {
                $reviewCount = $faker->numberBetween(1, 3);
                $reviewUsers = collect($users)->shuffle()->take($reviewCount);
                foreach ($reviewUsers as $reviewUser) {
                    Review::create([
                        'user_id' => $reviewUser->id,
                        'saved_road_id' => $road->id,
                        'rating' => $faker->numberBetween(4, 5),
                        'comment' => $faker->sentence(10),
                    ]);
                }
                $avg = $road->reviews()->avg('rating');
                if ($avg !== null) {
                    $road->update(['average_rating' => round($avg, 2)]);
                }
            }

            $this->seedRide($demoUser, $savedRoads[0]);
            $this->seedRide($demoUser, $savedRoads[1]);
            $this->seedRide($users[1], $savedRoads[4]);
            $this->seedRide($users[2], $savedRoads[5]);

            // Followers/following for leaderboard presence
            $allUserIds = collect($users)->merge($followerUsers)->pluck('id')->all();
            $mainUserIds = collect($users)->pluck('id')->all();
            $topUser = $users[1];
            $secondUser = $users[2];

            $demoUser->followers()->syncWithoutDetaching(array_values(array_diff($allUserIds, [$demoUser->id])));
            $demoUser->following()->syncWithoutDetaching([
                $topUser->id,
                $secondUser->id,
                $users[3]->id,
                $users[4]->id,
            ]);

            foreach ($users as $user) {
                $user->followers()->syncWithoutDetaching(array_values(array_diff($allUserIds, [$user->id])));
            }

            foreach ($followerUsers as $user) {
                $user->following()->syncWithoutDetaching($mainUserIds);
            }
        });
    }

    private function seedRide(User $user, SavedRoad $road): void
    {
        $start = now()->subDays(rand(2, 8))->setTime(rand(7, 9), rand(0, 59));
        $points = [];
        $lat = 48.1372;
        $lng = 11.5756;
        for ($i = 0; $i < 12; $i++) {
            $points[] = [
                'lat' => $lat + ($i * 0.0025),
                'lng' => $lng + ($i * 0.0031),
                'alt' => 30 + ($i * 2),
                'speed' => 12 + ($i * 0.7),
                'time' => $start->copy()->addMinutes($i * 3)->toIso8601String(),
            ];
        }

        Ride::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'linked_route_id' => (string) $road->id,
            'started_at' => $start,
            'ended_at' => $start->copy()->addMinutes(33),
            'distance_meters' => rand(6200, 15000),
            'duration_seconds' => 33 * 60,
            'average_speed' => 9.5,
            'max_speed' => 16.8,
            'points' => $points,
            'synced' => true,
        ]);
    }
}
