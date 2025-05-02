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
        return $this->photo_path ? Storage::url($this->photo_path) : null;
    }
}
