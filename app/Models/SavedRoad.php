<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavedRoad extends Model
{
    use HasFactory;

    protected $fillable = [
        'road_name',
        'route_type', // 'road' or 'route'
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
        'min_elevation',
        'country',
        'region'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'saved_road_id');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function roadComments()
    {
        return $this->hasMany(RoadComment::class, 'road_id');
    }

    public function photos()
    {
        return $this->hasMany(RoadPhoto::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'road_tag', 'road_id', 'tag_id');
    }

    public function collections()
    {
        return $this->belongsToMany(Collection::class, 'collection_road', 'road_id', 'collection_id')
            ->withPivot('order');
    }
}