<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RouteShare extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'share_token',
        'route_data',
        'route_name',
        'route_description',
        'is_public',
        'view_count',
        'share_count',
        'expires_at'
    ];

    protected $casts = [
        'route_data' => 'array',
        'is_public' => 'boolean',
        'expires_at' => 'datetime',
        'view_count' => 'integer',
        'share_count' => 'integer'
    ];

    /**
     * Generate a unique share token
     */
    public static function generateToken(): string
    {
        do {
            $token = bin2hex(random_bytes(32)); // 64 character token
        } while (self::where('share_token', $token)->exists());
        
        return $token;
    }

    /**
     * Increment view count
     */
    public function incrementViews(): void
    {
        $this->increment('view_count');
    }

    /**
     * Increment share count
     */
    public function incrementShares(): void
    {
        $this->increment('share_count');
    }

    /**
     * Check if share is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Get the user that owns this share
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
