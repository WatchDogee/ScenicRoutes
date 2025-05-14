<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'is_public',
        'is_featured',
        'cover_image',
        'saved_count',
        'likes_count',
        'average_rating',
        'reviews_count',
    ];

    protected $casts = [
        'average_rating' => 'float',
        'is_public' => 'boolean',
        'is_featured' => 'boolean',
    ];
public function user()
    {
        return $this->belongsTo(User::class);
    }
public function roads()
    {
        return $this->belongsToMany(SavedRoad::class, 'collection_road')
            ->withPivot('order')
            ->orderBy('order')
            ->withTimestamps();
    }
public function tags()
    {
        return $this->belongsToMany(Tag::class, 'collection_tag', 'collection_id', 'tag_id');
    }
public function reviews()
    {
        return $this->hasMany(CollectionReview::class);
    }
}
