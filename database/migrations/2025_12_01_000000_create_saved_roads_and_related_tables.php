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
        // Core saved roads table used throughout the app
        if (!Schema::hasTable('saved_roads')) {
            Schema::create('saved_roads', function (Blueprint $table) {
                $table->id();
                $table->string('road_name');
                $table->string('road_surface')->nullable();
                $table->json('road_coordinates');
                $table->float('twistiness')->nullable();
                $table->integer('corner_count')->nullable();
                $table->float('length')->nullable();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->text('description')->nullable();
                $table->boolean('is_public')->default(false);
                $table->float('average_rating')->nullable();
                $table->float('elevation_gain')->nullable();
                $table->float('elevation_loss')->nullable();
                $table->float('max_elevation')->nullable();
                $table->float('min_elevation')->nullable();
                $table->string('country')->nullable();
                $table->string('region')->nullable();
                $table->timestamps();
            });
        }

        // Simple reviews table tied to saved roads
        if (!Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->unsignedBigInteger('saved_road_id')->nullable();
                $table->unsignedTinyInteger('rating')->nullable();
                $table->text('comment')->nullable();
                $table->timestamps();

                // Keep foreign key optional to avoid issues with legacy / partial data
                $table->index('saved_road_id');
            });
        }

        // Comments on saved roads
        if (!Schema::hasTable('comments')) {
            Schema::create('comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->unsignedBigInteger('saved_road_id')->nullable();
                $table->text('comment');
                $table->timestamps();

                $table->index('saved_road_id');
            });
        }

        // Photos attached directly to saved roads
        if (!Schema::hasTable('road_photos')) {
            Schema::create('road_photos', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('saved_road_id')->nullable();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('photo_path');
                $table->text('caption')->nullable();
                $table->timestamps();

                $table->index('saved_road_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('road_photos');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('saved_roads');
    }
};




























