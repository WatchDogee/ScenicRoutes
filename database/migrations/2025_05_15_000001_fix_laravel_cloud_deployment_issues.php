<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
public function up(): void
    {
        Log::info('Starting Laravel Cloud deployment fix migration');

        
        $this->fixReviewPhotosTable();
        
        
        $this->fixCollectionReviewsTable();
        
        
        $this->fixCollectionsTable();
        
        Log::info('Laravel Cloud deployment fix migration completed');
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
            
            if (!Schema::hasColumn('review_photos', 'user_id')) {
                Log::info('Adding user_id column to review_photos table');
                Schema::table('review_photos', function (Blueprint $table) {
                    $table->foreignId('user_id')->nullable()->after('review_id')->constrained()->nullOnDelete();
                });
            }
        } else {
            
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
private function fixCollectionReviewsTable(): void
    {
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
            
            
            if (!Schema::hasColumn('collections', 'user_id')) {
                Log::info('Adding user_id column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->foreignId('user_id')->after('id')->constrained()->onDelete('cascade');
                });
            }
            
            
            if (!Schema::hasColumn('collections', 'name')) {
                Log::info('Adding name column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->string('name')->after('user_id');
                });
            }
            
            
            if (!Schema::hasColumn('collections', 'description')) {
                Log::info('Adding description column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->text('description')->nullable()->after('name');
                });
            }
            
            
            if (!Schema::hasColumn('collections', 'is_public')) {
                Log::info('Adding is_public column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->boolean('is_public')->default(false)->after('description');
                });
            }
            
            
            if (!Schema::hasColumn('collections', 'is_featured')) {
                Log::info('Adding is_featured column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->boolean('is_featured')->default(false)->after('is_public');
                });
            }
            
            
            if (!Schema::hasColumn('collections', 'cover_image')) {
                Log::info('Adding cover_image column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->string('cover_image')->nullable()->after('is_featured');
                });
            }
            
            
            if (!Schema::hasColumn('collections', 'saved_count')) {
                Log::info('Adding saved_count column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->integer('saved_count')->default(0)->after('cover_image');
                });
            }
            
            
            if (!Schema::hasColumn('collections', 'likes_count')) {
                Log::info('Adding likes_count column to collections table');
                Schema::table('collections', function (Blueprint $table) {
                    $table->integer('likes_count')->default(0)->after('saved_count');
                });
            }
        } else {
            
            Log::info('Creating collections table');
            Schema::create('collections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->text('description')->nullable();
                $table->boolean('is_public')->default(false);
                $table->boolean('is_featured')->default(false);
                $table->string('cover_image')->nullable();
                $table->integer('saved_count')->default(0);
                $table->integer('likes_count')->default(0);
                $table->decimal('average_rating', 3, 2)->nullable();
                $table->integer('reviews_count')->default(0);
                $table->timestamps();
            });
        }
    }
public function down(): void
    {
        
    }
};
