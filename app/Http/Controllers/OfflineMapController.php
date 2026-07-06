<?php

namespace App\Http\Controllers;

use App\Services\OfflineMapService;
use App\Models\SavedRoad;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class OfflineMapController extends Controller
{
    protected $offlineMapService;

    public function __construct(OfflineMapService $offlineMapService)
    {
        $this->offlineMapService = $offlineMapService;

        $this->middleware(function ($request, $next) {
            if (!config('features.offline_maps', true)) {
                return response()->json([
                    'error' => 'Offline maps are disabled',
                    'reason' => 'feature_disabled',
                ], 403);
            }

            return $next($request);
        });
    }

    /**
     * Get all available regions for download
     */
    public function getRegions(): JsonResponse
    {
        try {
            $regions = $this->offlineMapService->getAvailableRegions();
            return response()->json($regions ?? []);
        } catch (\Exception $e) {
            Log::error('Error fetching offline map regions', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([], 200); // Return empty array instead of error
        }
    }

    /**
     * Get user's downloaded regions
     */
    public function getUserDownloads(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $downloads = $this->offlineMapService->getUserDownloads($user);
            return response()->json($downloads);
        } catch (\Exception $e) {
            Log::error('Error fetching user downloads', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch downloads'], 500);
        }
    }

    /**
     * Get user's saved regions (planned downloads)
     */
    public function getUserSavedRegions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([], 200);
            }
            $saved = $this->offlineMapService->getUserSavedRegions($user);
            return response()->json($saved ?? []);
        } catch (\Exception $e) {
            Log::error('Error fetching saved regions', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([], 200); // Return empty array instead of error
        }
    }

    /**
     * Save a region for later download (no tiles downloaded on web)
     */
    public function saveRegion(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $request->validate([
                'region_id' => 'required|string',
                'region_name' => 'required|string',
                'bounds' => 'required|array',
                'bounds.south' => 'required|numeric',
                'bounds.west' => 'required|numeric',
                'bounds.north' => 'required|numeric',
                'bounds.east' => 'required|numeric',
                'zoom_levels' => 'nullable|array',
                'estimated_size_mb' => 'nullable|integer',
            ]);

            $canDownload = $this->offlineMapService->canDownloadMore($user, 1);
            if (!$canDownload['allowed']) {
                return response()->json([
                    'error' => $canDownload['message'] ?? 'Limit reached',
                    'reason' => $canDownload['reason'] ?? 'limit',
                    'limits' => $canDownload,
                ], 403);
            }

            $saved = $this->offlineMapService->saveRegionForLater($user, [
                'region_id' => $request->region_id,
                'region_name' => $request->region_name,
                'bounds' => $request->bounds,
                'zoom_levels' => $request->zoom_levels ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                'estimated_size_mb' => $request->estimated_size_mb ?? 0,
            ]);

            return response()->json([
                'message' => 'Saved for phone download',
                'saved' => [
                    'id' => $saved->id,
                    'region_id' => $saved->region_id,
                    'region_name' => $saved->region_name,
                    'status' => $saved->status,
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error saving region for later', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to save region'], 500);
        }
    }

    /**
     * Initiate download of a region
     */
    public function downloadRegion(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $request->validate([
                'region_id' => 'required|string',
                'region_name' => 'required|string',
                'bounds' => 'required|array',
                'bounds.south' => 'required|numeric',
                'bounds.west' => 'required|numeric',
                'bounds.north' => 'required|numeric',
                'bounds.east' => 'required|numeric',
                'zoom_levels' => 'nullable|array',
                'estimated_size_mb' => 'nullable|integer',
            ]);

            // Check if user can download more
            $canDownload = $this->offlineMapService->canDownloadMore($user, 1);
            if (!$canDownload['allowed']) {
                return response()->json([
                    'error' => $canDownload['message'],
                    'reason' => $canDownload['reason'],
                    'limits' => [
                        'current_regions' => $canDownload['current_regions'] ?? 0,
                        'limit_regions' => $canDownload['limit_regions'] ?? 0,
                        'current_storage_mb' => $canDownload['current_storage_mb'] ?? 0,
                        'limit_storage_mb' => $canDownload['limit_storage_mb'] ?? 0,
                    ],
                ], 403);
            }

            // Check if region already downloaded
            $existingDownload = \App\Models\OfflineMapDownload::where('user_id', $user->id)
                ->where('region_id', $request->region_id)
                ->where('status', 'completed')
                ->first();

            if ($existingDownload) {
                return response()->json([
                    'error' => 'Region already downloaded',
                    'download' => [
                        'id' => $existingDownload->id,
                        'region_id' => $existingDownload->region_id,
                        'region_name' => $existingDownload->region_name,
                    ],
                ], 409);
            }

            // Create download record
            $download = $this->offlineMapService->createDownload($user, [
                'region_id' => $request->region_id,
                'region_name' => $request->region_name,
                'bounds' => $request->bounds,
                'zoom_levels' => $request->zoom_levels ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                'estimated_size_mb' => $request->estimated_size_mb ?? 0,
            ]);

            // Calculate tile count for progress tracking
            $tileCount = $this->offlineMapService->calculateTileCount(
                $request->bounds,
                $request->zoom_levels ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
            );

            return response()->json([
                'message' => 'Download initiated',
                'download' => [
                    'id' => $download->id,
                    'region_id' => $download->region_id,
                    'region_name' => $download->region_name,
                    'status' => $download->status,
                    'total_tiles' => $tileCount,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error initiating download', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to initiate download'], 500);
        }
    }

    /**
     * Mark download as completed (called from frontend after tiles are downloaded)
     */
    public function completeDownload(Request $request, int $downloadId): JsonResponse
    {
        try {
            $user = $request->user();
            $download = \App\Models\OfflineMapDownload::where('user_id', $user->id)
                ->where('id', $downloadId)
                ->firstOrFail();

            $request->validate([
                'actual_size_mb' => 'nullable|integer',
            ]);

            $this->offlineMapService->completeDownload($download, $request->actual_size_mb);

            return response()->json([
                'message' => 'Download completed',
                'download' => [
                    'id' => $download->id,
                    'status' => $download->status,
                    'size_mb' => $download->size_mb,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Download not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error completing download', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to complete download'], 500);
        }
    }

    /**
     * Delete a downloaded region
     */
    public function deleteDownload(Request $request, int $downloadId): JsonResponse
    {
        try {
            $user = $request->user();
            $this->offlineMapService->deleteDownload($user, $downloadId);

            return response()->json(['message' => 'Download deleted successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Download not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error deleting download', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to delete download'], 500);
        }
    }

    /**
     * Delete a saved-for-phone region
     */
    public function deleteSavedRegion(Request $request, int $savedId): JsonResponse
    {
        try {
            $user = $request->user();
            $this->offlineMapService->deleteSavedRegion($user, $savedId);

            return response()->json(['message' => 'Saved region removed']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Saved region not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error deleting saved region', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to delete saved region'], 500);
        }
    }

    /**
     * Get storage usage for user
     */
    public function getStorageUsage(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'usage' => ['total_mb' => 0],
                    'limits' => [
                        'allowed' => false,
                        'current_regions' => 0,
                        'current_storage_mb' => 0,
                        'limit_storage_mb' => 0,
                    ],
                ], 200);
            }
            $usage = $this->offlineMapService->getStorageUsage($user);
            $canDownload = $this->offlineMapService->canDownloadMore($user, 1);

            return response()->json([
                'usage' => $usage,
                'limits' => [
                    'allowed' => $canDownload['allowed'],
                    'current_regions' => $canDownload['current_regions'] ?? 0,
                    'current_storage_mb' => $canDownload['current_storage_mb'] ?? 0,
                    'limit_storage_mb' => $canDownload['limit_storage_mb'] ?? 0,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching storage usage', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'usage' => ['total_mb' => 0],
                'limits' => [
                    'allowed' => false,
                    'current_regions' => 0,
                    'current_storage_mb' => 0,
                    'limit_storage_mb' => 0,
                ],
            ], 200);
        }
    }

    /**
     * Check download limits
     */
    public function checkLimits(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $canDownload = $this->offlineMapService->canDownloadMore($user, 1);
            return response()->json($canDownload);
        } catch (\Exception $e) {
            Log::error('Error checking limits', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to check limits'], 500);
        }
    }

    /**
     * Report a region downloaded on phone to sync with website
     */
    public function reportDownloadedRegion(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $request->validate([
                'region_id' => 'required|string',
                'region_name' => 'required|string',
                'size_mb' => 'required|integer|min:0',
                'download_date' => 'nullable|integer',
                'bounds' => 'nullable|array',
                'bounds.south' => 'nullable|numeric',
                'bounds.west' => 'nullable|numeric',
                'bounds.north' => 'nullable|numeric',
                'bounds.east' => 'nullable|numeric',
                'zoom_levels' => 'nullable|array',
            ]);

            $data = [
                'region_id' => $request->region_id,
                'region_name' => $request->region_name,
                'size_mb' => $request->size_mb,
                'status' => 'completed',
                'device' => 'android',
                'download_date' => $request->download_date ? now()->setTimestampMs($request->download_date) : now(),
            ];
            if ($request->has('bounds')) {
                $data['bounds'] = $request->bounds;
            }
            if ($request->has('zoom_levels')) {
                $data['zoom_levels'] = $request->zoom_levels;
            }

            $download = $this->offlineMapService->recordDownloadedRegion($user, $data);

            return response()->json([
                'message' => 'Download recorded',
                'download' => [
                    'id' => $download->id,
                    'region_id' => $download->region_id,
                    'region_name' => $download->region_name,
                    'size_mb' => $download->size_mb,
                    'status' => $download->status,
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error reporting downloaded region', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to report download'], 500);
        }
    }

    /**
     * Save a custom region created on Android
     */
    public function saveCustomRegion(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $request->validate([
                'region_id' => 'required|string',
                'region_name' => 'required|string',
                'bounds' => 'required|array',
                'bounds.south' => 'required|numeric',
                'bounds.west' => 'required|numeric',
                'bounds.north' => 'required|numeric',
                'bounds.east' => 'required|numeric',
                'zoom_levels' => 'nullable|array',
                'radius_km' => 'nullable|numeric',
            ]);

            $saved = $this->offlineMapService->saveCustomRegion($user, [
                'region_id' => $request->region_id,
                'region_name' => $request->region_name,
                'bounds' => $request->bounds,
                'zoom_levels' => $request->zoom_levels ?? [11, 12, 13, 14],
                'radius_km' => $request->radius_km,
            ]);

            return response()->json([
                'message' => 'Custom region saved',
                'region' => [
                    'id' => $saved->region_id,
                    'name' => $saved->region_name,
                    'status' => 'custom',
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error saving custom region', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to save custom region'], 500);
        }
    }

    /**
     * Save offline map for a route (creates area around route coordinates)
     */
    public function saveRouteOfflineMap(Request $request)
    {
        try {
            $user = $request->user();

            $request->validate([
                'road_id' => 'required|integer',
                'buffer_km' => 'nullable|numeric|min:0.1|max:10',
            ]);

            // Get the saved road
            $road = SavedRoad::where('id', $request->road_id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            // Decode coordinates and calculate bounds with buffer
            $coordinates = json_decode($road->coordinates, true);
            if (empty($coordinates)) {
                return response()->json(['error' => 'Road has no coordinates'], 400);
            }

            $bufferKm = $request->buffer_km ?? 1; // 1km default buffer
            $bounds = $this->offlineMapService->calculateBoundsFromCoordinates($coordinates, $bufferKm);

            // Save as custom region
            $saved = $this->offlineMapService->saveCustomRegion($user, [
                'region_id' => 'route_' . $road->id . '_' . time(),
                'region_name' => $road->name . ' (Offline)',
                'bounds' => $bounds,
                'zoom_levels' => [11, 12, 13, 14, 15],
                'radius_km' => $bufferKm,
            ]);

            return response()->json([
                'message' => 'Route offline map saved',
                'region' => [
                    'id' => $saved->region_id,
                    'name' => $saved->region_name,
                    'status' => 'custom',
                    'road_id' => $road->id,
                    'buffer_km' => $bufferKm,
                ],
            ], 201);
        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'Road not found'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error saving route offline map', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to save route offline map'], 500);
        }
    }
}


