<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up(): void
    {
        
        Schema::dropIfExists('poi_reviews');
    }
public function down(): void
    {
        
        if (!Schema::hasTable('poi_reviews')) {
            Schema::create('poi_reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('point_of_interest_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
                $table->decimal('rating', 2, 1);
                $table->text('comment')->nullable();
                $table->timestamps();
            });
        }
    }
};
