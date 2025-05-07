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
    ];

    /**
     * Get the user that owns the collection.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the roads in this collection.
     */
    public function roads()
    {
        return $this->belongsToMany(SavedRoad::class, 'collection_road')
            ->withPivot('order')
            ->orderBy('order')
            ->withTimestamps();
    }

    /**
     * Get the tags for the collection.
     */
    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'collection_tag', 'collection_id', 'tag_id');
    }
}
