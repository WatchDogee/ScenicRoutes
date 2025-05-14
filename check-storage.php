<?php

require __DIR__ . '/vendor/autoload.php';

// Create Laravel application
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Check storage configuration
echo "Storage Configuration:\n";
echo "Default Disk: " . config('filesystems.default') . "\n";
echo "Public Disk URL: " . config('filesystems.disks.public.url') . "\n";
echo "APP_URL: " . config('app.url') . "\n\n";

// Check if storage link exists
echo "Storage Link Check:\n";
$publicPath = public_path('storage');
$targetPath = storage_path('app/public');

if (file_exists($publicPath)) {
    echo "✅ Public storage link exists at: {$publicPath}\n";
    
    // Check if it's a valid symlink
    if (is_link($publicPath)) {
        $actualTarget = readlink($publicPath);
        echo "Link target: {$actualTarget}\n";
        echo "Expected target: {$targetPath}\n";
        
        if (realpath($actualTarget) === realpath($targetPath)) {
            echo "✅ Symlink points to the correct target\n";
        } else {
            echo "❌ Symlink points to an incorrect target\n";
        }
    } else {
        echo "❌ Public storage exists but is not a symlink\n";
    }
} else {
    echo "❌ Public storage link does not exist\n";
}

echo "\n";

// Check profile pictures
echo "Profile Pictures Check:\n";
$profilePictures = \Illuminate\Support\Facades\Storage::disk('public')->files('profile-pictures');
echo "Found " . count($profilePictures) . " profile pictures\n";

if (count($profilePictures) > 0) {
    $firstPicture = $profilePictures[0];
    echo "First picture: {$firstPicture}\n";
    
    // Get URL
    $url = \Illuminate\Support\Facades\Storage::disk('public')->url($firstPicture);
    echo "URL: {$url}\n";
    
    // Check if file exists
    $exists = \Illuminate\Support\Facades\Storage::disk('public')->exists($firstPicture);
    echo $exists ? "✅ File exists on disk\n" : "❌ File does not exist on disk\n";
    
    // Get file size
    $size = \Illuminate\Support\Facades\Storage::disk('public')->size($firstPicture);
    echo "File size: {$size} bytes\n";
}

echo "\n";

// Check review photos
echo "Review Photos Check:\n";
$reviewPhotos = \Illuminate\Support\Facades\Storage::disk('public')->files('review-photos');
echo "Found " . count($reviewPhotos) . " review photos\n";

if (count($reviewPhotos) > 0) {
    $firstPhoto = $reviewPhotos[0];
    echo "First photo: {$firstPhoto}\n";
    
    // Get URL
    $url = \Illuminate\Support\Facades\Storage::disk('public')->url($firstPhoto);
    echo "URL: {$url}\n";
    
    // Check if file exists
    $exists = \Illuminate\Support\Facades\Storage::disk('public')->exists($firstPhoto);
    echo $exists ? "✅ File exists on disk\n" : "❌ File does not exist on disk\n";
    
    // Get file size
    $size = \Illuminate\Support\Facades\Storage::disk('public')->size($firstPhoto);
    echo "File size: {$size} bytes\n";
}

echo "\n";

// Check if we can generate a URL for a user's profile picture
echo "User Profile Picture URL Check:\n";
$user = \App\Models\User::find(2); // Assuming user ID 2 exists
if ($user) {
    echo "User found: {$user->name}\n";
    echo "Profile picture path: {$user->profile_picture}\n";
    
    // Check if the file exists
    $exists = \Illuminate\Support\Facades\Storage::disk('public')->exists($user->profile_picture);
    echo $exists ? "✅ File exists on disk\n" : "❌ File does not exist on disk\n";
    
    // Get the URL
    $url = \Illuminate\Support\Facades\Storage::disk('public')->url($user->profile_picture);
    echo "URL: {$url}\n";
}
