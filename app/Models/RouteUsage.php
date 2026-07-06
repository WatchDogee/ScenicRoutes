<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouteUsage extends Model
{
    protected $fillable = [
        'user_id',
        'saved_road_id',
        'route_type',
        'curvature_level',
        'waypoints_count',
        'distance_km',
        'used_at',
    ];

    protected $casts = [
        'used_at' => 'datetime',
        'distance_km' => 'decimal:2',
        'waypoints_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function savedRoad(): BelongsTo
    {
        return $this->belongsTo(SavedRoad::class);
    }
}
