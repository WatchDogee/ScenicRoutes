<?php

namespace App\Http\Controllers;

use App\Models\RouteShare;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class RouteShareController extends Controller
{
    /**
     * Create a shareable link for a route
     * POST /api/routes/share
     */
    public function createShare(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'route' => 'required|array',
            'route.coordinates' => 'required|array|min:2',
            'route_name' => 'nullable|string|max:255',
            'route_description' => 'nullable|string|max:1000',
            'expires_in_days' => 'nullable|integer|min:1|max:365'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 400);
        }

        try {
            $user = $request->user(); // Optional - can be null for anonymous

            $share = RouteShare::create([
                'user_id' => $user?->id,
                'share_token' => RouteShare::generateToken(),
                'route_data' => $request->input('route'),
                'route_name' => $request->input('route_name', 'Shared Route'),
                'route_description' => $request->input('route_description'),
                'is_public' => true,
                'expires_at' => $request->input('expires_in_days') 
                    ? now()->addDays($request->input('expires_in_days')) 
                    : null
            ]);

            return response()->json([
                'success' => true,
                'share_token' => $share->share_token,
                'share_url' => route('route.shared', ['token' => $share->share_token]),
                'expires_at' => $share->expires_at?->toIso8601String()
            ]);
        } catch (\Exception $e) {
            Log::error('Error creating route share', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()?->id
            ]);

            return response()->json([
                'error' => 'Failed to create shareable link',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * View a shared route (public, no auth required)
     * GET /routes/shared/{token}
     */
    public function viewShared($token)
    {
        try {
            $share = RouteShare::where('share_token', $token)
                ->where('is_public', true)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                })
                ->firstOrFail();

            // Increment view count
            $share->incrementViews();

            return Inertia::render('SharedRoute', [
                'share' => [
                    'token' => $share->share_token,
                    'route_name' => $share->route_name,
                    'route_description' => $share->route_description,
                    'view_count' => $share->view_count,
                    'created_at' => $share->created_at->toIso8601String()
                ],
                'route' => $share->route_data,
                'route_name' => $share->route_name,
                'route_description' => $share->route_description
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return Inertia::render('SharedRoute', [
                'error' => 'Route not found',
                'message' => 'This shared route does not exist or has expired.'
            ]);
        } catch (\Exception $e) {
            Log::error('Error viewing shared route', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);

            return Inertia::render('SharedRoute', [
                'error' => 'Error loading route',
                'message' => 'An error occurred while loading this shared route.'
            ]);
        }
    }

    /**
     * Get sharing statistics (owner only)
     * GET /api/routes/shared/{token}/stats
     */
    public function getStats($token)
    {
        try {
            $share = RouteShare::where('share_token', $token)->firstOrFail();
            
            // Check if user owns this share
            if ($share->user_id !== auth()->id()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to view these statistics.'
                ], 403);
            }

            return response()->json([
                'view_count' => $share->view_count,
                'share_count' => $share->share_count,
                'created_at' => $share->created_at->toIso8601String(),
                'expires_at' => $share->expires_at?->toIso8601String()
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Share not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error getting share stats', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to get statistics',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Record that a share action happened (copy, social share, etc.)
     * POST /api/routes/shared/{token}/share
     */
    public function recordShare(Request $request, $token)
    {
        $request->validate([
            'source' => 'nullable|string|max:50',
        ]);

        try {
            $share = RouteShare::where('share_token', $token)->firstOrFail();
            $share->incrementShares();

            Log::info('Route share interaction recorded', [
                'token' => $token,
                'source' => $request->input('source'),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'share_count' => $share->share_count,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Share not found',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error recording share interaction', [
                'token' => $token,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to record share activity',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a shared route (owner only)
     * DELETE /api/routes/shared/{token}
     */
    public function deleteShare($token)
    {
        try {
            $share = RouteShare::where('share_token', $token)->firstOrFail();
            
            // Check if user owns this share
            if ($share->user_id !== auth()->id()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to delete this share.'
                ], 403);
            }

            $share->delete();

            return response()->json([
                'success' => true,
                'message' => 'Shared route deleted successfully'
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Share not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error deleting share', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to delete share',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate QR code for shared route
     * GET /routes/shared/{token}/qr
     */
    public function generateQR($token)
    {
        try {
            $share = RouteShare::where('share_token', $token)
                ->where('is_public', true)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                })
                ->firstOrFail();

            $shareUrl = route('route.shared', ['token' => $share->share_token]);
            
            // Return QR code data URL (frontend will generate QR code)
            return response()->json([
                'url' => $shareUrl,
                'token' => $share->share_token
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate QR code',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
