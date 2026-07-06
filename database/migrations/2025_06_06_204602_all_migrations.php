<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('username')->unique();
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->timestamp('last_verification_sent_at')->nullable();
                $table->rememberToken();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });
        }

        if (!Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
            });
        }

        if (!Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('queue')->index();
                $table->longText('payload');
                $table->unsignedTinyInteger('attempts');
                $table->unsignedInteger('reserved_at')->nullable();
                $table->unsignedInteger('available_at');
                $table->unsignedInteger('created_at');
            });
        }

        if (!Schema::hasTable('job_batches')) {
            Schema::create('job_batches', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('name');
                $table->integer('total_jobs');
                $table->integer('pending_jobs');
                $table->integer('failed_jobs');
                $table->longText('failed_job_ids');
                $table->mediumText('options')->nullable();
                $table->integer('cancelled_at')->nullable();
                $table->integer('created_at');
                $table->integer('finished_at')->nullable();
            });
        }

        if (!Schema::hasTable('failed_jobs')) {
            Schema::create('failed_jobs', function (Blueprint $table) {
                $table->id();
                $table->string('uuid')->unique();
                $table->text('connection');
                $table->text('queue');
                $table->longText('payload');
                $table->longText('exception');
                $table->timestamp('failed_at')->useCurrent();
            });
        }

        if (!Schema::hasTable('collections')) {
            Schema::create('collections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->text('description')->nullable();
                $table->boolean('is_public')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('collection_road')) {
            Schema::create('collection_road', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                // Use a simple foreign key field without constraint to avoid dependency
                // on a legacy 'roads' table that is no longer part of the schema.
                $table->unsignedBigInteger('road_id')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('collection_reviews')) {
            Schema::create('collection_reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->integer('rating');
                $table->text('comment')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('user_saved_collections')) {
            Schema::create('user_saved_collections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('collection_id')->constrained()->onDelete('cascade');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('review_photos')) {
            Schema::create('review_photos', function (Blueprint $table) {
                $table->id();
                // Use simple IDs without foreign key constraints to legacy tables
                $table->unsignedBigInteger('review_id')->nullable();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('photo_path');
                $table->text('caption')->nullable();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'email_index')) {
                    $table->index('email');
                }
                if (!Schema::hasColumn('users', 'username_index')) {
                    $table->index('username');
                }
            });
        }

        if (Schema::hasTable('collections')) {
            Schema::table('collections', function (Blueprint $table) {
                if (!Schema::hasColumn('collections', 'user_id_index')) {
                    $table->index('user_id');
                }
                if (!Schema::hasColumn('collections', 'is_public_index')) {
                    $table->index('is_public');
                }
            });
        }

        $this->markAllMigrationsAsCompleted();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop tables in reverse order
        Schema::dropIfExists('review_photos');
        Schema::dropIfExists('user_saved_collections');
        Schema::dropIfExists('collection_reviews');
        Schema::dropIfExists('collection_road');
        Schema::dropIfExists('collections');
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('users');
    }

    private function markAllMigrationsAsCompleted()
    {
        // Get all migration files
        $migrations = collect(glob(database_path('migrations/*.php')))
            ->map(function ($file) {
                return basename($file, '.php');
            })
            ->filter(function ($migration) {
                return $migration !== '2025_06_06_204602_squash_all_migrations';
            });

        // Mark them as completed in the migrations table
        foreach ($migrations as $migration) {
            DB::table('migrations')->updateOrInsert(
                ['migration' => $migration],
                ['batch' => 1]
            );
        }
    }
};
