<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Password;

class TestPasswordReset extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:test-password-reset {email? : The email address to send the password reset email to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a password reset email to a user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email') ?: $this->ask('Enter the email address to send the password reset email to:');

        $this->info("Sending password reset email to {$email}...");

        try {
            $status = Password::sendResetLink(['email' => $email]);

            if ($status === Password::RESET_LINK_SENT) {
                $this->info('Password reset email sent successfully! Check your Mailtrap inbox.');
            } else {
                $this->error("Failed to send password reset email: {$status}");
            }
        } catch (\Exception $e) {
            $this->error("Failed to send password reset email: {$e->getMessage()}");
            
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
