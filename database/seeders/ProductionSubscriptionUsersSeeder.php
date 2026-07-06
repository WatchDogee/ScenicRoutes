<?php

namespace Database\Seeders;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProductionSubscriptionUsersSeeder extends Seeder
{
    /**
     * Create or update seed users for each subscription tier without truncation.
     */
    public function run(): void
    {
        $password = env('SEED_USERS_PASSWORD');
        $freeEmail = env('SEED_FREE_EMAIL');
        $premiumEmail = env('SEED_PREMIUM_EMAIL');
        $proEmail = env('SEED_PRO_EMAIL');

        if (!$password || !$freeEmail || !$premiumEmail || !$proEmail) {
            $this->command->error('Missing SEED_USERS_PASSWORD or SEED_*_EMAIL env vars.');
            $this->command->error('Set SEED_FREE_EMAIL, SEED_PREMIUM_EMAIL, SEED_PRO_EMAIL, SEED_USERS_PASSWORD.');
            return;
        }

        $passwordHash = Hash::make($password);

        $free = $this->firstOrCreateUser(
            $freeEmail,
            'Seed Free User',
            $passwordHash,
            'seed_free'
        );

        $premium = $this->firstOrCreateUser(
            $premiumEmail,
            'Seed Premium User',
            $passwordHash,
            'seed_premium'
        );

        Subscription::updateOrCreate(
            ['user_id' => $premium->id, 'plan' => 'premium'],
            [
                'stripe_subscription_id' => 'seed_premium_sub',
                'status' => 'active',
                'starts_at' => now()->subMonth(),
                'ends_at' => now()->addMonth(),
            ]
        );

        $pro = $this->firstOrCreateUser(
            $proEmail,
            'Seed Pro User',
            $passwordHash,
            'seed_pro'
        );

        Subscription::updateOrCreate(
            ['user_id' => $pro->id, 'plan' => 'pro'],
            [
                'stripe_subscription_id' => 'seed_pro_sub',
                'status' => 'active',
                'starts_at' => now()->subMonth(),
                'ends_at' => now()->addMonth(),
            ]
        );

        $this->command->info('Seed users created/updated: free, premium, pro.');
    }

    private function firstOrCreateUser(string $email, string $name, string $passwordHash, string $fallbackUsername): User
    {
        return User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'username' => $this->normalizeUsername($email, $fallbackUsername),
                'password' => $passwordHash,
                'email_verified_at' => now(),
            ]
        );
    }

    private function normalizeUsername(string $email, string $fallback): string
    {
        $localPart = Str::before($email, '@');
        $slug = Str::slug($localPart);

        return $slug !== '' ? $slug : $fallback;
    }
}
