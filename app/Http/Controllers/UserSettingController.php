<?php

namespace App\Http\Controllers;

use App\Models\UserSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UserSettingController extends Controller
{
    /**
     * Get all settings for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $settings = $user->settings()->get()->pluck('value', 'key')->toArray();

            // Add default values for settings that don't exist yet
            $defaultSettings = $this->getDefaultSettings();
            foreach ($defaultSettings as $key => $value) {
                if (!isset($settings[$key])) {
                    $settings[$key] = $value;
                }
            }

            return response()->json([
                'settings' => $settings
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching user settings: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a specific setting for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'key' => 'required|string',
                'value' => 'required',
            ]);

            $user = $request->user();
            $setting = $user->setSetting($validated['key'], $validated['value']);

            return response()->json([
                'message' => 'Setting updated successfully',
                'setting' => [
                    'key' => $setting->key,
                    'value' => $setting->value
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating user setting: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update setting',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update multiple settings at once for the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateMultiple(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'settings' => 'required|array',
                'settings.*' => 'required',
            ]);

            $user = $request->user();
            $updatedSettings = [];

            foreach ($validated['settings'] as $key => $value) {
                $setting = $user->setSetting($key, $value);
                $updatedSettings[$key] = $value;
            }

            return response()->json([
                'message' => 'Settings updated successfully',
                'settings' => $updatedSettings
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating multiple user settings: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get default settings for a new user.
     *
     * @return array
     */
    private function getDefaultSettings(): array
    {
        return [
            'measurement_units' => 'metric', // metric or imperial
            'default_map_view' => 'terrain', // terrain, satellite, or standard
            'show_community_by_default' => false,
            'default_search_radius' => 10, // in km
            'default_search_type' => 'town', // town, region, or country
            'theme' => 'light', // light or dark
            'notifications_enabled' => true,
            'default_navigation_app' => 'google_maps', // google_maps, waze, apple_maps, etc.
        ];
    }
}
