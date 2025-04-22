<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'saved_road_id', 'comment'];

    public function road()
    {
        return $this->belongsTo(SavedRoad::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
