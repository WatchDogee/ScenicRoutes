<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create users table first (no foreign key dependencies)
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

        // Create saved_roads table (depends on users)
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
        });

        // Create reviews table (depends on users and saved_roads)
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
            $table->integer('rating');
            $table->timestamps();
            $table->text('comment')->nullable();
        });

        // Create review_photos table (depends on reviews)
        Schema::create('review_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained()->onDelete('cascade');
            $table->string('photo_path');
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        // Create road_photos table (depends on saved_roads and users)
        Schema::create('road_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('photo_path');
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        // Create comments table (depends on users and saved_roads)
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
            $table->text('comment');
            $table->timestamps();
        });

        // Create points_of_interest table (depends on users)
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

        // Create poi_photos table (depends on points_of_interest and users)
        Schema::create('poi_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('point_of_interest_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('photo_path');
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        // Create poi_reviews table (depends on points_of_interest and users)
        Schema::create('poi_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('point_of_interest_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('rating', 2, 1);
            $table->text('comment')->nullable();
            $table->timestamps();
        });

        // Create user_settings table (depends on users)
        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('key');
            $table->text('value');
            $table->timestamps();
            $table->unique(['user_id', 'key']);
        });

        // Create password_reset_tokens table (no foreign key dependencies)
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Create personal_access_tokens table (polymorphic relationship)
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

        // Create cache table (no foreign key dependencies)
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        // Create cache_locks table (no foreign key dependencies)
        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->integer('expiration');
        });

        // Create sessions table (optional foreign key to users)
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('payload');
            $table->integer('last_activity')->index();
        });
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
    }
};
