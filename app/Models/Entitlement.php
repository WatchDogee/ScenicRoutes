<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Entitlement extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'entitlement_key',
        'status',
        'source',
        'product_id',
        'starts_at',
        'expires_at',
        'next_billing_date',
        'purchase_token',
        'stripe_subscription_id',
        'stripe_price_id',
        'device_id',
        'last_validated_at',
        'last_validation_result',
        'metadata',
        'notes',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'next_billing_date' => 'datetime',
        'last_validated_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if entitlement is currently active
     */
    public function isActive(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        if ($this->starts_at && $this->starts_at->isFuture()) {
            return false;
        }

        return true;
    }

    /**
     * Scope: active entitlements
     */
    public function scopeActive($query)
    {
        return $query
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->where(function ($q) {
                $q->whereNull('starts_at')
                  ->orWhere('starts_at', '<=', now());
            });
    }

    /**
     * Scope: by entitlement key
     */
    public function scopeByKey($query, string $key)
    {
        return $query->where('entitlement_key', $key);
    }

    /**
     * Scope: by source (play, stripe, manual)
     */
    public function scopeBySource($query, string $source)
    {
        return $query->where('source', $source);
    }

    /**
     * Update validation result
     */
    public function recordValidation(string $result, ?string $notes = null): void
    {
        $this->update([
            'last_validated_at' => now(),
            'last_validation_result' => $result,
            'notes' => $notes ? ($this->notes . "\n" . $notes) : $this->notes,
        ]);
    }

    /**
     * Mark as expired
     */
    public function expire(): void
    {
        $this->update([
            'status' => 'inactive',
            'last_validation_result' => 'expired',
            'last_validated_at' => now(),
        ]);
    }
}
