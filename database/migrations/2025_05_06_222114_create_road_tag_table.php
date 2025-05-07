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
        Schema::create('road_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('road_id')->constrained('saved_roads')->onDelete('cascade');
            $table->foreignId('tag_id')->constrained('tags')->onDelete('cascade');
            $table->timestamps();

            // Ensure a road can't have the same tag twice
            $table->unique(['road_id', 'tag_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('road_tag');
    }
};
