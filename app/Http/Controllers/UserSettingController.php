<?php

namespace App\Http\Controllers;

use App\Models\UserSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UserSettingController extends Controller
{
public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $settings = $user->settings()->get();

            
            $settingsArray = [];
            foreach ($settings as $setting) {
                $value = $setting->value;

                
                if ($value === 'true') {
                    $value = true;
                } elseif ($value === 'false') {
                    $value = false;
                }

                
                if (is_numeric($value) && !is_bool($value)) {
                    $value = $value + 0; 
                }

                $settingsArray[$setting->key] = $value;
            }

            
            $defaultSettings = $this->getDefaultSettings();
            foreach ($defaultSettings as $key => $value) {
                if (!isset($settingsArray[$key])) {
                    $settingsArray[$key] = $value;
                }
            }

            
            Log::info('Returning user settings', [
                'user_id' => $user->id,
                'settings' => $settingsArray
            ]);

            return response()->json([
                'settings' => $settingsArray
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching user settings: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
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
public function updateMultiple(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'settings' => 'required|array',
                'settings.*' => 'required',
            ]);

            $user = $request->user();
            $updatedSettings = [];

            
            Log::info('Updating multiple settings', [
                'user_id' => $user->id,
                'settings' => $validated['settings']
            ]);

            foreach ($validated['settings'] as $key => $value) {
                
                if ($value === 'true' || $value === true) {
                    $value = true;
                } elseif ($value === 'false' || $value === false) {
                    $value = false;
                }

                $setting = $user->setSetting($key, $value);

                
                $savedValue = $setting->value;
                if ($savedValue === 'true') {
                    $savedValue = true;
                } elseif ($savedValue === 'false') {
                    $savedValue = false;
                }

                $updatedSettings[$key] = $savedValue;
            }

            
            Log::info('Settings updated', [
                'user_id' => $user->id,
                'updated_settings' => $updatedSettings
            ]);

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
private function getDefaultSettings(): array
    {
        return [
            'measurement_units' => 'metric', 
            'default_map_view' => 'standard', 
            'show_community_by_default' => false,
            'default_search_radius' => 10, 
            'default_search_type' => 'town', 
            'theme' => 'light', 
            'notifications_enabled' => true,
            'default_navigation_app' => 'google_maps', 
        ];
    }
}
