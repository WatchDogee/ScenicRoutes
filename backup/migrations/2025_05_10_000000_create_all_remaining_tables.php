<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create points_of_interest table if it doesn't exist
        if (!Schema::hasTable('points_of_interest')) {
            Schema::create('points_of_interest', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('type'); // e.g., 'fuel_station', 'tourist_attraction', 'restaurant', etc.
                $table->string('subtype')->nullable(); // e.g., 'gas', 'electric', 'museum', 'viewpoint', etc.
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->text('description')->nullable();
                $table->string('address')->nullable();
                $table->string('phone')->nullable();
                $table->string('website')->nullable();
                $table->json('opening_hours')->nullable();
                $table->json('amenities')->nullable(); // For fuel stations: payment methods, services, etc.
                $table->boolean('is_verified')->default(false);
                $table->foreignId('added_by_user_id')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();
                
                // Add index for spatial queries
                $table->index(['latitude', 'longitude']);
                $table->index('type');
            });
        }

        // Create poi_photos table if it doesn't exist
        if (!Schema::hasTable('poi_photos')) {
            Schema::create('poi_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('poi_id')->constrained('points_of_interest')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }

        // Create poi_reviews table if it doesn't exist
        if (!Schema::hasTable('poi_reviews')) {
            Schema::create('poi_reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('poi_id')->constrained('points_of_interest')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->integer('rating'); // 1-5 stars
                $table->text('comment')->nullable();
                $table->timestamps();
                
                // Ensure a user can only review a POI once
                $table->unique(['user_id', 'poi_id']);
            });
        }

        // Create review_photos table if it doesn't exist
        if (!Schema::hasTable('review_photos')) {
            Schema::create('review_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('review_id')->constrained('reviews')->onDelete('cascade');
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }

        // Create road_photos table if it doesn't exist
        if (!Schema::hasTable('road_photos')) {
            Schema::create('road_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('saved_road_id')->constrained('saved_roads')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }

        // Add elevation data to saved_roads table if columns don't exist
        if (Schema::hasTable('saved_roads')) {
            $elevationColumns = [
                'elevation_gain', 'elevation_loss', 'max_elevation', 'min_elevation'
            ];
            
            $columnsToAdd = [];
            foreach ($elevationColumns as $column) {
                if (!Schema::hasColumn('saved_roads', $column)) {
                    $columnsToAdd[] = $column;
                }
            }
            
            if (!empty($columnsToAdd)) {
                Schema::table('saved_roads', function (Blueprint $table) use ($columnsToAdd) {
                    if (in_array('elevation_gain', $columnsToAdd)) {
                        $table->decimal('elevation_gain', 10, 2)->nullable()->comment('Total uphill elevation change in meters');
                    }
                    if (in_array('elevation_loss', $columnsToAdd)) {
                        $table->decimal('elevation_loss', 10, 2)->nullable()->comment('Total downhill elevation change in meters');
                    }
                    if (in_array('max_elevation', $columnsToAdd)) {
                        $table->decimal('max_elevation', 10, 2)->nullable()->comment('Highest point on the road in meters');
                    }
                    if (in_array('min_elevation', $columnsToAdd)) {
                        $table->decimal('min_elevation', 10, 2)->nullable()->comment('Lowest point on the road in meters');
                    }
                });
            }
        }

        // Add description to saved_roads table if it doesn't exist
        if (Schema::hasTable('saved_roads') && !Schema::hasColumn('saved_roads', 'description')) {
            Schema::table('saved_roads', function (Blueprint $table) {
                $table->text('description')->nullable();
            });
        }

        // Add comment to reviews table if it doesn't exist
        if (Schema::hasTable('reviews') && !Schema::hasColumn('reviews', 'comment')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->text('comment')->nullable();
            });
        }

        // Add username to users table if it doesn't exist
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('username')->nullable()->unique()->after('name');
            });

            // Generate usernames for existing users based on their email
            $users = DB::table('users')->get();
            foreach ($users as $user) {
                // Generate a username from the email (part before @)
                $emailParts = explode('@', $user->email);
                $baseUsername = $emailParts[0];

                // Check if username already exists and append a number if needed
                $username = $baseUsername;
                $counter = 1;

                // Use a different approach to check for duplicates
                $existingUsernames = DB::table('users')
                    ->where('id', '!=', $user->id)
                    ->pluck('username')
                    ->toArray();

                while (in_array($username, $existingUsernames)) {
                    $username = $baseUsername . $counter;
                    $counter++;
                }

                // Update the user with the new username
                DB::table('users')->where('id', $user->id)->update(['username' => $username]);
            }
        }

        // Create user_settings table if it doesn't exist
        if (!Schema::hasTable('user_settings')) {
            Schema::create('user_settings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('key');
                $table->text('value');
                $table->timestamps();

                // Add a unique constraint to ensure each user has only one setting per key
                $table->unique(['user_id', 'key']);
            });
        }

        // Add profile_picture to users table if it doesn't exist
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'profile_picture')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('profile_picture')->nullable()->after('email');
            });
        }

        // Create sessions table if it doesn't exist
        if (!Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        // Create cache tables if they don't exist
        if (!Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });
        }

        if (!Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
            });
        }

        // Create personal_access_tokens table if it doesn't exist
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

        // Create password_reset_tokens table if it doesn't exist
        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop tables in reverse order to avoid foreign key constraints
        Schema::dropIfExists('poi_reviews');
        Schema::dropIfExists('poi_photos');
        Schema::dropIfExists('points_of_interest');
        Schema::dropIfExists('review_photos');
        Schema::dropIfExists('road_photos');
        Schema::dropIfExists('user_settings');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('sessions');

        // Remove columns from existing tables
        if (Schema::hasTable('saved_roads')) {
            Schema::table('saved_roads', function (Blueprint $table) {
                if (Schema::hasColumn('saved_roads', 'elevation_gain')) {
                    $table->dropColumn('elevation_gain');
                }
                if (Schema::hasColumn('saved_roads', 'elevation_loss')) {
                    $table->dropColumn('elevation_loss');
                }
                if (Schema::hasColumn('saved_roads', 'max_elevation')) {
                    $table->dropColumn('max_elevation');
                }
                if (Schema::hasColumn('saved_roads', 'min_elevation')) {
                    $table->dropColumn('min_elevation');
                }
                if (Schema::hasColumn('saved_roads', 'description')) {
                    $table->dropColumn('description');
                }
            });
        }

        if (Schema::hasTable('reviews') && Schema::hasColumn('reviews', 'comment')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->dropColumn('comment');
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'username')) {
                    $table->dropColumn('username');
                }
                if (Schema::hasColumn('users', 'profile_picture')) {
                    $table->dropColumn('profile_picture');
                }
            });
        }
    }
};
