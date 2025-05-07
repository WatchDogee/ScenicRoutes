<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create migration_log table first
        $this->createMigrationLogTable();

        // Create users table (no foreign key dependencies)
        $this->createUsersTable();

        // Create saved_roads table (depends on users)
        $this->createSavedRoadsTable();

        // Create reviews table (depends on users and saved_roads)
        $this->createReviewsTable();

        // Create review_photos table (depends on reviews)
        $this->createReviewPhotosTable();

        // Create road_photos table (depends on saved_roads and users)
        $this->createRoadPhotosTable();

        // Create comments table (depends on users and saved_roads)
        $this->createCommentsTable();

        // Create points_of_interest table (depends on users)
        $this->createPointsOfInterestTable();

        // Create poi_photos table (depends on points_of_interest and users)
        $this->createPoiPhotosTable();

        // Create poi_reviews table (depends on points_of_interest and users)
        $this->createPoiReviewsTable();

        // Create user_settings table (depends on users)
        $this->createUserSettingsTable();

        // Create follows table (depends on users)
        $this->createFollowsTable();

        // Create collections table (depends on users)
        $this->createCollectionsTable();

        // Create collection_road pivot table
        $this->createCollectionRoadTable();

        // Create tags table
        $this->createTagsTable();

        // Create road_tag pivot table
        $this->createRoadTagTable();

        // Create collection_tag pivot table
        $this->createCollectionTagTable();

        // Create password_reset_tokens table (no foreign key dependencies)
        $this->createPasswordResetTokensTable();

        // Create personal_access_tokens table (polymorphic relationship)
        $this->createPersonalAccessTokensTable();

        // Create cache table
        $this->createCacheTable();

        // Create cache_locks table
        $this->createCacheLocksTable();

        // Create sessions table
        $this->createSessionsTable();

        // Seed predefined tags
        $this->seedPredefinedTags();

        // Log successful migration
        $this->logMigration('All tables created successfully');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop tables in reverse order to avoid foreign key constraint issues
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('collection_tag');
        Schema::dropIfExists('road_tag');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('collection_road');
        Schema::dropIfExists('collections');
        Schema::dropIfExists('follows');
        Schema::dropIfExists('user_settings');
        Schema::dropIfExists('poi_reviews');
        Schema::dropIfExists('poi_photos');
        Schema::dropIfExists('points_of_interest');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('road_photos');
        Schema::dropIfExists('review_photos');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('saved_roads');
        Schema::dropIfExists('users');
        Schema::dropIfExists('migration_log');
    }

    /**
     * Create migration_log table
     */
    private function createMigrationLogTable()
    {
        if (!Schema::hasTable('migration_log')) {
            Schema::create('migration_log', function (Blueprint $table) {
                $table->id();
                $table->text('message');
                $table->string('migration')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Create users table
     */
    private function createUsersTable()
    {
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('username')->nullable()->unique();
                $table->string('email')->unique();
                $table->string('profile_picture')->nullable();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->timestamps();
            });
        }
    }

    /**
     * Create saved_roads table
     */
    private function createSavedRoadsTable()
    {
        if (!Schema::hasTable('saved_roads')) {
            Schema::create('saved_roads', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('road_name')->nullable();
                $table->string('road_surface')->nullable();
                $table->json('road_coordinates');
                $table->decimal('twistiness', 8, 4)->nullable();
                $table->integer('corner_count')->nullable();
                $table->decimal('length', 10, 2)->nullable();
                $table->boolean('is_public')->default(false);
                $table->decimal('average_rating', 3, 2)->nullable();
                $table->timestamps();
                $table->text('description')->nullable();
                $table->decimal('elevation_gain', 10, 2)->nullable()->comment('Total uphill elevation change in meters');
                $table->decimal('elevation_loss', 10, 2)->nullable()->comment('Total downhill elevation change in meters');
                $table->decimal('max_elevation', 10, 2)->nullable()->comment('Highest point on the road in meters');
                $table->decimal('min_elevation', 10, 2)->nullable()->comment('Lowest point on the road in meters');
                $table->string('country')->nullable();
                $table->string('region')->nullable();
                $table->index('country');
                $table->index('average_rating');
            });
        }
    }

    /**
     * Create reviews table
     */
    private function createReviewsTable()
    {
        if (!Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->integer('rating');
                $table->timestamps();
                $table->text('comment')->nullable();
            });
        }
    }

    /**
     * Create review_photos table
     */
    private function createReviewPhotosTable()
    {
        if (!Schema::hasTable('review_photos')) {
            Schema::create('review_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('review_id')->constrained()->onDelete('cascade');
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Create road_photos table
     */
    private function createRoadPhotosTable()
    {
        if (!Schema::hasTable('road_photos')) {
            Schema::create('road_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Create comments table
     */
    private function createCommentsTable()
    {
        if (!Schema::hasTable('comments')) {
            Schema::create('comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->text('comment');
                $table->timestamps();
            });
        }
    }

    /**
     * Create points_of_interest table
     */
    private function createPointsOfInterestTable()
    {
        if (!Schema::hasTable('points_of_interest')) {
            Schema::create('points_of_interest', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
                $table->string('name');
                $table->string('type');
                $table->string('subtype')->nullable();
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->text('description')->nullable();
                $table->json('properties')->nullable();
                $table->string('osm_id')->nullable();
                $table->boolean('is_verified')->default(false);
                $table->timestamps();
            });
        }
    }

    /**
     * Create poi_photos table
     */
    private function createPoiPhotosTable()
    {
        if (!Schema::hasTable('poi_photos')) {
            Schema::create('poi_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('point_of_interest_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Create poi_reviews table
     */
    private function createPoiReviewsTable()
    {
        if (!Schema::hasTable('poi_reviews')) {
            Schema::create('poi_reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('point_of_interest_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
                $table->decimal('rating', 2, 1);
                $table->text('comment')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Create user_settings table
     */
    private function createUserSettingsTable()
    {
        if (!Schema::hasTable('user_settings')) {
            Schema::create('user_settings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('key');
                $table->text('value');
                $table->timestamps();
                $table->unique(['user_id', 'key']);
            });
        }
    }

    /**
     * Create follows table
     */
    private function createFollowsTable()
    {
        if (!Schema::hasTable('follows')) {
            Schema::create('follows', function (Blueprint $table) {
                $table->id();
                $table->foreignId('follower_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('followed_id')->constrained('users')->onDelete('cascade');
                $table->timestamps();

                // Prevent duplicate follows
                $table->unique(['follower_id', 'followed_id']);
            });
        }
    }

    /**
     * Create collections table
     */
    private function createCollectionsTable()
    {
        if (!Schema::hasTable('collections')) {
            Schema::create('collections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->text('description')->nullable();
                $table->boolean('is_public')->default(false);
                $table->boolean('is_featured')->default(false);
                $table->string('cover_image')->nullable();
                $table->integer('saved_count')->default(0);
                $table->integer('likes_count')->default(0);
                $table->timestamps();
            });
        }
    }

    /**
     * Create collection_road pivot table
     */
    private function createCollectionRoadTable()
    {
        if (!Schema::hasTable('collection_road')) {
            Schema::create('collection_road', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->integer('order')->default(0);
                $table->timestamps();

                // Prevent duplicate roads in a collection
                $table->unique(['collection_id', 'saved_road_id']);
            });
        }
    }

    /**
     * Create tags table
     */
    private function createTagsTable()
    {
        if (!Schema::hasTable('tags')) {
            Schema::create('tags', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->string('type')->default('general');
                $table->timestamps();
            });
        }
    }

    /**
     * Create road_tag pivot table
     */
    private function createRoadTagTable()
    {
        if (!Schema::hasTable('road_tag')) {
            Schema::create('road_tag', function (Blueprint $table) {
                $table->id();
                $table->foreignId('road_id')->constrained('saved_roads')->onDelete('cascade');
                $table->foreignId('tag_id')->constrained('tags')->onDelete('cascade');
                $table->timestamps();

                // Prevent duplicate tags on a road
                $table->unique(['road_id', 'tag_id']);
            });
        }
    }

    /**
     * Create collection_tag pivot table
     */
    private function createCollectionTagTable()
    {
        if (!Schema::hasTable('collection_tag')) {
            Schema::create('collection_tag', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->foreignId('tag_id')->constrained()->onDelete('cascade');
                $table->timestamps();

                // Prevent duplicate tags on a collection
                $table->unique(['collection_id', 'tag_id']);
            });
        }
    }

    /**
     * Create password_reset_tokens table
     */
    private function createPasswordResetTokensTable()
    {
        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    /**
     * Create personal_access_tokens table
     */
    private function createPersonalAccessTokensTable()
    {
        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Create cache table
     */
    private function createCacheTable()
    {
        if (!Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });
        }
    }

    /**
     * Create cache_locks table
     */
    private function createCacheLocksTable()
    {
        if (!Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
            });
        }
    }

    /**
     * Create sessions table
     */
    private function createSessionsTable()
    {
        if (!Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->text('payload');
                $table->integer('last_activity')->index();
            });
        }
    }

    /**
     * Seed predefined tags
     */
    private function seedPredefinedTags()
    {
        // Define predefined tags
        $tagCategories = [
            // Road characteristics
            'road_characteristic' => [
                'Twisty' => 'Roads with many curves and turns',
                'Straight' => 'Roads with long straight sections',
                'Hilly' => 'Roads with significant elevation changes',
                'Flat' => 'Roads with minimal elevation changes',
            ],

            // Surface types
            'surface_type' => [
                'Paved' => 'Roads with asphalt or concrete surface',
                'Gravel' => 'Roads with gravel or crushed stone surface',
                'Dirt' => 'Unpaved dirt roads',
            ],

            // Scenery types
            'scenery' => [
                'Mountain' => 'Roads through mountainous terrain',
                'Coastal' => 'Roads along coastlines or with ocean views',
                'Forest' => 'Roads through forested areas',
                'Desert' => 'Roads through desert landscapes',
                'Urban' => 'Roads through cities or urban areas',
                'Scenic' => 'Roads with particularly beautiful views',
            ],

            // Experience types
            'experience' => [
                'Technical' => 'Roads requiring technical driving skills',
                'Beginner-friendly' => 'Roads suitable for beginners',
                'Advanced' => 'Roads best suited for experienced drivers',
            ],

            // Vehicle suitability
            'vehicle' => [
                'Motorcycle' => 'Roads particularly good for motorcycles',
                'Car' => 'Roads well-suited for cars',
                'Bicycle' => 'Roads suitable for cycling',
            ],
        ];

        // Create tags using Laravel's transaction handling
        DB::transaction(function () use ($tagCategories) {
            foreach ($tagCategories as $type => $tags) {
                foreach ($tags as $name => $description) {
                    // Check if tag already exists
                    $slug = Str::slug($name);
                    $existingTag = DB::table('tags')->where('slug', $slug)->first();

                    if (!$existingTag) {
                        DB::table('tags')->insert([
                            'name' => $name,
                            'slug' => $slug,
                            'description' => $description,
                            'type' => $type,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        // Update existing tag with proper type and description
                        DB::table('tags')
                            ->where('id', $existingTag->id)
                            ->update([
                                'description' => $description,
                                'type' => $type,
                                'updated_at' => now(),
                            ]);
                    }
                }
            }
        });
    }

    /**
     * Log migration message
     */
    private function logMigration($message)
    {
        try {
            if (Schema::hasTable('migration_log')) {
                DB::table('migration_log')->insert([
                    'message' => $message,
                    'migration' => '2025_05_01_000000_create_all_tables_postgres_consolidated',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Exception $e) {
            // Just log the error but don't fail the migration
            \Log::warning('Could not log to migration_log table: ' . $e->getMessage());
        }
    }
};
