<?php

namespace App\Models;

// Enable email verification
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'username',
        'password',
        'profile_picture',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be appended.
     *
     * @var list<string>
     */
    protected $appends = ['profile_picture_url'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getProfilePictureUrlAttribute()
    {
        if ($this->profile_picture) {
            // Check if we're using S3 or local storage
            $disk = config('filesystems.default');

            // Log the current disk and profile picture path for debugging
            \Log::info('Getting profile picture URL', [
                'disk' => $disk,
                'path' => $this->profile_picture,
                'app_url' => config('app.url')
            ]);

            try {
                // For local development, always use the public disk with the correct APP_URL
                if ($disk === 'public') {
                    // Make sure we're using the correct APP_URL
                    $appUrl = config('app.url');
                    if (empty($appUrl) || $appUrl === 'http://localhost') {
                        $appUrl = 'http://localhost:8000';
                    }

                    // Construct the URL manually to ensure it's correct
                    $url = $appUrl . '/storage/' . $this->profile_picture;
                    \Log::info('Generated URL for public disk', ['url' => $url]);
                    return $url;
                }

                // For S3 storage
                if ($disk === 's3' && config('filesystems.disks.s3.key')) {
                    $url = Storage::disk('s3')->url($this->profile_picture);
                    \Log::info('Generated URL from S3 disk', ['url' => $url]);
                    return $url;
                }

                // Fallback to asset helper
                $url = asset('storage/' . $this->profile_picture);
                \Log::info('Generated URL from asset helper', ['url' => $url]);
                return $url;
            } catch (\Exception $e) {
                // Log the error and fallback to asset helper
                \Log::error('Error generating profile picture URL', [
                    'error' => $e->getMessage(),
                    'path' => $this->profile_picture
                ]);

                // Last resort fallback
                return asset('storage/' . $this->profile_picture);
            }
        }

        // Generate initials-based placeholder if no profile picture
        return "https://ui-avatars.com/api/?name=" . urlencode($this->name) . "&background=random&color=fff&size=256";
    }

    public function savedRoads()
    {
        return $this->hasMany(SavedRoad::class);
    }

    /**
     * Get the points of interest added by the user.
     */
    public function pointsOfInterest()
    {
        return $this->hasMany(PointOfInterest::class);
    }

    /**
     * Get the POI photos added by the user.
     */
    public function poiPhotos()
    {
        return $this->hasMany(PoiPhoto::class);
    }

    /**
     * Get the POI reviews added by the user.
     */
    public function poiReviews()
    {
        return $this->hasMany(PoiReview::class);
    }

    /**
     * Get the settings for the user.
     */
    public function settings()
    {
        return $this->hasMany(UserSetting::class);
    }



    /**
     * Get a specific setting value.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public function getSetting($key, $default = null)
    {
        $setting = $this->settings()->where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    /**
     * Set a specific setting value.
     *
     * @param string $key
     * @param mixed $value
     * @return UserSetting
     */
    public function setSetting($key, $value)
    {
        $setting = $this->settings()->updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );

        return $setting;
    }

    // Users need to verify their email address

    /**
     * Send the email verification notification.
     *
     * @return void
     */
    public function sendEmailVerificationNotification()
    {
        $this->notify(new \App\Notifications\CustomVerifyEmail);
    }

    /**
     * Get the collections created by the user.
     */
    public function collections()
    {
        return $this->hasMany(Collection::class);
    }

    /**
     * Get the reviews created by the user.
     */
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get the users that this user is following.
     */
    public function following()
    {
        return $this->belongsToMany(User::class, 'follows', 'follower_id', 'followed_id')
            ->withTimestamps();
    }

    /**
     * Get the users that are following this user.
     */
    public function followers()
    {
        return $this->belongsToMany(User::class, 'follows', 'followed_id', 'follower_id')
            ->withTimestamps();
    }

    /**
     * Check if the user is following another user.
     *
     * @param int $userId
     * @return bool
     */
    public function isFollowing($userId)
    {
        return $this->following()->where('followed_id', $userId)->exists();
    }

    /**
     * Get the user's bio.
     */
    public function getBioAttribute()
    {
        // If bio column exists, return it
        if (isset($this->attributes['bio'])) {
            return $this->attributes['bio'];
        }

        // Otherwise, try to get it from settings
        return $this->getSetting('bio', '');
    }
}
