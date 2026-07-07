<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpiring extends Notification
{
    use Queueable;

    protected $subscription;
    protected $daysRemaining;

    /**
     * Create a new notification instance.
     */
    public function __construct($subscription, $daysRemaining)
    {
        $this->subscription = $subscription;
        $this->daysRemaining = $daysRemaining;
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
        
        if ($this->daysRemaining === 0) {
            // Expiring today
            $subject = "Your {$plan} subscription expires today";
            $message = "Your {$plan} subscription expires today ({$expirationDate}). Renew now to continue enjoying all premium features!";
        } elseif ($this->daysRemaining === 1) {
            // Expiring tomorrow
            $subject = "Your {$plan} subscription expires tomorrow";
            $message = "Your {$plan} subscription expires tomorrow ({$expirationDate}). Renew now to avoid losing access to premium features!";
        } else {
            // Expiring in X days
            $subject = "Your {$plan} subscription expires in {$this->daysRemaining} days";
            $message = "Your {$plan} subscription will expire in {$this->daysRemaining} days ({$expirationDate}). Renew now to continue enjoying all premium features!";
        }

        return (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->name},")
            ->line($message)
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
            'days_remaining' => $this->daysRemaining,
            'expires_at' => $this->subscription->ends_at->toIso8601String(),
        ];
    }
}

