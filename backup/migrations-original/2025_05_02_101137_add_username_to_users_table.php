<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('name');
        });

        // Generate usernames for existing users based on their email
        if (Schema::hasTable('users')) {
            $users = DB::table('users')->get();
            foreach ($users as $user) {
                // Generate a username from the email (part before @)
                $emailParts = explode('@', $user->email);
                $baseUsername = $emailParts[0];

                // Check if username already exists and append a number if needed
                $username = $baseUsername;
                $counter = 1;

                // Use a different approach to check for duplicates
                $existingUsernames = DB::table('users')
                    ->where('id', '!=', $user->id)
                    ->pluck('username')
                    ->toArray();

                while (in_array($username, $existingUsernames)) {
                    $username = $baseUsername . $counter;
                    $counter++;
                }

                // Update the user with the new username
                DB::table('users')->where('id', $user->id)->update(['username' => $username]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }
};
