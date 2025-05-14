<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ReviewPhoto extends Model
{
    use HasFactory;

    protected $fillable = [
        'review_id',
        'user_id',
        'photo_path',
        'caption',
    ];

    protected $appends = [
        'photo_url',
    ];
public function review()
    {
        return $this->belongsTo(Review::class);
    }
public function user()
    {
        return $this->belongsTo(User::class);
    }
public function getPhotoUrlAttribute()
    {
        if (!$this->photo_path) {
            return null;
        }

        
        $disk = config('filesystems.default');

        try {
            
            if ($disk === 'public') {
                
                $appUrl = config('app.url');
                if (empty($appUrl) || $appUrl === 'http://localhost') {
                    $appUrl = 'http://localhost:8000';
                }

                
                $url = $appUrl . '/storage/' . $this->photo_path;
                \Log::info('Generated review photo URL for public disk', ['url' => $url]);
                return $url;
            }

            
            if ($disk === 's3' && config('filesystems.disks.s3.key')) {
                $url = Storage::disk('s3')->url($this->photo_path);
                return $url;
            }

            
            return asset('storage/' . $this->photo_path);
        } catch (\Exception $e) {
            
            \Log::error('Error generating review photo URL', [
                'error' => $e->getMessage(),
                'path' => $this->photo_path
            ]);

            
            return asset('storage/' . $this->photo_path);
        }
    }
}
