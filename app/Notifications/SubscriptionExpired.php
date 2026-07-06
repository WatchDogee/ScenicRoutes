<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpired extends Notification
{
    use Queueable;

    protected $subscription;

    /**
     * Create a new notification instance.
     */
    public function __construct($subscription)
    {
        $this->subscription = $subscription;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $plan = ucfirst($this->subscription->plan);
        $expirationDate = $this->subscription->ends_at->format('F j, Y');

        return (new MailMessage)
            ->subject("Your {$plan} subscription has expired")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your {$plan} subscription expired on {$expirationDate}.")
            ->line('You can still access basic features, but premium features are no longer available.')
            ->action('Renew Subscription', url('/subscription'))
            ->line('Thank you for using ScenicRoutes!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'subscription_id' => $this->subscription->id,
            'plan' => $this->subscription->plan,
            'expired_at' => $this->subscription->ends_at->toIso8601String(),
        ];
    }
}

