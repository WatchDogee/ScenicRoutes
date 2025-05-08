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
        Schema::create('collection_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('collection_id')->constrained()->onDelete('cascade');
            $table->integer('rating');
            $table->text('comment')->nullable();
            $table->timestamps();

            // Ensure a user can only review a collection once
            $table->unique(['user_id', 'collection_id']);
        });

        // Add average_rating column to collections table
        Schema::table('collections', function (Blueprint $table) {
            $table->decimal('average_rating', 3, 2)->nullable();
            $table->integer('reviews_count')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('collection_reviews');
        
        Schema::table('collections', function (Blueprint $table) {
            $table->dropColumn('average_rating');
            $table->dropColumn('reviews_count');
        });
    }
};
