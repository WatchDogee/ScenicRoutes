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
        return $this->photo_path ? Storage::url($this->photo_path) : null;
    }
}
