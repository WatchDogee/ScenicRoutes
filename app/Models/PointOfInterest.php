<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PointOfInterest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'subtype',
        'latitude',
        'longitude',
        'description',
        'properties',
        'osm_id',
        'is_verified',
    ];

    protected $casts = [
        'properties' => 'array',
        'is_verified' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
    ];
public function user()
    {
        return $this->belongsTo(User::class);
    }
public function photos()
    {
        return $this->hasMany(PoiPhoto::class);
    }
public function scopeTourism($query)
    {
        return $query->where('type', 'tourism');
    }
public function scopeFuel($query)
    {
        return $query->where('type', 'fuel');
    }
public function scopeCharging($query)
    {
        return $query->where('type', 'charging');
    }
public function scopeOfSubtype($query, $subtype)
    {
        return $query->where('subtype', $subtype);
    }
public function scopeNearby($query, $latitude, $longitude, $radiusKm = 10)
    {
        $radiusInDegrees = $radiusKm / 111.32; 

        return $query->whereBetween('latitude', [$latitude - $radiusInDegrees, $latitude + $radiusInDegrees])
                     ->whereBetween('longitude', [$longitude - $radiusInDegrees, $longitude + $radiusInDegrees]);
    }
}
