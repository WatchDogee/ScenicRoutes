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
        Schema::create('route_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            // Use a nullable plain foreign key here so the table does not depend
            // on the legacy saved_roads schema when running migrations from scratch.
            $table->unsignedBigInteger('saved_road_id')->nullable();
            $table->string('route_type'); // graphhopper, round_trip, curved, straightest
            $table->string('curvature_level')->nullable(); // straightest, curvy, extra_curvy
            $table->integer('waypoints_count')->default(2);
            $table->decimal('distance_km', 10, 2)->nullable();
            $table->timestamp('used_at');
            $table->timestamps();
            
            $table->index(['user_id', 'used_at']);
            $table->index(['user_id', 'route_type']);
            $table->index('used_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('route_usages');
    }
};
