<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MakeProUserRoadsPublic extends Command
{
    protected $signature = 'roads:make-public {user-id=3}';
    protected $description = 'Make all roads for a user public';

    public function handle()
    {
        $userId = $this->argument('user-id');
        $updated = DB::table('saved_roads')->where('user_id', $userId)->update(['is_public' => 1]);
        $this->info("Updated $updated roads for user $userId to public");
        
        $count = DB::table('saved_roads')->where('user_id', $userId)->where('is_public', 1)->count();
        $this->info("Total public roads for user $userId: $count");
    }
}
