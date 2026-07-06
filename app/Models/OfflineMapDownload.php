<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfflineMapDownload extends Model
{
    protected $fillable = [
        'user_id',
        'region_id',
        'region_name',
        'south',
        'west',
        'north',
        'east',
        'zoom_levels',
        'radius_km',
        'size_mb',
        'status',
        'download_date',
        'last_used',
    ];

    protected $casts = [
        'zoom_levels' => 'array',
        'south' => 'decimal:7',
        'west' => 'decimal:7',
        'north' => 'decimal:7',
        'east' => 'decimal:7',
        'radius_km' => 'decimal:2',
        'size_mb' => 'integer',
        'download_date' => 'datetime',
        'last_used' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
