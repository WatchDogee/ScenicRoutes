<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
public function up(): void
    {
        Log::info('Starting Laravel Cloud schema fix migration');

        
        $this->fixReviewPhotosTable();

        
        $this->ensureTablesExist();

        Log::info('Laravel Cloud schema fix migration completed');
    }
private function fixReviewPhotosTable(): void
    {
        Log::info('Fixing review_photos table');

        
        Schema::dropIfExists('review_photos');

        
        Schema::create('review_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('photo_path');
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        Log::info('review_photos table created successfully');
    }
private function ensureTablesExist(): void
    {
        
        if (!Schema::hasColumn('saved_roads', 'is_public')) {
            Log::info('Adding is_public column to saved_roads table');
            Schema::table('saved_roads', function (Blueprint $table) {
                $table->boolean('is_public')->default(false);
            });
        }

        
        $this->ensureColumnsExist();
    }
private function ensureColumnsExist(): void
    {
        
        if (Schema::hasTable('saved_roads')) {
            if (!Schema::hasColumn('saved_roads', 'average_rating')) {
                Schema::table('saved_roads', function (Blueprint $table) {
                    $table->decimal('average_rating', 3, 2)->nullable();
                });
            }
            
            if (!Schema::hasColumn('saved_roads', 'country')) {
                Schema::table('saved_roads', function (Blueprint $table) {
                    $table->string('country')->nullable();
                });
            }
            
            if (!Schema::hasColumn('saved_roads', 'region')) {
                Schema::table('saved_roads', function (Blueprint $table) {
                    $table->string('region')->nullable();
                });
            }
        }
    }
public function down(): void
    {
        
    }
};
