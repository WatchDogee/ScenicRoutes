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
        'is_verified'
    ];

    protected $casts = [
        'properties' => 'array',
        'is_verified' => 'boolean',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7'
    ];

    /**
     * Get the user who added this point of interest.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the photos for this point of interest.
     */
    public function photos()
    {
        return $this->hasMany(PoiPhoto::class);
    }

    /**
     * Get the reviews for this point of interest.
     */
    public function reviews()
    {
        return $this->hasMany(PoiReview::class);
    }
}
