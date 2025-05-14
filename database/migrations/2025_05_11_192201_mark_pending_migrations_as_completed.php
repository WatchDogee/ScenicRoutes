<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
public function up(): void
    {
        
        $pendingMigrations = [
            '2025_05_11_182741_create_review_photos_table',
            '2025_05_20_000000_create_missing_tables',
            '2025_05_20_000001_add_user_id_to_review_photos',
            '2025_05_20_000002_recreate_review_photos_table'
        ];

        foreach ($pendingMigrations as $migration) {
            
            $exists = DB::table('migrations')->where('migration', $migration)->exists();

            if (!$exists) {
                
                DB::table('migrations')->insert([
                    'migration' => $migration,
                    'batch' => DB::table('migrations')->max('batch') + 1
                ]);
            }
        }
    }
public function down(): void
    {
        
    }
};
