<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class LaravelCloudServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        if ($this->isLaravelCloud()) {

            $cloudFilesystemConfig = require config_path('filesystems.cloud.php');
            Config::set('filesystems', $cloudFilesystemConfig);

            Config::set('filesystems.default', 'public');

            Log::info('Laravel Cloud configuration loaded', [
                'default_disk' => Config::get('filesystems.default'),
                'public_url' => Config::get('filesystems.disks.public.url')
            ]);
        }
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Check if the application is running on Laravel Cloud
     */
    private function isLaravelCloud(): bool
    {
        // Check for Laravel Cloud environment variables
        return env('LARAVEL_CLOUD') === 'true' ||
               env('APP_ENV') === 'production';
    }
}
