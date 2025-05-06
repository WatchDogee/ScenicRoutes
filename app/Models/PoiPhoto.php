<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class PoiPhoto extends Model
{
    use HasFactory;

    protected $fillable = [
        'point_of_interest_id',
        'user_id',
        'photo_path',
        'caption'
    ];

    protected $appends = [
        'photo_url',
    ];

    /**
     * Get the point of interest that owns the photo.
     */
    public function pointOfInterest()
    {
        return $this->belongsTo(PointOfInterest::class);
    }

    /**
     * Get the user who uploaded the photo.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
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
            try {
                // First try using Storage::disk('public')->url which is more reliable
                return Storage::disk('public')->url($this->photo_path);
            } catch (\Exception $e) {
                // Fallback to Storage::url if the first method fails
                return Storage::url($this->photo_path);
            }
        }
    }
}
