<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ride extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'linked_route_id',
        'started_at',
        'ended_at',
        'distance_meters',
        'duration_seconds',
        'average_speed',
        'max_speed',
        'points',
        'synced',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'points' => 'array',
        'synced' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
