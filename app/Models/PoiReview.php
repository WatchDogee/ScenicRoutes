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
<<<<<<< HEAD
        'comment'
    ];

    protected $casts = [
        'rating' => 'decimal:1'
    ];

    /**
     * Get the point of interest that owns the review.
=======
        'comment',
    ];

    protected $casts = [
        'rating' => 'float',
    ];

    /**
     * Get the POI that owns the review.
>>>>>>> 3792695 (0.2.0 Added POI and revised reviews)
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
