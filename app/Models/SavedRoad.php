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
        'description',
        'is_public',
        'average_rating',
        'elevation_gain',
        'elevation_loss',
        'max_elevation',
        'min_elevation'
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

    /**
     * Get the photos for the road.
     */
    public function photos()
    {
        return $this->hasMany(RoadPhoto::class);
    }

    /**
     * Get the tags for the road.
     */
    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'road_tag', 'road_id', 'tag_id');
    }

    /**
     * Get the collections that contain this road.
     */
    public function collections()
    {
        return $this->belongsToMany(Collection::class, 'collection_road', 'road_id', 'collection_id')
            ->withPivot('order');
    }
}