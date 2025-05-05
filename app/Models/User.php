<?php

namespace App\Models;

// Enable email verification
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
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
            return asset('storage/' . $this->profile_picture);
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
