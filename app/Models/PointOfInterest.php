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

    /**
     * Get the user who added this POI.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the photos for this POI.
     */
    public function photos()
    {
        return $this->hasMany(PoiPhoto::class);
    }

    /**
     * Get the reviews for this POI.
     */
    public function reviews()
    {
        return $this->hasMany(PoiReview::class);
    }

    /**
     * Get the average rating for this POI.
     */
    public function getAverageRatingAttribute()
    {
        return $this->reviews()->avg('rating');
    }

    /**
     * Scope a query to only include tourism POIs.
     */
    public function scopeTourism($query)
    {
        return $query->where('type', 'tourism');
    }

    /**
     * Scope a query to only include fuel station POIs.
     */
    public function scopeFuel($query)
    {
        return $query->where('type', 'fuel');
    }

    /**
     * Scope a query to only include EV charging POIs.
     */
    public function scopeCharging($query)
    {
        return $query->where('type', 'charging');
    }

    /**
     * Scope a query to filter by subtype.
     */
    public function scopeOfSubtype($query, $subtype)
    {
        return $query->where('subtype', $subtype);
    }

    /**
     * Scope a query to find POIs within a certain radius of a point.
     */
    public function scopeNearby($query, $latitude, $longitude, $radiusKm = 10)
    {
        $radiusInDegrees = $radiusKm / 111.32; // Approximate conversion from km to degrees

        return $query->whereBetween('latitude', [$latitude - $radiusInDegrees, $latitude + $radiusInDegrees])
                     ->whereBetween('longitude', [$longitude - $radiusInDegrees, $longitude + $radiusInDegrees]);
    }
}
