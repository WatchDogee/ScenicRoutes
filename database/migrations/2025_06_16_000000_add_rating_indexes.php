<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add index on average_rating column
        Schema::table('saved_roads', function (Blueprint $table) {
            $table->index('average_rating');
        });

        // Update average ratings for all roads
        DB::statement('
            UPDATE saved_roads sr
            SET average_rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM reviews r
                WHERE r.saved_road_id = sr.id
            )
        ');
    }

    public function down(): void
    {
        Schema::table('saved_roads', function (Blueprint $table) {
            $table->dropIndex(['average_rating']);
        });
    }
}; 