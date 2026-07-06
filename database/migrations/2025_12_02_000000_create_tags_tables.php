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
        if (!Schema::hasTable('tags')) {
            Schema::create('tags', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->string('type')->nullable(); // e.g. 'road', 'collection', category, etc.
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('road_tag')) {
            Schema::create('road_tag', function (Blueprint $table) {
                $table->id();
                // Use a simple unsigned ID and index to avoid hard foreign key coupling
                // to legacy / partially migrated schemas.
                $table->unsignedBigInteger('road_id')->nullable();
                $table->foreignId('tag_id')->constrained()->onDelete('cascade');
                $table->timestamps();

                $table->index('road_id');
            });
        }

        if (!Schema::hasTable('collection_tag')) {
            Schema::create('collection_tag', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->foreignId('tag_id')->constrained()->onDelete('cascade');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('collection_tag');
        Schema::dropIfExists('road_tag');
        Schema::dropIfExists('tags');
    }
};


