import localforage from 'localforage';

// Configure localforage for tile storage
const tileStore = localforage.createInstance({
    name: 'ScenicRoutes',
    storeName: 'mapTiles',
    description: 'Offline map tiles storage'
});

// In-memory cache for frequently accessed tiles (LRU cache)
const memoryCache = new Map();
const MAX_MEMORY_CACHE_SIZE = 100; // Keep 100 tiles in memory

/**
 * LRU cache implementation for tile memory cache
 */
function addToMemoryCache(key, blob) {
    if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
        // Remove oldest entry (first in Map)
        const firstKey = memoryCache.keys().next().value;
        memoryCache.delete(firstKey);
    }
    memoryCache.set(key, blob);
}

const regionStore = localforage.createInstance({
    name: 'ScenicRoutes',
    storeName: 'mapRegions',
    description: 'Offline map regions metadata'
});

/**
 * Generate tile key for storage
 */
function getTileKey(layer, z, x, y) {
    return `tile:${layer}:${z}:${x}:${y}`;
}

/**
 * Store a tile in cache (memory and IndexedDB)
 */
export async function storeTile(layer, z, x, y, blob) {
    try {
        const key = getTileKey(layer, z, x, y);
        
        // Store in memory cache
        addToMemoryCache(key, blob);
        
        // Store in IndexedDB (async, don't wait)
        tileStore.setItem(key, blob).catch(error => {
            console.error('Error storing tile in IndexedDB:', error);
        });
        
        return true;
    } catch (error) {
        console.error('Error storing tile:', error);
        return false;
    }
}

/**
 * Get a tile from cache (memory first, then IndexedDB)
 */
export async function getTile(layer, z, x, y) {
    try {
        const key = getTileKey(layer, z, x, y);
        
        // Check memory cache first
        if (memoryCache.has(key)) {
            return memoryCache.get(key);
        }
        
        // Fallback to IndexedDB
        const blob = await tileStore.getItem(key);
        
        // Add to memory cache if found
        if (blob) {
            addToMemoryCache(key, blob);
        }
        
        return blob;
    } catch (error) {
        console.error('Error getting tile:', error);
        return null;
    }
}

/**
 * Check if tile exists in cache
 */
export async function hasTile(layer, z, x, y) {
    try {
        const key = getTileKey(layer, z, x, y);
        const exists = await tileStore.getItem(key);
        return exists !== null;
    } catch (error) {
        console.error('Error checking tile:', error);
        return false;
    }
}

/**
 * Clear all tiles for a specific region
 */
export async function clearRegion(regionId) {
    try {
        const region = await regionStore.getItem(`region:${regionId}`);
        if (!region) {
            // Region metadata not found, but try to clear anyway by iterating all tiles
            // This is a fallback for cases where metadata is missing
            const keys = await tileStore.keys();
            let clearedCount = 0;
            for (const key of keys) {
                if (key.includes(`:${regionId}:`) || key.startsWith(`tile:`)) {
                    await tileStore.removeItem(key);
                    clearedCount++;
                }
            }
            console.log(`Cleared ${clearedCount} tiles for region ${regionId} (fallback method)`);
            return true;
        }

        const { bounds, zoomLevels, layers } = region;
        let clearedCount = 0;

        for (const layer of layers || ['standard']) {
            for (const z of zoomLevels || []) {
                const nwTile = latLngToTile(bounds.north, bounds.west, z);
                const seTile = latLngToTile(bounds.south, bounds.east, z);

                const minX = Math.min(nwTile.x, seTile.x);
                const maxX = Math.max(nwTile.x, seTile.x);
                const minY = Math.min(nwTile.y, seTile.y);
                const maxY = Math.max(nwTile.y, seTile.y);

                for (let x = minX; x <= maxX; x++) {
                    for (let y = minY; y <= maxY; y++) {
                        const key = getTileKey(layer, z, x, y);
                        await tileStore.removeItem(key);
                        clearedCount++;
                    }
                }
            }
        }

        // Remove region metadata
        await regionStore.removeItem(`region:${regionId}`);

        console.log(`Cleared ${clearedCount} tiles for region ${regionId}`);
        return true;
    } catch (error) {
        console.error('Error clearing region:', error);
        return false;
    }
}

/**
 * Store region metadata
 */
export async function storeRegionMetadata(regionId, metadata) {
    try {
        await regionStore.setItem(`region:${regionId}`, metadata);
        return true;
    } catch (error) {
        console.error('Error storing region metadata:', error);
        return false;
    }
}

/**
 * Get region metadata
 */
export async function getRegionMetadata(regionId) {
    try {
        return await regionStore.getItem(`region:${regionId}`);
    } catch (error) {
        console.error('Error getting region metadata:', error);
        return null;
    }
}

/**
 * Get all stored regions
 */
export async function getAllRegions() {
    try {
        const keys = await regionStore.keys();
        const regions = [];
        for (const key of keys) {
            if (key.startsWith('region:')) {
                const regionId = key.replace('region:', '');
                const metadata = await regionStore.getItem(key);
                if (metadata) {
                    regions.push({ regionId, ...metadata });
                }
            }
        }
        return regions;
    } catch (error) {
        console.error('Error getting all regions:', error);
        return [];
    }
}

/**
 * Get storage usage estimate
 */
export async function getStorageUsage() {
    try {
        if (!navigator.storage || !navigator.storage.estimate) {
            return { available: null, used: null, usage: null };
        }

        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;

        return {
            used: usage,
            quota: quota,
            available: quota - usage,
            usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
            usedMB: (usage / 1024 / 1024).toFixed(2),
            availableMB: ((quota - usage) / 1024 / 1024).toFixed(2),
            quotaMB: (quota / 1024 / 1024).toFixed(2),
        };
    } catch (error) {
        console.error('Error getting storage usage:', error);
        return { available: null, used: null, usage: null };
    }
}

/**
 * Clear all cached tiles (use with caution)
 */
export async function clearAllTiles() {
    try {
        await tileStore.clear();
        await regionStore.clear();
        return true;
    } catch (error) {
        console.error('Error clearing all tiles:', error);
        return false;
    }
}

/**
 * Convert lat/lng to tile coordinates
 * Helper function used by clearRegion
 */
function latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
}

/**
 * Download and cache a single tile
 */
export async function downloadAndCacheTile(url, layer, z, x, y) {
    try {
        // Check if already cached
        const cached = await getTile(layer, z, x, y);
        if (cached) {
            return cached;
        }

        // Download tile
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download tile: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Store in cache
        await storeTile(layer, z, x, y, blob);
        
        return blob;
    } catch (error) {
        console.error(`Error downloading tile ${z}/${x}/${y}:`, error);
        return null;
    }
}

/**
 * Create object URL from blob for use in img src
 */
export function createTileUrl(blob) {
    if (!blob) return null;
    return URL.createObjectURL(blob);
}

/**
 * Revoke object URL to free memory
 */
export function revokeTileUrl(url) {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

