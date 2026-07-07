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
        Schema::create('offline_map_regions', function (Blueprint $table) {
            $table->id();
            $table->string('region_id')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('south', 10, 7);
            $table->decimal('west', 10, 7);
            $table->decimal('north', 10, 7);
            $table->decimal('east', 10, 7);
            $table->json('country_codes')->nullable(); // ['LV', 'EE', 'LT']
            $table->json('zoom_levels')->nullable(); // [0, 1, 2, ..., 18]
            $table->integer('estimated_size_mb')->default(0);
            $table->boolean('is_bundle')->default(false);
            $table->json('bundle_regions')->nullable(); // For bundles, list of region_ids
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offline_map_regions');
    }
};
