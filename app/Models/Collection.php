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
}
