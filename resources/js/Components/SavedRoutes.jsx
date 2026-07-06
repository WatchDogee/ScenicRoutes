import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { FaRoute, FaTrash, FaEye, FaTimes } from 'react-icons/fa';
import { formatDistance } from '../utils/routeUtils';

export default function SavedRoutes({ auth, map, onLoadRoute }) {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        if (auth?.token) {
            fetchSavedRoutes();
        }
    }, [auth?.token]);

    // Listen for saved roads/routes updates
    useEffect(() => {
        const handleUpdate = () => {
            console.log('savedRoadsUpdated event received, refreshing routes list');
            if (auth?.token) {
                // Add small delay to ensure backend has processed the save
                setTimeout(() => {
                    fetchSavedRoutes();
                }, 300);
            }
        };
        window.addEventListener('savedRoadsUpdated', handleUpdate);
        return () => window.removeEventListener('savedRoadsUpdated', handleUpdate);
    }, [auth?.token]);

    const fetchSavedRoutes = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/saved-routes');
            console.log('Fetched saved routes:', response.data);
            setRoutes(response.data || []);
            setError(null);
        } catch (error) {
            console.error('Error fetching saved routes:', error);
            setError('Failed to load saved routes');
            if (error.response?.status === 401) {
                window.dispatchEvent(new CustomEvent('auth:failed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const deleteRoute = async (routeId) => {
        if (!window.confirm('Delete this route?')) return;
        
        try {
            await apiClient.delete(`/saved-roads/${routeId}`);
            setRoutes(routes.filter(route => route.id !== routeId));
        } catch (error) {
            alert('Failed to delete route');
        }
    };

    const loadRouteOnMap = (route) => {
        if (!route.road_coordinates || !map || !onLoadRoute) return;
        
        try {
            // Parse coordinates
            const coords = typeof route.road_coordinates === 'string' 
                ? JSON.parse(route.road_coordinates)
                : route.road_coordinates;
            
            if (!Array.isArray(coords) || coords.length < 2) {
                alert('Invalid route coordinates');
                return;
            }

            // Call parent callback to load route
            onLoadRoute({
                coordinates: coords,
                distance: route.length ? route.length * 1000 : null, // Convert km to meters
                curvature: route.twistiness || null,
                corner_count: route.corner_count || null,
                elevation_gain: route.elevation_gain || null,
                elevation_loss: route.elevation_loss || null,
                max_elevation: route.max_elevation || null,
                min_elevation: route.min_elevation || null,
                distance_km: route.length || null
            });
        } catch (error) {
            console.error('Error loading route:', error);
            alert('Failed to load route on map');
        }
    };

    if (!auth?.token) {
        return null;
    }

    return (
        <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FaRoute className="text-blue-600" />
                    Saved Routes ({routes.length})
                </label>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="px-2 py-1 text-xs rounded border bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                    title="Toggle saved routes list"
                >
                    {isExpanded ? 'Hide' : 'Show'}
                </button>
            </div>
            
            {isExpanded && (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                    {loading ? (
                        <div className="text-xs text-gray-600 text-center py-2">Loading saved routes...</div>
                    ) : error ? (
                        <div className="text-xs text-red-600 text-center py-2">{error}</div>
                    ) : routes.length === 0 ? (
                        <div className="text-xs text-gray-600 text-center py-2">No saved routes found</div>
                    ) : (
                        routes.map((route) => (
                            <div
                                key={route.id}
                                className="flex items-center justify-between p-2 rounded text-sm bg-white border border-gray-200 hover:bg-gray-100"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="font-medium text-gray-800 truncate">
                                            {route.road_name || 'Unnamed Route'}
                                        </div>
                                        <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-semibold flex-shrink-0" title="Saved Route">
                                            ROUTE
                                        </span>
                                    </div>
                                    {route.length && (
                                        <div className="text-xs text-gray-600">
                                            {formatDistance(route.length * 1000, 'metric')}
                                            {route.twistiness != null && typeof route.twistiness === 'number' && 
                                                ` • Curvature: ${route.twistiness.toFixed(3)}`}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                    <button
                                        onClick={() => loadRouteOnMap(route)}
                                        className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                        title="Load route on map"
                                    >
                                        <FaEye />
                                    </button>
                                    <button
                                        onClick={() => deleteRoute(route.id)}
                                        className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                                        title="Delete route"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
