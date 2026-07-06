import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import axios from 'axios';
import { 
    FaDownload, FaTimes, FaTrash, FaMap, FaCheckCircle, FaExclamationTriangle, 
    FaInfoCircle, FaSearch, FaSpinner, FaWifi, FaBan, FaHdd,
    FaClock, FaChartBar, FaMapMarkerAlt, FaList, FaGlobe
} from 'react-icons/fa';
import { offlineMapManager } from '../utils/offlineMapManager';
import { downloadAndCacheTile, storeRegionMetadata, clearRegion } from '../utils/tileCache';

/**
 * Enhanced Offline Maps Panel with polished UI
 * Features:
 * - Complete download functionality with progress tracking
 * - Region selection (map-based, list-based, search)
 * - Storage management
 * - Offline indicator
 * - Download progress with ETA
 */
export default function EnhancedOfflineMapsPanel({ map, isActive, onClose, auth = null }) {
    // State declarations
    const [regions, setRegions] = useState([]);
    const [filteredRegions, setFilteredRegions] = useState([]);
    const [savedRegions, setSavedRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(null);
    const [storageUsage, setStorageUsage] = useState(0);
    const [limits, setLimits] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
    const [searchQuery, setSearchQuery] = useState('');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [selectedDownload, setSelectedDownload] = useState(null);
    const [isDrawingCustomArea, setIsDrawingCustomArea] = useState(false);
    const [customAreaName, setCustomAreaName] = useState('');
    const [customAreaBounds, setCustomAreaBounds] = useState(null);

    // Refs
    const rectangleRef = useRef(null);
    const rectangleLayerRef = useRef(null);
    const downloadAbortControllerRef = useRef(null);
    const regionMarkersRef = useRef([]);
    const downloadBoundsLayersRef = useRef([]);
    const resizeHandlesRef = useRef([]);

    const loadRegions = async () => {
        try {
            setLoading(true);
            const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
            const response = await axios.get('/api/offline-maps/regions', { headers });
            setRegions(response.data);
            setFilteredRegions(response.data);
        } catch (error) {
            console.error('Error loading regions:', error);
            setError('Failed to load regions');
        } finally {
            setLoading(false);
        }
    };

    // Removed: website does not fetch downloaded regions

    const loadSaved = async () => {
        try {
            const response = await axios.get('/api/offline-maps/saved', {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setSavedRegions(response.data);
        } catch (error) {
            console.error('Error loading saved regions:', error);
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

        if (isOffline) {
            setError('Cannot save maps while offline. Please check your internet connection.');
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
            const totalTiles = downloadResponse.data.download?.total_tiles || downloadResponse.data.total_tiles || 1000;

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

    const handleSaveForPhone = async (region) => {
        if (!auth?.token) {
            setError('Please log in to save offline maps');
            return;
        }

        try {
            setError(null);
            setLoading(true);
            await axios.post('/api/offline-maps/save', {
                region_id: region.id,
                region_name: region.name,
                bounds: region.bounds,
                zoom_levels: region.zoom_levels,
                estimated_size_mb: region.estimated_size_mb,
            }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            await loadSaved();
        } catch (error) {
            console.error('Error saving region for phone:', error);
            setError(error.response?.data?.error || 'Failed to save region for phone');
        } finally {
            setLoading(false);
        }
    };

    const downloadTiles = async (region, downloadId, totalTiles) => {
        const { bounds, zoom_levels } = region;
        const layers = ['standard'];
        
        let downloadedTiles = 0;
        let failedTiles = 0;
        const startTime = Date.now();
        let lastUpdateTime = startTime;

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
            timeRemaining: null,
        });

        try {
            for (const layer of layers) {
                for (const z of zoom_levels) {
                    if (downloadAbortControllerRef.current?.signal.aborted) {
                        throw new Error('Download cancelled');
                    }

                    const nwTile = latLngToTile(bounds.north, bounds.west, z);
                    const seTile = latLngToTile(bounds.south, bounds.east, z);

                    const minX = Math.min(nwTile.x, seTile.x);
                    const maxX = Math.max(nwTile.x, seTile.x);
                    const minY = Math.min(nwTile.y, seTile.y);
                    const maxY = Math.max(nwTile.y, seTile.y);

                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            if (downloadAbortControllerRef.current?.signal.aborted) {
                                throw new Error('Download cancelled');
                            }

                            try {
                                let url;
                                if (layer === 'standard') {
                                    url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
                                } else {
                                    url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
                                }
                                
                                const blob = await downloadAndCacheTile(url, layer, z, x, y);
                                
                                if (blob) {
                                    downloadedTiles++;
                                } else {
                                    failedTiles++;
                                }
                            } catch (error) {
                                console.error(`Error downloading tile ${z}/${x}/${y}:`, error);
                                failedTiles++;
                            }

                            // Update progress every tile or every 100ms
                            const now = Date.now();
                            if (now - lastUpdateTime >= 100 || (downloadedTiles + failedTiles) === totalTiles) {
                                const elapsed = (now - startTime) / 1000;
                                const speed = downloadedTiles / elapsed;
                                const remaining = totalTiles - downloadedTiles - failedTiles;
                                const eta = remaining / speed;
                                const timeRemaining = formatTimeRemaining(eta);

                                setDownloadProgress({
                                    downloadId,
                                    regionId: region.id,
                                    regionName: region.name,
                                    total: totalTiles,
                                    downloaded: downloadedTiles,
                                    failed: failedTiles,
                                    percentage: ((downloadedTiles + failedTiles) / totalTiles) * 100,
                                    speed: Math.round(speed * 10) / 10,
                                    eta: eta > 0 ? Math.round(eta) : null,
                                    timeRemaining,
                                });

                                lastUpdateTime = now;
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
                actual_size_mb: Math.round((downloadedTiles * 20) / 1024),
            }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });

            setDownloadProgress(null);
            setLoading(false);
            
            await loadDownloads();
            await loadStorageUsage();

        } catch (error) {
            console.error('Error downloading tiles:', error);
            setError(error.message || 'Download failed');
            setDownloadProgress(null);
            setLoading(false);
        }
    };

    const formatTimeRemaining = (seconds) => {
        if (!seconds || seconds < 0) return null;
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
    };

    // Removed: website does not manage downloaded regions

    const handleDeleteSaved = async (saved) => {
        if (!confirm(`Remove "${saved.region_name}" from saved list?`)) {
            return;
        }

        try {
            await axios.delete(`/api/offline-maps/saved/${saved.id}`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            await loadSaved();
        } catch (error) {
            console.error('Error removing saved region:', error);
            setError('Failed to remove saved region');
        }
    };

    // --- Custom area drawing helpers (web) ---
    const startDrawingCustomArea = () => {
        if (!map) return;

        setIsDrawingCustomArea(true);
        setCustomAreaName('');
        setCustomAreaBounds(null);

        // Remove existing rectangle & handles
        if (rectangleRef.current) {
            map.removeLayer(rectangleRef.current);
            rectangleRef.current = null;
        }
        resizeHandlesRef.current.forEach(h => map.removeLayer(h));
        resizeHandlesRef.current = [];

        // Create a rectangle centered on current view
        const bounds = map.getBounds();
        const center = map.getCenter();
        const latDiff = (bounds.getNorth() - bounds.getSouth()) * 0.3;
        const lngDiff = (bounds.getEast() - bounds.getWest()) * 0.3;
        const rectangleBounds = [
            [center.lat - latDiff, center.lng - lngDiff],
            [center.lat + latDiff, center.lng + lngDiff],
        ];

        const rectangle = L.rectangle(rectangleBounds, {
            color: '#8b5cf6',
            weight: 3,
            fillOpacity: 0.2,
        }).addTo(map);

        rectangleRef.current = rectangle;

        let isDragging = false;
        let startLatLng = null;

        function updateBounds(skipHandleUpdate = false) {
            const b = rectangle.getBounds();
            setCustomAreaBounds({
                north: b.getNorth(),
                south: b.getSouth(),
                east: b.getEast(),
                west: b.getWest(),
            });
            if (!skipHandleUpdate) positionHandles();
        }

        function createHandles() {
            // Remove old handles
            resizeHandlesRef.current.forEach(h => map.removeLayer(h));
            resizeHandlesRef.current = [];

            const b = rectangle.getBounds();
            const corners = [
                [b.getNorth(), b.getEast(), 'ne'],
                [b.getNorth(), b.getWest(), 'nw'],
                [b.getSouth(), b.getEast(), 'se'],
                [b.getSouth(), b.getWest(), 'sw'],
            ];

            corners.forEach(([lat, lng, key]) => {
                const marker = L.marker([lat, lng], {
                    draggable: true,
                    icon: L.divIcon({
                        className: 'resize-handle',
                        iconSize: [12, 12],
                    }),
                }).addTo(map);

                marker.on('drag', (e) => {
                    const newCorner = e.target.getLatLng();
                    const current = rectangle.getBounds();
                    const opp = key === 'ne' ? current.getSouthWest()
                        : key === 'nw' ? current.getSouthEast()
                        : key === 'se' ? current.getNorthWest()
                        : current.getNorthEast();

                    const newBounds = L.latLngBounds(
                        [Math.min(newCorner.lat, opp.lat), Math.min(newCorner.lng, opp.lng)],
                        [Math.max(newCorner.lat, opp.lat), Math.max(newCorner.lng, opp.lng)],
                    );

                    rectangle.setBounds(newBounds);
                    updateBounds(true);
                });

                resizeHandlesRef.current.push(marker);
            });
        }

        function positionHandles() {
            const b = rectangle.getBounds();
            if (resizeHandlesRef.current.length === 4) {
                const corners = [
                    [b.getNorth(), b.getEast()],
                    [b.getNorth(), b.getWest()],
                    [b.getSouth(), b.getEast()],
                    [b.getSouth(), b.getWest()],
                ];
                resizeHandlesRef.current.forEach((h, idx) => h.setLatLng(corners[idx]));
            } else {
                createHandles();
            }
        }

        rectangle.on('mousedown', (e) => {
            isDragging = true;
            startLatLng = e.latlng;
            map.dragging.disable();
            L.DomEvent.stopPropagation(e);
        });

        map.on('mousemove', (e) => {
            if (isDragging && startLatLng) {
                const latDelta = e.latlng.lat - startLatLng.lat;
                const lngDelta = e.latlng.lng - startLatLng.lng;

                const currentBounds = rectangle.getBounds();
                const newBounds = L.latLngBounds(
                    [currentBounds.getSouth() + latDelta, currentBounds.getWest() + lngDelta],
                    [currentBounds.getNorth() + latDelta, currentBounds.getEast() + lngDelta],
                );

                rectangle.setBounds(newBounds);
                startLatLng = e.latlng;
                updateBounds();
            }
        });

        map.on('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                map.dragging.enable();
            }
        });

        createHandles();
        updateBounds();
    };

    const cancelDrawingCustomArea = () => {
        setIsDrawingCustomArea(false);
        setCustomAreaName('');
        setCustomAreaBounds(null);

        if (rectangleRef.current && map) {
            map.removeLayer(rectangleRef.current);
            rectangleRef.current = null;
        }
        resizeHandlesRef.current.forEach(h => map.removeLayer(h));
        resizeHandlesRef.current = [];
    };

    const saveCustomArea = async () => {
        if (!customAreaBounds || !customAreaName.trim()) {
            setError('Please provide a name for your custom area');
            return;
        }

        try {
            setError(null);
            setLoading(true);

            const latDiff = Math.abs(customAreaBounds.north - customAreaBounds.south);
            const lngDiff = Math.abs(customAreaBounds.east - customAreaBounds.west);
            const area = latDiff * lngDiff;
            const estimatedSizeMB = Math.max(5, Math.min(150, Math.round(area * 1000)));

            const centerLat = (customAreaBounds.north + customAreaBounds.south) / 2;
            const centerLng = (customAreaBounds.east + customAreaBounds.west) / 2;
            const radiusKm = Math.round((latDiff * 111) / 2);
            const regionId = `custom_${Date.now()}`;

            await axios.post('/api/offline-maps/custom', {
                region_id: regionId,
                region_name: customAreaName.trim(),
                bounds: customAreaBounds,
                zoom_levels: [10, 11, 12, 13, 14],
                estimated_size_mb: estimatedSizeMB,
                center_lat: centerLat,
                center_lng: centerLng,
                radius_km: radiusKm,
            }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });

            await loadSaved();
            cancelDrawingCustomArea();
        } catch (error) {
            console.error('Error saving custom area:', error);
            setError(error.response?.data?.error || 'Failed to save custom area');
        } finally {
            setLoading(false);
        }
    };

    const saveCurrentMapView = async () => {
        if (!map) return;

        const bounds = map.getBounds();
        const customBounds = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
        };

        const name = prompt('Enter a name for this map area:', 'Current Map View');
        if (!name) return;

        try {
            setError(null);
            setLoading(true);

            const latDiff = Math.abs(customBounds.north - customBounds.south);
            const lngDiff = Math.abs(customBounds.east - customBounds.west);
            const area = latDiff * lngDiff;
            const estimatedSizeMB = Math.max(5, Math.min(150, Math.round(area * 1000)));

            const centerLat = (customBounds.north + customBounds.south) / 2;
            const centerLng = (customBounds.east + customBounds.west) / 2;
            const radiusKm = Math.round((latDiff * 111) / 2);
            const regionId = `custom_${Date.now()}`;

            await axios.post('/api/offline-maps/custom', {
                region_id: regionId,
                region_name: name.trim(),
                bounds: customBounds,
                zoom_levels: [10, 11, 12, 13, 14],
                estimated_size_mb: estimatedSizeMB,
                center_lat: centerLat,
                center_lng: centerLng,
                radius_km: radiusKm,
            }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });

            await loadSaved();
        } catch (error) {
            console.error('Error saving map view:', error);
            setError(error.response?.data?.error || 'Failed to save map view');
        } finally {
            setLoading(false);
        }
    };


    // Removed: website does not cancel downloads

    const isRegionDownloaded = () => false; // Website doesn't track downloads

    const isRegionSaved = (regionId) => {
        return savedRegions.some(s => s.region_id === regionId);
    };

    // useEffect hooks for initialization
    useEffect(() => {
        if (isActive) {
            loadRegions();
            if (auth?.token) {
                loadSaved();
                loadStorageUsage();
            }
        }
    }, [isActive, auth?.token]);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = regions.filter(r =>
                r.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredRegions(filtered);
        } else {
            setFilteredRegions(regions);
        }
    }, [searchQuery, regions]);

    // Removed: tile helpers for website downloads

    const getStoragePercentage = () => {
        if (!storageUsage || !limits) return 0;
        if (limits.limit_storage_mb === Number.MAX_SAFE_INTEGER) return 0;
        return (storageUsage.total_mb / limits.limit_storage_mb) * 100;
    };

    if (!isActive) return null;

    return (
        <div className="enhanced-offline-maps-panel bg-stone-50 dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 absolute top-4 right-4 z-[1000] w-96 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="panel-header flex items-center justify-between p-4 border-b bg-gradient-to-r from-stone-500 to-stone-600 dark:from-stone-700 dark:to-stone-800 text-white">
                <h3 className="text-lg font-semibold flex items-center">
                    <FaMap className="mr-2" />
                    Offline Maps
                </h3>
                <button
                    onClick={onClose}
                    className="text-white/90 hover:text-white transition-colors"
                >
                    <FaTimes />
                </button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 max-h-[calc(90vh-64px)] p-4 bg-white dark:bg-stone-900">

                {/* Storage Usage Card */}
                {storageUsage && limits && (
                    <div className="mb-4 p-4 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold text-stone-900 dark:text-white flex items-center">
                                <FaHdd className="mr-2" />
                                Storage Usage
                            </div>
                        </div>
                        
                        {/* Storage Progress Bar */}
                        {limits.limit_storage_mb !== Number.MAX_SAFE_INTEGER && (
                            <>
                                <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-3 mb-2 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                            getStoragePercentage() > 90 ? 'bg-rose-300' :
                                            getStoragePercentage() > 70 ? 'bg-amber-300' :
                                            'bg-emerald-300'
                                        }`}
                                        style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-stone-900 dark:text-white font-medium">
                                        {storageUsage.total_mb}MB / {limits.limit_storage_mb}MB
                                    </span>
                                    <span className="text-stone-800 dark:text-stone-200 font-medium">
                                        {Math.round(getStoragePercentage())}%
                                    </span>
                                </div>
                            </>
                        )}

                        {limits.limit_storage_mb === Number.MAX_SAFE_INTEGER && (
                            <div className="text-xs text-stone-900 dark:text-white font-medium">
                                {storageUsage.total_mb}MB used (Unlimited)
                            </div>
                        )}

                        {!limits.allowed && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                <FaExclamationTriangle className="inline mr-1" />
                                Storage limit reached
                            </div>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start">
                        <FaExclamationTriangle className="mr-2 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                            <FaTimes />
                        </button>
                    </div>
                )}

                {/* Download Progress */}
                {downloadProgress && (
                    <div className="mb-4 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                                <FaSpinner className="animate-spin mr-2 text-emerald-600" />
                                <div>
                                    <div className="text-sm font-semibold text-emerald-700">
                                        Downloading: {downloadProgress.regionName}
                                    </div>
                                    <div className="text-xs text-emerald-700">
                                        {Math.round(downloadProgress.percentage)}% complete
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleCancelDownload}
                                className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-stone-200 rounded-full h-3 mb-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-300 to-emerald-400 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-1"
                                style={{ width: `${downloadProgress.percentage}%` }}
                            >
                                {downloadProgress.percentage > 10 && (
                                    <span className="text-xs text-white font-semibold">
                                        {Math.round(downloadProgress.percentage)}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Progress Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                            <div className="flex items-center">
                                <FaChartBar className="mr-1" />
                                {downloadProgress.downloaded} / {downloadProgress.total} tiles
                            </div>
                            {downloadProgress.failed > 0 && (
                                <div className="text-red-600">
                                    {downloadProgress.failed} failed
                                </div>
                            )}
                            {downloadProgress.speed > 0 && (
                                <div className="flex items-center">
                                    <FaDownload className="mr-1" />
                                    {downloadProgress.speed} tiles/sec
                                </div>
                            )}
                            {downloadProgress.timeRemaining && (
                                <div className="flex items-center">
                                    <FaClock className="mr-1" />
                                    {downloadProgress.timeRemaining} remaining
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* View Mode Toggle */}
                <div className="mb-4 flex gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                    <button
                        onClick={() => { setViewMode('list'); }}
                        className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                            viewMode === 'list'
                                ? 'bg-white dark:bg-stone-700 text-stone-700 dark:text-white shadow-sm'
                                : 'text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white'
                        }`}
                    >
                        <FaList className="inline mr-1" />
                        List
                    </button>
                    <button
                        onClick={() => { setViewMode('map'); setSearchQuery(''); }}
                        className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                            viewMode === 'map'
                                ? 'bg-white dark:bg-stone-700 text-stone-700 dark:text-white shadow-sm'
                                : 'text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white'
                        }`}
                    >
                        <FaMap className="inline mr-1" />
                        Map
                    </button>
                </div>



                {/* Map View - Custom Area Tools */}
                {viewMode === 'map' && (
                    <div className="space-y-3 mb-4">
                        {!isDrawingCustomArea ? (
                            <>
                                <div className="p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-lg">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2 flex items-center">
                                        <FaMap className="mr-2" />
                                        Create Custom Offline Area
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 mb-3">
                                        Draw a custom area on the map or save your current view
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={startDrawingCustomArea}
                                            disabled={loading}
                                            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <FaMapMarkerAlt className="text-xs" />
                                            Draw Custom Area
                                        </button>
                                        <button
                                            onClick={saveCurrentMapView}
                                            disabled={loading}
                                            className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <FaDownload className="text-xs" />
                                            Save Current View
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3 bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-slate-700 dark:text-slate-200">
                                    <FaInfoCircle className="inline mr-1" />
                                    <strong>Tip:</strong> You can also select pre-defined regions from the List or Search tabs
                                </div>
                            </>
                        ) : (
                            <div className="p-4 bg-white border border-stone-300 rounded-lg shadow-sm">
                                <div className="text-sm font-semibold text-stone-900 mb-3 flex items-center">
                                    <FaMapMarkerAlt className="mr-2" />
                                    Drawing Custom Area
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-base font-bold text-stone-900 mb-2">
                                            Area Name
                                        </label>
                                        <input
                                            type="text"
                                            value={customAreaName}
                                            onChange={(e) => setCustomAreaName(e.target.value)}
                                            placeholder="e.g., Riga to Sigulda Route"
                                            className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-stone-900 placeholder:text-stone-600 font-semibold"
                                        />
                                    </div>
                                    {customAreaBounds && (
                                        <div className="p-3 rounded-lg border-2 border-gray-600 bg-white shadow-sm">
                                            <div className="font-bold mb-2 text-stone-900 text-sm">Selected Area:</div>
                                            <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-stone-900">
                                                <div className="bg-stone-100 text-stone-900 p-2 rounded">North: {customAreaBounds.north.toFixed(4)}</div>
                                                <div className="bg-stone-100 text-stone-900 p-2 rounded">South: {customAreaBounds.south.toFixed(4)}</div>
                                                <div className="bg-stone-100 text-stone-900 p-2 rounded">East: {customAreaBounds.east.toFixed(4)}</div>
                                                <div className="bg-stone-100 text-stone-900 p-2 rounded">West: {customAreaBounds.west.toFixed(4)}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-3 bg-stone-800 rounded-lg border border-gray-700 shadow-md">
                                        <strong className="block mb-2 text-white font-bold text-sm">How to use:</strong>
                                        <ul className="list-disc list-inside space-y-1 text-stone-100 text-xs">
                                            <li>Drag the rectangle to move it</li>
                                            <li>Use corner squares to resize it</li>
                                            <li>Enter a name and click Save</li>
                                        </ul>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={saveCustomArea}
                                            disabled={loading || !customAreaName.trim()}
                                            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-base font-bold rounded-lg transition-all disabled:bg-stone-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100 disabled:transform-none"
                                        >
                                            <FaCheckCircle className="inline mr-2" />
                                            Save Custom Area
                                        </button>
                                        <button
                                            onClick={cancelDrawingCustomArea}
                                            className="px-5 py-3 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white text-base font-bold rounded-lg transition-all shadow-lg hover:shadow-xl"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Downloaded Regions: removed from website */}

                {/* Saved for Phone & Downloaded Offline Maps */}
                {savedRegions.length > 0 && (
                    <div className="space-y-2 mt-4">
                        <div className="text-sm font-semibold text-stone-700 mb-2 flex items-center">
                            <FaMapMarkerAlt className="mr-2 text-slate-600" />
                            Offline Maps ({savedRegions.length})
                        </div>
                        {savedRegions.map((saved) => (
                            <div
                                key={saved.id}
                                className="p-3 bg-stone-50 border border-stone-200 rounded-lg hover:border-stone-300 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-stone-800 truncate flex items-center gap-2">
                                            {saved.region_name}
                                            {saved.status === 'custom' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                    Custom
                                                </span>
                                            )}
                                            {saved.status === 'completed' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                                    ✓ Downloaded
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-stone-500 mt-1 space-y-1">
                                            <div className="flex items-center">
                                                <FaHdd className="mr-1" />
                                                ~{saved.size_mb}MB
                                            </div>
                                            {saved.radius_km && (
                                                <div className="text-xs text-slate-600">
                                                    {saved.radius_km}km radius
                                                </div>
                                            )}
                                            {saved.status === 'saved' && (
                                                <div className="text-xs text-slate-600">
                                                    Open app on phone to download
                                                </div>
                                            )}
                                            {saved.status === 'completed' && (
                                                <div className="text-xs text-green-600 font-medium">
                                                    Downloaded on device
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteSaved(saved)}
                                        className="ml-3 text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                                        title="Remove from saved"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Info */}

        </div>
    );
}


