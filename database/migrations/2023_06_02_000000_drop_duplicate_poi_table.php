<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up(): void
    {
        
        Schema::dropIfExists('poi_photos');

        
        
        Schema::dropIfExists('points_of_interest');
    }
public function down(): void
    {
        
        
        
    }
};
