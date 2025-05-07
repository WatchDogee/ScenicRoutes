<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Create users table
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

        // Create saved_roads table
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
                $table->text('description')->nullable();
                $table->decimal('elevation_gain', 10, 2)->nullable();
                $table->decimal('elevation_loss', 10, 2)->nullable();
                $table->decimal('max_elevation', 10, 2)->nullable();
                $table->decimal('min_elevation', 10, 2)->nullable();
                $table->string('country')->nullable();
                $table->string('region')->nullable();
                $table->timestamps();
            });
        }

        // Create reviews table
        if (!Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->integer('rating');
                $table->text('comment')->nullable();
                $table->timestamps();
            });
        }

        // Create review_photos table
        if (!Schema::hasTable('review_photos')) {
            Schema::create('review_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('review_id')->constrained()->onDelete('cascade');
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }

        // Create road_photos table
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

        // Create comments table
        if (!Schema::hasTable('comments')) {
            Schema::create('comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->text('comment');
                $table->timestamps();
            });
        }

        // Create points_of_interest table
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

        // Create poi_photos table
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

        // Create poi_reviews table
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

        // Create user_settings table
        if (!Schema::hasTable('user_settings')) {
            Schema::create('user_settings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('key');
                $table->text('value');
                $table->unique(['user_id', 'key']);
                $table->timestamps();
            });
        }

        // Create follows table
        if (!Schema::hasTable('follows')) {
            Schema::create('follows', function (Blueprint $table) {
                $table->id();
                $table->foreignId('follower_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('followed_id')->constrained('users')->onDelete('cascade');
                $table->unique(['follower_id', 'followed_id']);
                $table->timestamps();
            });
        }

        // Create collections table
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

        // Create collection_road pivot table
        if (!Schema::hasTable('collection_road')) {
            Schema::create('collection_road', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->integer('order')->default(0);
                $table->unique(['collection_id', 'saved_road_id']);
                $table->timestamps();
            });
        }

        // Create tags table
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

        // Create road_tag pivot table
        if (!Schema::hasTable('road_tag')) {
            Schema::create('road_tag', function (Blueprint $table) {
                $table->id();
                $table->foreignId('road_id')->constrained('saved_roads')->onDelete('cascade');
                $table->foreignId('tag_id')->constrained('tags')->onDelete('cascade');
                $table->unique(['road_id', 'tag_id']);
                $table->timestamps();
            });
        }

        // Create collection_tag pivot table
        if (!Schema::hasTable('collection_tag')) {
            Schema::create('collection_tag', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->foreignId('tag_id')->constrained()->onDelete('cascade');
                $table->unique(['collection_id', 'tag_id']);
                $table->timestamps();
            });
        }

        // Create password_reset_tokens table
        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        // Create personal_access_tokens table
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

        // Create sessions table
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

        // Create migration_log table
        if (!Schema::hasTable('migration_log')) {
            Schema::create('migration_log', function (Blueprint $table) {
                $table->id();
                $table->text('message');
                $table->string('migration')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Drop tables in reverse order to avoid foreign key constraint issues
        Schema::dropIfExists('migration_log');
        Schema::dropIfExists('sessions');
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
    }
};
