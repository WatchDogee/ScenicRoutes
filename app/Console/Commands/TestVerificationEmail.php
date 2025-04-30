<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestVerificationEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:test-verification {email? : The email address to send the verification email to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a test user and send a verification email';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email') ?: $this->ask('Enter the email address for the test user:');

        // Check if user already exists
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            if (!$this->confirm("A user with email {$email} already exists. Do you want to resend the verification email?")) {
                $this->info('Operation cancelled.');
                return Command::SUCCESS;
            }

            $this->info("Resending verification email to {$email}...");
            $existingUser->sendEmailVerificationNotification();
            $this->info('Verification email sent successfully! Check your Mailtrap inbox.');
            return Command::SUCCESS;
        }

        $this->info("Creating a test user with email {$email}...");

        try {
            // Create a test user
            $user = User::create([
                'name' => 'Test User',
                'email' => $email,
                'password' => Hash::make('password'),
            ]);

            $this->info("Test user created successfully.");
            $this->info("Sending verification email...");

            // Trigger the email verification notification
            event(new Registered($user));

            $this->info('Verification email sent successfully! Check your Mailtrap inbox.');
        } catch (\Exception $e) {
            $this->error("Failed to create test user or send verification email: {$e->getMessage()}");
            
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
