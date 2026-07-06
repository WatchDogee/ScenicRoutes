<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfflineMapRegion extends Model
{
    protected $fillable = [
        'region_id',
        'name',
        'description',
        'south',
        'west',
        'north',
        'east',
        'country_codes',
        'zoom_levels',
        'estimated_size_mb',
        'is_bundle',
        'bundle_regions',
        'is_active',
        'display_order',
    ];

    protected $casts = [
        'country_codes' => 'array',
        'zoom_levels' => 'array',
        'bundle_regions' => 'array',
        'is_bundle' => 'boolean',
        'is_active' => 'boolean',
        'south' => 'decimal:7',
        'west' => 'decimal:7',
        'north' => 'decimal:7',
        'east' => 'decimal:7',
        'estimated_size_mb' => 'integer',
        'display_order' => 'integer',
    ];
}
