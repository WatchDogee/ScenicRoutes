<?php

namespace App\Http\Controllers;

use App\Models\UserSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\QueryException;

class UserSettingController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Default settings (return these if table doesn't exist or no settings found)
            $defaultSettings = [
                'measurement_units' => 'metric',
                'default_map_view' => 'standard',
                'default_search_radius' => 10,
                'default_search_type' => 'town',
                'theme' => 'light',
                'default_navigation_app' => 'google_maps',
                'show_community_by_default' => false,
                'notifications_enabled' => true,
            ];

            try {
                $settings = UserSetting::where('user_id', $user->id)->get();
                $formattedSettings = [];

                foreach ($settings as $setting) {
                    $value = $setting->value;

                    if ($value === 'true' || $value === 'false') {
                        $value = $value === 'true';
                    } else if (is_numeric($value)) {
                        $value = $value + 0;
                    }

                    $formattedSettings[$setting->key] = $value;
                }

                // Merge with defaults
                foreach ($defaultSettings as $key => $defaultValue) {
                    if (!isset($formattedSettings[$key])) {
                        $formattedSettings[$key] = $defaultValue;
                    }
                }

                return response()->json(['settings' => $formattedSettings]);
            } catch (\Illuminate\Database\QueryException $e) {
                // Table doesn't exist - return defaults
                \Log::warning('UserSettingController::index - user_settings table not found, returning defaults', [
                    'error' => $e->getMessage()
                ]);
                return response()->json(['settings' => $defaultSettings]);
            }
        } catch (\Exception $e) {
            \Log::error('UserSettingController::index error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch settings', 'message' => $e->getMessage()], 500);
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
            if (!$user) {
                Log::error('UserSettingController::update - No authenticated user');
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            Log::info('UserSettingController::update - Attempting to update setting', [
                'user_id' => $user->id,
                'key' => $validated['key'],
                'value' => $validated['value'],
                'value_type' => gettype($validated['value'])
            ]);

            $setting = $user->setSetting($validated['key'], $validated['value']);

            // Refresh the model to get the actual saved value
            $setting->refresh();

            $savedValue = $setting->value;
            if ($savedValue === 'true' || $savedValue === 'false') {
                $savedValue = $savedValue === 'true';
            } else if (is_numeric($savedValue)) {
                $savedValue = $savedValue + 0;
            }

            Log::info('UserSettingController::update - Setting updated successfully', [
                'key' => $setting->key,
                'saved_value' => $savedValue
            ]);

            return response()->json([
                'message' => 'Setting updated successfully',
                'setting' => [
                    'key' => $setting->key,
                    'value' => $savedValue
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('UserSettingController::update - Validation error', [
                'errors' => $e->errors()
            ]);
            return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            // Check if the error is about the table not existing
            if (str_contains($e->getMessage(), 'does not exist') || str_contains($e->getMessage(), 'relation')) {
                Log::error('UserSettingController::update - user_settings table does not exist', [
                    'error' => $e->getMessage(),
                    'hint' => 'Please run: php artisan migrate'
                ]);
                return response()->json([
                    'error' => 'Database table not found',
                    'message' => 'The user_settings table does not exist. Please run the migration: php artisan migrate'
                ], 500);
            }
            
            Log::error('UserSettingController::update - Database error', [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'sql' => $e->getSql() ?? 'N/A',
                'bindings' => $e->getBindings() ?? []
            ]);
            return response()->json(['error' => 'Failed to update setting', 'message' => $e->getMessage()], 500);
        } catch (\Exception $e) {
            Log::error('UserSettingController::update - Exception', [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to update setting', 'message' => $e->getMessage()], 500);
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

            foreach ($validated['settings'] as $key => $value) {
                if ($value === true || $value === false) {
                    $value = $value ? 'true' : 'false';
                }

                $setting = $user->setSetting($key, $value);

                $savedValue = $setting->value;
                if ($savedValue === 'true' || $savedValue === 'false') {
                    $savedValue = $savedValue === 'true';
                } else if (is_numeric($savedValue)) {
                    $savedValue = $savedValue + 0;
                }

                $updatedSettings[$key] = $savedValue;
            }

            return response()->json([
                'message' => 'Settings updated successfully',
                'settings' => $updatedSettings
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update settings'], 500);
        }
    }
}
