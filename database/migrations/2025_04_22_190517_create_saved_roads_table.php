<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateSavedRoadsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('saved_roads', function (Blueprint $table) {
            $table->id(); // Auto-increment primary key
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Link to users table
            $table->string('road_name')->nullable(); // Road name
            $table->string('road_surface')->nullable(); // Road surface type
            $table->json('road_coordinates'); // Store coordinates as JSON
            $table->decimal('twistiness', 8, 4)->nullable(); // Measure road twistiness
            $table->integer('corner_count')->nullable(); // Number of corners
            $table->decimal('length', 10, 2)->nullable(); // Road length (meters)
            $table->timestamps(); // Created/updated timestamps
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('saved_roads');
    }
}