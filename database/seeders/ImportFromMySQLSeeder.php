<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ImportFromMySQLSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // This seeder assumes you have a MySQL connection configured in your database.php
        // Add a 'mysql_old' connection to your config/database.php file pointing to your MySQL database

        // List of tables to import in the correct order
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

    /**
     * Import data from a MySQL table to PostgreSQL
     */
    private function importTable(string $table): void
    {
        // Skip if table doesn't exist in the source database
        if (!Schema::connection('mysql_old')->hasTable($table)) {
            $this->command->info("Table {$table} doesn't exist in source database, skipping...");
            return;
        }

        // Get data from MySQL
        $rows = DB::connection('mysql_old')->table($table)->get();
        
        if ($rows->isEmpty()) {
            $this->command->info("No data in {$table}, skipping...");
            return;
        }

        $this->command->info("Importing {$rows->count()} rows from {$table}...");

        // Get the sequence name for PostgreSQL
        $sequence = "{$table}_id_seq";

        // Disable foreign key checks in PostgreSQL
        DB::statement('SET session_replication_role = replica;');

        // Clear existing data
        DB::table($table)->delete();

        // Reset sequence if it exists
        if (in_array('id', Schema::getColumnListing($table))) {
            try {
                DB::statement("ALTER SEQUENCE {$sequence} RESTART WITH 1");
            } catch (\Exception $e) {
                $this->command->warn("Could not reset sequence for {$table}: {$e->getMessage()}");
            }
        }

        // Insert data in chunks to avoid memory issues
        foreach ($rows->chunk(100) as $chunk) {
            $data = [];
            foreach ($chunk as $row) {
                $rowData = (array) $row;
                
                // Convert any MySQL-specific data types
                foreach ($rowData as $key => $value) {
                    // Convert tinyint(1) to boolean
                    if (is_numeric($value) && ($key === 'is_public' || $key === 'is_verified')) {
                        $rowData[$key] = (bool) $value;
                    }
                }
                
                $data[] = $rowData;
            }
            
            DB::table($table)->insert($data);
        }

        // Update sequence to the max ID value
        if (in_array('id', Schema::getColumnListing($table))) {
            try {
                $maxId = DB::table($table)->max('id') ?? 0;
                DB::statement("ALTER SEQUENCE {$sequence} RESTART WITH " . ($maxId + 1));
            } catch (\Exception $e) {
                $this->command->warn("Could not update sequence for {$table}: {$e->getMessage()}");
            }
        }

        // Re-enable foreign key checks
        DB::statement('SET session_replication_role = DEFAULT;');

        $this->command->info("Imported data into {$table} successfully!");
    }
}
