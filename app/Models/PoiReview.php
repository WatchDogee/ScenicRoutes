<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PoiReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'point_of_interest_id',
        'user_id',
        'rating',
        'comment'
    ];

    protected $casts = [
        'rating' => 'decimal:1'
    ];

    /**
     * Get the point of interest that owns the review.
     */
    public function pointOfInterest()
    {
        return $this->belongsTo(PointOfInterest::class);
    }

    /**
     * Get the user who wrote the review.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
