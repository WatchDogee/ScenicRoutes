<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserSetting extends Model
{
    use HasFactory;
protected $fillable = [
        'user_id',
        'key',
        'value',
    ];
protected $casts = [
        'value' => 'string',
    ];
public function getValueAttribute($value)
    {
        
        if ($value === 'true') {
            return true;
        } elseif ($value === 'false') {
            return false;
        }

        
        if (is_numeric($value)) {
            return $value + 0; 
        }

        return $value;
    }
public function setValueAttribute($value)
    {
        
        if (is_bool($value)) {
            $this->attributes['value'] = $value ? 'true' : 'false';
        } else {
            $this->attributes['value'] = (string) $value;
        }
    }
public function user()
    {
        return $this->belongsTo(User::class);
    }
}
