<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'type'];

    /**
     * Get all roads that are tagged with this tag.
     */
    public function roads()
    {
        return $this->belongsToMany(SavedRoad::class, 'road_tag', 'tag_id', 'road_id');
    }

    /**
     * Get all collections that are tagged with this tag.
     */
    public function collections()
    {
        return $this->belongsToMany(Collection::class, 'collection_tag', 'tag_id', 'collection_id');
    }
}
