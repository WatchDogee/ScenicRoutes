<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavedRoad extends Model
{
    use HasFactory;

    protected $fillable = [
        'road_name',
        'road_surface',
        'road_coordinates',
        'twistiness',
        'corner_count',
        'length',
        'user_id',
        'description'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }
}