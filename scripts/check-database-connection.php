<?php

require __DIR__ . '/../vendor/autoload.php';


$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

echo "Checking database connection...\n";

try {
    
    $databaseDriver = DB::connection()->getDriverName();
    echo "Database driver: {$databaseDriver}\n";
    
    
    $databaseName = DB::connection()->getDatabaseName();
    echo "Database name: {$databaseName}\n";
    
    
    $connection = DB::connection()->getPdo();
    echo "Database connection successful!\n";
    
    
    if (Schema::hasTable('saved_roads')) {
        echo "saved_roads table exists\n";
        
        
        if (Schema::hasColumn('saved_roads', 'is_public')) {
            echo "is_public column exists in saved_roads table\n";
        } else {
            echo "is_public column does not exist in saved_roads table\n";
        }
        
        
        if (Schema::hasColumn('saved_roads', 'road_coordinates')) {
            echo "road_coordinates column exists in saved_roads table\n";
            
            
            $columnType = DB::connection()->getDoctrineColumn('saved_roads', 'road_coordinates')->getType()->getName();
            echo "road_coordinates column type: {$columnType}\n";
            
            
            $sampleRoad = DB::table('saved_roads')->first();
            if ($sampleRoad) {
                echo "Sample road_coordinates: " . substr($sampleRoad->road_coordinates, 0, 100) . "...\n";
            }
        } else {
            echo "road_coordinates column does not exist in saved_roads table\n";
        }
        
        
        $publicRoadsCount = DB::table('saved_roads')->where('is_public', true)->count();
        echo "Number of public roads: {$publicRoadsCount}\n";
    } else {
        echo "saved_roads table does not exist\n";
    }
    
    
    if (Schema::hasTable('review_photos')) {
        echo "review_photos table exists\n";
        
        
        $reviewPhotosCount = DB::table('review_photos')->count();
        echo "Number of review photos: {$reviewPhotosCount}\n";
    } else {
        echo "review_photos table does not exist\n";
    }
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}

echo "Database check completed.\n";
