<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SimpleTestEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:simple-test {email? : The email address to send the test email to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a simple test email using the raw method';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email') ?: $this->ask('Enter the email address to send the test email to:');

        $this->info("Sending test email to {$email}...");

        try {
            // Using the simplest possible email sending method
            Mail::raw('This is a test email from your Laravel application.', function ($message) use ($email) {
                $message->to($email)
                    ->subject('Test Email from Laravel');
            });

            $this->info('Test email sent successfully! Check your Mailtrap inbox.');
        } catch (\Exception $e) {
            $this->error("Failed to send test email: {$e->getMessage()}");
            
            // Show more detailed error information
            $this->line("\nDetailed error information:");
            $this->line("Error code: " . $e->getCode());
            $this->line("Error file: " . $e->getFile() . " (line " . $e->getLine() . ")");
            $this->line("Error trace:");
            $this->line($e->getTraceAsString());
        }

        return Command::SUCCESS;
    }
}
