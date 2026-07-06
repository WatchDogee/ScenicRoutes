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
        // Add indexes to saved_roads table
        Schema::table('saved_roads', function (Blueprint $table) {
            // Check if indexes don't already exist before adding
            if (!$this->indexExists('saved_roads', 'saved_roads_user_id_index')) {
                $table->index('user_id');
            }
            if (!$this->indexExists('saved_roads', 'saved_roads_is_public_index')) {
                $table->index('is_public');
            }
            if (!$this->indexExists('saved_roads', 'saved_roads_user_id_is_public_index')) {
                $table->index(['user_id', 'is_public']);
            }
            if (!$this->indexExists('saved_roads', 'saved_roads_created_at_index')) {
                $table->index('created_at');
            }
            if (!$this->indexExists('saved_roads', 'saved_roads_average_rating_index')) {
                $table->index('average_rating');
            }
        });

        // Add indexes to collections table
        Schema::table('collections', function (Blueprint $table) {
            if (!$this->indexExists('collections', 'collections_user_id_index')) {
                $table->index('user_id');
            }
            if (!$this->indexExists('collections', 'collections_is_public_index')) {
                $table->index('is_public');
            }
            if (!$this->indexExists('collections', 'collections_user_id_is_public_index')) {
                $table->index(['user_id', 'is_public']);
            }
            if (!$this->indexExists('collections', 'collections_created_at_index')) {
                $table->index('created_at');
            }
        });

        // Add indexes to reviews table
        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasColumn('reviews', 'saved_road_id')) {
                if (!$this->indexExists('reviews', 'reviews_saved_road_id_index')) {
                    $table->index('saved_road_id');
                }
            } elseif (Schema::hasColumn('reviews', 'road_id')) {
                if (!$this->indexExists('reviews', 'reviews_road_id_index')) {
                    $table->index('road_id');
                }
            }
            if (!$this->indexExists('reviews', 'reviews_user_id_index')) {
                $table->index('user_id');
            }
            if (Schema::hasColumn('reviews', 'collection_id')) {
                if (!$this->indexExists('reviews', 'reviews_collection_id_index')) {
                    $table->index('collection_id');
                }
            }
            if (!$this->indexExists('reviews', 'reviews_created_at_index')) {
                $table->index('created_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('saved_roads', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['is_public']);
            $table->dropIndex(['user_id', 'is_public']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['average_rating']);
        });

        Schema::table('collections', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['is_public']);
            $table->dropIndex(['user_id', 'is_public']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasColumn('reviews', 'saved_road_id')) {
                $table->dropIndex(['saved_road_id']);
            }
            if (Schema::hasColumn('reviews', 'road_id')) {
                $table->dropIndex(['road_id']);
            }
            $table->dropIndex(['user_id']);
            if (Schema::hasColumn('reviews', 'collection_id')) {
                $table->dropIndex(['collection_id']);
            }
            $table->dropIndex(['created_at']);
        });
    }

    /**
     * Check if an index exists on a table
     */
    private function indexExists(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        
        // PostgreSQL syntax
        if ($connection->getDriverName() === 'pgsql') {
            $result = $connection->select(
                "SELECT COUNT(*) as count FROM pg_indexes 
                 WHERE tablename = ? AND indexname = ?",
                [$table, $indexName]
            );
        } else {
            // MySQL fallback
            $databaseName = $connection->getDatabaseName();
            $result = $connection->select(
                "SELECT COUNT(*) as count FROM information_schema.statistics 
                 WHERE table_schema = ? AND table_name = ? AND index_name = ?",
                [$databaseName, $table, $indexName]
            );
        }
        
        return $result[0]->count > 0;
    }
};
