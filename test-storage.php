<?php

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Storage;

// Create Laravel application
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Test file content
$content = 'This is a test file to verify Cloudflare R2 storage configuration. ' . date('Y-m-d H:i:s');
$filename = 'test-' . time() . '.txt';

// Debug S3 configuration
echo "S3 Configuration:\n";
echo "Driver: " . config('filesystems.disks.s3.driver') . "\n";
echo "Key: " . substr(config('filesystems.disks.s3.key'), 0, 5) . "...\n";
echo "Secret: " . substr(config('filesystems.disks.s3.secret'), 0, 5) . "...\n";
echo "Region: " . config('filesystems.disks.s3.region') . "\n";
echo "Bucket: " . config('filesystems.disks.s3.bucket') . "\n";
echo "Endpoint: " . config('filesystems.disks.s3.endpoint') . "\n";
echo "Use Path Style: " . (config('filesystems.disks.s3.use_path_style_endpoint') ? 'true' : 'false') . "\n";
echo "Visibility: " . (config('filesystems.disks.s3.visibility') ?? 'not set') . "\n\n";

try {
    // Try to store a file
    echo "Attempting to upload file {$filename}...\n";
    $success = Storage::disk('s3')->put($filename, $content);

    if ($success) {
        echo "✅ Successfully uploaded file to Cloudflare R2!\n";

        // Get the URL
        $url = Storage::disk('s3')->url($filename);
        echo "📄 File URL: {$url}\n";

        // Verify we can retrieve the content
        echo "Attempting to retrieve file content...\n";
        $retrievedContent = Storage::disk('s3')->get($filename);
        if ($retrievedContent === $content) {
            echo "✅ Successfully retrieved file content!\n";
        } else {
            echo "❌ Retrieved content doesn't match original content.\n";
            echo "Original: {$content}\n";
            echo "Retrieved: {$retrievedContent}\n";
        }
    } else {
        echo "❌ Failed to upload file.\n";
    }
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
