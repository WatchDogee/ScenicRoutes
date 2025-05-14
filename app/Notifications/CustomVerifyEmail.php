<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;

class CustomVerifyEmail extends VerifyEmail
{
protected function verificationUrl($notifiable)
    {
        
        return url("/direct-verify/{$notifiable->getKey()}");
    }
}
