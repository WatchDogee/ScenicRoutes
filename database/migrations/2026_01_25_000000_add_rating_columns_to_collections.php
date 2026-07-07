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
        Schema::table('collections', function (Blueprint $table) {
            if (!Schema::hasColumn('collections', 'cover_image')) {
                $table->string('cover_image')->nullable();
            }
            if (!Schema::hasColumn('collections', 'average_rating')) {
                $table->float('average_rating')->nullable()->default(0);
            }
            if (!Schema::hasColumn('collections', 'reviews_count')) {
                $table->integer('reviews_count')->default(0);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            if (Schema::hasColumn('collections', 'cover_image')) {
                $table->dropColumn('cover_image');
            }
            if (Schema::hasColumn('collections', 'average_rating')) {
                $table->dropColumn('average_rating');
            }
            if (Schema::hasColumn('collections', 'reviews_count')) {
                $table->dropColumn('reviews_count');
            }
        });
    }
};
