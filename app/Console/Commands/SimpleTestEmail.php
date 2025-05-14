<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SimpleTestEmail extends Command
{
protected $signature = 'email:simple-test {email? : The email address to send the test email to}';
protected $description = 'Send a simple test email using the raw method';
public function handle()
    {
        $email = $this->argument('email') ?: $this->ask('Enter the email address to send the test email to:');

        $this->info("Sending test email to {$email}...");

        try {
            
            Mail::raw('This is a test email from your Laravel application.', function ($message) use ($email) {
                $message->to($email)
                    ->subject('Test Email from Laravel');
            });

            $this->info('Test email sent successfully! Check your Mailtrap inbox.');
        } catch (\Exception $e) {
            $this->error("Failed to send test email: {$e->getMessage()}");
            
            
            $this->line("\nDetailed error information:");
            $this->line("Error code: " . $e->getCode());
            $this->line("Error file: " . $e->getFile() . " (line " . $e->getLine() . ")");
            $this->line("Error trace:");
            $this->line($e->getTraceAsString());
        }

        return Command::SUCCESS;
    }
}
