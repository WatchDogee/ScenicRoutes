<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up(): void
    {
        if (Schema::hasTable('review_photos') && !Schema::hasColumn('review_photos', 'user_id')) {
            Schema::table('review_photos', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('review_id')->constrained()->onDelete('set null');
            });
        }
    }
public function down(): void
    {
        if (Schema::hasTable('review_photos') && Schema::hasColumn('review_photos', 'user_id')) {
            Schema::table('review_photos', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }
    }
};
