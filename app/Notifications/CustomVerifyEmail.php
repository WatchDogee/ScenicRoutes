<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;

class CustomVerifyEmail extends VerifyEmail
{
    /**
     * Get the verification URL for the given notifiable.
     *
     * @param  mixed  $notifiable
     * @return string
     */
    protected function verificationUrl($notifiable)
    {
        // Generate a direct verification URL with just the user ID
        return url("/direct-verify/{$notifiable->getKey()}");
    }
}
