<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
public function up(): void
    {
        Log::info('Starting collection_reviews table migration');

        
        if (!Schema::hasTable('collection_reviews')) {
            Log::info('Creating collection_reviews table');
            Schema::create('collection_reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->integer('rating');
                $table->text('comment')->nullable();
                $table->timestamps();
            });
        }

        Log::info('Collection_reviews table migration completed');
    }
public function down(): void
    {
        Schema::dropIfExists('collection_reviews');
    }
};
