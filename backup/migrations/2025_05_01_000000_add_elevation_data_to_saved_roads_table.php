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
        Schema::table('saved_roads', function (Blueprint $table) {
            $table->decimal('elevation_gain', 10, 2)->nullable()->comment('Total uphill elevation change in meters');
            $table->decimal('elevation_loss', 10, 2)->nullable()->comment('Total downhill elevation change in meters');
            $table->decimal('max_elevation', 10, 2)->nullable()->comment('Highest point on the road in meters');
            $table->decimal('min_elevation', 10, 2)->nullable()->comment('Lowest point on the road in meters');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('saved_roads', function (Blueprint $table) {
            $table->dropColumn('elevation_gain');
            $table->dropColumn('elevation_loss');
            $table->dropColumn('max_elevation');
            $table->dropColumn('min_elevation');
        });
    }
};
