<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ImportFromMySQLSeeder extends Seeder
{
public function run(): void
    {
        
        

        
        $tables = [
            'users',
            'saved_roads',
            'reviews',
            'review_photos',
            'road_photos',
            'comments',
            'points_of_interest',
            'poi_photos',
            'poi_reviews',
            'user_settings',
            'personal_access_tokens',
            'password_reset_tokens',
            'sessions',
        ];

        foreach ($tables as $table) {
            $this->importTable($table);
        }
    }
private function importTable(string $table): void
    {
        
        if (!Schema::connection('mysql_old')->hasTable($table)) {
            $this->command->info("Table {$table} doesn't exist in source database, skipping...");
            return;
        }

        
        $rows = DB::connection('mysql_old')->table($table)->get();
        
        if ($rows->isEmpty()) {
            $this->command->info("No data in {$table}, skipping...");
            return;
        }

        $this->command->info("Importing {$rows->count()} rows from {$table}...");

        
        $sequence = "{$table}_id_seq";

        
        DB::statement('SET session_replication_role = replica;');

        
        DB::table($table)->delete();

        
        if (in_array('id', Schema::getColumnListing($table))) {
            try {
                DB::statement("ALTER SEQUENCE {$sequence} RESTART WITH 1");
            } catch (\Exception $e) {
                $this->command->warn("Could not reset sequence for {$table}: {$e->getMessage()}");
            }
        }

        
        foreach ($rows->chunk(100) as $chunk) {
            $data = [];
            foreach ($chunk as $row) {
                $rowData = (array) $row;
                
                
                foreach ($rowData as $key => $value) {
                    
                    if (is_numeric($value) && ($key === 'is_public' || $key === 'is_verified')) {
                        $rowData[$key] = (bool) $value;
                    }
                }
                
                $data[] = $rowData;
            }
            
            DB::table($table)->insert($data);
        }

        
        if (in_array('id', Schema::getColumnListing($table))) {
            try {
                $maxId = DB::table($table)->max('id') ?? 0;
                DB::statement("ALTER SEQUENCE {$sequence} RESTART WITH " . ($maxId + 1));
            } catch (\Exception $e) {
                $this->command->warn("Could not update sequence for {$table}: {$e->getMessage()}");
            }
        }

        
        DB::statement('SET session_replication_role = DEFAULT;');

        $this->command->info("Imported data into {$table} successfully!");
    }
}
