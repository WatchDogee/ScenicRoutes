<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserSetting extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'key',
        'value',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'value' => 'string',
    ];

    /**
     * Get the value attribute with proper type casting.
     *
     * @param  string  $value
     * @return mixed
     */
    public function getValueAttribute($value)
    {
        // Handle boolean values
        if ($value === 'true') {
            return true;
        } elseif ($value === 'false') {
            return false;
        }

        // Handle numeric values
        if (is_numeric($value)) {
            return $value + 0; // Convert to int or float
        }

        return $value;
    }

    /**
     * Set the value attribute with proper type casting.
     *
     * @param  mixed  $value
     * @return void
     */
    public function setValueAttribute($value)
    {
        // Convert boolean values to strings for storage
        if (is_bool($value)) {
            $this->attributes['value'] = $value ? 'true' : 'false';
        } else {
            $this->attributes['value'] = (string) $value;
        }
    }

    /**
     * Get the user that owns the setting.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
