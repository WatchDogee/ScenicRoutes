<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DeleteUser extends Command
{
protected $signature = 'user:delete {email? : The email of the user to delete} {--force : Force deletion without confirmation}';
protected $description = 'Delete a user and all associated data';
public function handle()
    {
        if ($this->argument('email')) {
            
            $this->deleteUser($this->argument('email'));
        } else {
            
            $this->listAndDeleteUsers();
        }

        return Command::SUCCESS;
    }
protected function deleteUser(string $email): void
    {
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found.");
            return;
        }

        if (!$this->option('force')) {
            if (!$this->confirm("Are you sure you want to delete user {$user->name} ({$user->email}) and all associated data?")) {
                $this->info('Operation cancelled.');
                return;
            }
        }

        DB::beginTransaction();
        try {
            
            if (method_exists($user, 'savedRoads')) {
                $savedRoadsCount = $user->savedRoads()->count();
                $user->savedRoads()->delete();
                $this->info("Deleted {$savedRoadsCount} saved roads.");
            }

            
            if (method_exists($user, 'ratings')) {
                $ratingsCount = $user->ratings()->count();
                $user->ratings()->delete();
                $this->info("Deleted {$ratingsCount} ratings.");
            }

            
            if (method_exists($user, 'comments')) {
                $commentsCount = $user->comments()->count();
                $user->comments()->delete();
                $this->info("Deleted {$commentsCount} comments.");
            }

            
            $tokensCount = $user->tokens()->count();
            $user->tokens()->delete();
            $this->info("Deleted {$tokensCount} tokens.");

            
            $user->delete();
            $this->info("User {$email} has been deleted successfully.");

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("An error occurred while deleting the user: {$e->getMessage()}");
        }
    }
protected function listAndDeleteUsers(): void
    {
        $users = User::all(['id', 'name', 'email', 'email_verified_at', 'created_at']);

        if ($users->isEmpty()) {
            $this->info('No users found.');
            return;
        }

        $this->table(
            ['ID', 'Name', 'Email', 'Verified', 'Created At'],
            $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'verified' => $user->email_verified_at ? 'Yes' : 'No',
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                ];
            })
        );

        $emailsToDelete = $this->ask('Enter the emails of the users you want to delete (comma-separated), or "all" to delete all users');

        if (strtolower($emailsToDelete) === 'all') {
            if ($this->confirm('Are you sure you want to delete ALL users? This action cannot be undone.')) {
                foreach ($users as $user) {
                    $this->deleteUser($user->email);
                }
            } else {
                $this->info('Operation cancelled.');
            }
        } else {
            $emails = array_map('trim', explode(',', $emailsToDelete));
            foreach ($emails as $email) {
                if (!empty($email)) {
                    $this->deleteUser($email);
                }
            }
        }
    }
}
