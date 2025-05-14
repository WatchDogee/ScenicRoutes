<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
public function up(): void
    {
        
        if (!Schema::hasTable('point_of_interests')) {
            Schema::create('point_of_interests', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('type');
                $table->string('description')->nullable();
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->string('country')->nullable();
                $table->string('region')->nullable();
                $table->string('city')->nullable();
                $table->string('address')->nullable();
                $table->string('phone')->nullable();
                $table->string('website')->nullable();
                $table->string('opening_hours')->nullable();
                $table->string('image_url')->nullable();
                $table->boolean('is_verified')->default(false);
                $table->unsignedBigInteger('user_id')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            });
        }
    }
public function down(): void
    {
        
        if (Schema::hasTable('point_of_interests')) {
            Schema::dropIfExists('point_of_interests');
        }
    }
};
