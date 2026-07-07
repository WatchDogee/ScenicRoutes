<?php

namespace Database\Seeders;

use App\Models\Collection;
use App\Models\SavedRoad;
use App\Models\User;
use Illuminate\Database\Seeder;

class PlayStoreMockCleanupSeeder extends Seeder
{
    private const MARKER = 'seed_playstore_';

    public function run(): void
    {
        $users = User::query()
            ->where('google_id', 'like', self::MARKER . '%')
            ->get();

        Collection::whereRaw('name ilike ?', ['%zzz%'])->orWhereRaw('name ilike ?', ['%demo%'])->delete();
        SavedRoad::whereRaw('road_name ilike ?', ['%zzz%'])->orWhereRaw('road_name ilike ?', ['%demo%'])->delete();
        User::whereRaw('name ilike ?', ['%zzz%'])->orWhereRaw('name ilike ?', ['%demo%'])->delete();

        if ($users->isEmpty()) {
            $this->command->info('No Play Store mock users found. Cleanup skipped.');
            return;
        }

        $userIds = $users->pluck('id')->all();

        Collection::whereIn('user_id', $userIds)->delete();
        SavedRoad::whereIn('user_id', $userIds)->delete();

        foreach ($users as $user) {
            $user->delete();
        }
    }
}
