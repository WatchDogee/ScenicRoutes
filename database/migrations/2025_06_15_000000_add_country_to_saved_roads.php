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
            $table->string('country')->nullable()->after('description');
            $table->string('region')->nullable()->after('country');
            $table->index('country');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('saved_roads', function (Blueprint $table) {
            $table->dropColumn(['country', 'region']);
        });
    }
};
