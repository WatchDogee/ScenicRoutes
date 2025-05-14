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
        Log::info('Starting PostgreSQL compatibility fix migration');

        
        $this->fixReviewPhotosTable();
        
        
        $this->fixCollectionsTable();
        
        
        $this->fixSavedRoadsTable();
        
        Log::info('PostgreSQL compatibility fix migration completed');
    }
private function fixReviewPhotosTable(): void
    {
        
        if (!Schema::hasTable('reviews')) {
            Log::info('Creating reviews table');
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('saved_road_id')->constrained()->onDelete('cascade');
                $table->integer('rating');
                $table->text('comment')->nullable();
                $table->timestamps();
            });
        }

        
        if (Schema::hasTable('review_photos')) {
            
            Log::info('review_photos table exists, checking structure');
            
            
            $hasCorrectColumns = Schema::hasColumns('review_photos', [
                'id', 'review_id', 'user_id', 'photo_path', 'caption', 'created_at', 'updated_at'
            ]);
            
            if (!$hasCorrectColumns) {
                Log::info('review_photos table has incorrect structure, recreating');
                Schema::dropIfExists('review_photos');
            }
        }

        
        if (!Schema::hasTable('review_photos')) {
            Log::info('Creating review_photos table');
            Schema::create('review_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('review_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });
        }
    }
private function fixCollectionsTable(): void
    {
        if (Schema::hasTable('collections')) {
            Log::info('Checking collections table structure');
            
            
            if (!Schema::hasColumn('collections', 'average_rating')) {
                Log::info('Adding average_rating column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->decimal('average_rating', 3, 2)->nullable();
                });
            }
            
            
            if (!Schema::hasColumn('collections', 'reviews_count')) {
                Log::info('Adding reviews_count column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->integer('reviews_count')->default(0);
                });
            }
        }
    }
private function fixSavedRoadsTable(): void
    {
        if (Schema::hasTable('saved_roads')) {
            Log::info('Checking saved_roads table structure');
            
            
            if (!Schema::hasColumn('saved_roads', 'view_count')) {
                Log::info('Adding view_count column to saved_roads table');
                Schema::table('saved_roads', function (Blueprint $table) {
                    $table->integer('view_count')->default(0);
                });
            }
        }
    }
public function down(): void
    {
        
    }
};
