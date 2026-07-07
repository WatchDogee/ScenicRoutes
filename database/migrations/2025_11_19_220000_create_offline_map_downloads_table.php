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
        Schema::create('offline_map_downloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('region_id');
            $table->string('region_name');
            $table->decimal('south', 10, 7);
            $table->decimal('west', 10, 7);
            $table->decimal('north', 10, 7);
            $table->decimal('east', 10, 7);
            $table->json('zoom_levels')->nullable();
            $table->integer('size_mb')->default(0);
            $table->string('status')->default('downloading'); // downloading, completed, failed, deleted
            $table->timestamp('download_date')->nullable();
            $table->timestamp('last_used')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index('region_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offline_map_downloads');
    }
};
