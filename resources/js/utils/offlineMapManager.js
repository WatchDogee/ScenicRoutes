import { 
    getTile, 
    hasTile, 
    storeTile, 
    downloadAndCacheTile,
    createTileUrl,
    revokeTileUrl,
    storeRegionMetadata,
    getRegionMetadata,
    getAllRegions,
    clearRegion,
    getStorageUsage
} from './tileCache';
import apiClient from './apiClient';

/**
 * Offline Map Manager
 * Coordinates between cached tiles and Leaflet map layers
 */
class OfflineMapManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.cachedRegions = new Map();
        this.tileUrlCache = new Map(); // Cache of blob URLs to avoid memory leaks
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            if (this.onStatusChange) {
                this.onStatusChange(true);
            }
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            if (this.onStatusChange) {
                this.onStatusChange(false);
            }
        });

        // Load cached regions on init
        this.loadCachedRegions();
    }

    /**
     * Load all cached regions from IndexedDB
     */
    async loadCachedRegions() {
        try {
            const regions = await getAllRegions();
            regions.forEach(region => {
                this.cachedRegions.set(region.regionId, region);
            });
        } catch (error) {
            console.error('Error loading cached regions:', error);
        }
    }

    /**
     * Check if a point is within any cached region
     */
    isPointCached(lat, lng, zoom) {
        for (const [regionId, region] of this.cachedRegions) {
            const { bounds, zoomLevels } = region;
            if (zoomLevels && !zoomLevels.includes(zoom)) {
                continue;
            }
            if (
                lat >= bounds.south &&
                lat <= bounds.north &&
                lng >= bounds.west &&
                lng <= bounds.east
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get tile URL - checks cache first, then falls back to online
     */
    async getTileUrl(layer, z, x, y, onlineUrl) {
        // Always try cache first
        const cachedBlob = await getTile(layer, z, x, y);
        if (cachedBlob) {
            const cacheKey = `${layer}:${z}:${x}:${y}`;
            let blobUrl = this.tileUrlCache.get(cacheKey);
            if (!blobUrl) {
                blobUrl = createTileUrl(cachedBlob);
                this.tileUrlCache.set(cacheKey, blobUrl);
            }
            return blobUrl;
        }

        // If online, download and cache
        if (this.isOnline && onlineUrl) {
            try {
                const blob = await downloadAndCacheTile(onlineUrl, layer, z, x, y);
                if (blob) {
                    const cacheKey = `${layer}:${z}:${x}:${y}`;
                    const blobUrl = createTileUrl(blob);
                    this.tileUrlCache.set(cacheKey, blobUrl);
                    return blobUrl;
                }
            } catch (error) {
                console.error('Error downloading tile:', error);
            }
        }

        // Fallback to online URL if available
        return onlineUrl || null;
    }

    /**
     * Create offline-aware Leaflet tile layer
     */
    createOfflineTileLayer(map, baseUrl, options = {}) {
        const layer = options.layer || 'standard';
        const L = window.L; // Assuming Leaflet is global

        // Create custom tile layer that checks cache first
        const OfflineTileLayer = L.TileLayer.extend({
            createTile: function(coords, done) {
                const tile = document.createElement('img');
                const z = coords.z;
                const x = coords.x;
                const y = coords.y;
                
                // Handle tile loading
                L.DomEvent.on(tile, 'load', () => {
                    done(null, tile);
                });
                
                L.DomEvent.on(tile, 'error', async () => {
                    // Try to get from cache
                    const cachedUrl = await this._getCachedTileUrl(layer, z, x, y);
                    if (cachedUrl) {
                        tile.src = cachedUrl;
                    } else {
                        done(new Error('Tile failed to load'), tile);
                    }
                });

                // Try to get tile URL (cache first, then online)
                this._getTileUrl(layer, z, x, y, baseUrl).then(url => {
                    if (url) {
                        tile.src = url;
                    } else {
                        done(new Error('No tile URL available'), tile);
                    }
                });

                return tile;
            },

            _getTileUrl: async function(layer, z, x, y, baseUrl) {
                return await offlineMapManager.getTileUrl(layer, z, x, y, baseUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y));
            },

            _getCachedTileUrl: async function(layer, z, x, y) {
                const blob = await getTile(layer, z, x, y);
                if (blob) {
                    return createTileUrl(blob);
                }
                return null;
            }
        });

        return new OfflineTileLayer(baseUrl, {
            ...options,
            layer: layer
        });
    }

    /**
     * Register a downloaded region
     */
    async registerRegion(regionId, metadata) {
        await storeRegionMetadata(regionId, metadata);
        this.cachedRegions.set(regionId, metadata);
    }

    /**
     * Unregister a region (when deleted)
     */
    async unregisterRegion(regionId) {
        await clearRegion(regionId);
        this.cachedRegions.delete(regionId);
    }

    /**
     * Get storage usage
     */
    async getStorageInfo() {
        return await getStorageUsage();
    }

    /**
     * Fetch offline map limits for the current user
     */
    async getLimits() {
        const token = localStorage.getItem('token');
        if (!token) {
            return {
                allowed: false,
                reason: 'unauthenticated',
                message: 'Please log in to view offline map limits.',
                current_regions: 0,
                limit_regions: 0,
                current_storage_mb: 0,
                limit_storage_mb: 0,
            };
        }

        const normalizeNumber = (value, fallback) => {
            if (typeof value !== 'number') return fallback;
            return value > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : value;
        };

        try {
            const response = await apiClient.get('/offline-maps/limits', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data || {};

            return {
                allowed: data.allowed ?? true,
                reason: data.reason || null,
                message: data.message || null,
                current_regions: normalizeNumber(data.current_regions, 0),
                limit_regions: normalizeNumber(data.limit_regions, Number.MAX_SAFE_INTEGER),
                current_storage_mb: normalizeNumber(data.current_storage_mb, 0),
                limit_storage_mb: normalizeNumber(data.limit_storage_mb, Number.MAX_SAFE_INTEGER),
            };
        } catch (error) {
            console.error('Failed to fetch offline limits:', error);
            return {
                allowed: true,
                reason: null,
                message: null,
                current_regions: 0,
                limit_regions: Number.MAX_SAFE_INTEGER,
                current_storage_mb: 0,
                limit_storage_mb: Number.MAX_SAFE_INTEGER,
            };
        }
    }

    /**
     * Check if we're online
     */
    getOnlineStatus() {
        return this.isOnline;
    }

    /**
     * Set callback for online/offline status changes
     */
    onStatusChange(callback) {
        this.onStatusChange = callback;
    }

    /**
     * Clean up blob URLs to prevent memory leaks
     */
    cleanup() {
        for (const [key, url] of this.tileUrlCache) {
            revokeTileUrl(url);
        }
        this.tileUrlCache.clear();
    }
}

// Export singleton instance
export const offlineMapManager = new OfflineMapManager();

// Also export class for testing
export default OfflineMapManager;

