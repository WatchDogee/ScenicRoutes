<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class LaravelCloudServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if ($this->isLaravelCloud()) {
            Log::info('Running on Laravel Cloud, loading cloud-specific configuration');

            $cloudFilesystemConfig = require config_path('filesystems.cloud.php');
            Config::set('filesystems', $cloudFilesystemConfig);

            Config::set('filesystems.default', 'public');

            Log::info('Laravel Cloud configuration loaded', [
                'default_disk' => Config::get('filesystems.default'),
                'public_url' => Config::get('filesystems.disks.public.url')
            ]);
        }
    }

    public function boot(): void
    {

    }

    private function isLaravelCloud(): bool
    {
        return env('LARAVEL_CLOUD') === 'true' ||
               env('APP_ENV') === 'production';
    }
}
