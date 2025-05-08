<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ReviewPhoto extends Model
{
    use HasFactory;

    protected $fillable = [
        'review_id',
        'photo_path',
        'caption',
    ];

    protected $appends = [
        'photo_url',
    ];

    /**
     * Get the review that owns the photo.
     */
    public function review()
    {
        return $this->belongsTo(Review::class);
    }

    /**
     * Get the URL for the photo.
     */
    public function getPhotoUrlAttribute()
    {
        if (!$this->photo_path) {
            return null;
        }

        // Check if we're using S3 or local storage
        $disk = config('filesystems.default');

        try {
            // For local development, always use the public disk with the correct APP_URL
            if ($disk === 'public') {
                // Make sure we're using the correct APP_URL
                $appUrl = config('app.url');
                if (empty($appUrl) || $appUrl === 'http://localhost') {
                    $appUrl = 'http://localhost:8000';
                }

                // Construct the URL manually to ensure it's correct
                $url = $appUrl . '/storage/' . $this->photo_path;
                \Log::info('Generated review photo URL for public disk', ['url' => $url]);
                return $url;
            }

            // For S3 storage
            if ($disk === 's3' && config('filesystems.disks.s3.key')) {
                $url = Storage::disk('s3')->url($this->photo_path);
                return $url;
            }

            // Fallback to asset helper
            return asset('storage/' . $this->photo_path);
        } catch (\Exception $e) {
            // Log the error and fallback to asset helper
            \Log::error('Error generating review photo URL', [
                'error' => $e->getMessage(),
                'path' => $this->photo_path
            ]);

            // Last resort fallback
            return asset('storage/' . $this->photo_path);
        }
    }
}
