<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Subscription;
use Illuminate\Support\Facades\Hash;

class TestSubscriptionUsersSeeder extends Seeder
{
    /**
     * Create deterministic test users for each subscription tier.
     */
    public function run(): void
    {
        // Wipe existing users / subscriptions (safe for local test env only)
        Subscription::truncate();
        User::truncate();

        $password = Hash::make('Password123!');

        // Free user (no subscription)
        $free = User::create([
            'name' => 'Test Free User',
            'username' => 'test_free',
            'email' => 'test_free@example.com',
            'password' => $password,
            'email_verified_at' => now(),
        ]);

        // Premium user
        $premium = User::create([
            'name' => 'Test Premium User',
            'username' => 'test_premium',
            'email' => 'test_premium@example.com',
            'password' => $password,
            'email_verified_at' => now(),
        ]);

        Subscription::create([
            'user_id' => $premium->id,
            'plan' => 'premium',
            'stripe_subscription_id' => 'test_premium_sub',
            'status' => 'active',
            'starts_at' => now()->subMonth(),
            'ends_at' => now()->addMonth(),
        ]);

        // Pro user
        $pro = User::create([
            'name' => 'Test Pro User',
            'username' => 'test_pro',
            'email' => 'test_pro@example.com',
            'password' => $password,
            'email_verified_at' => now(),
        ]);

        Subscription::create([
            'user_id' => $pro->id,
            'plan' => 'pro',
            'stripe_subscription_id' => 'test_pro_sub',
            'status' => 'active',
            'starts_at' => now()->subMonth(),
            'ends_at' => now()->addMonth(),
        ]);
    }
}


