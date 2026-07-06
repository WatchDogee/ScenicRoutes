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
        Schema::table('offline_map_downloads', function (Blueprint $table) {
            // Check if column doesn't exist before adding
            if (!Schema::hasColumn('offline_map_downloads', 'radius_km')) {
                $table->decimal('radius_km', 8, 2)->nullable()->after('zoom_levels');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('offline_map_downloads', function (Blueprint $table) {
            if (Schema::hasColumn('offline_map_downloads', 'radius_km')) {
                $table->dropColumn('radius_km');
            }
        });
    }
};
