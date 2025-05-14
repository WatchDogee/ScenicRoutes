<?php

namespace App\Models;


use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
use HasApiTokens, HasFactory, Notifiable;
protected $fillable = [
        'name',
        'email',
        'username',
        'password',
        'profile_picture',
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
        ];
    }

    public function getProfilePictureUrlAttribute()
    {
        if ($this->profile_picture) {
            
            $disk = config('filesystems.default');

            
            \Log::info('Getting profile picture URL', [
                'disk' => $disk,
                'path' => $this->profile_picture,
                'app_url' => config('app.url')
            ]);

            try {
                
                if ($disk === 'public') {
                    
                    $appUrl = config('app.url');
                    if (empty($appUrl) || $appUrl === 'http://localhost') {
                        $appUrl = 'http://localhost:8000';
                    }

                    
                    $url = $appUrl . '/storage/' . $this->profile_picture;
                    \Log::info('Generated URL for public disk', ['url' => $url]);
                    return $url;
                }

                
                if ($disk === 's3' && config('filesystems.disks.s3.key')) {
                    $url = Storage::disk('s3')->url($this->profile_picture);
                    \Log::info('Generated URL from S3 disk', ['url' => $url]);
                    return $url;
                }

                
                $url = asset('storage/' . $this->profile_picture);
                \Log::info('Generated URL from asset helper', ['url' => $url]);
                return $url;
            } catch (\Exception $e) {
                
                \Log::error('Error generating profile picture URL', [
                    'error' => $e->getMessage(),
                    'path' => $this->profile_picture
                ]);

                
                return asset('storage/' . $this->profile_picture);
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
        
        \Log::info('Setting user setting', [
            'user_id' => $this->id,
            'key' => $key,
            'value' => $value,
            'value_type' => gettype($value)
        ]);

        
        if ($value === 'true' || $value === true) {
            $value = true;
        } elseif ($value === 'false' || $value === false) {
            $value = false;
        }

        $setting = $this->settings()->updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );

        
        \Log::info('Setting saved', [
            'setting_id' => $setting->id,
            'key' => $setting->key,
            'value' => $setting->value,
            'value_type' => gettype($setting->value)
        ]);

        return $setting;
    }
public function sendEmailVerificationNotification()
    {
        $this->notify(new \App\Notifications\CustomVerifyEmail);
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
}
