<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
public function up(): void
    {
        Log::info('Starting collection_road table migration');

        
        if (!Schema::hasTable('collection_road')) {
            Log::info('Creating collection_road table');
            Schema::create('collection_road', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->integer('order')->default(0);
                $table->unique(['collection_id', 'saved_road_id']);
                $table->timestamps();
            });
        }

        Log::info('Collection_road table migration completed');
    }
public function down(): void
    {
        
    }
};
