<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up(): void
    {
        
        if (Schema::hasTable('review_photos')) {
            
            if (!Schema::hasColumn('review_photos', 'user_id')) {
                Schema::table('review_photos', function (Blueprint $table) {
                    $table->unsignedBigInteger('user_id')->nullable()->after('review_id');
                    $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
                });
            }
        } else {
            
            Schema::create('review_photos', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('review_id');
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();

                $table->foreign('review_id')->references('id')->on('reviews')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            });
        }
    }
public function down(): void
    {
        
    }
};
