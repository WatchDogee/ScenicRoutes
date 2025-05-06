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
        if ($disk === 's3') {
            // For S3 storage
            return Storage::disk('s3')->url($this->photo_path);
        } else {
            // For local storage
            return Storage::url($this->photo_path);
        }
    }
}
