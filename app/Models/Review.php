<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'saved_road_id',
        'rating',
        'comment'
    ];

    public function road()
    {
        return $this->belongsTo(SavedRoad::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
public function photos()
    {
        return $this->hasMany(ReviewPhoto::class);
    }
}
