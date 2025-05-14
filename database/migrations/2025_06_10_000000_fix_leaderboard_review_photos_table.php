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
        Log::info('Starting leaderboard fix migration for review_photos table');

        
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
            
            Log::info('Dropping existing review_photos table');
            Schema::dropIfExists('review_photos');
        }

        
        Log::info('Creating review_photos table');
        Schema::create('review_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('photo_path');
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        
        if (Schema::hasTable('review_photos')) {
            Log::info('review_photos table created successfully');
        } else {
            Log::error('Failed to create review_photos table');
        }

        
        $this->ensureLeaderboardColumns();

        Log::info('Leaderboard fix migration completed');
    }
private function ensureLeaderboardColumns(): void
    {
        
        if (Schema::hasTable('saved_roads')) {
            if (!Schema::hasColumn('saved_roads', 'average_rating')) {
                Log::info('Adding average_rating column to saved_roads table');
                Schema::table('saved_roads', function (Blueprint $table) {
                    $table->decimal('average_rating', 3, 2)->nullable();
                });
            }
            
            if (!Schema::hasColumn('saved_roads', 'view_count')) {
                Log::info('Adding view_count column to saved_roads table');
                Schema::table('saved_roads', function (Blueprint $table) {
                    $table->integer('view_count')->default(0);
                });
            }
        }

        
        if (Schema::hasTable('collections')) {
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
public function down(): void
    {
        
    }
};
