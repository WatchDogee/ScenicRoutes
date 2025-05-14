<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CollectionReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'collection_id',
        'rating',
        'comment'
    ];
public function collection()
    {
        return $this->belongsTo(Collection::class);
    }
public function user()
    {
        return $this->belongsTo(User::class);
    }
}
