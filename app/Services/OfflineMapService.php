<?php

namespace App\Services;

use App\Models\OfflineMapRegion;
use App\Models\OfflineMapDownload;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class OfflineMapService
{
    /**
     * Get all available regions for download
     * Returns empty array - we only show user's custom/saved regions
     */
    public function getAvailableRegions()
    {
        // Return empty array - we don't offer preset regions anymore
        // Users create custom regions or download from saved roads/routes
        return [];
    }

    /**
     * Get user's downloaded regions
     */
    public function getUserDownloads(User $user)
    {
        return OfflineMapDownload::where('user_id', $user->id)
            ->where('status', 'completed')
            ->orderBy('download_date', 'desc')
            ->get()
            ->map(function ($download) {
                return [
                    'id' => $download->id,
                    'region_id' => $download->region_id,
                    'region_name' => $download->region_name,
                    'bounds' => [
                        'south' => (float) $download->south,
                        'west' => (float) $download->west,
                        'north' => (float) $download->north,
                        'east' => (float) $download->east,
                    ],
                    'zoom_levels' => $download->zoom_levels ?? [],
                    'size_mb' => $download->size_mb,
                    'download_date' => $download->download_date,
                    'last_used' => $download->last_used,
                ];
            });
    }

    /**
     * Get user's saved regions (planned downloads) AND completed downloads from Android
     */
    public function getUserSavedRegions(User $user)
    {
        return OfflineMapDownload::where('user_id', $user->id)
            ->whereIn('status', ['saved', 'custom', 'completed'])
            ->orderBy('download_date', 'desc')
            ->get()
            ->map(function ($saved) {
                return [
                    'id' => $saved->id,
                    'region_id' => $saved->region_id,
                    'region_name' => $saved->region_name,
                    'bounds' => [
                        'south' => (float) $saved->south,
                        'west' => (float) $saved->west,
                        'north' => (float) $saved->north,
                        'east' => (float) $saved->east,
                    ],
                    'zoom_levels' => $saved->zoom_levels ?? [],
                    'size_mb' => $saved->size_mb,
                    'saved_at' => $saved->download_date,
                    'status' => $saved->status,
                    'radius_km' => $saved->radius_km,
                ];
            });
    }

    /**
     * Save a region for later download (no tiles yet)
     */
    public function saveRegionForLater(User $user, array $regionData)
    {
        $saved = OfflineMapDownload::updateOrCreate(
            [
                'user_id' => $user->id,
                'region_id' => $regionData['region_id'],
            ],
            [
                'region_name' => $regionData['region_name'],
                'south' => $regionData['bounds']['south'],
                'west' => $regionData['bounds']['west'],
                'north' => $regionData['bounds']['north'],
                'east' => $regionData['bounds']['east'],
                'zoom_levels' => $regionData['zoom_levels'] ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                'size_mb' => $regionData['estimated_size_mb'] ?? 0,
                'status' => 'saved',
                'download_date' => now(),
            ]
        );

        return $saved;
    }

    /**
     * Create a download record for a region
     */
    public function createDownload(User $user, array $regionData)
    {
        $download = OfflineMapDownload::create([
            'user_id' => $user->id,
            'region_id' => $regionData['region_id'],
            'region_name' => $regionData['region_name'],
            'south' => $regionData['bounds']['south'],
            'west' => $regionData['bounds']['west'],
            'north' => $regionData['bounds']['north'],
            'east' => $regionData['bounds']['east'],
            'zoom_levels' => $regionData['zoom_levels'] ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
            'size_mb' => $regionData['estimated_size_mb'] ?? 0,
            'status' => 'downloading',
            'download_date' => now(),
        ]);

        return $download;
    }

    /**
     * Mark download as completed
     */
    public function completeDownload(OfflineMapDownload $download, int $actualSizeMb = null)
    {
        $download->update([
            'status' => 'completed',
            'size_mb' => $actualSizeMb ?? $download->size_mb,
        ]);

        return $download;
    }

    /**
     * Delete a downloaded region
     */
    public function deleteDownload(User $user, int $downloadId)
    {
        $download = OfflineMapDownload::where('user_id', $user->id)
            ->where('id', $downloadId)
            ->firstOrFail();

        $download->update(['status' => 'deleted']);

        return true;
    }

    /**
     * Delete a saved-for-later region
     */
    public function deleteSavedRegion(User $user, int $savedId)
    {
        $saved = OfflineMapDownload::where('user_id', $user->id)
            ->where('id', $savedId)
            ->where('status', 'saved')
            ->firstOrFail();

        $saved->update(['status' => 'deleted']);

        return true;
    }

    /**
     * Get total storage used by user
     */
    public function getStorageUsage(User $user)
    {
        $totalSize = OfflineMapDownload::where('user_id', $user->id)
            ->where('status', 'completed')
            ->sum('size_mb');

        return [
            'total_mb' => $totalSize,
            'total_gb' => round($totalSize / 1024, 2),
            'download_count' => OfflineMapDownload::where('user_id', $user->id)
                ->where('status', 'completed')
                ->count(),
        ];
    }

    /**
     * Check if user can download more regions based on subscription
     */
    public function canDownloadMore(User $user, int $requestedRegions = 1)
    {
        // Get active subscription - check if relationship exists
        $subscription = null;
        try {
            $subscription = $user->subscription;
        } catch (\Exception $e) {
            // Relationship might not exist yet
        }
        
        $plan = 'free';
        if ($subscription) {
            // Check if subscription is active
            if ($subscription->status === 'active' && 
                (!$subscription->ends_at || $subscription->ends_at->isFuture())) {
                $plan = $subscription->plan ?? 'free';
            }
        }

        $currentDownloads = OfflineMapDownload::where('user_id', $user->id)
            ->where('status', 'completed')
            ->count();

        $limits = [
            'free' => ['storage_mb' => 0],
            'premium' => ['storage_mb' => 500],
            'pro' => ['storage_mb' => PHP_INT_MAX],
        ];

        $limit = $limits[$plan] ?? $limits['free'];

        // No region count limit - only storage limit applies

        // Check storage limit
        $storageUsage = $this->getStorageUsage($user);
        if ($plan !== 'pro' && $storageUsage['total_mb'] >= $limit['storage_mb']) {
            return [
                'allowed' => false,
                'reason' => 'storage_limit',
                'current_mb' => $storageUsage['total_mb'],
                'limit_mb' => $limit['storage_mb'],
                'message' => "You have reached your storage limit of {$limit['storage_mb']}MB. Upgrade to download more.",
            ];
        }

        return [
            'allowed' => true,
            'current_storage_mb' => $storageUsage['total_mb'],
            'limit_storage_mb' => $limit['storage_mb'],
        ];
    }

    /**
     * Calculate tile count for a region (for progress tracking)
     */
    public function calculateTileCount(array $bounds, array $zoomLevels)
    {
        $totalTiles = 0;
        $south = $bounds['south'];
        $west = $bounds['west'];
        $north = $bounds['north'];
        $east = $bounds['east'];

        foreach ($zoomLevels as $zoom) {
            $nwTile = $this->latLngToTile($north, $west, $zoom);
            $seTile = $this->latLngToTile($south, $east, $zoom);

            $tilesX = abs($seTile['x'] - $nwTile['x']) + 1;
            $tilesY = abs($seTile['y'] - $nwTile['y']) + 1;

            $totalTiles += $tilesX * $tilesY;
        }

        return $totalTiles;
    }

    /**
     * Convert lat/lng to tile coordinates
     */
    private function latLngToTile($lat, $lng, $zoom)
    {
        $n = pow(2, $zoom);
        $x = floor(($lng + 180) / 360 * $n);
        $latRad = deg2rad($lat);
        $y = floor((1 - log(tan($latRad) + 1 / cos($latRad)) / M_PI) / 2 * $n);
        
        return ['x' => $x, 'y' => $y];
    }

    /**
     * Record a region download reported from Android/phone device
     */
    public function recordDownloadedRegion(User $user, array $downloadData)
    {
        // Check if already exists
        $existing = OfflineMapDownload::where('user_id', $user->id)
            ->where('region_id', $downloadData['region_id'])
            ->first();

        if ($existing) {
            // Update existing record
            $existing->update([
                'region_name' => $downloadData['region_name'],
                'size_mb' => $downloadData['size_mb'],
                'status' => $downloadData['status'] ?? 'completed',
                'download_date' => $downloadData['download_date'] ?? now(),
                'south' => $downloadData['bounds']['south'] ?? $existing->south,
                'west' => $downloadData['bounds']['west'] ?? $existing->west,
                'north' => $downloadData['bounds']['north'] ?? $existing->north,
                'east' => $downloadData['bounds']['east'] ?? $existing->east,
                'zoom_levels' => $downloadData['zoom_levels'] ?? $existing->zoom_levels,
            ]);
            return $existing;
        }

        // Create new download record
        $payload = [
            'user_id' => $user->id,
            'region_id' => $downloadData['region_id'],
            'region_name' => $downloadData['region_name'],
            'size_mb' => $downloadData['size_mb'],
            'status' => $downloadData['status'] ?? 'completed',
            'download_date' => $downloadData['download_date'] ?? now(),
            'device' => $downloadData['device'] ?? 'web',
        ];

        if (isset($downloadData['bounds'])) {
            $payload['south'] = $downloadData['bounds']['south'] ?? null;
            $payload['west'] = $downloadData['bounds']['west'] ?? null;
            $payload['north'] = $downloadData['bounds']['north'] ?? null;
            $payload['east'] = $downloadData['bounds']['east'] ?? null;
        }
        if (isset($downloadData['zoom_levels'])) {
            $payload['zoom_levels'] = $downloadData['zoom_levels'];
        }

        return OfflineMapDownload::create($payload);
    }

    /**
     * Save a custom region created on Android
     */
    public function saveCustomRegion(User $user, array $regionData)
    {
        $customRegion = OfflineMapDownload::updateOrCreate(
            [
                'user_id' => $user->id,
                'region_id' => $regionData['region_id'],
            ],
            [
                'region_name' => $regionData['region_name'],
                'south' => $regionData['bounds']['south'],
                'west' => $regionData['bounds']['west'],
                'north' => $regionData['bounds']['north'],
                'east' => $regionData['bounds']['east'],
                'zoom_levels' => $regionData['zoom_levels'] ?? [11, 12, 13, 14],
                'radius_km' => $regionData['radius_km'] ?? null,
                'size_mb' => $this->estimateSizeFromBounds($regionData['bounds']) ?? 0,
                'status' => 'custom',
                'download_date' => now(),
            ]
        );

        return $customRegion;
    }

    /**
     * Estimate region size from bounds
     */
    private function estimateSizeFromBounds(array $bounds): int
    {
        $south = $bounds['south'];
        $west = $bounds['west'];
        $north = $bounds['north'];
        $east = $bounds['east'];

        $latDiff = abs($north - $south);
        $lonDiff = abs($east - $west);
        
        // Rough estimation: ~1MB per 0.1 degree square at zoom 14
        // Adjust based on zoom levels
        $baseMb = ($latDiff * $lonDiff) / (0.1 * 0.1);
        
        return max(1, (int)ceil($baseMb));
    }

    /**
     * Calculate bounds from a set of coordinates with buffer
     * @param array $coordinates Array of [lat, lng] pairs
     * @param float $bufferKm Buffer distance in kilometers
     * @return array Bounds array with south, west, north, east
     */
    public function calculateBoundsFromCoordinates($coordinates, $bufferKm = 1)
    {
        if (empty($coordinates)) {
            return null;
        }

        $lats = array_map(fn($coord) => $coord[0], $coordinates);
        $lngs = array_map(fn($coord) => $coord[1], $coordinates);

        $minLat = min($lats);
        $maxLat = max($lats);
        $minLng = min($lngs);
        $maxLng = max($lngs);

        // Add buffer (1 degree ≈ 111 km)
        $latBuffer = ($bufferKm / 111);
        $lngBuffer = ($bufferKm / 111) / cos(deg2rad(($minLat + $maxLat) / 2));

        return [
            'south' => $minLat - $latBuffer,
            'west' => $minLng - $lngBuffer,
            'north' => $maxLat + $latBuffer,
            'east' => $maxLng + $lngBuffer,
        ];
    }
}
