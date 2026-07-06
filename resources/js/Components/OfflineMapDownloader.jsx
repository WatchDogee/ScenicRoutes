import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import axios from 'axios';
import { FaDownload, FaTimes, FaTrash, FaMap, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { offlineMapManager } from '../utils/offlineMapManager';
import { downloadAndCacheTile, storeRegionMetadata, clearRegion } from '../utils/tileCache';

export default function OfflineMapDownloader({ map, isActive, onClose, auth = null }) {
    const [regions, setRegions] = useState([]);
    const [downloads, setDownloads] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(null);
    const [storageUsage, setStorageUsage] = useState(null);
    const [limits, setLimits] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
    
    const rectangleRef = useRef(null);
    const rectangleLayerRef = useRef(null);
    const downloadAbortControllerRef = useRef(null);

    // Load regions and downloads on mount
    useEffect(() => {
        if (isActive && auth?.token) {
            loadRegions();
            loadDownloads();
            loadStorageUsage();
        }
    }, [isActive, auth]);

    const loadRegions = async () => {
        try {
            setLoading(true);
            const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
            const response = await axios.get('/api/offline-maps/regions', { headers });
            setRegions(response.data);
        } catch (error) {
            console.error('Error loading regions:', error);
            setError('Failed to load regions');
        } finally {
            setLoading(false);
        }
    };

    const loadDownloads = async () => {
        try {
            const response = await axios.get('/api/offline-maps/downloads', {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setDownloads(response.data);
        } catch (error) {
            console.error('Error loading downloads:', error);
        }
    };

    const loadStorageUsage = async () => {
        try {
            const response = await axios.get('/api/offline-maps/storage', {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setStorageUsage(response.data.usage);
            setLimits(response.data.limits);
        } catch (error) {
            console.error('Error loading storage usage:', error);
        }
    };

    const handleDownloadRegion = async (region) => {
        if (!auth?.token) {
            setError('Please log in to save maps');
            return;
        }

        try {
            setError(null);
            setLoading(true);

            // Check limits first
            const limitsResponse = await axios.get('/api/offline-maps/limits', {
                headers: { Authorization: `Bearer ${auth.token}` }
            });

            if (!limitsResponse.data.allowed) {
                setError(limitsResponse.data.message);
                setLoading(false);
                return;
            }

            // Initiate download
            const downloadResponse = await axios.post('/api/offline-maps/download', {
                region_id: region.id,
                region_name: region.name,
                bounds: region.bounds,
                zoom_levels: region.zoom_levels,
                estimated_size_mb: region.estimated_size_mb,
            }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });

            const download = downloadResponse.data.download;
            const totalTiles = downloadResponse.data.total_tiles;

            // Start downloading tiles
            await downloadTiles(region, download.id, totalTiles);

        } catch (error) {
            console.error('Error downloading region:', error);
            if (error.response?.status === 403) {
                setError(error.response.data.error || 'Download limit reached. Please upgrade your plan.');
            } else if (error.response?.status === 409) {
                setError('Region already downloaded');
            } else {
                setError(error.response?.data?.error || 'Failed to download region');
            }
            setLoading(false);
        }
    };

    const downloadTiles = async (region, downloadId, totalTiles) => {
        const { bounds, zoomLevels } = region;
        const layers = ['standard']; // Can be extended to support terrain, satellite
        
        let downloadedTiles = 0;
        let failedTiles = 0;
        const startTime = Date.now();

        // Create abort controller for cancellation
        downloadAbortControllerRef.current = new AbortController();

        setDownloadProgress({
            downloadId,
            regionId: region.id,
            regionName: region.name,
            total: totalTiles,
            downloaded: 0,
            failed: 0,
            percentage: 0,
            speed: 0,
            eta: null,
        });

        try {
            for (const layer of layers) {
                for (const z of zoomLevels) {
                    if (downloadAbortControllerRef.current?.signal.aborted) {
                        throw new Error('Download cancelled');
                    }

                    const nwTile = latLngToTile(bounds.north, bounds.west, z);
                    const seTile = latLngToTile(bounds.south, bounds.east, z);

                    const minX = Math.min(nwTile.x, seTile.x);
                    const maxX = Math.max(nwTile.x, seTile.x);
                    const minY = Math.min(nwTile.y, seTile.y);
                    const maxY = Math.max(nwTile.y, seTile.y);

                    const tilesInZoom = (maxX - minX + 1) * (maxY - minY + 1);
                    let zoomDownloaded = 0;

                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            if (downloadAbortControllerRef.current?.signal.aborted) {
                                throw new Error('Download cancelled');
                            }

                            try {
                                // Build tile URL based on layer type
                                let url;
                                if (layer === 'standard') {
                                    url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
                                } else if (layer === 'terrain') {
                                    url = `https://tile.opentopomap.org/${z}/${x}/${y}.png`;
                                } else if (layer === 'satellite') {
                                    url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
                                } else {
                                    url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`; // Default to OSM
                                }
                                
                                const blob = await downloadAndCacheTile(url, layer, z, x, y);
                                
                                if (blob) {
                                    downloadedTiles++;
                                    zoomDownloaded++;
                                } else {
                                    failedTiles++;
                                }
                            } catch (error) {
                                console.error(`Error downloading tile ${z}/${x}/${y}:`, error);
                                failedTiles++;
                            }

                            // Update progress every 10 tiles
                            if ((downloadedTiles + failedTiles) % 10 === 0) {
                                const elapsed = (Date.now() - startTime) / 1000;
                                const speed = downloadedTiles / elapsed;
                                const remaining = totalTiles - downloadedTiles - failedTiles;
                                const eta = remaining / speed;

                                setDownloadProgress({
                                    downloadId,
                                    regionId: region.id,
                                    regionName: region.name,
                                    total: totalTiles,
                                    downloaded: downloadedTiles,
                                    failed: failedTiles,
                                    percentage: ((downloadedTiles + failedTiles) / totalTiles) * 100,
                                    speed: Math.round(speed),
                                    eta: eta > 0 ? Math.round(eta) : null,
                                });
                            }
                        }
                    }
                }
            }

            // Store region metadata
            await storeRegionMetadata(region.id, {
                regionId: region.id,
                bounds: region.bounds,
                zoomLevels: region.zoom_levels,
                layers: layers,
                downloadedAt: new Date().toISOString(),
            });

            // Register with offline map manager
            await offlineMapManager.registerRegion(region.id, {
                regionId: region.id,
                bounds: region.bounds,
                zoomLevels: region.zoom_levels,
            });

            // Mark download as completed
            await axios.post(`/api/offline-maps/downloads/${downloadId}/complete`, {
                actual_size_mb: Math.round((downloadedTiles * 20) / 1024), // Rough estimate: 20KB per tile
            }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });

            setDownloadProgress(null);
            setLoading(false);
            
            // Reload downloads and storage
            await loadDownloads();
            await loadStorageUsage();

            alert(`Successfully downloaded ${region.name}!`);
        } catch (error) {
            console.error('Error downloading tiles:', error);
            setError(error.message || 'Download failed');
            setDownloadProgress(null);
            setLoading(false);
        }
    };

    const handleDeleteDownload = async (download) => {
        if (!confirm(`Delete ${download.region_name}? This will remove all cached tiles for this region.`)) {
            return;
        }

        try {
            await axios.delete(`/api/offline-maps/downloads/${download.id}`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });

            // Clear tiles from IndexedDB
            await clearRegion(download.region_id);
            await offlineMapManager.unregisterRegion(download.region_id);

            await loadDownloads();
            await loadStorageUsage();
        } catch (error) {
            console.error('Error deleting download:', error);
            setError('Failed to delete download');
        }
    };

    const handleCancelDownload = () => {
        if (downloadAbortControllerRef.current) {
            downloadAbortControllerRef.current.abort();
            downloadAbortControllerRef.current = null;
        }
        setDownloadProgress(null);
        setLoading(false);
    };

    const isRegionDownloaded = (regionId) => {
        return downloads.some(d => d.region_id === regionId && d.status === 'completed');
    };

    // Helper function to convert lat/lng to tile coordinates
    const latLngToTile = (lat, lng, zoom) => {
        const n = Math.pow(2, zoom);
        const x = Math.floor((lng + 180) / 360 * n);
        const latRad = (lat * Math.PI) / 180;
        const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
        return { x, y };
    };

    if (!isActive) return null;

    return (
        <div className="offline-map-downloader bg-white p-4 rounded-lg shadow-lg absolute top-4 right-4 z-[1000] max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                    <FaMap className="mr-2" />
                    Offline Maps
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <FaTimes />
                </button>
            </div>

            {/* Storage Usage */}
            {storageUsage && limits && (
                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="text-sm font-semibold text-blue-700 mb-2">Storage Usage</div>
                    <div className="text-xs text-gray-600 space-y-1">
                        <div>Used: {storageUsage.total_mb}MB / {limits.limit_storage_mb}MB</div>
                        <div>Regions: {storageUsage.download_count} / {limits.limit_regions === Number.MAX_SAFE_INTEGER ? '∞' : limits.limit_regions}</div>
                        {!limits.allowed && (
                            <div className="text-red-600 font-semibold mt-2">
                                {limits.reason === 'region_limit' ? 'Region limit reached' : 'Storage limit reached'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start">
                    <FaExclamationTriangle className="mr-2 mt-0.5" />
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* Download Progress */}
            {downloadProgress && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-green-700">
                            Downloading: {downloadProgress.regionName}
                        </div>
                        <button
                            onClick={handleCancelDownload}
                            className="text-red-600 hover:text-red-800 text-xs"
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${downloadProgress.percentage}%` }}
                        />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                        <div>
                            {downloadProgress.downloaded} / {downloadProgress.total} tiles
                            {downloadProgress.failed > 0 && ` (${downloadProgress.failed} failed)`}
                        </div>
                        {downloadProgress.speed > 0 && (
                            <div>
                                Speed: {downloadProgress.speed} tiles/sec
                                {downloadProgress.eta && ` • ETA: ${Math.round(downloadProgress.eta)}s`}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View Mode Toggle */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 px-3 py-2 rounded text-sm ${
                        viewMode === 'list'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    List View
                </button>
                <button
                    onClick={() => setViewMode('map')}
                    className={`flex-1 px-3 py-2 rounded text-sm ${
                        viewMode === 'map'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    Map View
                </button>
            </div>

            {/* Regions List */}
            {viewMode === 'list' && (
                <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Available Regions</div>
                    {loading && regions.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">Loading regions...</div>
                    ) : regions.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">No regions available</div>
                    ) : (
                        regions.map((region) => {
                            const isDownloaded = isRegionDownloaded(region.id);
                            return (
                                <div
                                    key={region.id}
                                    className={`p-3 rounded border ${
                                        isDownloaded
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-800">{region.name}</div>
                                            {region.description && (
                                                <div className="text-xs text-gray-600 mt-1">{region.description}</div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1">
                                                Size: ~{region.estimated_size_mb}MB
                                                {region.countries && region.countries.length > 0 && (
                                                    <> • {region.countries.join(', ')}</>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-2">
                                            {isDownloaded ? (
                                                <div className="flex items-center text-green-600 text-xs">
                                                    <FaCheckCircle className="mr-1" />
                                                    Downloaded
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleDownloadRegion(region)}
                                                    disabled={loading || downloadProgress || !limits?.allowed}
                                                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                                                >
                                                    <FaDownload className="mr-1" />
                                                    Download
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Downloaded Regions */}
            <div className="mt-6 space-y-2">
                <div className="text-sm font-semibold text-gray-700 mb-2">Downloaded Regions</div>
                {downloads.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">No regions downloaded yet</div>
                ) : (
                    downloads.map((download) => (
                        <div
                            key={download.id}
                            className="p-3 bg-gray-50 border border-gray-200 rounded"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-800">{download.region_name}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Size: {download.size_mb}MB
                                        {download.download_date && (
                                            <> • Downloaded: {new Date(download.download_date).toLocaleDateString()}</>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteDownload(download)}
                                    className="ml-2 text-red-600 hover:text-red-800"
                                    title="Delete download"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                <div className="flex items-start">
                    <FaInfoCircle className="mr-2 mt-0.5" />
                    <div>
                        <div className="font-semibold mb-1">About Offline Maps</div>
                        <div>Save maps for your phone. Maps are saved on the website and downloaded on your Android device.</div>
                        <div className="mt-2">
                            Free: 1 region (100MB) • Premium: 500MB storage • Pro: Unlimited
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

