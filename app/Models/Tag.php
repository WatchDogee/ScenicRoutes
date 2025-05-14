<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'type'];
public function roads()
    {
        return $this->belongsToMany(SavedRoad::class, 'road_tag', 'tag_id', 'road_id');
    }
public function collections()
    {
        return $this->belongsToMany(Collection::class, 'collection_tag', 'tag_id', 'collection_id');
    }
}
