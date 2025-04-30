<?php

namespace App\Models;

// Temporarily comment out MustVerifyEmail to bypass verification
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable /* implements MustVerifyEmail */
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
     * The "booted" method of the model.
     * Automatically mark new users as verified for testing purposes.
     */
    protected static function booted()
    {
        static::creating(function ($user) {
            $user->email_verified_at = now();
        });
    }
}
