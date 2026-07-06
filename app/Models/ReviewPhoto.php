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
        'user_id',
        'photo_path',
        'caption',
    ];

    protected $appends = [
        'photo_url',
    ];

    public function review()
    {
        return $this->belongsTo(Review::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getPhotoUrlAttribute()
    {
        if (!$this->photo_path) {
            return null;
        }
        return \Storage::disk('public')->url($this->photo_path);
    }
}
