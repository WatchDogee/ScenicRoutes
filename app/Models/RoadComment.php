<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoadComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'road_id',
        'user_id',
        'comment'
    ];

    public function road()
    {
        return $this->belongsTo(SavedRoad::class, 'road_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
