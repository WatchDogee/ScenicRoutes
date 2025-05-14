<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateUser extends Command
{
protected $signature = 'create:user {name} {email} {password} {--username=}';
protected $description = 'Create a new user';
public function handle()
    {
        $name = $this->argument('name');
        $email = $this->argument('email');
        $password = $this->argument('password');
        $username = $this->option('username') ?: null;

        try {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'username' => $username,
            ]);

            $this->info("User created successfully with ID: {$user->id}");
        } catch (\Exception $e) {
            $this->error("Failed to create user: {$e->getMessage()}");
        }
    }
}
