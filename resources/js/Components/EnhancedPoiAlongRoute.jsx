import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { FaGasPump, FaBolt, FaCamera, FaMapMarkerAlt, FaPlus, FaFilter, FaTimes, FaRoute } from 'react-icons/fa';
import PointOfInterestService from '../Services/PointOfInterestService';
import axios from 'axios';
import { logTelemetryEvent } from '../utils/telemetry';

/**
 * Enhanced POI Component for Route Integration
 * Features:
 * - Automatically shows POIs along calculated route
 * - Visual indicators (on route, near route, far from route)
 * - Filter by category
 * - Click to add as waypoint
 * - Distance from route calculation
 * - "Add nearest gas station" quick action
 */
export default function EnhancedPoiAlongRoute({ 
    map, 
    route, 
    waypoints, 
    onAddWaypoint,
    onRecalculateRoute,
    routeCoordinates = []
}) {
    const [poisAlongRoute, setPoisAlongRoute] = useState([]);
    const [filteredPois, setFilteredPois] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showPois, setShowPois] = useState(false);
    const [isVisible, setIsVisible] = useState(false); // Control component visibility
    const [selectedCategories, setSelectedCategories] = useState({
        fuel: true,
        charging: true,
        tourism: true
    });
    const [maxDistanceFromRoute, setMaxDistanceFromRoute] = useState(5); // km
    const [poiLayerRef, setPoiLayerRef] = useState(null);
    const markersRef = useRef([]);

    // Initialize POI layer
    useEffect(() => {
        if (!map) return;

        const layer = L.layerGroup().addTo(map);
        setPoiLayerRef(layer);

        return () => {
            if (layer) {
                layer.clearLayers();
                map.removeLayer(layer);
            }
        };
    }, [map]);

    // Calculate distance from point to route line
    const distanceFromRoute = (poiLat, poiLon, routeCoords) => {
        if (!routeCoords || routeCoords.length === 0) return Infinity;

        let minDistance = Infinity;

        // Check distance to each segment of the route
        for (let i = 0; i < routeCoords.length - 1; i++) {
            const p1 = routeCoords[i];
            const p2 = routeCoords[i + 1];
            
            const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
            const lon1 = Array.isArray(p1) ? p1[1] : (p1.lon || p1.lng);
            const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
            const lon2 = Array.isArray(p2) ? p2[1] : (p2.lon || p2.lng);

            // Calculate distance from POI to line segment
            const distance = pointToLineDistance(poiLat, poiLon, lat1, lon1, lat2, lon2);
            minDistance = Math.min(minDistance, distance);
        }

        return minDistance; // Returns distance in kilometers
    };

    // Calculate distance from point to line segment (simplified Haversine)
    const pointToLineDistance = (px, py, x1, y1, x2, y2) => {
        const R = 6371; // Earth radius in km

        // Convert to radians
        const toRad = (deg) => deg * Math.PI / 180;
        const pxRad = toRad(px);
        const pyRad = toRad(py);
        const x1Rad = toRad(x1);
        const y1Rad = toRad(y1);
        const x2Rad = toRad(x2);
        const y2Rad = toRad(y2);

        // Calculate distance from point to each endpoint, return minimum
        // Distance to point 1
        const dLat1 = pxRad - x1Rad;
        const dLon1 = pyRad - y1Rad;
        const a1 = Math.sin(dLat1 / 2) ** 2 +
            Math.cos(x1Rad) * Math.cos(pxRad) * Math.sin(dLon1 / 2) ** 2;
        const c1 = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));
        const dist1 = R * c1;

        // Distance to point 2
        const dLat2 = pxRad - x2Rad;
        const dLon2 = pyRad - y2Rad;
        const a2 = Math.sin(dLat2 / 2) ** 2 +
            Math.cos(x2Rad) * Math.cos(pxRad) * Math.sin(dLon2 / 2) ** 2;
        const c2 = 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
        const dist2 = R * c2;

        // Return minimum distance (simplified - for better accuracy, would need proper line projection)
        return Math.min(dist1, dist2);
    };

    // Fetch POIs along route
    const fetchPoisAlongRoute = async () => {
        if (!route || !routeCoordinates || routeCoordinates.length === 0) {
            alert('Please calculate a route first');
            return;
        }

        setLoading(true);
        setPoisAlongRoute([]);

        try {
            const allPois = [];
            const searchRadius = 10; // km

            // Sample points along route (every 20th point, max 20 points)
            const sampleInterval = Math.max(1, Math.floor(routeCoordinates.length / 20));
            const searchPoints = [];

            for (let i = 0; i < routeCoordinates.length; i += sampleInterval) {
                const coord = routeCoordinates[i];
                const lat = Array.isArray(coord) ? coord[0] : coord.lat;
                const lon = Array.isArray(coord) ? coord[1] : (coord.lon || coord.lng);
                searchPoints.push({ lat, lon });
            }

            // Fetch POIs at each search point
            for (const point of searchPoints) {
                try {
                    // Fetch all POI types
                    if (selectedCategories.fuel) {
                        const fuelPois = await PointOfInterestService.fetchFuelStations(
                            point.lat, point.lon, searchRadius
                        );
                        allPois.push(...fuelPois.map(poi => ({ ...poi, type: 'fuel' })));
                    }

                    if (selectedCategories.charging) {
                        const chargingPois = await PointOfInterestService.fetchChargingStations(
                            point.lat, point.lon, searchRadius
                        );
                        allPois.push(...chargingPois.map(poi => ({ ...poi, type: 'charging' })));
                    }

                    if (selectedCategories.tourism) {
                        const tourismPois = await PointOfInterestService.fetchTourismObjects(
                            point.lat, point.lon, searchRadius
                        );
                        allPois.push(...tourismPois.map(poi => ({ ...poi, type: 'tourism' })));
                    }
                } catch (error) {
                    console.error('Error fetching POIs:', error);
                }
            }

            // Remove duplicates
            const uniquePois = [];
            const seenIds = new Set();
            for (const poi of allPois) {
                const id = poi.id || poi.osm_id || `${poi.latitude}_${poi.longitude}`;
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    uniquePois.push(poi);
                }
            }

            // Calculate distance from route for each POI
            const poisWithDistance = uniquePois.map(poi => {
                const distance = distanceFromRoute(
                    poi.latitude, 
                    poi.longitude, 
                    routeCoordinates
                );
                return {
                    ...poi,
                    distanceFromRoute: distance,
                    status: distance < 0.5 ? 'on_route' : distance < 2 ? 'near_route' : 'far_from_route'
                };
            });

            // Filter by max distance
            const filtered = poisWithDistance.filter(poi => 
                poi.distanceFromRoute <= maxDistanceFromRoute
            );

            // Sort by distance from route
            filtered.sort((a, b) => a.distanceFromRoute - b.distanceFromRoute);

            setPoisAlongRoute(filtered);
            setFilteredPois(filtered);
        } catch (error) {
            console.error('Error fetching POIs along route:', error);
            alert('Failed to fetch POIs along route');
        } finally {
            setLoading(false);
        }
    };

    // Filter POIs by category
    useEffect(() => {
        if (!poisAlongRoute.length) {
            setFilteredPois([]);
            return;
        }

        const filtered = poisAlongRoute.filter(poi => {
            if (poi.type === 'fuel' && !selectedCategories.fuel) return false;
            if (poi.type === 'charging' && !selectedCategories.charging) return false;
            if (poi.type === 'tourism' && !selectedCategories.tourism) return false;
            return poi.distanceFromRoute <= maxDistanceFromRoute;
        });

        setFilteredPois(filtered);
    }, [selectedCategories, maxDistanceFromRoute, poisAlongRoute]);

    // Display POIs on map
    useEffect(() => {
        if (!poiLayerRef || !showPois) {
            // Clear markers
            if (poiLayerRef) {
                poiLayerRef.clearLayers();
            }
            markersRef.current = [];
            return;
        }

        poiLayerRef.clearLayers();
        markersRef.current = [];

        filteredPois.forEach(poi => {
            const lat = poi.latitude;
            const lon = poi.longitude;

            // Determine icon and color based on type and distance
            let iconColor, iconClass;
            if (poi.status === 'on_route') {
                iconColor = '#22c55e'; // Green - on route
                iconClass = 'poi-marker-on-route';
            } else if (poi.status === 'near_route') {
                iconColor = '#f59e0b'; // Orange - near route
                iconClass = 'poi-marker-near-route';
            } else {
                iconColor = '#6b7280'; // Gray - far from route
                iconClass = 'poi-marker-far-route';
            }

            let iconHtml;
            if (poi.type === 'fuel') {
                iconHtml = `<div class="poi-icon-wrapper" style="background-color: ${iconColor}; opacity: ${poi.status === 'far_from_route' ? 0.5 : 1}">
                    <i class="fa fa-gas-pump" style="color: white;"></i>
                </div>`;
            } else if (poi.type === 'charging') {
                iconHtml = `<div class="poi-icon-wrapper" style="background-color: ${iconColor}; opacity: ${poi.status === 'far_from_route' ? 0.5 : 1}">
                    <i class="fa fa-bolt" style="color: white;"></i>
                </div>`;
            } else {
                iconHtml = `<div class="poi-icon-wrapper" style="background-color: ${iconColor}; opacity: ${poi.status === 'far_from_route' ? 0.5 : 1}">
                    <i class="fa fa-camera" style="color: white;"></i>
                </div>`;
            }

            const icon = L.divIcon({
                className: `custom-poi-icon ${iconClass}`,
                html: iconHtml,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });

            const marker = L.marker([lat, lon], { icon })
                .bindPopup(createPoiPopup(poi))
                .addTo(poiLayerRef);

            // Add click handler to add as waypoint
            marker.on('click', () => {
                // Popup will show "Add as waypoint" button
            });

            markersRef.current.push({ marker, poi });
        });
    }, [filteredPois, showPois, poiLayerRef]);

    // Create POI popup
    const createPoiPopup = (poi) => {
        const distanceText = poi.distanceFromRoute < 1 
            ? `${(poi.distanceFromRoute * 1000).toFixed(0)}m`
            : `${poi.distanceFromRoute.toFixed(2)}km`;

        return `
            <div class="poi-popup-enhanced" style="min-width: 200px;">
                <h3 style="font-weight: bold; margin-bottom: 8px;">${poi.name || 'Unnamed POI'}</h3>
                <p style="font-size: 12px; color: #666; margin-bottom: 4px;">
                    ${poi.type === 'fuel' ? 'Fuel Station' : poi.type === 'charging' ? 'EV Charging' : 'Tourism'}
                </p>
                <p style="font-size: 12px; color: #666; margin-bottom: 8px;">
                    Distance from route: <strong>${distanceText}</strong>
                </p>
                <button 
                    class="add-poi-waypoint-btn" 
                    data-poi-id="${poi.id}"
                    style="width: 100%; padding: 8px; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
                >
                    <i class="fa fa-plus"></i> Add as Waypoint
                </button>
            </div>
        `;
    };

    // Handle popup button clicks
    useEffect(() => {
        if (!showPois) return;

        const handlePopupClick = (e) => {
            if (e.target.closest('.add-poi-waypoint-btn')) {
                const btn = e.target.closest('.add-poi-waypoint-btn');
                const poiId = btn.getAttribute('data-poi-id');
                const poi = filteredPois.find(p => (p.id || p.osm_id) == poiId);
                
                if (poi && onAddWaypoint) {
                    const newWaypoint = {
                        id: Date.now() + Math.random(),
                        lat: parseFloat(poi.latitude),
                        lng: parseFloat(poi.longitude),
                        name: poi.name || 'Unnamed POI',
                        poiId: poi.id,
                        type: poi.type,
                        subtype: poi.subtype || null,
                        isPoi: true,
                        source: 'poi_marker'
                    };
                    onAddWaypoint(newWaypoint);
                    logTelemetryEvent('poi_waypoint_requested', {
                        type: poi.type,
                        distance_from_route: poi.distanceFromRoute,
                        name: poi.name || null,
                        source: 'poi_marker',
                    });
                    
                    // Recalculate route if callback provided
                    if (onRecalculateRoute) {
                        setTimeout(() => onRecalculateRoute(), 100);
                    }
                }
            }
        };

        document.addEventListener('click', handlePopupClick);
        return () => document.removeEventListener('click', handlePopupClick);
    }, [showPois, filteredPois, onAddWaypoint, onRecalculateRoute]);

    // Add nearest gas station
    const addNearestGasStation = () => {
        const gasStations = filteredPois.filter(poi => poi.type === 'fuel');
        if (gasStations.length === 0) {
            alert('No gas stations found along the route');
            return;
        }

        const nearest = gasStations[0]; // Already sorted by distance
        const newWaypoint = {
            id: Date.now() + Math.random(),
            lat: parseFloat(nearest.latitude),
            lng: parseFloat(nearest.longitude),
            name: nearest.name || 'Gas Station',
            poiId: nearest.id,
            type: 'fuel',
            subtype: nearest.subtype || null,
            isPoi: true,
            source: 'nearest_gas'
        };
        
        if (onAddWaypoint) {
            onAddWaypoint(newWaypoint);
            logTelemetryEvent('poi_waypoint_requested', {
                type: 'fuel',
                distance_from_route: nearest.distanceFromRoute,
                name: nearest.name || null,
                source: 'nearest_gas',
            });
            if (onRecalculateRoute) {
                setTimeout(() => onRecalculateRoute(), 100);
            }
        }
    };

    if (!route || !routeCoordinates || routeCoordinates.length === 0) {
        return null;
    }

    // If component is not visible, show a small button to open it
    if (!isVisible) {
        return (
            <div className="absolute top-4 right-4 z-[1000]" style={{ pointerEvents: 'auto' }}>
                <button
                    onClick={() => setIsVisible(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
                >
                    <FaMapMarkerAlt />
                    <span>Show POIs Along Route</span>
                </button>
            </div>
        );
    }

    return (
        <div className="enhanced-poi-along-route bg-white rounded-lg shadow-lg p-4 border border-blue-200 absolute top-4 right-4 z-[1000] max-w-sm" style={{ pointerEvents: 'auto' }}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center text-gray-700">
                    <FaRoute className="mr-2 text-blue-500" />
                    POIs Along Route
                </h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Close POI panel"
                >
                    <FaTimes />
                </button>
            </div>

            {!showPois && (
                <button
                    onClick={() => {
                        setShowPois(true);
                        if (poisAlongRoute.length === 0) {
                            fetchPoisAlongRoute();
                        }
                    }}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                    <FaMapMarkerAlt />
                    Show POIs Along Route
                </button>
            )}

            {showPois && (
                <>
                    {/* Quick Actions */}
                    <div className="mb-3 flex gap-2">
                        <button
                            onClick={fetchPoisAlongRoute}
                            disabled={loading}
                            className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-sm flex items-center justify-center gap-2"
                        >
                            {loading ? 'Loading...' : 'Refresh POIs'}
                        </button>
                        <button
                            onClick={addNearestGasStation}
                            disabled={filteredPois.filter(p => p.type === 'fuel').length === 0}
                            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 text-sm flex items-center gap-2"
                            title="Add nearest gas station as waypoint"
                        >
                            <FaGasPump />
                            Nearest Gas
                        </button>
                    </div>

                    {/* Category Filters */}
                    <div className="mb-3">
                        <label className="text-xs text-gray-700 mb-2 block flex items-center gap-2">
                            <FaFilter />
                            Filter Categories:
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedCategories(prev => ({ ...prev, fuel: !prev.fuel }))}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                    selectedCategories.fuel
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                <FaGasPump className="inline mr-1" />
                                Fuel
                            </button>
                            <button
                                onClick={() => setSelectedCategories(prev => ({ ...prev, charging: !prev.charging }))}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                    selectedCategories.charging
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                <FaBolt className="inline mr-1" />
                                EV
                            </button>
                            <button
                                onClick={() => setSelectedCategories(prev => ({ ...prev, tourism: !prev.tourism }))}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                    selectedCategories.tourism
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                <FaCamera className="inline mr-1" />
                                Tourism
                            </button>
                        </div>
                    </div>

                    {/* Distance Filter */}
                    <div className="mb-3">
                        <label className="text-xs text-gray-700 mb-1 block">
                            Max Distance: {maxDistanceFromRoute} km
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={maxDistanceFromRoute}
                            onChange={(e) => setMaxDistanceFromRoute(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    {/* POI List */}
                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-4 text-gray-500">Loading POIs...</div>
                        ) : filteredPois.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                                No POIs found along route
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredPois.slice(0, 20).map((poi, index) => {
                                    const distanceText = poi.distanceFromRoute < 1 
                                        ? `${(poi.distanceFromRoute * 1000).toFixed(0)}m`
                                        : `${poi.distanceFromRoute.toFixed(2)}km`;

                                    return (
                                        <div
                                            key={poi.id || index}
                                            className={`p-2 border rounded text-xs ${
                                                poi.status === 'on_route' ? 'bg-green-50 border-green-200' :
                                                poi.status === 'near_route' ? 'bg-orange-50 border-orange-200' :
                                                'bg-gray-50 border-gray-200 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-semibold">{poi.name || 'Unnamed POI'}</div>
                                                    <div className="text-gray-600">
                                                        {poi.type === 'fuel' && <FaGasPump className="inline mr-1" />}
                                                        {poi.type === 'charging' && <FaBolt className="inline mr-1" />}
                                                        {poi.type === 'tourism' && <FaCamera className="inline mr-1" />}
                                                        {distanceText} from route
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newWaypoint = {
                                                            id: Date.now() + Math.random(),
                                                            lat: parseFloat(poi.latitude),
                                                            lng: parseFloat(poi.longitude),
                                                            name: poi.name || 'Unnamed POI',
                                                            poiId: poi.id,
                                                            type: poi.type,
                                                            subtype: poi.subtype || null,
                                                            isPoi: true,
                                                            source: 'poi_panel'
                                                        };
                                                        if (onAddWaypoint) {
                                                            onAddWaypoint(newWaypoint);
                                                            logTelemetryEvent('poi_waypoint_requested', {
                                                                type: poi.type,
                                                                distance_from_route: poi.distanceFromRoute,
                                                                name: poi.name || null,
                                                                source: 'poi_panel',
                                                            });
                                                            if (onRecalculateRoute) {
                                                                setTimeout(() => onRecalculateRoute(), 100);
                                                            }
                                                        }
                                                    }}
                                                    className="ml-2 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs flex items-center gap-1"
                                                    title="Add as waypoint"
                                                >
                                                    <FaPlus />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                        {filteredPois.length} POI{filteredPois.length !== 1 ? 's' : ''} found
                        {filteredPois.length > 20 && ` (showing first 20)`}
                    </div>
                </>
            )}
        </div>
    );
}

