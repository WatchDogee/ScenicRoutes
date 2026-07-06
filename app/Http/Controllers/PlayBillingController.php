<?php

namespace App\Http\Controllers;

use App\Models\Entitlement;
use App\Models\User;
use App\Services\EntitlementService;
use App\Services\PlayBillingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * API controller for Google Play Billing verification and acknowledgment
 */
class PlayBillingController extends Controller
{
    protected PlayBillingService $playService;
    protected EntitlementService $entitlementService;

    public function __construct(PlayBillingService $playService, EntitlementService $entitlementService)
    {
        $this->playService = $playService;
        $this->entitlementService = $entitlementService;
    }

    /**
     * POST /api/billing/play/verify
     * 
     * Verify and acknowledge a Play purchase
     * Body: {
     *   "product_id": "premium_monthly",
     *   "purchase_token": "token_from_play",
     *   "device_id": "optional_device_identifier"
     * }
     */
    public function verify(Request $request)
    {
        $request->validate([
            'product_id' => 'required|string',
            'purchase_token' => 'required|string',
            'device_id' => 'nullable|string',
        ]);

        $user = $request->user();

        // Verify with Play and create/update entitlement
        $result = $this->playService->verifyAndGrant(
            $user,
            $request->product_id,
            $request->purchase_token
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], 400);
        }

        // Optionally bind to device
        if ($request->device_id) {
            $result['entitlement']->update(['device_id' => $request->device_id]);
        }

        Log::info('Play purchase verified via API', [
            'user_id' => $user->id,
            'product_id' => $request->product_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Purchase verified and acknowledged',
            'entitlement' => [
                'key' => $result['entitlement']->entitlement_key,
                'status' => $result['entitlement']->status,
                'expires_at' => $result['entitlement']->expires_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * GET /api/billing/entitlements
     * 
     * Get current entitlement status for the user
     */
    public function getEntitlements(Request $request)
    {
        $user = $request->user();
        $status = $this->entitlementService->getEntitlementStatus($user);

        return response()->json($status);
    }

    /**
     * POST /api/billing/restore
     * 
     * Restore purchases from Play (called on app startup)
     * The app provides tokens from queryPurchasesAsync
     * Body: {
     *   "purchases": [
     *     {
     *       "product_id": "premium_monthly",
     *       "purchase_token": "token",
     *       "type": "subscription|product"
     *     }
     *   ]
     * }
     */
    public function restore(Request $request)
    {
        $request->validate([
            'purchases' => 'required|array',
            'purchases.*.product_id' => 'required|string',
            'purchases.*.purchase_token' => 'required|string',
        ]);

        $user = $request->user();
        $restored = 0;

        foreach ($request->purchases as $purchase) {
            $result = $this->playService->verifyAndGrant(
                $user,
                $purchase['product_id'],
                $purchase['purchase_token']
            );

            if ($result['success']) {
                $restored++;
            } else {
                Log::warning('Failed to restore purchase', [
                    'user_id' => $user->id,
                    'product_id' => $purchase['product_id'],
                    'reason' => $result['message'],
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Restored $restored purchase(es)",
            'entitlements' => $this->entitlementService->getActiveEntitlements($user),
        ]);
    }

    /**
     * GET /api/billing/entitlements/{entitlementKey}
     * 
     * Check if user has a specific entitlement
     */
    public function hasEntitlement(Request $request, string $key)
    {
        $user = $request->user();
        $hasIt = $this->entitlementService->hasEntitlement($user, $key);

        return response()->json([
            'entitlement_key' => $key,
            'has_entitlement' => $hasIt,
        ]);
    }
}
