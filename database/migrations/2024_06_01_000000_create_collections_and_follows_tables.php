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
        // Create collections table
        if (!Schema::hasTable('collections')) {
            Schema::create('collections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->text('description')->nullable();
                $table->boolean('is_public')->default(false);
                $table->string('cover_image')->nullable();
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
                $table->timestamps();
                
                // Prevent duplicate roads in a collection
                $table->unique(['collection_id', 'saved_road_id']);
            });
        }

        // Create follows table
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
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('collection_road');
        Schema::dropIfExists('collections');
        Schema::dropIfExists('follows');
    }
};
