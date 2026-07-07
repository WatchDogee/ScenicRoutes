import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RoutePlanner from '../Components/RoutePlanner';
import { Head } from '@inertiajs/react';
import { fixMapTiles } from '../utils/mapTileFix';
import axios from 'axios';
import { validateRouteParameters, analyzeDeadEndAccuracy, generateRouteComparison } from '../utils/routeValidator';

const DebugRouteAdvanced = () => {
    const mapRef = useRef(null);
    const routesLayerRef = useRef(null);
    const layerRegistryRef = useRef({});
    const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(true);
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [routeStats, setRouteStats] = useState(null);
    const [deadEnds, setDeadEnds] = useState([]);
    const [kurvigerRoutes, setKurvigerRoutes] = useState([]);
    const [showKurvigerImport, setShowKurvigerImport] = useState(false);
    
    // Debug locations - Use locations within GraphHopper bounds (10.86-58.94°N)
    // Try a longer route that's more likely to have multiple path options
    // Riga to Liepaja (coastal route, multiple paths possible)
    const DEBUG_START = { lat: 56.9496, lng: 24.1052, name: 'Riga' };
    const DEBUG_END = { lat: 56.5047, lng: 21.0108, name: 'Liepaja' };
    
    // Available waypoint cities
    const DEBUG_WAYPOINT_CITIES = [
        { name: 'Madona', lat: 56.8533, lng: 26.2167 },
        { name: 'Gulbene', lat: 57.1833, lng: 26.7500 },
        { name: 'Cēsis', lat: 57.3117, lng: 25.2744 },
        { name: 'Valmiera', lat: 57.5417, lng: 25.4250 },
        { name: 'Smiltene', lat: 57.4167, lng: 25.9000 },
        { name: 'Alūksne', lat: 57.4167, lng: 27.0500 },
        { name: 'Valka', lat: 57.7750, lng: 26.0083 },
    ];
    
    // Start with NO waypoints to test alternative routes (waypoints can prevent alternatives)
    const [waypoints, setWaypoints] = useState([]);
    
    const [isCalculating, setIsCalculating] = useState(false);
    const [strategyComparison, setStrategyComparison] = useState(null);
    const [isComparingStrategies, setIsComparingStrategies] = useState(false);
    const [showStrategyComparison, setShowStrategyComparison] = useState(false);
    // Enable alternative routes by default for testing
    const [showAlternativeRoutes, setShowAlternativeRoutes] = useState(true);
    const [alternativeRoutes, setAlternativeRoutes] = useState([]);
    const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState(0);
    const [alternativeRoutesWarning, setAlternativeRoutesWarning] = useState(null);
    const [alternativeRoutesBlocked, setAlternativeRoutesBlocked] = useState(false);
    const [strategy1Route, setStrategy1Route] = useState(null);
    const [strategy2Route, setStrategy2Route] = useState(null);
    const [graphHopperRoute, setGraphHopperRoute] = useState(null);
    const [isCalculatingStrategy1, setIsCalculatingStrategy1] = useState(false);
    const [isCalculatingStrategy2, setIsCalculatingStrategy2] = useState(false);
    const [isCalculatingGraphHopper, setIsCalculatingGraphHopper] = useState(false);
    const [graphHopperStatus, setGraphHopperStatus] = useState(null);
    const [curvatureLevel, setCurvatureLevel] = useState('balanced');
    const [avoidOptions, setAvoidOptions] = useState([]); // ['highways','tolls','ferries','unpaved']
    
    // Section-specific curvature state
    const [segmentCurvatureRoute, setSegmentCurvatureRoute] = useState(null);
    const [isCalculatingSegmentCurvature, setIsCalculatingSegmentCurvature] = useState(false);
    const [segmentCurvatureLevels, setSegmentCurvatureLevels] = useState(['balanced']);
    
    // Saved roads for debugging (moved before useEffect that uses it)
    const [savedRoads, setSavedRoads] = useState([]);
    const [selectedSavedRoads, setSelectedSavedRoads] = useState([]);
    const [savedRoadsLoading, setSavedRoadsLoading] = useState(false);
    
    // Update segment curvature levels when waypoints change
    useEffect(() => {
        const numSegments = waypoints.length + 1;
        setSegmentCurvatureLevels(prev => {
            if (prev.length === numSegments) return prev;
            const newLevels = [...prev];
            while (newLevels.length < numSegments) {
                newLevels.push(newLevels[newLevels.length - 1] || 'balanced');
            }
            if (newLevels.length > numSegments) {
                newLevels.splice(numSegments);
            }
            return newLevels;
        });
    }, [waypoints.length]);
    
    // Check for incompatible features when alternative routes are enabled
    useEffect(() => {
        if (showAlternativeRoutes) {
            const hasSavedRoads = selectedSavedRoads && selectedSavedRoads.length > 0;
            const hasPoiWaypoints = waypoints && waypoints.some(wp => wp.isPoi);
            
            if (hasSavedRoads || hasPoiWaypoints) {
                const reasons = [];
                if (hasSavedRoads) reasons.push('saved roads');
                if (hasPoiWaypoints) reasons.push('POI waypoints');
                
                setAlternativeRoutesBlocked(true);
                setAlternativeRoutesWarning(`Alternative routes cannot be used with ${reasons.join(' or ')}. Please remove ${reasons.join(' and ')} first.`);
                setShowAlternativeRoutes(false);
                setAlternativeRoutes([]);
            } else {
                setAlternativeRoutesBlocked(false);
                setAlternativeRoutesWarning(null);
            }
        }
    }, [showAlternativeRoutes, selectedSavedRoads, waypoints]);
    
    // Round trip state
    const [isRoundTrip, setIsRoundTrip] = useState(false);
    const [roundTripDistance, setRoundTripDistance] = useState(100); // Default 100 km

    useEffect(() => {
        const mapContainer = document.getElementById('debug-map');
        if (!mapContainer || mapRef.current) return;

        const leafletMap = L.map(mapContainer, {
            center: [57.1, 27.1],
            zoom: 9,
            zoomControl: true,
            attributionControl: true,
        });

        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors',
        });
        tileLayer.addTo(leafletMap);
        fixMapTiles(leafletMap);

        // Create routes layer
        const routesLayer = L.layerGroup().addTo(leafletMap);
        routesLayerRef.current = routesLayer;

        mapRef.current = leafletMap;

        return () => {
            if (leafletMap) {
                leafletMap.remove();
            }
        };
    }, []);
    
    // Load saved roads on mount
    useEffect(() => {
        const loadSavedRoads = async () => {
            setSavedRoadsLoading(true);
            try {
                // Try to get public saved roads first
                const response = await axios.get('/api/public-saved-roads');
                if (Array.isArray(response.data)) {
                    setSavedRoads(response.data);
                    // Auto-select Balvi-Celmene-Sita if it exists
                    const balviRoad = response.data.find(road => 
                        road.road_name && (
                            road.road_name.toLowerCase().includes('balvi') ||
                            road.road_name.toLowerCase().includes('celmene') ||
                            road.road_name.toLowerCase().includes('sita')
                        )
                    );
                    // Disable auto-selection for alternative routes testing
                    // if (balviRoad) {
                    //     setSelectedSavedRoads([balviRoad]);
                    //     console.log('Auto-selected saved road:', balviRoad.road_name, 'ID:', balviRoad.id);
                    // }
                }
            } catch (error) {
                console.error('Failed to load saved roads:', error);
                // Try authenticated endpoint if available
                try {
                    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
                    if (token) {
                        const authResponse = await axios.get('/api/saved-roads', {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (Array.isArray(authResponse.data)) {
                            setSavedRoads(authResponse.data);
                        }
                    }
                } catch (authError) {
                    console.error('Failed to load authenticated saved roads:', authError);
                }
            } finally {
                setSavedRoadsLoading(false);
            }
        };
        
        loadSavedRoads();
    }, []);

    const addWaypoint = (city) => {
        const newWaypoint = {
            id: Date.now(),
            name: city.name,
            lat: city.lat,
            lng: city.lng
        };
        setWaypoints([...waypoints, newWaypoint]);
    };

    const removeWaypoint = (id) => {
        setWaypoints(waypoints.filter(wp => wp.id !== id));
    };

    const clearWaypoints = () => {
        setWaypoints([]);
    };

    const calculateRoutes = async () => {
        setIsCalculating(true);
        setRoutes([]);
        setSelectedRoute(null);
        setRouteStats(null);
        setDeadEnds([]);
        setAlternativeRoutes([]);
        setSelectedAlternativeIndex(0);
        
        if (routesLayerRef.current) {
            routesLayerRef.current.clearLayers();
        }

        try {
            const waypointsData = waypoints.map(wp => ({ lat: wp.lat, lon: wp.lng }));
            const savedRoadIds = selectedSavedRoads.map(road => road.id);
            
            // Get auth token from localStorage
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            const requestHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            console.log('=== DEBUG ROUTE CALCULATION ===');
            console.log('Start:', DEBUG_START);
            console.log('End:', DEBUG_END);
            console.log('Waypoints:', waypointsData);
            console.log('Saved Road IDs:', savedRoadIds);
            console.log('Selected Saved Roads:', selectedSavedRoads.map(r => ({ id: r.id, name: r.road_name })));
            console.log('Show Alternative Routes:', showAlternativeRoutes);
            console.log('Avoid Options:', avoidOptions);
            console.log('Has Auth Token:', !!token);
            
            const axiosConfig = { 
                timeout: 120000,
                headers: requestHeaders
            };
            
            // Prepare request payload
            const basePayload = {
                start_lat: DEBUG_START.lat,
                start_lon: DEBUG_START.lng,
                end_lat: DEBUG_END.lat,
                end_lon: DEBUG_END.lng,
                waypoints: waypointsData,
                saved_road_ids: savedRoadIds,
                avoid_options: avoidOptions
            };
            
            let straightestRes, balancedRes, curvyRes, extraCurvyRes;
            
            // Check if alternative routes are compatible with current settings
            const hasSavedRoads = savedRoadIds && savedRoadIds.length > 0;
            const hasWaypoints = waypoints && waypoints.length > 0;
            const hasPoiWaypoints = waypoints && waypoints.some(wp => wp.isPoi);
            
            // Block alternative routes if incompatible features are used
            if (showAlternativeRoutes && (hasSavedRoads || hasPoiWaypoints)) {
                const reasons = [];
                if (hasSavedRoads) reasons.push('saved roads');
                if (hasPoiWaypoints) reasons.push('POI waypoints');
                
                setAlternativeRoutesBlocked(true);
                setAlternativeRoutesWarning(`Alternative routes are not available when using ${reasons.join(' or ')}. Please disable alternative routes or remove ${reasons.join(' and ')}.`);
                setShowAlternativeRoutes(false);
                setAlternativeRoutes([]);
            } else {
                setAlternativeRoutesBlocked(false);
                setAlternativeRoutesWarning(null);
            }
            
            // If alternative routes enabled, make ONE API call with alternative_routes: true
            if (showAlternativeRoutes) {
                console.log('Calculating routes with alternative routes enabled...');
                try {
                    const response = await axios.post('/api/routes/graphhopper', {
                        ...basePayload,
                        curvature_level: 'straightest',
                        alternative_routes: true
                    }, axiosConfig);
                    
                    const responseData = response.data;
                    console.log('Alternative routes response:', responseData);
                    console.log('Response type:', typeof responseData);
                    console.log('Is array?', Array.isArray(responseData));
                    console.log('Has routes property?', responseData.routes !== undefined);
                    console.log('Routes is array?', Array.isArray(responseData.routes));
                    console.log('Routes length:', responseData.routes?.length);
                    console.log('Single route flag:', responseData.single_route);
                    
                    // Check if response contains alternative routes
                    // Handle different response formats
                    let routesArray = null;
                    
                    if (responseData.routes && Array.isArray(responseData.routes)) {
                        routesArray = responseData.routes;
                    } else if (Array.isArray(responseData)) {
                        routesArray = responseData;
                    } else if (responseData && !responseData.error) {
                        // Single route object - wrap in array
                        routesArray = [responseData];
                    }
                    
                    if (routesArray && routesArray.length > 1) {
                        console.log(`Found ${routesArray.length} alternative routes`);
                        setAlternativeRoutes(routesArray);
                        setSelectedAlternativeIndex(0);
                        setAlternativeRoutesWarning(null);
                        
                        // Use first route as straightest, duplicate for other types for compatibility
                        const firstRoute = routesArray[0];
                        straightestRes = { data: firstRoute };
                        balancedRes = { data: firstRoute };
                        curvyRes = { data: firstRoute };
                        extraCurvyRes = { data: firstRoute };
                    } else if (routesArray && routesArray.length === 1) {
                        // Only one route returned when alternatives were requested
                        console.warn('Alternative routes requested but only one route returned');
                        setAlternativeRoutes([]);
                        setAlternativeRoutesWarning('Alternative routes are not available for this route. Only one route option was found.');
                        
                        const singleRoute = routesArray[0];
                        straightestRes = { data: singleRoute };
                        balancedRes = { data: singleRoute };
                        curvyRes = { data: singleRoute };
                        extraCurvyRes = { data: singleRoute };
                    } else {
                        // No valid routes
                        console.error('No valid routes in response:', responseData);
                        setAlternativeRoutes([]);
                        setAlternativeRoutesWarning('Failed to calculate alternative routes. No valid routes returned.');
                        throw new Error('No valid routes returned');
                    }
                } catch (err) {
                    console.error('Error fetching routes with alternatives:', err);
                    setAlternativeRoutesWarning('Failed to calculate alternative routes. ' + (err.response?.data?.message || err.message || 'Unknown error'));
                    throw new Error(`Route calculation failed: ${err.response?.data?.message || err.message || 'Unknown error'}`);
                }
            } else {
                // Calculate all four GraphHopper route types with different curvature levels
                [straightestRes, balancedRes, curvyRes, extraCurvyRes] = await Promise.all([
                    axios.post('/api/routes/graphhopper', {
                        ...basePayload,
                        curvature_level: 'straightest',
                        alternative_routes: false
                    }, axiosConfig).catch(err => {
                        console.error('Error fetching straightest route:', err);
                        throw new Error(`Straightest route failed: ${err.message || 'Unknown error'}`);
                    }),
                    axios.post('/api/routes/graphhopper', {
                        ...basePayload,
                        curvature_level: 'balanced',
                        alternative_routes: false
                    }, axiosConfig).catch(err => {
                        console.error('Error fetching balanced route:', err);
                        throw new Error(`Balanced route failed: ${err.message || 'Unknown error'}`);
                    }),
                    axios.post('/api/routes/graphhopper', {
                        ...basePayload,
                        curvature_level: 'curvy',
                        alternative_routes: false
                    }, axiosConfig).catch(err => {
                        console.error('Error fetching curvy route:', err);
                        throw new Error(`Curvy route failed: ${err.message || 'Unknown error'}`);
                    }),
                    axios.post('/api/routes/graphhopper', {
                        ...basePayload,
                        curvature_level: 'extra_curvy',
                        alternative_routes: false
                    }, axiosConfig).catch(err => {
                        console.error('Error fetching extra_curvy route:', err);
                        throw new Error(`Extra Curvy route failed: ${err.message || 'Unknown error'}`);
                    })
                ]);
            }

            // GraphHopper routes with distinct colors
            const calculatedRoutes = [
                { ...straightestRes.data, type: 'straightest', color: '#006400' }, // Dark green for straightest route
                { ...balancedRes.data, type: 'balanced', color: '#0066ff' }, // Bright blue
                { ...curvyRes.data, type: 'curvy', color: '#ff6600' }, // Bright orange
                { ...extraCurvyRes.data, type: 'extra_curvy', color: '#ff0033' } // Bright red
            ];

            // Debug: Log route coordinate counts to identify incomplete routes
            console.log('=== ROUTE GENERATION DEBUG ===');
            calculatedRoutes.forEach(route => {
                const coordCount = route.coordinates?.length || 0;
                const hasCoords = coordCount > 0;
                console.log(`Route ${route.type}:`, {
                    coordinates: coordCount,
                    distance: `${(route.distance / 1000)?.toFixed(2)} km`,
                    duration: `${Math.round(route.duration / 60)} min`,
                    hasCoordinates: hasCoords,
                    curvature: route.curvature,
                    fullRoute: route
                });
                if (coordCount < 10) {
                    console.warn(`Route ${route.type} has very few coordinates (${coordCount}), may be incomplete!`);
                }
                if (!hasCoords) {
                    console.error(`Route ${route.type} HAS NO COORDINATES!`);
                }
            });
            console.log('=== END ROUTE DEBUG ===');

            // Filter out routes without coordinates
            const validRoutes = calculatedRoutes.filter(route => {
                const hasCoords = route.coordinates && route.coordinates.length > 0;
                if (!hasCoords) {
                    console.error(`Filtering out route ${route.type} - no coordinates`);
                }
                return hasCoords;
            });
            
            if (validRoutes.length < calculatedRoutes.length) {
                console.warn(`Some routes were filtered out. Valid: ${validRoutes.length}, Total: ${calculatedRoutes.length}`);
            }
            
            if (validRoutes.length === 0) {
                console.error('No valid routes to display! All routes were filtered out.');
                alert('No valid routes could be calculated. Check console for details.');
                setIsCalculating(false);
                return;
            }
            
            const enrichedRoutes = validRoutes.map((route, index) => ({
                ...route,
                routeIndex: index,
                routeId: `route-${route.type}-${index}`
            }));

            console.log(`Setting ${enrichedRoutes.length} routes to state:`, enrichedRoutes.map(r => ({ type: r.type, coords: r.coordinates?.length })));
            setRoutes(enrichedRoutes);
            if (typeof window !== 'undefined') {
                window.__debugEnrichedRoutes = enrichedRoutes;
            }
            setSelectedRoute(null); // Ensure no route is selected initially - show all routes
            setRouteStats(null); // Clear route stats when recalculating
            
            // Force show all routes initially and ensure they're visible
            setTimeout(() => {
                if (routesLayerRef.current && enrichedRoutes.length > 0) {
                    showAllRoutes();
                    
                    // If alternative routes are enabled, display them after main routes
                    if (showAlternativeRoutes && alternativeRoutes.length > 1) {
                        displayAlternativeRoutesOnMap();
                    }
                    
                    // Show notification if alternatives were requested but not available
                    if (showAlternativeRoutes && alternativeRoutes.length <= 1 && !alternativeRoutesBlocked) {
                        // Notification already set in calculateRoutes function
                    }
                    
                    // Force map refresh to ensure routes are visible
                    if (mapRef.current) {
                        mapRef.current.invalidateSize();
                    }
                }
            }, 100);
            
            // Validate routes match their parameters (use validRoutes)
            const validation = validateRouteParameters(enrichedRoutes);
            if (!validation.valid || validation.warnings.length > 0) {
                console.warn('Route validation:', validation);
            }
            
            // Generate route comparison (use enrichedRoutes)
            const comparison = generateRouteComparison(enrichedRoutes);
            console.log('Route comparison:', comparison);
            
            // Analyze dead ends will be called after analyzeDeadEnds completes
            if (mapRef.current && routesLayerRef.current) {
                // Start marker - no shadow
                const startIcon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                L.marker([DEBUG_START.lat, DEBUG_START.lng], { icon: startIcon })
                    .bindPopup(`<b>Start:</b> ${DEBUG_START.name}`)
                    .addTo(routesLayerRef.current);
                
                // End marker - no shadow
                const endIcon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                L.marker([DEBUG_END.lat, DEBUG_END.lng], { icon: endIcon })
                    .bindPopup(`<b>End:</b> ${DEBUG_END.name}`)
                    .addTo(routesLayerRef.current);
                
                // Waypoint markers - no shadow
                waypoints.forEach((wp, idx) => {
                    const wpIcon = L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background-color: #f59e0b; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });
                    L.marker([wp.lat, wp.lng], { icon: wpIcon })
                        .bindPopup(`<b>Waypoint ${idx + 1}:</b> ${wp.name}`)
                        .addTo(routesLayerRef.current);
                });
            }
            
            // Draw all valid routes on map
            const allBounds = [];
            layerRegistryRef.current = {};
            if (typeof window !== 'undefined') {
                window.__debugLayers = [];
            }
            enrichedRoutes.forEach((route, index) => {
                // Validate route has coordinates
                if (!route.coordinates || route.coordinates.length === 0) {
                    console.warn(`Route ${route.type} has no coordinates`);
                    return;
                }
                
                // Validate coordinates format and filter out invalid ones
                const validLatlngs = route.coordinates
                    .map(coord => {
                        // Handle both [lat, lng] and {lat, lng} formats
                        if (Array.isArray(coord)) {
                            return coord.length >= 2 && !isNaN(coord[0]) && !isNaN(coord[1]) 
                                ? [coord[0], coord[1]] 
                                : null;
                        } else if (coord && typeof coord === 'object') {
                            return coord.lat && coord.lng 
                                ? [coord.lat, coord.lng] 
                                : null;
                        }
                        return null;
                    })
                    .filter(coord => coord !== null);
                
                if (validLatlngs.length < 2) {
                    console.error(`Route ${route.type} has insufficient valid coordinates: ${validLatlngs.length}`, {
                        originalCount: route.coordinates?.length,
                        route: route
                    });
                    return;
                }
                
                // Log route completeness
                console.log(`Drawing route ${route.type}: ${validLatlngs.length} valid coordinates`);
                
                // EXTREME: Very bright colors and VERY thick lines with white outline for maximum visibility
                // Even thicker for debug page
                // Straightest route gets extra thickness and darker green
                const isStraightest = route.type === 'straightest';
                const routeWeight = isStraightest ? 80 : 60; // Straightest route is thicker
                const outlineWeight = isStraightest ? 90 : 70; // Thicker outline for straightest
                
                const polyline = L.polyline(validLatlngs, {
                    color: route.color,
                    weight: routeWeight, // Thicker for straightest route
                    opacity: 1.0, // Full opacity for brightness
                    fillOpacity: 1.0, // Full opacity
                    dashArray: null, // Solid line
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'route-line-highlight' // Add class for CSS highlighting
                }).addTo(routesLayerRef.current);
                
                // Verify polyline was created successfully
                if (!polyline || !polyline.getLatLngs || polyline.getLatLngs().length === 0) {
                    console.error(`Failed to create polyline for route ${route.type}`);
                    return;
                }
                
                // Add white outline for contrast - create a thicker white line underneath
                const outline = L.polyline(validLatlngs, {
                    color: '#ffffff',
                    weight: outlineWeight, // Thicker outline for straightest route
                    opacity: 1.0,
                    fillOpacity: 1.0,
                    dashArray: null, // Solid line
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'route-outline'
                }).addTo(routesLayerRef.current);
                
                // Bring colored route to front
                polyline.bringToFront();
                
                // Force update style to ensure visibility - keep very thick weight
                polyline.setStyle({
                    weight: routeWeight, // Match the initial weight
                    opacity: 1.0
                });
                
                // Store outline reference for cleanup
                polyline.outlineLayer = outline;
                
                // Store reference for highlighting - CRITICAL: Store route data for selection
                polyline.routeType = route.type;
                polyline.routeData = route;
                polyline.isKurviger = false;
                polyline.routeIndex = index;
                polyline.routeId = route.routeId ?? `route-${route.type}-${index}`; // Unique ID for matching
                
                // Also store on outline for easier lookup
                outline.routeType = route.type;
                outline.isOutline = true;
                outline.routeIndex = index;
                outline.routeId = `${polyline.routeId}-outline`;
                
                layerRegistryRef.current[route.routeId] = {
                    main: polyline,
                    outline,
                    color: route.color || resolveLayerColor(polyline)
                };
                
                if (typeof window !== 'undefined') {
                    window.__debugLayers.push({
                        routeId: polyline.routeId,
                        routeType: polyline.routeType,
                        routeIndex: index,
                        color: polyline.options?.color
                    });
                }

                // Format route type for display
                const routeTypeLabel = route.type === 'straightest' ? 'Straightest' 
                    : route.type === 'balanced' ? 'Balanced' 
                    : route.type === 'curvy' ? 'Curvy' 
                    : route.type === 'extra_curvy' ? 'Extra Curvy' 
                    : route.type;
                polyline.bindPopup(`<b>${routeTypeLabel}</b><br>Distance: ${(route.distance / 1000)?.toFixed(2)} km<br>Duration: ${Math.round(route.duration / 60)} min${route.curvature ? `<br>Curvature: ${route.curvature.toFixed(2)}` : ''}`);
                
                // Collect bounds from polyline
                try {
                    const bounds = polyline.getBounds();
                    if (bounds && bounds.isValid()) {
                        allBounds.push(bounds);
                    }
                } catch (e) {
                    console.warn('Could not get bounds for route:', route.type, e);
                }
            });
            
            // Include Kurviger routes in bounds calculation
            kurvigerRoutes.forEach(route => {
                if (route.coordinates && route.coordinates.length > 0) {
                    const latlngs = route.coordinates.map(coord => [coord[0], coord[1]]);
                    try {
                        const tempPolyline = L.polyline(latlngs);
                        const bounds = tempPolyline.getBounds();
                        if (bounds && bounds.isValid()) {
                            allBounds.push(bounds);
                        }
                    } catch (e) {
                        console.warn('Could not get bounds for Kurviger route:', e);
                    }
                }
            });
            
            // Fit map to show all routes with markers
            if (allBounds.length > 0 && mapRef.current) {
                try {
                    // Create bounds from all route bounds
                    let combinedBounds = allBounds[0];
                    for (let i = 1; i < allBounds.length; i++) {
                        combinedBounds.extend(allBounds[i]);
                    }
                    
                    // Include start/end/waypoints
                    combinedBounds.extend([DEBUG_START.lat, DEBUG_START.lng]);
                    combinedBounds.extend([DEBUG_END.lat, DEBUG_END.lng]);
                    waypoints.forEach(wp => {
                        combinedBounds.extend([wp.lat, wp.lng]);
                    });
                    
                    // Use setTimeout to ensure routes are rendered before fitting bounds
                    setTimeout(() => {
                        if (mapRef.current && combinedBounds && combinedBounds.isValid()) {
                            mapRef.current.fitBounds(combinedBounds, { padding: [50, 50], maxZoom: 12 });
                            mapRef.current.invalidateSize();
                        }
                    }, 100);
                } catch (e) {
                    console.error('Error fitting bounds:', e);
                    // Fallback: just center on start point
                    if (mapRef.current) {
                        setTimeout(() => {
                            mapRef.current.setView([DEBUG_START.lat, DEBUG_START.lng], 9);
                        }, 100);
                    }
                }
            }
            
            // Force map refresh to ensure routes are visible
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize();
                }
            }, 200);

            // Analyze routes for dead ends
            analyzeDeadEnds(enrichedRoutes);

        } catch (error) {
            console.error('Error calculating routes:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
            const statusCode = error.response?.status;
            alert(`Error calculating routes (${statusCode || 'N/A'}): ${errorMessage}\n\nCheck console for details.`);
        } finally {
            setIsCalculating(false);
        }
    };

    const calculateRoundTrip = async () => {
        setIsCalculating(true);
        setRoutes([]);
        setSelectedRoute(null);
        setRouteStats(null);
        setDeadEnds([]);
        
        if (routesLayerRef.current) {
            routesLayerRef.current.clearLayers();
        }

        try {
            const savedRoadIds = selectedSavedRoads.map(road => road.id);
            
            console.log('=== DEBUG ROUND TRIP CALCULATION ===');
            console.log('Start:', DEBUG_START);
            console.log('Distance (km):', roundTripDistance);
            console.log('Curvature Level:', curvatureLevel);
            console.log('Saved Road IDs:', savedRoadIds);
            console.log('Selected Saved Roads:', selectedSavedRoads.map(r => ({ id: r.id, name: r.road_name })));
            
            const axiosConfig = { timeout: 180000 }; // 3 minute timeout for round trip
            
            const response = await axios.post('/api/routes/round-trip', {
                start_lat: DEBUG_START.lat,
                start_lon: DEBUG_START.lng,
                distance_km: roundTripDistance,
                curvature_level: curvatureLevel,
                saved_road_ids: savedRoadIds
            }, axiosConfig);
            
            if (!response.data || !response.data.coordinates || response.data.coordinates.length === 0) {
                console.error('Round trip route has no coordinates');
                alert('Round trip route could not be calculated. Check console for details.');
                setIsCalculating(false);
                return;
            }
            
            const roundTripRoute = {
                ...response.data,
                type: 'round_trip',
                color: '#9b59b6', // Purple for round trip
                routeId: 'round-trip-route'
            };
            
            console.log('Round trip route calculated:', {
                coordinates: roundTripRoute.coordinates.length,
                distance: `${(roundTripRoute.distance / 1000)?.toFixed(2)} km`,
                target_distance: `${roundTripRoute.target_distance_km || roundTripDistance} km`,
                actual_distance: `${roundTripRoute.actual_distance_km || (roundTripRoute.distance / 1000)?.toFixed(2)} km`,
                duration: `${Math.round(roundTripRoute.duration / 60)} min`,
                curvature: roundTripRoute.curvature,
                is_round_trip: roundTripRoute.is_round_trip
            });
            
            setRoutes([roundTripRoute]);
            setSelectedRoute(null);
            
            // Draw start marker (same as end for round trip)
            if (mapRef.current && routesLayerRef.current) {
                const startIcon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background-color: #9b59b6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                L.marker([DEBUG_START.lat, DEBUG_START.lng], { icon: startIcon })
                    .bindPopup(`<b>Start/End:</b> ${DEBUG_START.name} (Round Trip)`)
                    .addTo(routesLayerRef.current);
            }
            
            // Draw round trip route on map
            const allBounds = [];
            layerRegistryRef.current = {};
            if (typeof window !== 'undefined') {
                window.__debugLayers = [];
            }
            
            const route = roundTripRoute;
            if (route.coordinates && route.coordinates.length > 0) {
                const validLatlngs = route.coordinates
                    .map(coord => {
                        if (Array.isArray(coord)) {
                            return coord.length >= 2 && !isNaN(coord[0]) && !isNaN(coord[1]) 
                                ? [coord[0], coord[1]] 
                                : null;
                        } else if (coord && typeof coord === 'object') {
                            return coord.lat && coord.lng 
                                ? [coord.lat, coord.lng] 
                                : null;
                        }
                        return null;
                    })
                    .filter(coord => coord !== null);
                
                if (validLatlngs.length >= 2) {
                    // Round trip styling: dashed line, purple color
                    const polyline = L.polyline(validLatlngs, {
                        color: route.color || '#9b59b6',
                        weight: 60,
                        opacity: 1.0,
                        fillOpacity: 1.0,
                        dashArray: '10, 5', // Dashed line for round trip
                        lineCap: 'round',
                        lineJoin: 'round',
                        className: 'route-line-round-trip'
                    });
                    
                    polyline.addTo(routesLayerRef.current);
                    polyline.isRoundTrip = true;
                    polyline.routeType = route.type;
                    polyline.routeId = route.routeId;
                    
                    layerRegistryRef.current[route.routeId] = polyline;
                    if (typeof window !== 'undefined') {
                        window.__debugLayers.push(polyline);
                    }
                    
                    // Add to bounds
                    try {
                        const bounds = polyline.getBounds();
                        if (bounds.isValid()) {
                            allBounds.push(bounds);
                        }
                    } catch (e) {
                        console.warn('Could not get bounds for round trip route:', e);
                    }
                }
            }
            
            // Fit map to route
            if (allBounds.length > 0 && mapRef.current) {
                try {
                    const group = new L.featureGroup(allBounds.map(b => L.rectangle(b)));
                    mapRef.current.fitBounds(group.getBounds().pad(0.1));
                } catch (e) {
                    console.warn('Could not fit bounds for round trip:', e);
                }
            }
            
            setIsCalculating(false);
        } catch (error) {
            console.error('Error calculating round trip:', error);
            alert(`Round trip calculation failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
            setIsCalculating(false);
        }
    };

    const calculateStrategy1 = async () => {
        setIsCalculatingStrategy1(true);
        
        try {
            const response = await axios.post('/api/routes/strategy1', {
                start_lat: DEBUG_START.lat,
                start_lon: DEBUG_START.lng,
                end_lat: DEBUG_END.lat,
                end_lon: DEBUG_END.lng,
                curvature_level: 'balanced'
            }, { timeout: 120000 });
            
            const route = response.data;
            
            // Check if response has error
            if (route.error) {
                alert(`Strategy 1 Error: ${route.message || route.error}`);
                setStrategy1Route(null);
                return;
            }
            
            setStrategy1Route(route);
            
            // Draw route on map
            if (mapRef.current && routesLayerRef.current && route.coordinates) {
                // Remove existing Strategy 1 route if any
                routesLayerRef.current.eachLayer((layer) => {
                    if (layer.options && layer.options.strategy === 'strategy1') {
                        routesLayerRef.current.removeLayer(layer);
                    }
                });
                
                const coords = route.coordinates.map(c => [c[0], c[1]]);
                const polyline = L.polyline(coords, {
                    color: '#3b82f6',
                    weight: 5,
                    opacity: 0.9,
                    strategy: 'strategy1'
                }).bindPopup('Strategy 1: OSRM Alternatives').addTo(routesLayerRef.current);
                
                // Add markers only if they don't exist
                let hasStartMarker = false;
                let hasEndMarker = false;
                routesLayerRef.current.eachLayer((layer) => {
                    if (layer instanceof L.Marker) {
                        const latlng = layer.getLatLng();
                        if (Math.abs(latlng.lat - DEBUG_START.lat) < 0.0001 && 
                            Math.abs(latlng.lng - DEBUG_START.lng) < 0.0001) {
                            hasStartMarker = true;
                        }
                        if (Math.abs(latlng.lat - DEBUG_END.lat) < 0.0001 && 
                            Math.abs(latlng.lng - DEBUG_END.lng) < 0.0001) {
                            hasEndMarker = true;
                        }
                    }
                });
                
                if (!hasStartMarker) {
                    const startIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    L.marker([DEBUG_START.lat, DEBUG_START.lng], { icon: startIcon })
                        .bindPopup(`<b>Start:</b> ${DEBUG_START.name}`)
                        .addTo(routesLayerRef.current);
                }
                
                if (!hasEndMarker) {
                    const endIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    L.marker([DEBUG_END.lat, DEBUG_END.lng], { icon: endIcon })
                        .bindPopup(`<b>End:</b> ${DEBUG_END.name}`)
                        .addTo(routesLayerRef.current);
                }
                
                // Fit bounds to show all routes
                const bounds = L.latLngBounds(coords);
                bounds.extend([DEBUG_START.lat, DEBUG_START.lng]);
                bounds.extend([DEBUG_END.lat, DEBUG_END.lng]);
                
                // Include Strategy 2 route if it exists
                if (strategy2Route && strategy2Route.coordinates) {
                    strategy2Route.coordinates.forEach(c => bounds.extend([c[0], c[1]]));
                }
                
                setTimeout(() => {
                    if (mapRef.current && bounds.isValid()) {
                        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error calculating Strategy 1:', error);
            alert(`Error calculating Strategy 1: ${error.message || 'Unknown error'}`);
        } finally {
            setIsCalculatingStrategy1(false);
        }
    };

    const calculateStrategy2 = async () => {
        setIsCalculatingStrategy2(true);
        
        try {
            const response = await axios.post('/api/routes/strategy2', {
                start_lat: DEBUG_START.lat,
                start_lon: DEBUG_START.lng,
                end_lat: DEBUG_END.lat,
                end_lon: DEBUG_END.lng,
                curvature_level: 'balanced'
            }, { timeout: 120000 });
            
            const route = response.data;
            
            // Check if response has error
            if (route.error) {
                alert(`Strategy 2 Error: ${route.message || route.error}`);
                setStrategy2Route(null);
                return;
            }
            
            setStrategy2Route(route);
            
            // Draw route on map
            if (mapRef.current && routesLayerRef.current && route.coordinates) {
                // Remove existing Strategy 2 route if any
                routesLayerRef.current.eachLayer((layer) => {
                    if (layer.options && layer.options.strategy === 'strategy2') {
                        routesLayerRef.current.removeLayer(layer);
                    }
                });
                
                const coords = route.coordinates.map(c => [c[0], c[1]]);
                const polyline = L.polyline(coords, {
                    color: '#10b981',
                    weight: 5,
                    opacity: 0.9,
                    strategy: 'strategy2'
                }).bindPopup('Strategy 2: OSM Curved Roads').addTo(routesLayerRef.current);
                
                // Add markers only if they don't exist
                let hasStartMarker = false;
                let hasEndMarker = false;
                routesLayerRef.current.eachLayer((layer) => {
                    if (layer instanceof L.Marker) {
                        const latlng = layer.getLatLng();
                        if (Math.abs(latlng.lat - DEBUG_START.lat) < 0.0001 && 
                            Math.abs(latlng.lng - DEBUG_START.lng) < 0.0001) {
                            hasStartMarker = true;
                        }
                        if (Math.abs(latlng.lat - DEBUG_END.lat) < 0.0001 && 
                            Math.abs(latlng.lng - DEBUG_END.lng) < 0.0001) {
                            hasEndMarker = true;
                        }
                    }
                });
                
                if (!hasStartMarker) {
                    const startIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    L.marker([DEBUG_START.lat, DEBUG_START.lng], { icon: startIcon })
                        .bindPopup(`<b>Start:</b> ${DEBUG_START.name}`)
                        .addTo(routesLayerRef.current);
                }
                
                if (!hasEndMarker) {
                    const endIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    L.marker([DEBUG_END.lat, DEBUG_END.lng], { icon: endIcon })
                        .bindPopup(`<b>End:</b> ${DEBUG_END.name}`)
                        .addTo(routesLayerRef.current);
                }
                
                // Fit bounds to show all routes
                const bounds = L.latLngBounds(coords);
                bounds.extend([DEBUG_START.lat, DEBUG_START.lng]);
                bounds.extend([DEBUG_END.lat, DEBUG_END.lng]);
                
                // Include Strategy 1 route if it exists
                if (strategy1Route && strategy1Route.coordinates) {
                    strategy1Route.coordinates.forEach(c => bounds.extend([c[0], c[1]]));
                }
                
                setTimeout(() => {
                    if (mapRef.current && bounds.isValid()) {
                        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error calculating Strategy 2:', error);
            alert(`Error calculating Strategy 2: ${error.message || 'Unknown error'}`);
        } finally {
            setIsCalculatingStrategy2(false);
        }
    };

    // Check GraphHopper connection status
    const checkGraphHopperStatus = async () => {
        try {
            const response = await axios.get('/api/routes/graphhopper/test');
            setGraphHopperStatus(response.data);
        } catch (error) {
            console.error('Error checking GraphHopper status:', error);
            setGraphHopperStatus({ connected: false, error: error.message });
        }
    };

    // Calculate route using GraphHopper
    const calculateGraphHopper = async () => {
        setIsCalculatingGraphHopper(true);

        try {
            const response = await axios.post('/api/routes/graphhopper', {
                start_lat: DEBUG_START.lat,
                start_lon: DEBUG_START.lng,
                end_lat: DEBUG_END.lat,
                end_lon: DEBUG_END.lng,
                curvature_level: curvatureLevel
            }, { timeout: 30000 });

            const route = response.data;

            // Check if response has error
            if (route.error) {
                alert(`GraphHopper Error: ${route.message || route.error}`);
                setGraphHopperRoute(null);
                return;
            }

            setGraphHopperRoute(route);

            // Draw route on map
            if (mapRef.current && routesLayerRef.current && route.coordinates) {
                // Remove existing GraphHopper route if any
                routesLayerRef.current.eachLayer((layer) => {
                    if (layer.options && layer.options.strategy === 'graphhopper') {
                        routesLayerRef.current.removeLayer(layer);
                    }
                });

                const coords = route.coordinates.map(c => [c[0], c[1]]);
                const polyline = L.polyline(coords, {
                    color: '#f59e0b',
                    weight: 5,
                    opacity: 0.9,
                    strategy: 'graphhopper'
                }).bindPopup(`GraphHopper: ${curvatureLevel.replace('_', ' ')}`).addTo(routesLayerRef.current);

                // Add markers only if they don't exist
                let hasStartMarker = false;
                let hasEndMarker = false;
                routesLayerRef.current.eachLayer((layer) => {
                    if (layer instanceof L.Marker) {
                        const latlng = layer.getLatLng();
                        if (Math.abs(latlng.lat - DEBUG_START.lat) < 0.0001 &&
                            Math.abs(latlng.lng - DEBUG_START.lng) < 0.0001) {
                            hasStartMarker = true;
                        }
                        if (Math.abs(latlng.lat - DEBUG_END.lat) < 0.0001 &&
                            Math.abs(latlng.lng - DEBUG_END.lng) < 0.0001) {
                            hasEndMarker = true;
                        }
                    }
                });

                if (!hasStartMarker) {
                    const startIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    L.marker([DEBUG_START.lat, DEBUG_START.lng], { icon: startIcon })
                        .bindPopup(`<b>Start:</b> ${DEBUG_START.name}`)
                        .addTo(routesLayerRef.current);
                }

                if (!hasEndMarker) {
                    const endIcon = L.divIcon({
                        className: 'custom-marker',
                        html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    L.marker([DEBUG_END.lat, DEBUG_END.lng], { icon: endIcon })
                        .bindPopup(`<b>End:</b> ${DEBUG_END.name}`)
                        .addTo(routesLayerRef.current);
                }

                // Fit bounds to show all routes
                const bounds = L.latLngBounds(coords);
                bounds.extend([DEBUG_START.lat, DEBUG_START.lng]);
                bounds.extend([DEBUG_END.lat, DEBUG_END.lng]);

                // Include other routes if they exist
                if (strategy1Route && strategy1Route.coordinates) {
                    strategy1Route.coordinates.forEach(c => bounds.extend([c[0], c[1]]));
                }
                if (strategy2Route && strategy2Route.coordinates) {
                    strategy2Route.coordinates.forEach(c => bounds.extend([c[0], c[1]]));
                }

                setTimeout(() => {
                    if (mapRef.current && bounds.isValid()) {
                        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error calculating GraphHopper route:', error);
            alert(`Error calculating GraphHopper route: ${error.message || 'Unknown error'}`);
        } finally {
            setIsCalculatingGraphHopper(false);
        }
    };

    // Check GraphHopper status on mount
    useEffect(() => {
        checkGraphHopperStatus();
    }, []);
    
    // Calculate route with segment-specific curvature
    const calculateSegmentCurvatureRoute = async () => {
        if (waypoints.length === 0) {
            alert('Please add at least one waypoint to use segment-specific curvature');
            return;
        }
        
        setIsCalculatingSegmentCurvature(true);
        setSegmentCurvatureRoute(null);
        
        try {
            // Ensure we have curvature levels for all segments (start->wp1, wp1->wp2, ..., wpN->end)
            const numSegments = waypoints.length + 1;
            const curvatureLevels = [...segmentCurvatureLevels];
            
            // Pad if needed
            while (curvatureLevels.length < numSegments) {
                curvatureLevels.push(curvatureLevels[curvatureLevels.length - 1] || 'balanced');
            }
            
            const response = await axios.post('/api/routes/graphhopper/segment-curvature', {
                start_lat: DEBUG_START.lat,
                start_lon: DEBUG_START.lng,
                end_lat: DEBUG_END.lat,
                end_lon: DEBUG_END.lng,
                waypoints: waypoints.map(wp => ({ lat: wp.lat, lon: wp.lng })),
                segment_curvature: curvatureLevels.slice(0, numSegments),
                avoid_options: avoidOptions
            }, { timeout: 120000 });
            
            if (response.data.error) {
                alert(`Error: ${response.data.error}`);
                setIsCalculatingSegmentCurvature(false);
                return;
            }
            
            const route = response.data;
            
            // Draw route on map
            if (mapRef.current && routesLayerRef.current && route.coordinates && route.coordinates.length > 0) {
                // Remove existing segment curvature route if any
                routesLayerRef.current.eachLayer((layer) => {
                    if (layer.options && layer.options.strategy === 'segment_curvature') {
                        routesLayerRef.current.removeLayer(layer);
                    }
                });
                
                const coords = route.coordinates.map(c => [c[0], c[1]]);
                const polyline = L.polyline(coords, {
                    color: '#9b59b6', // Purple for segment-specific
                    weight: 5,
                    opacity: 0.9,
                    strategy: 'segment_curvature'
                }).bindPopup(`Segment-Specific Curvature Route`).addTo(routesLayerRef.current);
                
                // Fit map to route - check if bounds are valid
                try {
                    const bounds = polyline.getBounds();
                    if (bounds && bounds.isValid && bounds.isValid()) {
                        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                    }
                } catch (e) {
                    console.warn('Could not fit bounds:', e);
                }
            }
            
            setSegmentCurvatureRoute(route);
        } catch (error) {
            console.error('Error calculating segment-specific curvature route:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
            console.error('Full error details:', {
                message: errorMessage,
                status: error.response?.status,
                data: error.response?.data
            });
            alert(`Error calculating route: ${errorMessage}`);
        } finally {
            setIsCalculatingSegmentCurvature(false);
        }
    };

    const compareStrategies = async () => {
        setIsComparingStrategies(true);
        setStrategyComparison(null);
        
        // Clear existing routes from map
        if (routesLayerRef.current) {
            routesLayerRef.current.clearLayers();
        }
        
        try {
            const response = await axios.post('/api/routes/compare-strategies', {
                start_lat: DEBUG_START.lat,
                start_lon: DEBUG_START.lng,
                end_lat: DEBUG_END.lat,
                end_lon: DEBUG_END.lng,
                curvature_level: 'balanced' // Can be made configurable
            }, { timeout: 120000 });
            
            const comparison = response.data;
            setStrategyComparison(comparison);
            
            // Draw routes on map
            if (mapRef.current && routesLayerRef.current) {
                // Draw straight route (baseline)
                if (comparison.straight_route?.coordinates) {
                    const straightCoords = comparison.straight_route.coordinates.map(c => [c[0], c[1]]);
                    L.polyline(straightCoords, {
                        color: '#6b7280',
                        weight: 3,
                        opacity: 0.7,
                        dashArray: null // Solid line
                    }).addTo(routesLayerRef.current);
                }
                
                // Draw Strategy 1 route (OSRM alternatives)
                if (comparison.strategy_1?.route?.coordinates) {
                    const s1Coords = comparison.strategy_1.route.coordinates.map(c => [c[0], c[1]]);
                    L.polyline(s1Coords, {
                        color: '#3b82f6',
                        weight: 5,
                        opacity: 0.9
                    }).bindPopup('Strategy 1: OSRM Alternatives').addTo(routesLayerRef.current);
                }
                
                // Draw Strategy 2 route (OSM curved roads)
                if (comparison.strategy_2?.route?.coordinates) {
                    const s2Coords = comparison.strategy_2.route.coordinates.map(c => [c[0], c[1]]);
                    L.polyline(s2Coords, {
                        color: '#10b981',
                        weight: 5,
                        opacity: 0.9
                    }).bindPopup('Strategy 2: OSM Curved Roads').addTo(routesLayerRef.current);
                }
                
                // Add markers
                const startIcon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                L.marker([DEBUG_START.lat, DEBUG_START.lng], { icon: startIcon })
                    .bindPopup(`<b>Start:</b> ${DEBUG_START.name}`)
                    .addTo(routesLayerRef.current);
                
                const endIcon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                L.marker([DEBUG_END.lat, DEBUG_END.lng], { icon: endIcon })
                    .bindPopup(`<b>End:</b> ${DEBUG_END.name}`)
                    .addTo(routesLayerRef.current);
                
                // Fit bounds
                const allBounds = L.latLngBounds([]);
                if (comparison.straight_route?.coordinates) {
                    comparison.straight_route.coordinates.forEach(c => allBounds.extend([c[0], c[1]]));
                }
                if (comparison.strategy_1?.route?.coordinates) {
                    comparison.strategy_1.route.coordinates.forEach(c => allBounds.extend([c[0], c[1]]));
                }
                if (comparison.strategy_2?.route?.coordinates) {
                    comparison.strategy_2.route.coordinates.forEach(c => allBounds.extend([c[0], c[1]]));
                }
                allBounds.extend([DEBUG_START.lat, DEBUG_START.lng]);
                allBounds.extend([DEBUG_END.lat, DEBUG_END.lng]);
                
                setTimeout(() => {
                    if (mapRef.current && allBounds.isValid()) {
                        mapRef.current.fitBounds(allBounds, { padding: [50, 50], maxZoom: 12 });
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error comparing strategies:', error);
            alert(`Error comparing strategies: ${error.message || 'Unknown error'}`);
        } finally {
            setIsComparingStrategies(false);
        }
    };

    const analyzeDeadEnds = (routes) => {
        const detectedDeadEnds = [];
        
        routes.forEach(route => {
            if (!route.coordinates || route.coordinates.length < 10) return;
            
            const coordinates = route.coordinates;
            const startPoint = coordinates[0];
            const endPoint = coordinates[coordinates.length - 1];
            
            // Sample points for analysis
            const sampleSize = Math.min(50, Math.max(25, Math.floor(coordinates.length / 10)));
            const step = Math.max(1, Math.floor(coordinates.length / sampleSize));
            const sampledPoints = [];
            
            for (let i = 0; i < coordinates.length; i += step) {
                const point = coordinates[i];
                sampledPoints.push({
                    point: point,
                    index: i,
                    distToEnd: getDistance(point[0], point[1], endPoint[0], endPoint[1]),
                    distToStart: getDistance(point[0], point[1], startPoint[0], startPoint[1])
                });
            }
            
            // Check for backtracking (moving away from destination)
            let maxBacktrack = 0;
            let backtrackLocations = [];
            let consecutiveBacktrack = 0;
            let totalBacktrack = 0;
            let previousDistToEnd = sampledPoints[0].distToEnd;
            
            for (let i = 1; i < sampledPoints.length; i++) {
                const currentDistToEnd = sampledPoints[i].distToEnd;
                
                if (currentDistToEnd > previousDistToEnd) {
                    const backtrackAmount = currentDistToEnd - previousDistToEnd;
                    maxBacktrack = Math.max(maxBacktrack, backtrackAmount);
                    consecutiveBacktrack += backtrackAmount;
                    totalBacktrack += backtrackAmount;
                    
                    // Lower threshold to catch smaller backtracks (100m instead of 200m)
                    if (backtrackAmount > 100) {
                        backtrackLocations.push({
                            point: sampledPoints[i].point,
                            backtrackAmount: backtrackAmount,
                            index: sampledPoints[i].index,
                            consecutiveBacktrack: consecutiveBacktrack
                        });
                    }
                } else {
                    // Reset consecutive backtrack when moving forward
                    if (consecutiveBacktrack > 300) {
                        // Mark the end of a significant backtrack sequence
                        backtrackLocations.push({
                            point: sampledPoints[i - 1].point,
                            backtrackAmount: consecutiveBacktrack,
                            index: sampledPoints[i - 1].index,
                            consecutiveBacktrack: consecutiveBacktrack,
                            type: 'consecutive'
                        });
                    }
                    consecutiveBacktrack = 0;
                }
                previousDistToEnd = currentDistToEnd;
            }
            
            // Check for loops and U-turns (points close together spatially but far in sequence)
            const loopLocations = [];
            for (let i = 0; i < sampledPoints.length - 5; i++) {
                for (let j = i + 5; j < sampledPoints.length; j++) {
                    const spatialDist = getDistance(
                        sampledPoints[i].point[0], sampledPoints[i].point[1],
                        sampledPoints[j].point[0], sampledPoints[j].point[1]
                    );
                    
                    // More sensitive spatial threshold (200m instead of 300m)
                    if (spatialDist < 200) {
                        const sequenceDist = Math.abs(sampledPoints[j].index - sampledPoints[i].index) * 
                            (route.distance / coordinates.length);
                        
                        // Lower sequence distance threshold (1500m instead of 2000m)
                        if (sequenceDist > 1500) {
                            // Check if this is a U-turn pattern (goes away then comes back)
                            const midIndex = Math.floor((i + j) / 2);
                            if (midIndex < sampledPoints.length) {
                                const midPoint = sampledPoints[midIndex];
                                const progress = sampledPoints[i].distToEnd - sampledPoints[j].distToEnd;
                                
                                // If midpoint is further from end than both endpoints, it's a U-turn
                                if (midPoint.distToEnd > sampledPoints[i].distToEnd && 
                                    midPoint.distToEnd > sampledPoints[j].distToEnd) {
                                    loopLocations.push({
                                        point: sampledPoints[midIndex].point,
                                        type: 'u-turn',
                                        sequenceDist: sequenceDist,
                                        progress: progress,
                                        spatialDist: spatialDist
                                    });
                                } else if (progress < 500) {
                                    // Loop that doesn't make good progress
                                    loopLocations.push({
                                        point: sampledPoints[i].point,
                                        type: 'inefficient-loop',
                                        sequenceDist: sequenceDist,
                                        progress: progress,
                                        spatialDist: spatialDist
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            // Check for branching patterns (route goes off main path and comes back)
            // This detects the pattern shown in the second image
            for (let i = 0; i < sampledPoints.length - 10; i++) {
                const point1 = sampledPoints[i];
                
                // Look ahead for a point that's close spatially but far in sequence
                for (let j = i + 10; j < sampledPoints.length; j++) {
                    const point2 = sampledPoints[j];
                    const spatialDist = getDistance(
                        point1.point[0], point1.point[1],
                        point2.point[0], point2.point[1]
                    );
                    
                    // If points are close (within 300m) but far in sequence
                    if (spatialDist < 300) {
                        const sequenceDist = Math.abs(point2.index - point1.index) * 
                            (route.distance / coordinates.length);
                        
                        if (sequenceDist > 1000) {
                            // Check if route went away from destination
                            const midIndex = Math.floor((i + j) / 2);
                            if (midIndex < sampledPoints.length) {
                                const midPoint = sampledPoints[midIndex];
                                const progress = point1.distToEnd - point2.distToEnd;
                                
                                // If midpoint is significantly further from end, it's a branch/backtrack
                                if (midPoint.distToEnd > point1.distToEnd + 200 && 
                                    progress < 1000) {
                                    loopLocations.push({
                                        point: midPoint.point,
                                        type: 'branch-backtrack',
                                        sequenceDist: sequenceDist,
                                        progress: progress,
                                        spatialDist: spatialDist,
                                        backtrackAmount: midPoint.distToEnd - point1.distToEnd
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            // More sensitive detection thresholds
            if (maxBacktrack > 300 || totalBacktrack > 800 || backtrackLocations.length > 0 || loopLocations.length > 0) {
                detectedDeadEnds.push({
                    routeType: route.type,
                    maxBacktrack: maxBacktrack,
                    totalBacktrack: totalBacktrack,
                    backtrackLocations: backtrackLocations,
                    loopLocations: loopLocations,
                    hasIssues: true
                });
            }
        });
        
        setDeadEnds(detectedDeadEnds);
        
        // Analyze dead end accuracy for false positives
        const deadEndAnalysis = analyzeDeadEndAccuracy(routes, detectedDeadEnds);
        if (deadEndAnalysis.potentialFalsePositives.length > 0) {
            console.warn('Potential false positives detected:', deadEndAnalysis.potentialFalsePositives);
        }
        
        // Mark dead ends on map
        detectedDeadEnds.forEach(deadEnd => {
            deadEnd.backtrackLocations.forEach(loc => {
                L.circleMarker([loc.point[0], loc.point[1]], {
                    radius: 8,
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.7
                }).bindPopup(`⚠️ Backtrack: ${deadEnd.routeType}<br>Amount: ${loc.backtrackAmount.toFixed(0)}m`).addTo(routesLayerRef.current);
            });
            
            deadEnd.loopLocations.forEach(loc => {
                const loopType = loc.type || 'loop';
                const typeLabel = {
                    'u-turn': 'U-Turn',
                    'inefficient-loop': 'Inefficient Loop',
                    'branch-backtrack': 'Branch Backtrack',
                    'loop': 'Loop'
                }[loopType] || 'Loop';
                
                L.circleMarker([loc.point[0], loc.point[1]], {
                    radius: 10,
                    color: '#dc2626',
                    fillColor: '#dc2626',
                    fillOpacity: 0.8,
                    weight: 2
                }).bindPopup(
                    `🔄 ${typeLabel}: ${deadEnd.routeType}<br>` +
                    `Sequence: ${loc.sequenceDist?.toFixed(0) || 0}m<br>` +
                    `Spatial: ${loc.spatialDist?.toFixed(0) || 0}m<br>` +
                    (loc.progress !== undefined ? `Progress: ${loc.progress.toFixed(0)}m<br>` : '') +
                    (loc.backtrackAmount !== undefined ? `Backtrack: ${loc.backtrackAmount.toFixed(0)}m` : '')
                ).addTo(routesLayerRef.current);
            });
        });
    };

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const calculateRouteStats = (coordinates) => {
        if (!coordinates || coordinates.length < 2) return null;
        
        let totalDistance = 0;
        let totalCurvature = 0;
        let cornerCount = 0;
        
        for (let i = 1; i < coordinates.length; i++) {
            const prev = coordinates[i - 1];
            const curr = coordinates[i];
            totalDistance += getDistance(prev[0], prev[1], curr[0], curr[1]);
        }
        
        for (let i = 1; i < coordinates.length - 1; i++) {
            const prev = coordinates[i - 1];
            const curr = coordinates[i];
            const next = coordinates[i + 1];
            
            const bearing1 = Math.atan2(
                Math.sin((curr[1] - prev[1]) * Math.PI / 180) * Math.cos(curr[0] * Math.PI / 180),
                Math.cos(prev[0] * Math.PI / 180) * Math.sin(curr[0] * Math.PI / 180) -
                Math.sin(prev[0] * Math.PI / 180) * Math.cos(curr[0] * Math.PI / 180) *
                Math.cos((curr[1] - prev[1]) * Math.PI / 180)
            ) * 180 / Math.PI;
            
            const bearing2 = Math.atan2(
                Math.sin((next[1] - curr[1]) * Math.PI / 180) * Math.cos(next[0] * Math.PI / 180),
                Math.cos(curr[0] * Math.PI / 180) * Math.sin(next[0] * Math.PI / 180) -
                Math.sin(curr[0] * Math.PI / 180) * Math.cos(next[0] * Math.PI / 180) *
                Math.cos((next[1] - curr[1]) * Math.PI / 180)
            ) * 180 / Math.PI;
            
            let angleChange = Math.abs(bearing2 - bearing1);
            if (angleChange > 180) angleChange = 360 - angleChange;
            
            if (angleChange > 15) {
                cornerCount++;
            }
            
            const segmentDist = getDistance(prev[0], prev[1], curr[0], curr[1]);
            if (segmentDist > 0) {
                totalCurvature += (angleChange * Math.PI / 180) / segmentDist;
            }
        }
        
        const curvature = totalDistance > 0 ? totalCurvature / totalDistance : 0;
        
        return {
            distance: totalDistance,
            curvature: curvature,
            corner_count: cornerCount
        };
    };

    const importKurvigerRoute = (kurvigerData) => {
        try {
            let routeData;
            if (typeof kurvigerData === 'string') {
                routeData = JSON.parse(kurvigerData);
            } else {
                routeData = kurvigerData;
            }
            
            // Validate route data
            if (!routeData.coordinates || !Array.isArray(routeData.coordinates)) {
                throw new Error('Invalid route data: coordinates array required');
            }
            
            // Calculate stats if not provided
            const stats = routeData.distance ? null : calculateRouteStats(routeData.coordinates);
            
            const routeId = routeData.routeId || `kurviger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const kurvigerRoute = {
                type: routeData.type || 'kurviger',
                name: routeData.name || 'Kurviger Route',
                coordinates: routeData.coordinates,
                distance: routeData.distance || (stats?.distance || 0),
                duration: routeData.duration || 0,
                curvature: routeData.curvature || (stats?.curvature || 0),
                corner_count: routeData.corner_count || (stats?.corner_count || 0),
                color: routeData.color || '#9b59b6', // Purple for Kurviger
                isKurviger: true,
                routeId
            };
            
            setKurvigerRoutes([...kurvigerRoutes, kurvigerRoute]);
            
            // Draw on map
            if (routesLayerRef.current && kurvigerRoute.coordinates.length > 0) {
                const latlngs = kurvigerRoute.coordinates.map(coord => [coord[0], coord[1]]);
                // Add white outline for Kurviger routes too
                const outline = L.polyline(latlngs, {
                    color: '#ffffff',
                    weight: 35, // Thick white outline
                    opacity: 1.0,
                    dashArray: null, // Solid line
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'kurviger-route-outline'
                }).addTo(routesLayerRef.current);
                
                const polyline = L.polyline(latlngs, {
                    color: kurvigerRoute.color,
                    weight: 30, // Thicker for visibility (increased from 20)
                    opacity: 1.0, // Full opacity
                    dashArray: null, // Solid line
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'kurviger-route-line'
                }).addTo(routesLayerRef.current);
                
                // Bring colored route to front
                polyline.bringToFront();
                
                // Store outline reference
                polyline.outlineLayer = outline;
                
                polyline.bindPopup(
                    `<b>${kurvigerRoute.name}</b><br>` +
                    `Distance: ${(kurvigerRoute.distance / 1000)?.toFixed(2)} km<br>` +
                    (kurvigerRoute.duration ? `Duration: ${Math.round(kurvigerRoute.duration / 60)} min<br>` : '') +
                    (kurvigerRoute.curvature ? `Curvature: ${kurvigerRoute.curvature.toFixed(6)}` : '')
                );
                
                polyline.routeType = kurvigerRoute.type;
                polyline.routeData = kurvigerRoute;
                polyline.routeId = routeId;
                polyline.isKurviger = true;
                
                if (!layerRegistryRef.current) {
                    layerRegistryRef.current = {};
                }
                layerRegistryRef.current[routeId] = {
                    main: polyline,
                    outline,
                    color: kurvigerRoute.color,
                    isKurviger: true
                };
            }
            
            return true;
        } catch (error) {
            console.error('Error importing Kurviger route:', error);
            alert(`Error importing Kurviger route: ${error.message}`);
            return false;
        }
    };

    const displayAlternativeRoutesOnMap = () => {
        if (!routesLayerRef.current || !alternativeRoutes || alternativeRoutes.length <= 1) {
            return;
        }
        
        // Clear existing alternative route layers
        routesLayerRef.current.eachLayer((layer) => {
            if (layer.options && layer.options.className === 'alternative-route') {
                routesLayerRef.current.removeLayer(layer);
            }
        });
        
        // Display all alternative routes except the selected one
        alternativeRoutes.forEach((route, index) => {
            if (index === selectedAlternativeIndex) {
                return; // Skip selected route (already displayed as main route)
            }
            
            if (!route.coordinates || route.coordinates.length === 0) {
                return;
            }
            
            const validLatlngs = route.coordinates
                .map(coord => {
                    if (Array.isArray(coord)) {
                        return coord.length >= 2 && !isNaN(coord[0]) && !isNaN(coord[1]) 
                            ? [coord[0], coord[1]] 
                            : null;
                    } else if (coord && typeof coord === 'object') {
                        return coord.lat && coord.lng 
                            ? [coord.lat, coord.lng] 
                            : null;
                    }
                    return null;
                })
                .filter(coord => coord !== null);
            
            if (validLatlngs.length >= 2) {
                // Draw alternative route as semi-transparent gray dashed line
                const grayShades = ['#6b7280', '#9ca3af', '#d1d5db']; // Different shades for each alternative
                const shadeIndex = index % grayShades.length;
                
                const polyline = L.polyline(validLatlngs, {
                    color: grayShades[shadeIndex],
                    weight: 4,
                    opacity: 0.5,
                    dashArray: '10, 5',
                    className: 'alternative-route'
                }).bindPopup(
                    `<b>Alternative Route ${index + 1}</b><br>` +
                    `Distance: ${route.distance ? (route.distance / 1000).toFixed(2) + ' km' : 'N/A'}<br>` +
                    `Duration: ${route.time ? Math.round(route.time / 60) + ' min' : 'N/A'}<br>` +
                    `Click to select this route`
                ).addTo(routesLayerRef.current);
                
                // Make clickable to select this alternative
                polyline.on('click', () => {
                    setSelectedAlternativeIndex(index);
                    // Trigger route selection update
                    const selectedRoute = {
                        ...route,
                        type: 'straightest',
                        color: '#006400'
                    };
                    const updatedRoutes = [selectedRoute];
                    setRoutes(updatedRoutes);
                    
                    // Redraw map
                    if (routesLayerRef.current) {
                        routesLayerRef.current.clearLayers();
                        // Re-add markers and redraw
                        setTimeout(() => {
                            displayAlternativeRoutesOnMap();
                        }, 100);
                    }
                });
            }
        });
    };
    
    const exportOurRoutes = () => {
        const exportData = routes.map(route => ({
            type: route.type,
            coordinates: route.coordinates,
            distance: route.distance,
            duration: route.duration,
            curvature: route.curvature,
            corner_count: route.corner_count,
            elevation_gain: route.elevation_gain,
            elevation_loss: route.elevation_loss
        }));
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `our-routes-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const compareWithKurviger = () => {
        if (kurvigerRoutes.length === 0 || routes.length === 0) {
            alert('Please import Kurviger routes and calculate our routes first');
            return;
        }
        
        const comparison = {
            ourRoutes: routes.map(r => ({
                type: r.type,
                distance: r.distance,
                curvature: r.curvature,
                corner_count: r.corner_count
            })),
            kurvigerRoutes: kurvigerRoutes.map(r => ({
                name: r.name,
                distance: r.distance,
                curvature: r.curvature,
                corner_count: r.corner_count
            }))
        };
        
        console.log('Route Comparison:', comparison);
        
        // Find matching route types for comparison
        const straightest = routes.find(r => r.type === 'straightest');
        const balanced = routes.find(r => r.type === 'balanced');
        const veryCurved = routes.find(r => r.type === 'very_curved');
        
        if (straightest && kurvigerRoutes.length > 0) {
            const kurvigerStraight = kurvigerRoutes[0]; // Assume first is straightest
            const distanceDiff = ((straightest.distance - kurvigerStraight.distance) / kurvigerStraight.distance * 100).toFixed(1);
            const curvatureDiff = kurvigerStraight.curvature > 0 
                ? ((straightest.curvature - kurvigerStraight.curvature) / kurvigerStraight.curvature * 100).toFixed(1)
                : 'N/A';
            
            alert(
                `Comparison Results:\n\n` +
                `Straightest vs Kurviger:\n` +
                `Distance: ${distanceDiff}% difference\n` +
                `Curvature: ${curvatureDiff}% difference\n\n` +
                `Check console for full comparison data.`
            );
        }
    };

    const selectRoute = (route) => {
        console.log('selectRoute called:', route.type, route);
        
        // If clicking the same route, deselect it (show all routes)
        if (selectedRoute && selectedRoute.type === route.type) {
            setSelectedRoute(null);
            showAllRoutes();
            setRouteStats(null);
            return;
        }
        
        setSelectedRoute(route);
        
        // Compute routeId the same way it's computed when drawing routes
        const targetRouteId = route.routeId ?? `route-${route.type}-${route.routeIndex ?? 0}`;
        const targetRouteType = route.type;
        console.log('Target routeId:', targetRouteId, 'Target type:', targetRouteType);
        
        let foundSelected = false;
        const processedLayers = new Set(); // Track processed layers to avoid duplicates
        
        // Iterate through ALL layers in routesLayerRef - this is the most reliable method
        if (routesLayerRef.current) {
            let totalLayers = 0;
            let skippedNonPolyline = 0;
            let skippedOutline = 0;
            
            routesLayerRef.current.eachLayer(layer => {
                totalLayers++;
                
                // Skip non-polylines (markers, etc.)
                if (!(layer instanceof L.Polyline)) {
                    skippedNonPolyline++;
                    return;
                }
                
                // Skip outline layers (handled by their parent)
                if (layer.isOutline || layer.className?.includes('outline')) {
                    skippedOutline++;
                    return;
                }
                
                // Note: Some Leaflet versions may not have setOpacity directly, but setStyle works
                // We'll use setStyle for opacity changes which is more reliable
                
                // Track that we've processed this layer
                const layerId = layer._leaflet_id || layer.routeId || `${layer.routeType}-${Date.now()}`;
                if (processedLayers.has(layerId)) {
                    return; // Already processed
                }
                processedLayers.add(layerId);
                
                // Get route type from layer (try multiple sources)
                const layerRouteType = layer.routeType || 
                                      (layer.routeData && layer.routeData.type) || 
                                      (layer.options && layer.options.routeType) || '';
                const layerRouteId = layer.routeId || '';
                
                // Check if this is the selected route (by type or routeId)
                const isSelected = layerRouteType === targetRouteType || layerRouteId === targetRouteId;
                
                console.log(`Processing layer: type=${layerRouteType}, routeId=${layerRouteId}, isSelected=${isSelected}, targetType=${targetRouteType}, targetId=${targetRouteId}`);
                
                if (isSelected) {
                    foundSelected = true;
                    // Show and highlight selected route - use setStyle for opacity (more reliable)
                    layer.setStyle({
                        weight: 70,
                        color: route.color || layer.options?.color || resolveLayerColor(layer),
                        fillOpacity: 1.0,
                        opacity: 1.0,
                        dashArray: null,
                        lineCap: 'round',
                        lineJoin: 'round'
                    });
                    // Also try setOpacity if available
                    if (typeof layer.setOpacity === 'function') {
                        layer.setOpacity(1.0);
                    }
                    // Handle outline if it exists
                    if (layer.outlineLayer) {
                        layer.outlineLayer.setStyle({
                            weight: 80,
                            opacity: 1.0,
                            dashArray: null
                        });
                        if (typeof layer.outlineLayer.setOpacity === 'function') {
                            layer.outlineLayer.setOpacity(1.0);
                        }
                        if (typeof layer.outlineLayer.bringToBack === 'function') {
                            layer.outlineLayer.bringToBack();
                        }
                    }
                    if (typeof layer.bringToFront === 'function') {
                        layer.bringToFront();
                    }
                    if (typeof layer.redraw === 'function') {
                        layer.redraw();
                    }
                } else {
                    // Hide ALL other routes (including Kurviger routes)
                    // Use setStyle for opacity (more reliable than setOpacity)
                    layer.setStyle({
                        opacity: 0.0,
                        fillOpacity: 0.0,
                        weight: layer.options?.weight || 45 // Keep weight but make invisible
                    });
                    // Also try setOpacity if available
                    if (typeof layer.setOpacity === 'function') {
                        layer.setOpacity(0.0);
                    }
                    if (layer.outlineLayer) {
                        layer.outlineLayer.setStyle({
                            opacity: 0.0,
                            fillOpacity: 0.0
                        });
                        if (typeof layer.outlineLayer.setOpacity === 'function') {
                            layer.outlineLayer.setOpacity(0.0);
                        }
                    }
                    if (typeof layer.redraw === 'function') {
                        layer.redraw();
                    }
                }
            });
            
            console.log(`Layer processing stats: total=${totalLayers}, processed=${processedLayers.size}, skippedNonPolyline=${skippedNonPolyline}, skippedOutline=${skippedOutline}`);
        }
        
        // Also process registry layers as backup (for Kurviger routes, etc.)
        const registry = layerRegistryRef.current || {};
        Object.entries(registry).forEach(([routeId, layerInfo]) => {
            const { main, outline, isKurviger } = layerInfo || {};
            if (!main || typeof main.setOpacity !== 'function') {
                return;
            }
            
            // Skip if already processed
            const mainId = main._leaflet_id || routeId;
            if (processedLayers.has(mainId)) {
                return;
            }
            processedLayers.add(mainId);
            
            // Hide all Kurviger routes when selecting our routes
            if (isKurviger) {
                main.setStyle({ opacity: 0.0, fillOpacity: 0.0 });
                if (typeof main.setOpacity === 'function') {
                    main.setOpacity(0.0);
                }
                if (outline) {
                    outline.setStyle({ opacity: 0.0, fillOpacity: 0.0 });
                    if (typeof outline.setOpacity === 'function') {
                        outline.setOpacity(0.0);
                    }
                }
                return;
            }
            
            // Check if this is the selected route
            const isSelected = routeId === targetRouteId;
            
            if (isSelected) {
                foundSelected = true;
                main.setStyle({
                    weight: 70,
                    color: route.color || layerInfo.color || resolveLayerColor(main),
                    fillOpacity: 1.0,
                    opacity: 1.0,
                    dashArray: null
                });
                if (typeof main.setOpacity === 'function') {
                    main.setOpacity(1.0);
                }
                if (outline) {
                    outline.setStyle({
                        weight: 80,
                        opacity: 1.0,
                        dashArray: null
                    });
                    if (typeof outline.setOpacity === 'function') {
                        outline.setOpacity(1.0);
                    }
                    if (typeof outline.bringToBack === 'function') {
                        outline.bringToBack();
                    }
                }
                if (typeof main.bringToFront === 'function') {
                    main.bringToFront();
                }
                if (typeof main.redraw === 'function') {
                    main.redraw();
                }
            } else {
                // Hide all other routes
                main.setStyle({ opacity: 0.0, fillOpacity: 0.0 });
                if (typeof main.setOpacity === 'function') {
                    main.setOpacity(0.0);
                }
                if (outline) {
                    outline.setStyle({ opacity: 0.0, fillOpacity: 0.0 });
                    if (typeof outline.setOpacity === 'function') {
                        outline.setOpacity(0.0);
                    }
                }
                if (typeof main.redraw === 'function') {
                    main.redraw();
                }
            }
        });
        
        console.log(`Route selection complete. Found selected: ${foundSelected}, Target: ${targetRouteType} (${targetRouteId}), Processed ${processedLayers.size} layers`);
        
        if (!foundSelected) {
            console.warn(`Could not find layer for route type: ${targetRouteType}, routeId: ${targetRouteId}`);
            // Log all available layers for debugging
            if (routesLayerRef.current) {
                const allLayers = [];
                routesLayerRef.current.eachLayer(layer => {
                    if (layer instanceof L.Polyline && !layer.isOutline) {
                        allLayers.push({
                            routeType: layer.routeType,
                            routeId: layer.routeId,
                            routeDataType: layer.routeData?.type
                        });
                    }
                });
                console.log('Available layers:', allLayers);
            }
        }
        
        setRouteStats({
            type: route.type,
            distance: route.distance,
            duration: route.duration,
            curvature: route.curvature,
            cornerCount: route.corner_count,
            elevationGain: route.elevation_gain,
            elevationLoss: route.elevation_loss
        });
    };

    const showAllRoutes = () => {
        // Show all routes with default styling (including Kurviger routes)
        const registry = layerRegistryRef.current || {};
        Object.values(registry).forEach(layerInfo => {
            const { main, outline, color, isKurviger } = layerInfo || {};
            if (!main || typeof main.setOpacity !== 'function') {
                return;
            }
            if (isKurviger) {
                main.setOpacity(0.9);
                main.setStyle({
                    weight: 30,
                    color: color || resolveLayerColor(main, color),
                    opacity: 0.9,
                    dashArray: null, // Solid line
                    lineCap: 'round',
                    lineJoin: 'round'
                });
                if (outline && typeof outline.setOpacity === 'function') {
                    outline.setOpacity(0.9);
                }
                if (typeof main.redraw === 'function') {
                    main.redraw();
                }
                return;
            }
            const baseColor = color || resolveLayerColor(main, color);
            main.setOpacity(1.0);
            main.setStyle({
                weight: 45,
                color: baseColor,
                fillOpacity: 1.0,
                opacity: 1.0,
                dashArray: null,
                lineCap: 'round',
                lineJoin: 'round'
            });
            if (outline && typeof outline.setOpacity === 'function') {
                outline.setOpacity(1.0);
                outline.setStyle({
                    weight: 55,
                    opacity: 1.0
                });
                outline.bringToBack();
            }
            if (typeof main.redraw === 'function') {
                main.redraw();
            }
        });
        
        if (routesLayerRef.current) {
            routesLayerRef.current.eachLayer(layer => {
                if (!(layer instanceof L.Polyline)) {
                    return;
                }
                if (layerRegistryRef.current && layerRegistryRef.current[layer.routeId]) {
                    return;
                }
                if (layer.isOutline || layer.className?.includes('outline')) {
                    return;
                }
                if (typeof layer.setOpacity !== 'function') {
                    return;
                }
                if (layer.isKurviger) {
                    layer.setOpacity(0.9);
                    layer.setStyle({
                        opacity: 0.9,
                        dashArray: null,
                        lineCap: 'round',
                        lineJoin: 'round'
                    });
                    if (layer.outlineLayer && typeof layer.outlineLayer.setOpacity === 'function') {
                        layer.outlineLayer.setOpacity(0.9);
                    }
                    if (typeof layer.redraw === 'function') {
                        layer.redraw();
                    }
                }
            });
        }
    };

    const resolveLayerColor = (layer, overrideColor = null) => {
        if (overrideColor) {
            return overrideColor;
        }
        if (layer.routeType === 'straightest') {
            return '#0066ff'; // Very bright blue
        } else if (layer.routeType === 'balanced') {
            return '#ff6600'; // Very bright orange
        } else if (layer.routeType === 'very_curved') {
            return '#ff0033'; // Very bright red
        } else if (layer.isKurviger) {
            return '#9b59b6'; // Purple for Kurviger
        }
        return '#000000'; // Default color
    };

    return (
        <div className="h-screen w-screen relative flex">
            <Head title="Advanced Debug Route - Scenic Routes" />
            
            {/* Route Legend and Highlight Styles - Reduced shadows */}
            <style>{`
                /* Make all route lines VERY thick with minimal shadows */
                .leaflet-interactive {
                    stroke-width: 45px !important;
                }
                
                /* Route line highlight class - minimal shadow */
                .route-line-highlight {
                    stroke-width: 45px !important;
                }
                
                /* Route outline (white background) - no shadow */
                .route-outline {
                    stroke-width: 55px !important;
                    stroke: #ffffff !important;
                }
                
                /* Kurviger route lines - no shadow */
                .kurviger-route-line {
                    stroke-width: 30px !important;
                }
                
                .kurviger-route-outline {
                    stroke-width: 35px !important;
                    stroke: #ffffff !important;
                }
                
                /* Ensure routes are always visible */
                svg path.leaflet-interactive {
                    stroke-width: 45px !important;
                    stroke-linecap: round !important;
                    stroke-linejoin: round !important;
                }
                
                /* Color-specific styling - no excessive shadows */
                svg path[stroke*="0, 102, 255"], svg path[stroke*="#0066ff"] {
                    stroke-width: 45px !important;
                    stroke: rgb(0, 102, 255) !important;
                }
                svg path[stroke*="255, 102, 0"], svg path[stroke*="#ff6600"] {
                    stroke-width: 45px !important;
                    stroke: rgb(255, 102, 0) !important;
                }
                svg path[stroke*="255, 0, 51"], svg path[stroke*="#ff0033"] {
                    stroke-width: 45px !important;
                    stroke: rgb(255, 0, 51) !important;
                }
            `}</style>
            
            {/* Sidebar */}
            <div className="w-80 bg-gray-800 text-white p-4 overflow-y-auto z-[1000]">
                <h2 className="text-xl font-bold mb-4">🔧 Route Debug Tool</h2>
                
                {/* Route Legend */}
                {(routes.length > 0 || kurvigerRoutes.length > 0) && (
                    <div className="mb-4 p-3 bg-gray-700 rounded">
                        <h3 className="text-sm font-semibold mb-2">Route Colors:</h3>
                        <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-green-500"></div>
                                <span>Straightest</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-blue-500"></div>
                                <span>Balanced</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-orange-500"></div>
                                <span>Curvy</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-red-500"></div>
                                <span>Extra Curvy</span>
                            </div>
                            {(strategyComparison || strategy1Route || strategy2Route || graphHopperRoute) && (
                                <>
                                    {(strategy1Route || strategyComparison) && (
                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-600">
                                            <div className="w-4 h-1 bg-blue-400"></div>
                                            <span>Strategy 1 (OSRM)</span>
                                        </div>
                                    )}
                                    {(strategy2Route || strategyComparison) && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-1 bg-green-400"></div>
                                            <span>Strategy 2 (OSM)</span>
                                        </div>
                                    )}
                                    {graphHopperRoute && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-1 bg-amber-400"></div>
                                            <span>GraphHopper</span>
                                        </div>
                                    )}
                                    {strategyComparison && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-1 bg-gray-500"></div>
                                            <span>Straight (Baseline)</span>
                                        </div>
                                    )}
                                </>
                            )}
                            {kurvigerRoutes.length > 0 && (
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-600">
                                    <div className="w-4 h-1 bg-purple-500"></div>
                                    <span>Kurviger Routes</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Waypoints Section */}
                {/* Strategy Comparison Section */}
                {strategyComparison && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-blue-300">Strategy Comparison</h3>
                            <button
                                onClick={() => setShowStrategyComparison(!showStrategyComparison)}
                                className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                            >
                                {showStrategyComparison ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {showStrategyComparison && (
                            <div className="p-3 bg-blue-900/20 rounded border border-blue-700">
                    
                    {/* GraphHopper Section */}
                    <div className="mb-4 p-3 bg-amber-900/20 rounded border border-amber-700">
                        <h4 className="font-semibold mb-2 text-amber-300">GraphHopper (Kurviger-style)</h4>
                        
                        {/* Status Check */}
                        {graphHopperStatus && (
                            <div className="mb-2 text-xs">
                                Status: 
                                {graphHopperStatus.connected ? (
                                    <span className="text-green-400 ml-1">✓ Connected</span>
                                ) : (
                                    <span className="text-red-400 ml-1">✗ Not Connected</span>
                                )}
                                <button
                                    onClick={checkGraphHopperStatus}
                                    className="ml-2 text-blue-400 hover:text-blue-300 underline text-xs"
                                >
                                    Refresh
                                </button>
                            </div>
                        )}
                        
                        {/* Curvature Level Selector */}
                        <div className="mb-2">
                            <label className="text-xs text-gray-300 mb-1 block">Curvature Level:</label>
                            <select
                                value={curvatureLevel}
                                onChange={(e) => setCurvatureLevel(e.target.value)}
                                className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600"
                            >
                                <option value="balanced">Balanced (1.0-1.1x)</option>
                                <option value="curvy">Curvy (1.1-1.3x)</option>
                                <option value="extra_curvy">Extra Curvy (1.3-1.5x)</option>
                            </select>
                        </div>
                        
                        {/* Calculate Button */}
                        <button
                            onClick={calculateGraphHopper}
                            disabled={isCalculatingGraphHopper || (graphHopperStatus && !graphHopperStatus.connected)}
                            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                        >
                            {isCalculatingGraphHopper ? 'Calculating...' : 'Calculate GraphHopper Route'}
                        </button>
                        
                        {graphHopperStatus && !graphHopperStatus.connected && (
                            <div className="mt-2 text-xs text-red-400">
                                ⚠️ GraphHopper server is not running. Start it first.
                            </div>
                        )}
                    </div>
                    
                    {/* Individual Strategy Buttons */}
                    <div className="space-y-2 mb-3">
                        <button
                            onClick={calculateStrategy1}
                            disabled={isCalculatingStrategy1}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                        >
                            {isCalculatingStrategy1 ? 'Calculating...' : 'Calculate Strategy 1 (OSRM)'}
                        </button>
                        <button
                            onClick={calculateStrategy2}
                            disabled={isCalculatingStrategy2}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                        >
                            {isCalculatingStrategy2 ? 'Calculating...' : 'Calculate Strategy 2 (OSM)'}
                        </button>
                    </div>
                    
                    {/* Compare Both Button */}
                    <button
                        onClick={compareStrategies}
                        disabled={isComparingStrategies}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded mb-3"
                    >
                        {isComparingStrategies ? 'Comparing...' : 'Compare Both Strategies'}
                    </button>
                    
                    {/* Strategy 1 Route Info */}
                    {strategy1Route && !strategy1Route.error && (
                        <div className="mb-3 p-2 bg-blue-900/30 rounded border border-blue-700">
                            <div className="font-semibold text-xs mb-1 text-blue-300">Strategy 1 Route</div>
                            <div className="text-xs space-y-0.5">
                                {strategy1Route.distance && (
                                    <div>Distance: {(strategy1Route.distance / 1000).toFixed(2)} km</div>
                                )}
                                {strategy1Route.duration && (
                                    <div>Duration: {Math.round(strategy1Route.duration / 60)} min</div>
                                )}
                                {strategy1Route.curvature && (
                                    <div>Curvature: {strategy1Route.curvature.toFixed(6)}</div>
                                )}
                                {strategy1Route.corner_count && (
                                    <div>Corners: {strategy1Route.corner_count}</div>
                                )}
                                {strategy1Route._timings && (
                                    <div className="text-gray-400 mt-1">
                                        Time: {strategy1Route._timings.total?.toFixed(0)}ms
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Strategy 2 Route Info */}
                    {strategy2Route && !strategy2Route.error && (
                        <div className="mb-3 p-2 bg-green-900/30 rounded border border-green-700">
                            <div className="font-semibold text-xs mb-1 text-green-300">Strategy 2 Route</div>
                            <div className="text-xs space-y-0.5">
                                {strategy2Route.distance && (
                                    <div>Distance: {(strategy2Route.distance / 1000).toFixed(2)} km</div>
                                )}
                                {strategy2Route.duration && (
                                    <div>Duration: {Math.round(strategy2Route.duration / 60)} min</div>
                                )}
                                {strategy2Route.curvature && (
                                    <div>Curvature: {strategy2Route.curvature.toFixed(6)}</div>
                                )}
                                {strategy2Route.corner_count && (
                                    <div>Corners: {strategy2Route.corner_count}</div>
                                )}
                                {strategy2Route._curved_roads_found && (
                                    <div>Curved Roads: {strategy2Route._curved_roads_found} found, {strategy2Route._curved_roads_used} used</div>
                                )}
                                {strategy2Route._timings && (
                                    <div className="text-gray-400 mt-1">
                                        Time: {strategy2Route._timings.total?.toFixed(0)}ms
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* GraphHopper Route Info */}
                    {graphHopperRoute && !graphHopperRoute.error && (
                        <div className="mb-3 p-2 bg-amber-900/30 rounded border border-amber-700">
                            <div className="font-semibold text-xs mb-1 text-amber-300">GraphHopper Route</div>
                            <div className="text-xs space-y-0.5">
                                {graphHopperRoute.distance && (
                                    <div>Distance: {(graphHopperRoute.distance / 1000).toFixed(2)} km</div>
                                )}
                                {graphHopperRoute.duration && (
                                    <div>Duration: {Math.round(graphHopperRoute.duration / 60)} min</div>
                                )}
                                {graphHopperRoute.curvature && (
                                    <div>Curvature: {graphHopperRoute.curvature.toFixed(6)}</div>
                                )}
                                {graphHopperRoute.corner_count && (
                                    <div>Corners: {graphHopperRoute.corner_count}</div>
                                )}
                                {graphHopperRoute._curvature_level && (
                                    <div>Level: {graphHopperRoute._curvature_level.replace('_', ' ')}</div>
                                )}
                                {graphHopperRoute._timings && (
                                    <div className="text-gray-400 mt-1">
                                        Time: {graphHopperRoute._timings.total?.toFixed(0)}ms
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                            </div>
                        )}
                    </div>
                )}
                
                {strategyComparison && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-blue-300">Strategy Comparison</h3>
                            <button
                                onClick={() => setShowStrategyComparison(!showStrategyComparison)}
                                className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                            >
                                {showStrategyComparison ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {showStrategyComparison && (
                            <div className="p-3 bg-blue-900/20 rounded border border-blue-700">
                                <div className="space-y-4 mt-4">
                            {/* Comparison Summary */}
                            <div className="bg-gray-700 p-3 rounded text-sm">
                                <div className="font-semibold mb-2">Comparison Results</div>
                                <div className="space-y-1 text-xs">
                                    <div>
                                        Speed Winner: <span className="font-semibold text-yellow-400">
                                            {strategyComparison.comparison.speed_winner === 'strategy_1' ? 'Strategy 1' : 'Strategy 2'}
                                        </span>
                                        ({strategyComparison.comparison.speed_difference_ms.toFixed(0)}ms difference)
                                    </div>
                                    {strategyComparison.comparison.curvature_winner && (
                                        <div>
                                            Curvature Winner: <span className="font-semibold text-green-400">
                                                {strategyComparison.comparison.curvature_winner === 'strategy_1' ? 'Strategy 1' : 'Strategy 2'}
                                            </span>
                                        </div>
                                    )}
                                    {strategyComparison.comparison.quality_score_winner && (
                                        <div>
                                            Quality Winner: <span className="font-semibold text-purple-400">
                                                {strategyComparison.comparison.quality_score_winner === 'strategy_1' ? 'Strategy 1' : 'Strategy 2'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Strategy 1 Results */}
                            {strategyComparison.strategy_1.success && strategyComparison.strategy_1.metrics && (
                                <div className="bg-blue-900/30 p-3 rounded border border-blue-700">
                                    <div className="font-semibold mb-2 text-blue-300">Strategy 1: OSRM Alternatives</div>
                                    <div className="space-y-1 text-xs">
                                        <div>Execution Time: {strategyComparison.strategy_1.execution_time_ms.toFixed(0)}ms</div>
                                        <div>Distance: {(strategyComparison.strategy_1.metrics.distance / 1000).toFixed(2)} km ({strategyComparison.strategy_1.metrics.distance_ratio.toFixed(2)}x straight)</div>
                                        <div>Curvature: {strategyComparison.strategy_1.metrics.curvature.toFixed(6)} ({strategyComparison.strategy_1.metrics.curvature_ratio.toFixed(2)}x straight)</div>
                                        <div>Corners: {strategyComparison.strategy_1.metrics.corner_count}</div>
                                        <div>Progress Score: {(strategyComparison.strategy_1.metrics.progress_score * 100).toFixed(1)}%</div>
                                        <div>Has Backtrack: {strategyComparison.strategy_1.metrics.has_backtrack ? 'Yes ⚠️' : 'No ✓'}</div>
                                        <div className="mt-2 pt-2 border-t border-blue-600">
                                            <div className="font-semibold">Quality Score: {strategyComparison.strategy_1.metrics.quality_score.toFixed(1)}/100</div>
                                        </div>
                                        {strategyComparison.strategy_1.route?._candidates_count && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                Candidates tested: {strategyComparison.strategy_1.route._candidates_count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Strategy 2 Results */}
                            {strategyComparison.strategy_2.success && strategyComparison.strategy_2.metrics && (
                                <div className="bg-green-900/30 p-3 rounded border border-green-700">
                                    <div className="font-semibold mb-2 text-green-300">Strategy 2: OSM Curved Roads</div>
                                    <div className="space-y-1 text-xs">
                                        <div>Execution Time: {strategyComparison.strategy_2.execution_time_ms.toFixed(0)}ms</div>
                                        <div>Distance: {(strategyComparison.strategy_2.metrics.distance / 1000).toFixed(2)} km ({strategyComparison.strategy_2.metrics.distance_ratio.toFixed(2)}x straight)</div>
                                        <div>Curvature: {strategyComparison.strategy_2.metrics.curvature.toFixed(6)} ({strategyComparison.strategy_2.metrics.curvature_ratio.toFixed(2)}x straight)</div>
                                        <div>Corners: {strategyComparison.strategy_2.metrics.corner_count}</div>
                                        <div>Progress Score: {(strategyComparison.strategy_2.metrics.progress_score * 100).toFixed(1)}%</div>
                                        <div>Has Backtrack: {strategyComparison.strategy_2.metrics.has_backtrack ? 'Yes ⚠️' : 'No ✓'}</div>
                                        <div className="mt-2 pt-2 border-t border-green-600">
                                            <div className="font-semibold">Quality Score: {strategyComparison.strategy_2.metrics.quality_score.toFixed(1)}/100</div>
                                        </div>
                                        {strategyComparison.strategy_2.route?._curved_roads_found && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                Curved roads found: {strategyComparison.strategy_2.route._curved_roads_found}, 
                                                Used: {strategyComparison.strategy_2.route._curved_roads_used}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Export Results */}
                            <button
                                onClick={() => {
                                    const dataStr = JSON.stringify(strategyComparison, null, 2);
                                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                    const url = URL.createObjectURL(dataBlob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `strategy-comparison-${Date.now()}.json`;
                                    link.click();
                                }}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                            >
                                Export Results (JSON)
                            </button>
                        </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Waypoints Section */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Waypoints ({waypoints.length})</h3>
                        <button
                            onClick={clearWaypoints}
                            className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                        >
                            Clear All
                        </button>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                        {waypoints.map(wp => (
                            <div key={wp.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                                <span className="text-sm">{wp.name}</span>
                                <button
                                    onClick={() => removeWaypoint(wp.id)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        {DEBUG_WAYPOINT_CITIES.map(city => (
                            <button
                                key={city.name}
                                onClick={() => addWaypoint(city)}
                                disabled={waypoints.some(wp => wp.name === city.name)}
                                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-2 py-1 rounded"
                            >
                                + {city.name}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Avoid Roads Section */}
                <div className="mb-4 p-3 bg-gray-700 rounded border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-100">
                            Avoid Roads
                        </label>
                        <span className="text-[11px] text-gray-300">
                            Passed to GraphHopper
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                        Match Kurviger/Calimoto controls by excluding categories below.
                    </p>
                    <div className="space-y-2">
                        {[
                            { value: 'highways', label: 'Highways', helper: 'Prefer smaller scenic roads' },
                            { value: 'tolls', label: 'Tolls', helper: 'Skip toll booths & paid sections' },
                            { value: 'ferries', label: 'Ferries', helper: 'Avoid ferry crossings' },
                            { value: 'unpaved', label: 'Unpaved Roads', helper: 'Stick to asphalt' },
                        ].map(option => {
                            const isChecked = avoidOptions.includes(option.value);
                            return (
                                <label
                                    key={option.value}
                                    className={`flex items-start gap-2 text-xs p-2 rounded border transition-colors ${
                                        isChecked ? 'bg-green-900/30 border-green-500' : 'bg-gray-800 border-gray-600'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                            setAvoidOptions(prev => {
                                                if (prev.includes(option.value)) {
                                                    return prev.filter(o => o !== option.value);
                                                }
                                                return [...prev, option.value];
                                            });
                                        }}
                                        className="mt-0.5"
                                    />
                                    <div>
                                        <div className="font-semibold text-gray-100">{option.label}</div>
                                        <div className="text-gray-400">{option.helper}</div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
                
                {/* Kurviger Comparison Section */}
                <div className="mb-4 p-3 bg-purple-900/30 rounded border border-purple-700">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-purple-300">🔄 Kurviger Comparison</h3>
                        <button
                            onClick={() => setShowKurvigerImport(!showKurvigerImport)}
                            className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
                        >
                            {showKurvigerImport ? 'Hide' : 'Import'}
                        </button>
                    </div>
                    
                    {showKurvigerImport && (
                        <div className="space-y-2 mt-2">
                            <textarea
                                id="kurviger-import"
                                placeholder="Paste Kurviger route JSON here...&#10;Format: {&#10;  &quot;name&quot;: &quot;Kurviger Fastest&quot;,&#10;  &quot;coordinates&quot;: [[lat, lng], ...],&#10;  &quot;distance&quot;: 230000,&#10;  &quot;curvature&quot;: 0.0005&#10;}"
                                className="w-full bg-gray-700 text-white text-xs p-2 rounded h-24 resize-none"
                            />
                            <button
                                onClick={() => {
                                    const textarea = document.getElementById('kurviger-import');
                                    if (textarea.value.trim()) {
                                        if (importKurvigerRoute(textarea.value)) {
                                            textarea.value = '';
                                        }
                                    }
                                }}
                                className="w-full bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-sm"
                            >
                                Import Route
                            </button>
                            <button
                                onClick={exportOurRoutes}
                                disabled={routes.length === 0}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-2 py-1 rounded text-sm"
                            >
                                Export Our Routes
                            </button>
                            <button
                                onClick={compareWithKurviger}
                                disabled={kurvigerRoutes.length === 0 || routes.length === 0}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-2 py-1 rounded text-sm"
                            >
                                Compare Metrics
                            </button>
                        </div>
                    )}
                    
                    {kurvigerRoutes.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {kurvigerRoutes.map((route, idx) => (
                                <div key={idx} className="bg-gray-700 p-2 rounded text-xs">
                                    <div className="font-semibold text-purple-300">{route.name}</div>
                                    <div>Distance: {(route.distance / 1000)?.toFixed(2)} km</div>
                                    {route.curvature && (
                                        <div>Curvature: {route.curvature.toFixed(6)}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Saved Roads Selection */}
                <div className="mb-4 p-3 bg-gray-700 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">Saved Roads (Debug)</h3>
                        <button
                            onClick={async () => {
                                setSavedRoadsLoading(true);
                                try {
                                    const response = await axios.get('/api/public-saved-roads');
                                    if (Array.isArray(response.data)) {
                                        setSavedRoads(response.data);
                                    }
                                } catch (error) {
                                    console.error('Failed to reload saved roads:', error);
                                } finally {
                                    setSavedRoadsLoading(false);
                                }
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                            disabled={savedRoadsLoading}
                        >
                            {savedRoadsLoading ? 'Loading...' : 'Reload'}
                        </button>
                    </div>
                    
                    <div className="text-xs text-gray-300 mb-2">
                        Start: {DEBUG_START.name} ({DEBUG_START.lat.toFixed(4)}, {DEBUG_START.lng.toFixed(4)})<br/>
                        End: {DEBUG_END.name} ({DEBUG_END.lat.toFixed(4)}, {DEBUG_END.lng.toFixed(4)})
                    </div>
                    
                    {savedRoadsLoading ? (
                        <div className="text-xs text-gray-400">Loading saved roads...</div>
                    ) : savedRoads.length === 0 ? (
                        <div className="text-xs text-gray-400">No saved roads found. Make sure you have public saved roads.</div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {savedRoads.map((road) => {
                                const isSelected = selectedSavedRoads.some(sr => sr.id === road.id);
                                return (
                                    <div
                                        key={road.id}
                                        className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-green-600 border-2 border-green-400'
                                                : 'bg-gray-600 border-2 border-gray-500 hover:bg-gray-500'
                                        }`}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedSavedRoads(prev => prev.filter(sr => sr.id !== road.id));
                                            } else {
                                                setSelectedSavedRoads(prev => [...prev, road]);
                                            }
                                        }}
                                    >
                                        <div className="font-medium">{road.road_name || 'Unnamed Road'}</div>
                                        <div className="text-gray-300">
                                            ID: {road.id}
                                            {road.length && ` • ${(road.length / 1000).toFixed(2)} km`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {selectedSavedRoads.length > 0 && (
                        <div className="mt-2 p-2 bg-green-900/30 rounded border border-green-600">
                            <div className="text-xs font-semibold text-green-300 mb-1">
                                Selected ({selectedSavedRoads.length}):
                            </div>
                            {selectedSavedRoads.map((road) => (
                                <div key={road.id} className="text-xs text-green-200">
                                    • {road.road_name || 'Unnamed'} (ID: {road.id})
                                    <button
                                        onClick={() => setSelectedSavedRoads(prev => prev.filter(sr => sr.id !== road.id))}
                                        className="ml-2 text-red-400 hover:text-red-300"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Alternative Routes Toggle */}
                {!isRoundTrip && (
                    <div className="mb-4 p-3 bg-purple-900/20 rounded border border-purple-700">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showAlternativeRoutes && !alternativeRoutesBlocked}
                                disabled={alternativeRoutesBlocked}
                                onChange={(e) => {
                                    // Check for incompatible features before enabling
                                    const hasSavedRoads = selectedSavedRoads && selectedSavedRoads.length > 0;
                                    const hasPoiWaypoints = waypoints && waypoints.some(wp => wp.isPoi);
                                    
                                    if (e.target.checked && (hasSavedRoads || hasPoiWaypoints)) {
                                        const reasons = [];
                                        if (hasSavedRoads) reasons.push('saved roads');
                                        if (hasPoiWaypoints) reasons.push('POI waypoints');
                                        
                                        setAlternativeRoutesBlocked(true);
                                        setAlternativeRoutesWarning(`Alternative routes cannot be used with ${reasons.join(' or ')}. Please remove ${reasons.join(' and ')} first.`);
                                        setShowAlternativeRoutes(false);
                                        return;
                                    }
                                    
                                    setShowAlternativeRoutes(e.target.checked);
                                    setAlternativeRoutesBlocked(false);
                                    setAlternativeRoutesWarning(null);
                                    if (!e.target.checked) {
                                        setAlternativeRoutes([]);
                                        setSelectedAlternativeIndex(0);
                                    }
                                }}
                                className="mr-2"
                            />
                            <span className={`text-xs font-semibold ${alternativeRoutesBlocked ? 'text-gray-500' : 'text-purple-300'}`}>
                                Show Alternative Routes
                            </span>
                        </label>
                        <p className="text-xs text-gray-400 mt-1">
                            Get 2-3 alternative route options for comparison
                        </p>
                        
                        {/* Warning when blocked */}
                        {alternativeRoutesBlocked && (
                            <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-200">
                                <strong>⚠️ Not Available:</strong> Alternative routes cannot be used with saved roads or POI waypoints. Please remove these features first.
                            </div>
                        )}
                        
                        {/* Warning when alternatives not available */}
                        {alternativeRoutesWarning && !alternativeRoutesBlocked && (
                            <div className="mt-2 p-2 bg-orange-900/30 border border-orange-700 rounded text-xs text-orange-200">
                                <strong>ℹ️ Info:</strong> {alternativeRoutesWarning}
                            </div>
                        )}
                        
                        {/* Alternative Routes Display */}
                        {showAlternativeRoutes && alternativeRoutes.length > 1 && (
                            <div className="mt-3 space-y-2">
                                <div className="text-xs font-semibold text-purple-300">
                                    Alternative Routes ({alternativeRoutes.length})
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {alternativeRoutes.map((route, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSelectedAlternativeIndex(index);
                                                
                                                // Update routes to show selected alternative as main route
                                                const selectedRoute = {
                                                    ...route,
                                                    type: 'straightest',
                                                    color: '#006400'
                                                };
                                                const updatedRoutes = [selectedRoute];
                                                setRoutes(updatedRoutes);
                                                
                                                // Redraw map with selected route
                                                if (routesLayerRef.current) {
                                                    routesLayerRef.current.clearLayers();
                                                    
                                                    // Re-add markers
                                                    const startIcon = L.divIcon({
                                                        className: 'custom-marker',
                                                        html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                                                        iconSize: [20, 20],
                                                        iconAnchor: [10, 10]
                                                    });
                                                    L.marker([DEBUG_START.lat, DEBUG_START.lng], { icon: startIcon })
                                                        .bindPopup(`<b>Start:</b> ${DEBUG_START.name}`)
                                                        .addTo(routesLayerRef.current);
                                                    
                                                    const endIcon = L.divIcon({
                                                        className: 'custom-marker',
                                                        html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                                                        iconSize: [20, 20],
                                                        iconAnchor: [10, 10]
                                                    });
                                                    L.marker([DEBUG_END.lat, DEBUG_END.lng], { icon: endIcon })
                                                        .bindPopup(`<b>End:</b> ${DEBUG_END.name}`)
                                                        .addTo(routesLayerRef.current);
                                                    
                                                    waypoints.forEach((wp, idx) => {
                                                        const wpIcon = L.divIcon({
                                                            className: 'custom-marker',
                                                            html: `<div style="background-color: #f59e0b; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
                                                            iconSize: [16, 16],
                                                            iconAnchor: [8, 8]
                                                        });
                                                        L.marker([wp.lat, wp.lng], { icon: wpIcon })
                                                            .bindPopup(`<b>Waypoint ${idx + 1}:</b> ${wp.name}`)
                                                            .addTo(routesLayerRef.current);
                                                    });
                                                }
                                                
                                                setTimeout(() => {
                                                    if (routesLayerRef.current && route.coordinates) {
                                                        const validLatlngs = route.coordinates
                                                            .map(coord => {
                                                                if (Array.isArray(coord)) {
                                                                    return coord.length >= 2 && !isNaN(coord[0]) && !isNaN(coord[1]) 
                                                                        ? [coord[0], coord[1]] 
                                                                        : null;
                                                                } else if (coord && typeof coord === 'object') {
                                                                    return coord.lat && coord.lng 
                                                                        ? [coord.lat, coord.lng] 
                                                                        : null;
                                                                }
                                                                return null;
                                                            })
                                                            .filter(coord => coord !== null);
                                                        
                                                        if (validLatlngs.length >= 2) {
                                                            // Draw selected route as main route (thick, solid)
                                                            const polyline = L.polyline(validLatlngs, {
                                                                color: '#006400',
                                                                weight: 60,
                                                                opacity: 1.0,
                                                                lineCap: 'round',
                                                                lineJoin: 'round'
                                                            }).bindPopup(`<b>Selected Route</b><br>Distance: ${route.distance ? (route.distance / 1000).toFixed(2) + ' km' : 'N/A'}<br>Duration: ${route.time ? Math.round(route.time / 60) + ' min' : 'N/A'}`).addTo(routesLayerRef.current);
                                                            
                                                            // Draw other alternatives as semi-transparent
                                                            displayAlternativeRoutesOnMap();
                                                            
                                                            if (mapRef.current) {
                                                                mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
                                                            }
                                                        }
                                                    }
                                                }, 100);
                                            }}
                                            className={`w-full text-left p-2 rounded border-2 transition-colors ${
                                                index === selectedAlternativeIndex
                                                    ? 'border-purple-500 bg-purple-900/50'
                                                    : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm text-white">
                                                        Route {index + 1}
                                                        {index === selectedAlternativeIndex && (
                                                            <span className="ml-2 text-purple-300">(Selected)</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-300 mt-1 space-y-0.5">
                                                        {route.distance && (
                                                            <div>Distance: {(route.distance / 1000).toFixed(2)} km</div>
                                                        )}
                                                        {route.time && (
                                                            <div>Duration: {Math.round(route.time / 60)} min</div>
                                                        )}
                                                        {route.curvature && (
                                                            <div>Curvature: {route.curvature.toFixed(6)}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Round Trip Controls */}
                <div className="mb-4 p-3 bg-indigo-900/20 rounded border border-indigo-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-indigo-300">🔄 Round Trip</h3>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isRoundTrip}
                                onChange={(e) => setIsRoundTrip(e.target.checked)}
                                className="mr-2"
                            />
                            <span className="text-xs">Enable Round Trip</span>
                        </label>
                    </div>
                    
                    {isRoundTrip && (
                        <div className="space-y-2 mt-2">
                            <div>
                                <label className="text-xs text-gray-300 mb-1 block">
                                    Distance (km): {roundTripDistance}
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="500"
                                    step="10"
                                    value={roundTripDistance}
                                    onChange={(e) => setRoundTripDistance(parseInt(e.target.value))}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>50 km</span>
                                    <span>500 km</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 mb-1 block">Curvature Level:</label>
                                <select
                                    value={curvatureLevel}
                                    onChange={(e) => setCurvatureLevel(e.target.value)}
                                    className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600"
                                >
                                    <option value="straightest">Straightest</option>
                                    <option value="balanced">Balanced</option>
                                    <option value="curvy">Curvy</option>
                                    <option value="extra_curvy">Extra Curvy</option>
                                </select>
                            </div>
                            <div className="text-xs text-gray-300">
                                Start: {DEBUG_START.name} ({DEBUG_START.lat.toFixed(4)}, {DEBUG_START.lng.toFixed(4)})<br/>
                                Route will loop back to start point
                                {selectedSavedRoads.length > 0 && (
                                    <><br/>Using {selectedSavedRoads.length} saved road(s)</>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Calculate Button */}
                <button
                    onClick={isRoundTrip ? calculateRoundTrip : calculateRoutes}
                    disabled={isCalculating || (graphHopperStatus && !graphHopperStatus.connected)}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 px-4 py-2 rounded mb-4 font-semibold"
                >
                    {isCalculating 
                        ? (isRoundTrip ? 'Calculating Round Trip...' : 'Calculating GraphHopper Routes...')
                        : (isRoundTrip ? 'Calculate Round Trip' : 'Calculate GraphHopper Routes')
                    }
                </button>
                
                {graphHopperStatus && !graphHopperStatus.connected && (
                    <div className="mb-4 text-xs text-red-400">
                        ⚠️ GraphHopper server is not running. Start it first.
                    </div>
                )}
                
                {/* Kurviger Comparison Metrics */}
                {routes.length > 0 && kurvigerRoutes.length > 0 && (
                    <div className="mb-6 p-3 bg-purple-900/20 rounded border border-purple-700">
                        <h3 className="font-semibold mb-2 text-purple-300">📊 Comparison Metrics</h3>
                        <div className="space-y-3 text-xs">
                            {(() => {
                                const straightest = routes.find(r => r.type === 'straightest');
                                const balanced = routes.find(r => r.type === 'balanced');
                                const veryCurved = routes.find(r => r.type === 'very_curved');
                                const kurvigerStraightest = kurvigerRoutes[0];
                                
                                return (
                                    <>
                                        {straightest && kurvigerStraightest && (
                                            <div className="bg-gray-700 p-2 rounded">
                                                <div className="font-semibold mb-1">Straightest vs Kurviger Straightest</div>
                                                <div>Distance: {straightest.distance / 1000}km vs {kurvigerStraightest.distance / 1000}km 
                                                    ({((straightest.distance - kurvigerStraightest.distance) / kurvigerStraightest.distance * 100).toFixed(1)}%)
                                                </div>
                                                {straightest.curvature && kurvigerStraightest.curvature && (
                                                    <div>Curvature: {straightest.curvature.toFixed(6)} vs {kurvigerStraightest.curvature.toFixed(6)}
                                                        ({((straightest.curvature - kurvigerStraightest.curvature) / kurvigerStraightest.curvature * 100).toFixed(1)}%)
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {balanced && kurvigerStraightest && (() => {
                                            const straightestDist = routes.find(r => r.type === 'straightest')?.distance || balanced.distance;
                                            const straightestCurv = routes.find(r => r.type === 'straightest')?.curvature || 0.0001;
                                            const balancedDistPct = ((balanced.distance / straightestDist) - 1) * 100;
                                            const balancedCurvPct = ((balanced.curvature / straightestCurv) - 1) * 100;
                                            return (
                                                <div className="bg-gray-700 p-2 rounded">
                                                    <div className="font-semibold mb-1">Balanced vs Kurviger Curvy</div>
                                                    <div>Distance: {(balanced.distance / 1000).toFixed(2)}km ({balancedDistPct.toFixed(1)}% longer)</div>
                                                    {balanced.curvature && (
                                                        <div>Curvature: {balanced.curvature.toFixed(6)} ({balancedCurvPct.toFixed(0)}% more)</div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {veryCurved && kurvigerStraightest && (() => {
                                            const straightestDist = routes.find(r => r.type === 'straightest')?.distance || veryCurved.distance;
                                            const straightestCurv = routes.find(r => r.type === 'straightest')?.curvature || 0.0001;
                                            const veryCurvedDistPct = ((veryCurved.distance / straightestDist) - 1) * 100;
                                            const veryCurvedCurvPct = ((veryCurved.curvature / straightestCurv) - 1) * 100;
                                            return (
                                                <div className="bg-gray-700 p-2 rounded">
                                                    <div className="font-semibold mb-1">Very Curved vs Kurviger Extra Curvy</div>
                                                    <div>Distance: {(veryCurved.distance / 1000).toFixed(2)}km ({veryCurvedDistPct.toFixed(1)}% longer)</div>
                                                    {veryCurved.curvature && (
                                                        <div>Curvature: {veryCurved.curvature.toFixed(6)} ({veryCurvedCurvPct.toFixed(0)}% more)</div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
                
                {/* Route Validation Results */}
                {routes.length > 0 && (() => {
                    const validation = validateRouteParameters(routes);
                    const comparison = generateRouteComparison(routes);
                    const deadEndAnalysis = analyzeDeadEndAccuracy(routes, deadEnds);
                    
                    return (
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">✅ Route Validation</h3>
                            {validation.errors.length > 0 && (
                                <div className="mb-2 p-2 bg-red-900/30 rounded text-xs">
                                    <div className="font-semibold text-red-400 mb-1">Errors:</div>
                                    {validation.errors.map((err, idx) => (
                                        <div key={idx} className="text-red-300">{err.message}</div>
                                    ))}
                                </div>
                            )}
                            {validation.warnings.length > 0 && (
                                <div className="mb-2 p-2 bg-yellow-900/30 rounded text-xs">
                                    <div className="font-semibold text-yellow-400 mb-1">Warnings:</div>
                                    {validation.warnings.map((warn, idx) => (
                                        <div key={idx} className="text-yellow-300">{warn.message}</div>
                                    ))}
                                </div>
                            )}
                            {validation.valid && validation.warnings.length === 0 && (
                                <div className="p-2 bg-green-900/30 rounded text-xs text-green-300">
                                    ✓ All routes match their parameters
                                </div>
                            )}
                            
                            {comparison && (
                                <div className="mt-3 p-2 bg-gray-700 rounded text-xs">
                                    <div className="font-semibold mb-1">Distance Ratios:</div>
                                    {comparison.ratios?.balanced && (
                                        <div>Balanced: {(comparison.ratios?.balanced?.distance * 100).toFixed(1)}% of straightest</div>
                                    )}
                                    {comparison.ratios?.curvy && (
                                        <div>Curvy: {(comparison.ratios?.curvy?.distance * 100).toFixed(1)}% of straightest</div>
                                    )}
                                    {comparison.ratios?.extra_curvy && (
                                        <div>Extra Curvy: {(comparison.ratios?.extra_curvy?.distance * 100).toFixed(1)}% of straightest</div>
                                    )}
                                    {comparison.ratios?.balanced && (
                                        <div>Balanced: {(comparison.ratios?.balanced?.distance * 100).toFixed(1)}% of straightest</div>
                                    )}
                                    {comparison.ratios?.very_curved && (
                                        <div>Very Curved: {(comparison.ratios?.very_curved?.distance * 100).toFixed(1)}% of straightest</div>
                                    )}
                                    <div className="font-semibold mt-2 mb-1">Curvature Ratios:</div>
                                    {comparison.ratios?.fast_and_curvy && (
                                        <div>Fast and Curvy: {(comparison.ratios?.fast_and_curvy?.curvature || 1).toFixed(2)}x fastest</div>
                                    )}
                                    {comparison.ratios?.curvy && (
                                        <div>Curvy: {(comparison.ratios?.curvy?.curvature || 1).toFixed(2)}x fastest</div>
                                    )}
                                    {comparison.ratios?.extra_curvy && (
                                        <div>Extra Curvy: {(comparison.ratios?.extra_curvy?.curvature || 1).toFixed(2)}x fastest</div>
                                    )}
                                    {comparison.ratios?.balanced && (
                                        <div>Balanced: {(comparison.ratios?.balanced?.curvature).toFixed(2)}x straightest</div>
                                    )}
                                    {comparison.ratios?.very_curved && (
                                        <div>Very Curved: {(comparison.ratios?.very_curved?.curvature).toFixed(2)}x straightest</div>
                                    )}
                                </div>
                            )}
                            
                            {deadEndAnalysis.potentialFalsePositives.length > 0 && (
                                <div className="mt-3 p-2 bg-yellow-900/30 rounded text-xs">
                                    <div className="font-semibold text-yellow-400 mb-1">⚠️ Potential False Positives:</div>
                                    {deadEndAnalysis.potentialFalsePositives.map((fp, idx) => (
                                        <div key={idx} className="text-yellow-300">
                                            {fp.routeType}: {fp.reason} (max: {fp.maxBacktrack.toFixed(0)}m)
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
                
                {/* Routes List */}
                {routes.length > 0 && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold">Routes</h3>
                            {selectedRoute && (
                                <button
                                    onClick={() => {
                                        setSelectedRoute(null);
                                        showAllRoutes();
                                        setRouteStats(null);
                                    }}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                                >
                                    Show All
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {routes.map((route, index) => {
                                const deadEnd = deadEnds.find(de => de.routeType === route.type);
                                const isSelected = selectedRoute?.type === route.type;
                                return (
                                    <div
                                        key={index}
                                        onClick={() => selectRoute(route)}
                                        className={`p-3 rounded cursor-pointer border-2 transition-colors ${
                                            isSelected
                                                ? 'border-yellow-400 bg-yellow-900/30'
                                                : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold capitalize">
                                                {route.type === 'fastest' ? 'Fastest' 
                                                    : route.type === 'fast_and_curvy' ? 'Fast and Curvy' 
                                                    : route.type === 'curvy' ? 'Curvy' 
                                                    : route.type === 'extra_curvy' ? 'Extra Curvy' 
                                                    : route.type}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {isSelected && (
                                                    <span className="text-xs text-yellow-400">● Selected</span>
                                                )}
                                                {deadEnd?.hasIssues && (
                                                    <span className="text-red-400 text-xs">⚠️ Issues</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-300">
                                            <div>Distance: {(route.distance / 1000)?.toFixed(2)} km</div>
                                            <div>Duration: {Math.round(route.duration / 60)} min</div>
                                            {route.curvature && (
                                                <div>Curvature: {route.curvature.toFixed(6)}</div>
                                            )}
                                        </div>
                                        {!isSelected && selectedRoute && (
                                            <div className="text-xs text-gray-500 mt-1 italic">(Hidden - click to view)</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* Route Stats */}
                {routeStats && (
                    <div className="mb-6">
                        <h3 className="font-semibold mb-2">Route Statistics</h3>
                        <div className="bg-gray-700 p-3 rounded text-sm space-y-1">
                            <div>Distance: {(routeStats.distance / 1000)?.toFixed(2)} km</div>
                            <div>Duration: {Math.round(routeStats.duration / 60)} min</div>
                            {routeStats.curvature && (
                                <div>Curvature: {routeStats.curvature.toFixed(6)}</div>
                            )}
                            {routeStats.cornerCount && (
                                <div>Corners: {routeStats.cornerCount}</div>
                            )}
                            {routeStats.elevationGain && (
                                <div>Elevation Gain: {routeStats.elevationGain.toFixed(0)} m</div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Dead Ends Report */}
                {deadEnds.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-semibold mb-2 text-red-400">⚠️ Dead Ends Detected</h3>
                        <div className="space-y-2">
                            {deadEnds.map((deadEnd, index) => (
                                <div key={index} className="bg-red-900/30 p-2 rounded text-xs">
                                    <div className="font-semibold capitalize mb-1">{deadEnd.routeType}</div>
                                    {deadEnd.maxBacktrack > 300 && (
                                        <div>Max Backtrack: {deadEnd.maxBacktrack.toFixed(0)}m</div>
                                    )}
                                    {deadEnd.totalBacktrack > 800 && (
                                        <div>Total Backtrack: {deadEnd.totalBacktrack.toFixed(0)}m</div>
                                    )}
                                    {deadEnd.backtrackLocations.length > 0 && (
                                        <div>Backtrack Points: {deadEnd.backtrackLocations.length}</div>
                                    )}
                                    {deadEnd.loopLocations.length > 0 && (
                                        <div>
                                            Loops/U-Turns: {deadEnd.loopLocations.length}
                                            {deadEnd.loopLocations.some(l => l.type === 'branch-backtrack') && 
                                                ' (including branch backtracks)'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
            </div>
            
            {/* Map Container */}
            <div 
                id="debug-map" 
                className="flex-1"
            />
        </div>
    );
};

export default DebugRouteAdvanced;

