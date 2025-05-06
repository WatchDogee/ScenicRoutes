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
                'exists_s3' => $disk === 's3' && config('filesystems.disks.s3.key') ? Storage::disk('s3')->exists($this->profile_picture) : 'S3 not configured',
                'exists_public' => Storage::disk('public')->exists($this->profile_picture),
                'app_url' => config('app.url')
            ]);

            // Try multiple approaches to ensure we get a valid URL
            try {
                // First try S3 if it's configured and set as default
                if ($disk === 's3' && config('filesystems.disks.s3.key')) {
                    $url = Storage::disk('s3')->url($this->profile_picture);
                    \Log::info('Generated URL from S3 disk', ['url' => $url]);
                    return $url;
                }

                // Then check if the file exists in public disk
                if (Storage::disk('public')->exists($this->profile_picture)) {
                    $url = Storage::disk('public')->url($this->profile_picture);
                    \Log::info('Generated URL from public disk', ['url' => $url]);
                    return $url;
                }

                // If S3 is configured but not set as default, try it as a fallback
                if (config('filesystems.disks.s3.key')) {
                    if (Storage::disk('s3')->exists($this->profile_picture)) {
                        $url = Storage::disk('s3')->url($this->profile_picture);
                        \Log::info('Generated URL from S3 disk (fallback)', ['url' => $url]);
                        return $url;
                    }
                }

                // Last resort: use the asset helper
                $assetUrl = asset('storage/' . $this->profile_picture);
                \Log::info('Generated URL from asset helper', ['url' => $assetUrl]);
                return $assetUrl;
            } catch (\Exception $e) {
                // Log the error and fallback to asset helper
                \Log::error('Error generating profile picture URL', [
                    'error' => $e->getMessage(),
                    'path' => $this->profile_picture
                ]);
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
}
