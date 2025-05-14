<?php

require __DIR__ . '/../vendor/autoload.php';


$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "Checking database schema...\n";


if (!Schema::hasTable('review_photos')) {
    echo "❌ review_photos table does not exist\n";
} else {
    echo "✅ review_photos table exists\n";
    
    
    $columns = Schema::getColumnListing('review_photos');
    echo "Columns in review_photos table: " . implode(', ', $columns) . "\n";
}


if (!Schema::hasTable('saved_roads')) {
    echo "❌ saved_roads table does not exist\n";
} else {
    echo "✅ saved_roads table exists\n";
    
    
    if (!Schema::hasColumn('saved_roads', 'is_public')) {
        echo "❌ is_public column does not exist in saved_roads table\n";
    } else {
        echo "✅ is_public column exists in saved_roads table\n";
    }
    
    
    $requiredColumns = ['road_name', 'road_coordinates', 'user_id', 'average_rating', 'country', 'region'];
    foreach ($requiredColumns as $column) {
        if (!Schema::hasColumn('saved_roads', $column)) {
            echo "❌ $column column does not exist in saved_roads table\n";
        } else {
            echo "✅ $column column exists in saved_roads table\n";
        }
    }
}


if (!Schema::hasTable('reviews')) {
    echo "❌ reviews table does not exist\n";
} else {
    echo "✅ reviews table exists\n";
}


if (!Schema::hasTable('road_photos')) {
    echo "❌ road_photos table does not exist\n";
} else {
    echo "✅ road_photos table exists\n";
}


echo "\nChecking storage configuration...\n";
echo "Default disk: " . config('filesystems.default') . "\n";
echo "Public disk URL: " . config('filesystems.disks.public.url') . "\n";
echo "APP_URL: " . config('app.url') . "\n";


echo "\nChecking storage link...\n";
$publicPath = public_path('storage');
$targetPath = storage_path('app/public');

if (file_exists($publicPath) && is_link($publicPath)) {
    echo "✅ Storage link exists\n";
} else {
    echo "❌ Storage link does not exist\n";
}

echo "\nDatabase schema check completed.\n";
