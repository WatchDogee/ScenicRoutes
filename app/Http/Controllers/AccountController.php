<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AccountController extends Controller
{
    /**
     * Delete the authenticated user's account and associated data.
     * Complies with platform policies by removing user data and cancelling subscriptions.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->deletion_requested_at) {
            return response()->json([
                'message' => 'Account deletion is already scheduled.',
                'scheduled_at' => $user->deletion_scheduled_at,
            ]);
        }

        $login = trim((string) $request->input('login', ''));
        if ($login !== '' && !($login === $user->email || $login === $user->username)) {
            return response()->json([
                'error' => 'invalid_login',
                'message' => 'Email or username does not match the signed-in account.',
            ], 422);
        }

        // Optional password confirmation: if user has a password set, require correct password when provided
        $password = $request->input('password');
        if (!empty($user->password)) {
            if (empty($password) || !Hash::check($password, $user->password)) {
                return response()->json([
                    'error' => 'invalid_password',
                    'message' => 'Password confirmation required to delete account.',
                ], 422);
            }
        }

        try {
            $graceDays = (int) env('ACCOUNT_DELETION_GRACE_DAYS', 30);
            $scheduledAt = now()->addDays($graceDays);

            // Cancel subscriptions immediately
            try {
                $paymentService = app(\App\Services\PaymentService::class);
                $paymentService->cancelSubscription($user, false);
            } catch (\Throwable $e) {
                Log::warning('Account deletion: subscription cancel failed', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }

            $user->tokens()->delete();
            $user->deletion_requested_at = now();
            $user->deletion_scheduled_at = $scheduledAt;
            $user->save();

            return response()->json([
                'message' => 'Account deletion scheduled.',
                'scheduled_at' => $scheduledAt,
                'grace_days' => $graceDays,
                'deleted' => false,
            ]);
        } catch (\Throwable $e) {
            Log::error('Account deletion failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'error' => 'deletion_failed',
                'message' => 'Failed to delete account. Please try again later.',
            ], 500);
        }
    }
}
