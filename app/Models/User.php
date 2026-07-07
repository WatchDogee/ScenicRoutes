<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Cashier\Billable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, Billable;

    protected $fillable = [
        'name',
        'email',
        'username',
        'password',
        'profile_picture',
        'google_id',
        'avatar',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['profile_picture_url'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_verification_sent_at' => 'datetime',
            'deletion_requested_at' => 'datetime',
            'deletion_scheduled_at' => 'datetime',
        ];
    }

    public function getProfilePictureUrlAttribute()
    {
        if ($this->profile_picture) {
            try {
                return asset('storage/' . $this->profile_picture);
            } catch (\Exception $e) {
                // Silently fail - return default avatar
            }
        }
        return "https://ui-avatars.com/api/?name=" . urlencode($this->name) . "&background=random&color=fff&size=256";
    }

    public function savedRoads()
    {
        return $this->hasMany(SavedRoad::class);
    }

    public function pointsOfInterest()
    {
        return $this->hasMany(PointOfInterest::class);
    }


    public function poiPhotos()
    {
        return $this->hasMany(PoiPhoto::class);
    }

    public function settings()
    {
        return $this->hasMany(UserSetting::class);
    }

    public function getSetting($key, $default = null)
    {
        $setting = $this->settings()->where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public function setSetting($key, $value)
    {
        // Convert boolean values to strings that the UserSetting mutator expects
        // The mutator will handle converting them back, but for storage we use strings
        if ($value === 'true' || $value === true) {
            $value = 'true';
        } elseif ($value === 'false' || $value === false) {
            $value = 'false';
        } else {
            // Ensure all other values are strings
            $value = (string) $value;
        }

        $setting = $this->settings()->updateOrCreate(
            ['user_id' => $this->id, 'key' => $key],
            ['value' => $value]
        );
        return $setting;
    }

    public function sendEmailVerificationNotification()
    {
        // Rate limit: only send if 2+ minutes have passed since last send
        if ($this->last_verification_sent_at !== null && $this->last_verification_sent_at->diffInSeconds(now()) < 120) {
            return;
        }
        $this->notify(new \App\Notifications\CustomVerifyEmail);
        $this->last_verification_sent_at = now();
        $this->save();
    }

    public function collections()
    {
        return $this->hasMany(Collection::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function following()
    {
        return $this->belongsToMany(User::class, 'follows', 'follower_id', 'followed_id')
            ->withTimestamps();
    }

    public function followers()
    {
        return $this->belongsToMany(User::class, 'follows', 'followed_id', 'follower_id')
            ->withTimestamps();
    }

    public function isFollowing($userId)
    {
        return $this->following()->where('followed_id', $userId)->exists();
    }

    public function getBioAttribute()
    {
        if (isset($this->attributes['bio'])) {
            return $this->attributes['bio'];
        }
        return $this->getSetting('bio', '');
    }

    public function savedCollections()
    {
        return $this->belongsToMany(\App\Models\Collection::class, 'user_saved_collections', 'user_id', 'collection_id');
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class)
            ->whereIn('status', ['active', 'trialing'])
            ->where(function($query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->latest('created_at');
    }

    public function offlineMapDownloads()
    {
        return $this->hasMany(OfflineMapDownload::class);
    }

    /**
     * Check if user has an active subscription
     */

    /**
     * Check if user has an active subscription or is a founder (lifetime access)
     */
    public function hasActiveSubscription($tier = null): bool
    {
        // Use already loaded subscription relationship if available
        if ($this->relationLoaded('subscription') && $this->subscription) {
            $subscription = $this->subscription;
        } else {
            // Query only if not already loaded
            $subscription = \App\Models\Subscription::where('user_id', $this->id)
                ->whereIn('status', ['active', 'trialing'])
                ->where(function($query) {
                    $query->whereNull('ends_at')
                        ->orWhere('ends_at', '>', now());
                })
                ->latest('created_at')
                ->first();
        }

        // Founder access: treat as always active
        if ($subscription && $subscription->plan === 'founder') {
            return true;
        }

        if (!$subscription) {
            return false;
        }

        if ($tier) {
            return $subscription->plan === $tier || ($tier === 'premium' && $subscription->plan === 'founder');
        }

        return true;
    }

    /**
     * Check if user is a founder (lifetime access)
     */
    public function isFounder(): bool
    {
        $subscription = \App\Models\Subscription::where('user_id', $this->id)
            ->where('status', 'active')
            ->where('plan', 'founder')
            ->first();
        return (bool) $subscription;
    }

    /**
     * Get current subscription tier
     */
    public function getSubscriptionTier(): string
    {
        // Use already loaded subscription relationship if available
        if ($this->relationLoaded('subscription') && $this->subscription) {
            return $this->subscription->plan ?? 'free';
        }
        
        // Load subscription if not already loaded
        $subscription = \App\Models\Subscription::where('user_id', $this->id)
            ->whereIn('status', ['active', 'trialing'])
            ->where(function($query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->latest('created_at')
            ->first();
        
        if ($subscription && $subscription->plan) {
            return $subscription->plan;
        }
        
        return 'free';
    }

    /**
     * Get all subscriptions (not just active)
     */
    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Get route usages
     */
    public function routeUsages()
    {
        return $this->hasMany(RouteUsage::class);
    }
}
