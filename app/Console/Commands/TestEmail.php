<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Mail\Message;

class TestEmail extends Command
{
protected $signature = 'email:test {email? : The email address to send the test email to}';
protected $description = 'Send a test email to verify email configuration';
public function handle()
    {
        $email = $this->argument('email') ?: $this->ask('Enter the email address to send the test email to:');

        $this->info("Sending test email to {$email}...");

        try {
            Mail::raw('This is a test email from your Laravel application to verify that your email configuration is working correctly.', function (Message $message) use ($email) {
                $message->to($email)
                    ->subject('Test Email from Laravel');
            });

            $this->info('Test email sent successfully! Check your Mailtrap inbox.');
        } catch (\Exception $e) {
            $this->error("Failed to send test email: {$e->getMessage()}");
            $this->line("Stack trace:");
            $this->line($e->getTraceAsString());
        }

        return Command::SUCCESS;
    }
}
