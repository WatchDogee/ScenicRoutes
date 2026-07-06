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
        Schema::create('route_shares', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('share_token', 64)->unique();
            $table->json('route_data');
            $table->string('route_name')->nullable();
            $table->text('route_description')->nullable();
            $table->boolean('is_public')->default(true);
            $table->integer('view_count')->default(0);
            $table->integer('share_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->index('share_token');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('route_shares');
    }
};
