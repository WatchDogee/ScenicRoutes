<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
public function up(): void
    {
        
        if (!Schema::hasTable('review_photos')) {
            
            Schema::create('review_photos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('review_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('photo_path');
                $table->string('caption')->nullable();
                $table->timestamps();
            });

            return; 
        }

        

        
        if (!Schema::hasColumn('review_photos', 'user_id')) {
            Schema::table('review_photos', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('review_id')->constrained()->nullOnDelete();
            });
        }

        
        

        
        

        
        if (Schema::hasTable('review_photos')) {
            
            try {
                $data = DB::table('review_photos')->get();

                
                Schema::dropIfExists('review_photos');

                Schema::create('review_photos', function (Blueprint $table) {
                    $table->id();
                    $table->foreignId('review_id')->constrained()->onDelete('cascade');
                    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                    $table->string('photo_path');
                    $table->string('caption')->nullable();
                    $table->timestamps();
                });

                
                foreach ($data as $row) {
                    
                    $rowArray = (array) $row;
                    unset($rowArray['id']);

                    
                    if (!isset($rowArray['created_at'])) {
                        $rowArray['created_at'] = now();
                    }
                    if (!isset($rowArray['updated_at'])) {
                        $rowArray['updated_at'] = now();
                    }

                    
                    if (!isset($rowArray['user_id'])) {
                        $rowArray['user_id'] = null;
                    }

                    
                    DB::table('review_photos')->insert($rowArray);
                }
            } catch (\Exception $e) {
                
                Schema::dropIfExists('review_photos');

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
    }
public function down(): void
    {
        
    }
};
