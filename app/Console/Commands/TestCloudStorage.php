<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class TestCloudStorage extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'storage:test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test cloud storage configuration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing cloud storage configuration...');

        // Debug S3 configuration
        $this->info('S3 Configuration:');
        $this->line('Driver: ' . config('filesystems.disks.s3.driver'));
        $this->line('Key: ' . substr(config('filesystems.disks.s3.key'), 0, 5) . '...');
        $this->line('Secret: ' . substr(config('filesystems.disks.s3.secret'), 0, 5) . '...');
        $this->line('Region: ' . config('filesystems.disks.s3.region'));
        $this->line('Bucket: ' . config('filesystems.disks.s3.bucket'));
        $this->line('Endpoint: ' . config('filesystems.disks.s3.endpoint'));
        $this->line('Use Path Style: ' . (config('filesystems.disks.s3.use_path_style_endpoint') ? 'true' : 'false'));
        $this->line('Visibility: ' . (config('filesystems.disks.s3.visibility') ?? 'not set'));

        // Test file content
        $content = 'This is a test file to verify Cloudflare R2 storage configuration. ' . date('Y-m-d H:i:s');
        $filename = 'test-' . time() . '.txt';

        try {
            // Try to store a file
            $this->info("\nAttempting to upload file {$filename}...");

            // Get the S3 client directly for more detailed debugging
            $this->line("Getting S3 client...");
            $s3Client = Storage::disk('s3')->getClient();
            $this->line("S3 client obtained successfully.");

            // Try a direct S3 operation to test connectivity
            $this->line("Testing S3 connectivity with listBuckets...");
            try {
                $buckets = $s3Client->listBuckets();
                $this->info("Successfully connected to S3. Available buckets:");
                foreach ($buckets['Buckets'] as $bucket) {
                    $this->line(" - " . $bucket['Name']);
                }
            } catch (\Exception $e) {
                $this->error("Failed to list buckets: " . $e->getMessage());
            }

            // Now try the put operation
            $this->line("Now trying to put file using Storage facade...");
            $success = Storage::disk('s3')->put($filename, $content);

            if ($success) {
                $this->info('✅ Successfully uploaded file to Cloudflare R2!');

                // Get the URL
                $url = Storage::disk('s3')->url($filename);
                $this->info("📄 File URL: {$url}");

                // Verify we can retrieve the content
                $this->info('Attempting to retrieve file content...');
                $retrievedContent = Storage::disk('s3')->get($filename);
                if ($retrievedContent === $content) {
                    $this->info('✅ Successfully retrieved file content!');
                } else {
                    $this->error('❌ Retrieved content doesn\'t match original content.');
                    $this->line("Original: {$content}");
                    $this->line("Retrieved: {$retrievedContent}");
                }
            } else {
                $this->error('❌ Failed to upload file.');
            }
        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            $this->line('Stack trace:');
            $this->line($e->getTraceAsString());
        }

        return 0;
    }
}
