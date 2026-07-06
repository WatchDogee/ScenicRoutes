import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import axios from 'axios';
import { formatDistance, formatDuration, getCurvatureLabel } from '../utils/routeUtils';
import { logTelemetryEvent } from '../utils/telemetry';
import { FaRoute, FaTimes, FaMapMarkerAlt, FaDirections, FaPlus, FaTrash, FaRoad, FaMap, FaGasPump, FaBolt, FaCamera, FaSearch, FaShare, FaSave, FaEdit } from 'react-icons/fa';
import NavigationAppSelector from './NavigationAppSelector';
import SearchInput from './SearchInput';
import ShareRoute from './ShareRoute';
import SaveRouteDialog from './SaveRouteDialog';
import RouteExport from './RouteExport';
import FeatureGate from './FeatureGate';
import EnhancedRouteStatistics from './EnhancedRouteStatistics';
import { useToast } from './Toast';

export default function RoutePlanner({ map, isActive, onRouteCalculated, onClose, initialStart, initialEnd, initialWaypoints, autoCalculate = false, auth = null, renderInSidebar = false }) {
    // Toast notifications
    const { showToast, ToastContainer } = useToast();
    
    const [startPoint, setStartPoint] = useState(null);
    const [endPoint, setEndPoint] = useState(null);
    const [waypoints, setWaypoints] = useState([]);
    const [routeMode, setRouteMode] = useState('straightest'); // 'straightest', 'mellow', 'curved'
    
    // Load saved preferences - default to straightest
    // If saved value is 'balanced' (old default), reset to 'straightest'
    const savedCurvature = localStorage.getItem('scenicRoutes_preferredCurvature');
    const defaultCurvature = savedCurvature && savedCurvature !== 'balanced' ? savedCurvature : 'straightest';
    const [selectedCurvatureBeforeSearch, setSelectedCurvatureBeforeSearch] = useState(defaultCurvature);
    
    // Update localStorage if it was 'balanced' (old default)
    useEffect(() => {
        if (savedCurvature === 'balanced') {
            localStorage.setItem('scenicRoutes_preferredCurvature', 'straightest');
        }
    }, []);
    
    const [routes, setRoutes] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Calculating routes...');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [showNavigationSelector, setShowNavigationSelector] = useState(false);
    const [startSearchQuery, setStartSearchQuery] = useState('');
    const [endSearchQuery, setEndSearchQuery] = useState('');
    const [waypointSearchQueries, setWaypointSearchQueries] = useState({}); // Map waypoint ID to search query
    const [clickMode, setClickMode] = useState(null); // 'start', 'end', 'waypoint', null
    const [clickModeWaypointId, setClickModeWaypointId] = useState(null); // Track which waypoint is in click mode
    const [hasInitialized, setHasInitialized] = useState(false);
    
    // Route preview on hover
    const [hoveredRoute, setHoveredRoute] = useState(null);
    const previewRouteLayerRef = useRef(null);
    const [savedRoads, setSavedRoads] = useState([]);
    const [savedRoadsLoading, setSavedRoadsLoading] = useState(false);
    const [selectedSavedRoads, setSelectedSavedRoads] = useState([]);
    const [showSavedRoads, setShowSavedRoads] = useState(false);
    
    // Round trip state
    const [isRoundTrip, setIsRoundTrip] = useState(false);
    const [roundTripDistance, setRoundTripDistance] = useState(100); // Default 100 km
    const [roundTripCurvatureLevel, setRoundTripCurvatureLevel] = useState('balanced');
    
    // Avoid roads and alternative routes state
    const [avoidOptions, setAvoidOptions] = useState([]); // ['highways', 'tolls', 'ferries', 'unpaved']
    const [showAlternativeRoutes, setShowAlternativeRoutes] = useState(false);
    const [alternativeRoutes, setAlternativeRoutes] = useState([]);
    const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState(0);
    const [alternativeRoutesWarning, setAlternativeRoutesWarning] = useState(null);
    const [alternativeRoutesBlocked, setAlternativeRoutesBlocked] = useState(false);
    const [showShareRoute, setShowShareRoute] = useState(false);
    const [showSaveRouteDialog, setShowSaveRouteDialog] = useState(false);
    const [showRouteActions, setShowRouteActions] = useState(false);
    
    // POI integration state
    const [showPoiSearch, setShowPoiSearch] = useState(false);
    const [poiSearchType, setPoiSearchType] = useState('tourism'); // 'tourism', 'fuel', 'charging'
    const [poiSearchRadius, setPoiSearchRadius] = useState(10); // km
    const [poiSearchLocation, setPoiSearchLocation] = useState('midpoint'); // 'start', 'end', 'midpoint', 'along_route'
    const [foundPois, setFoundPois] = useState([]);
    const [poiLoading, setPoiLoading] = useState(false);
    
    // Section-specific curvature state
    const [segmentCurvatureRoute, setSegmentCurvatureRoute] = useState(null);
    const [isCalculatingSegmentCurvature, setIsCalculatingSegmentCurvature] = useState(false);
    const [segmentCurvatureLevels, setSegmentCurvatureLevels] = useState(['balanced']);
    const [containerFound, setContainerFound] = useState(false);
    
    const startMarkerRef = useRef(null);
    const endMarkerRef = useRef(null);
    const waypointMarkersRef = useRef([]);
    const routeLayerRef = useRef(null);
    const markersLayerRef = useRef(null);
    const editableRoutePolylineRef = useRef(null); // Reference to editable route polyline
    const routeEditControlRef = useRef(null); // Reference to edit control
    const sidebarContainerRef = useRef(null);
    
    // Use refs to always access latest state values in event handlers
    const startPointRef = useRef(startPoint);
    const endPointRef = useRef(endPoint);
    const waypointsRef = useRef(waypoints);
    const clickModeWaypointIdRef = useRef(clickModeWaypointId);
    const isActiveRef = useRef(isActive);
    const clickModeRef = useRef(clickMode);
    
    // Keep refs in sync with state
    useEffect(() => {
        startPointRef.current = startPoint;
        endPointRef.current = endPoint;
        waypointsRef.current = waypoints;
        isActiveRef.current = isActive;
        clickModeRef.current = clickMode;
    }, [startPoint, endPoint, waypoints, isActive, clickMode, clickModeWaypointId]);
    
    useEffect(() => {
        clickModeWaypointIdRef.current = clickModeWaypointId;
    }, [clickModeWaypointId]);

    // Save curvature preference when changed
    useEffect(() => {
        localStorage.setItem('scenicRoutes_preferredCurvature', selectedCurvatureBeforeSearch);
    }, [selectedCurvatureBeforeSearch]);


    // Initialize preview route layer
    useEffect(() => {
        if (!map) return;
        if (!previewRouteLayerRef.current) {
            previewRouteLayerRef.current = L.layerGroup().addTo(map);
        }
        return () => {
            if (previewRouteLayerRef.current) {
                previewRouteLayerRef.current.clearLayers();
            }
        };
    }, [map]);

    // Update cursor based on click mode
    useEffect(() => {
        if (!map) return;
        
        const container = map.getContainer();
        if (clickMode === 'start') {
            container.style.cursor = 'crosshair';
        } else if (clickMode === 'end') {
            container.style.cursor = 'crosshair';
        } else if (clickMode === 'waypoint') {
            container.style.cursor = 'crosshair';
        } else {
            container.style.cursor = '';
        }

        return () => {
            if (container) container.style.cursor = '';
        };
    }, [map, clickMode]);

    // Smart waypoint suggestions based on route midpoint
    const suggestWaypoints = () => {
        if (!startPoint || !endPoint) return [];
        
        const midLat = (startPoint.lat + endPoint.lat) / 2;
        const midLng = (startPoint.lng + endPoint.lng) / 2;
        const distance = Math.sqrt(
            Math.pow((endPoint.lat - startPoint.lat) * 111000, 2) + 
            Math.pow((endPoint.lng - startPoint.lng) * 111000, 2)
        );
        
        const suggestions = [];
        
        // Suggest waypoint at 1/3 and 2/3 of route for longer routes
        if (distance > 50000) { // > 50km
            suggestions.push({
                lat: startPoint.lat + (endPoint.lat - startPoint.lat) * 0.33,
                lng: startPoint.lng + (endPoint.lng - startPoint.lng) * 0.33,
                label: 'Suggested stop (1/3)'
            });
            suggestions.push({
                lat: startPoint.lat + (endPoint.lat - startPoint.lat) * 0.67,
                lng: startPoint.lng + (endPoint.lng - startPoint.lng) * 0.67,
                label: 'Suggested stop (2/3)'
            });
        } else if (distance > 20000) { // > 20km
            suggestions.push({
                lat: midLat,
                lng: midLng,
                label: 'Suggested midpoint stop'
            });
        }
        
        return suggestions;
    };
    
    // Update segment curvature levels when waypoints change
    useEffect(() => {
        const numSegments = waypoints.length + 1;
        const isLoggedIn = auth?.user !== null && auth?.user !== undefined;
        const subscriptionPlan = auth?.user?.subscription?.plan;
        const hasExtraCurvyAccess = isLoggedIn && (subscriptionPlan === 'premium' || subscriptionPlan === 'pro');
        
        setSegmentCurvatureLevels(prev => {
            if (prev.length === numSegments) {
                // Check if any level is extra_curvy without access and reset it
                const hasInvalidLevel = prev.some(level => level === 'extra_curvy' && !hasExtraCurvyAccess);
                if (hasInvalidLevel) {
                    return prev.map(level => level === 'extra_curvy' && !hasExtraCurvyAccess ? 'balanced' : level);
                }
                return prev;
            }
            const newLevels = [...prev];
            while (newLevels.length < numSegments) {
                const lastLevel = newLevels[newLevels.length - 1] || 'balanced';
                // Don't add extra_curvy if no access
                const safeLevel = (lastLevel === 'extra_curvy' && !hasExtraCurvyAccess) ? 'balanced' : lastLevel;
                newLevels.push(safeLevel);
            }
            if (newLevels.length > numSegments) {
                newLevels.splice(numSegments);
            }
            // Filter out extra_curvy if no access
            return newLevels.map(level => level === 'extra_curvy' && !hasExtraCurvyAccess ? 'balanced' : level);
        });
    }, [waypoints.length, auth]);

    // Handle sidebar rendering with portal - removed duplicate, handled below

    // Removed auto-calculation - user must click "Search Routes" button

    // GraphHopper status indicator and checks removed

    // Load saved roads if user is authenticated
    const loadSavedRoads = async () => {
        if (auth && auth.token) {
            try {
                setSavedRoadsLoading(true);
                axios.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`;
                const response = await axios.get('/api/saved-roads', {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                if (Array.isArray(response.data)) {
                    setSavedRoads(response.data);
                }
            } catch (error) {
                console.error('Error loading saved roads:', error);
                if (error.response?.status === 401) {
                    // Auth failed, clear token
                    delete axios.defaults.headers.common['Authorization'];
                }
            } finally {
                setSavedRoadsLoading(false);
            }
        }
    };

    useEffect(() => {
        loadSavedRoads();
    }, [auth]);

    // Listen for saved roads/routes updates
    useEffect(() => {
        const handleUpdate = () => {
            loadSavedRoads();
        };
        window.addEventListener('savedRoadsUpdated', handleUpdate);
        return () => window.removeEventListener('savedRoadsUpdated', handleUpdate);
    }, [auth]);

    useEffect(() => {
        if (!map) return;

        // Create layers for markers and routes
        if (!markersLayerRef.current) {
            markersLayerRef.current = L.layerGroup().addTo(map);
        }
        if (!routeLayerRef.current) {
            routeLayerRef.current = L.layerGroup().addTo(map);
        }

        if (isActive) {
            // Re-create markers if points exist but markers don't (after returning to route planner)
            if (startPoint && startPoint.lat && startPoint.lng && !startMarkerRef.current) {
                addMarker(startPoint.lat, startPoint.lng, 'start');
            }
            if (endPoint && endPoint.lat && endPoint.lng && !endMarkerRef.current) {
                addMarker(endPoint.lat, endPoint.lng, 'end');
            }
            waypoints.forEach((wp) => {
                // Check wp has valid lat/lng and doesn't already have a marker
                if (wp && wp.lat && wp.lng && wp.id) {
                    const existingMarker = waypointMarkersRef.current.find(m => m.id === wp.id);
                    if (!existingMarker) {
                        addMarker(wp.lat, wp.lng, 'waypoint', wp.id);
                    }
                }
            });
            
            // Use a named handler function that can be properly removed
            const clickHandler = (e) => {
                // Check if clicking on UI elements
                if (e.originalEvent.target.closest('.route-planner-panel') ||
                    e.originalEvent.target.closest('.leaflet-control') ||
                    e.originalEvent.target.closest('button')) {
                    return;
                }
                
                // Stop event propagation to prevent other handlers
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);
                
                // Use refs to get latest state values
                if (!isActiveRef.current) return;
                
                const { lat, lng } = e.latlng;
                const currentClickMode = clickModeRef.current;
                
                // Helper function to reverse geocode coordinates to location name
                const reverseGeocode = async (lat, lng) => {
                    try {
                        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                            params: {
                                lat,
                                lon: lng,
                                format: 'json',
                                addressdetails: 1,
                                'accept-language': 'en'
                            },
                            withCredentials: false,
                            headers: { 'Accept': 'application/json' }
                        });
                        
                        if (response.data && response.data.address) {
                            const addr = response.data.address;
                            const parts = [];
                            if (addr.city || addr.town || addr.village || addr.municipality) {
                                parts.push(addr.city || addr.town || addr.village || addr.municipality);
                            }
                            if (addr.county) {
                                parts.push(addr.county);
                            } else if (addr.state || addr.region) {
                                parts.push(addr.state || addr.region);
                            }
                            if (addr.country) {
                                parts.push(addr.country);
                            }
                            if (parts.length > 0) {
                                return parts.join(', ');
                            }
                            return response.data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        }
                    } catch (error) {
                        console.warn('Reverse geocoding failed:', error);
                    }
                    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                };
                
                if (currentClickMode === 'start') {
                    const newStartPoint = { lat, lng };
                    setStartPoint(newStartPoint);
                    addMarker(lat, lng, 'start');
                    // Reverse geocode to get location name
                    reverseGeocode(lat, lng).then(locationName => {
                        setStartSearchQuery(locationName);
                    });
                    setClickMode(null);
                    // Clear old routes when start point changes
                    if (routeLayerRef.current) {
                        routeLayerRef.current.clearLayers();
                    }
                    setRoutes({});
                    setSelectedRoute(null);
                    // Save to history
                    showToast('Start point set', 'success', 2000);
                } else if (currentClickMode === 'end') {
                    const newEndPoint = { lat, lng };
                    setEndPoint(newEndPoint);
                    addMarker(lat, lng, 'end');
                    // Reverse geocode to get location name
                    reverseGeocode(lat, lng).then(locationName => {
                        setEndSearchQuery(locationName);
                    });
                    setClickMode(null);
                    // Clear old routes when end point changes
                    if (routeLayerRef.current) {
                        routeLayerRef.current.clearLayers();
                    }
                    setRoutes({});
                    setSelectedRoute(null);
                    // Save to history
                    showToast('End point set', 'success', 2000);
                } else if (currentClickMode === 'waypoint') {
                    if (clickModeWaypointIdRef.current) {
                        // Updating existing waypoint
                        const waypointId = clickModeWaypointIdRef.current;
                        setWaypoints(prev => {
                            const updated = prev.map(wp => 
                                wp.id === waypointId 
                                    ? { ...wp, lat, lng }
                                    : wp
                            );
                            return updated;
                        });
                        
                        // Update marker
                        const waypointMarker = waypointMarkersRef.current.find(wp => wp.id === waypointId);
                        if (waypointMarker && markersLayerRef.current) {
                            markersLayerRef.current.removeLayer(waypointMarker.marker);
                            waypointMarkersRef.current = waypointMarkersRef.current.filter(wp => wp.id !== waypointId);
                        }
                        addMarker(lat, lng, 'waypoint', waypointId);
                        
                        // Reverse geocode to get location name
                        reverseGeocode(lat, lng).then(locationName => {
                            setWaypointSearchQueries(prev => ({
                                ...prev,
                                [waypointId]: locationName
                            }));
                        });
                        
                        showToast('Waypoint updated', 'success', 2000);
                    } else {
                        // Adding new waypoint
                        const newWaypoint = { lat, lng, id: Date.now() };
                        setWaypoints(prev => [...prev, newWaypoint]);
                        addMarker(lat, lng, 'waypoint', newWaypoint.id);
                        
                        // Reverse geocode to get location name
                        reverseGeocode(lat, lng).then(locationName => {
                            setWaypointSearchQueries(prev => ({
                                ...prev,
                                [newWaypoint.id]: locationName
                            }));
                        });
                        
                        // With multi-segment routing, each segment gets full strategic waypoints
                        const curvatureLevel = selectedCurvatureBeforeSearch || 'straightest';
                        if (curvatureLevel !== 'straightest') {
                            const strategicWpsPerSegment = curvatureLevel === 'balanced' ? 1 : curvatureLevel === 'curvy' ? 2 : 3;
                            showToast(`Waypoint added. Using multi-segment routing - each segment will have ${strategicWpsPerSegment} strategic waypoint(s) for full curviness.`, 'success', 4000);
                        } else {
                            showToast('Waypoint added', 'success', 2000);
                        }
                    }
                    setClickMode(null);
                    setClickModeWaypointId(null);
                }
                // Only allow map clicks when a click mode is active
                // No default behavior - user must select start/end/waypoint mode first
            };
            
            // Remove old handler if it exists
            if (markersLayerRef.current && markersLayerRef.current._routeClickHandler) {
                map.off('click', markersLayerRef.current._routeClickHandler, map);
            }
            
            // Add handler with a specific context to make it easier to remove
            map.on('click', clickHandler, map);
            map.getContainer().style.cursor = 'crosshair';
            
            // Store handler reference for cleanup
            markersLayerRef.current._routeClickHandler = clickHandler;
        } else {
            // Clean up
            if (markersLayerRef.current && markersLayerRef.current._routeClickHandler) {
                map.off('click', markersLayerRef.current._routeClickHandler, map);
                delete markersLayerRef.current._routeClickHandler;
            }
            map.getContainer().style.cursor = '';
            // DON'T clear route when exiting - preserve markers for when user returns
            // User can manually clear with "Clear Route" button if needed
        }

        return () => {
            if (map && markersLayerRef.current && markersLayerRef.current._routeClickHandler) {
                map.off('click', markersLayerRef.current._routeClickHandler, map);
                delete markersLayerRef.current._routeClickHandler;
            }
        };
    }, [map, isActive, clickMode]);

    const addMarker = (lat, lng, type, waypointId = null) => {
        if (!map || !markersLayerRef.current) return;

        let color, icon;
        if (type === 'start') {
            if (startMarkerRef.current) {
                markersLayerRef.current.removeLayer(startMarkerRef.current);
            }
            color = 'green';
            icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            const marker = L.marker([lat, lng], { icon }).addTo(markersLayerRef.current);
            startMarkerRef.current = marker;
        } else if (type === 'end') {
            if (endMarkerRef.current) {
                markersLayerRef.current.removeLayer(endMarkerRef.current);
            }
            color = 'red';
            icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            const marker = L.marker([lat, lng], { icon }).addTo(markersLayerRef.current);
            endMarkerRef.current = marker;
        } else if (type === 'waypoint') {
            color = 'blue';
            icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: move;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            const marker = L.marker([lat, lng], { 
                icon,
                draggable: true // Make waypoints draggable for easy adjustment
            }).addTo(markersLayerRef.current);
            
            // Add drag handler to update waypoint position
            marker.on('dragend', (e) => {
                const newLat = e.target.getLatLng().lat;
                const newLng = e.target.getLatLng().lng;
                
                if (waypointId) {
                    setWaypoints(prev => {
                        const updated = prev.map(wp => 
                            wp.id === waypointId 
                                ? { ...wp, lat: newLat, lng: newLng }
                                : wp
                        );
                        return updated;
                    });
                    // Update search query when waypoint is dragged
                    setWaypointSearchQueries(prev => ({
                        ...prev,
                        [waypointId]: `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`
                    }));
                    showToast('Waypoint moved. Click "Search Routes" to recalculate.', 'info', 2000);
                }
            });
            
            if (waypointId) {
                waypointMarkersRef.current.push({ id: waypointId, marker });
            }
        }
    };

    // Initialize with provided initial values (after markers layer and addMarker are set up)
    useEffect(() => {
        if (!map || !markersLayerRef.current || hasInitialized || !initialStart || !initialEnd) return;
        
        // Set start point
        setStartPoint({ lat: initialStart.lat, lng: initialStart.lng });
        addMarker(initialStart.lat, initialStart.lng, 'start');
        setStartSearchQuery(initialStart.name || `Balvi (${initialStart.lat.toFixed(4)}, ${initialStart.lng.toFixed(4)})`);
        
        // Set end point
        setEndPoint({ lat: initialEnd.lat, lng: initialEnd.lng });
        addMarker(initialEnd.lat, initialEnd.lng, 'end');
        setEndSearchQuery(initialEnd.name || `Riga (${initialEnd.lat.toFixed(4)}, ${initialEnd.lng.toFixed(4)})`);
        
        // Set waypoints if provided
        if (initialWaypoints && initialWaypoints.length > 0) {
            const formattedWaypoints = initialWaypoints.map((wp, index) => ({
                lat: wp.lat,
                lng: wp.lng,
                id: wp.id || Date.now() + index
            }));
            setWaypoints(formattedWaypoints);
            formattedWaypoints.forEach(wp => {
                addMarker(wp.lat, wp.lng, 'waypoint', wp.id);
            });
            // Initialize search queries for waypoints
            const queries = {};
            formattedWaypoints.forEach(wp => {
                queries[wp.id] = wp.name || `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`;
            });
            setWaypointSearchQueries(queries);
        }
        
        setHasInitialized(true);
        
        // Auto-calculate routes if requested
        if (autoCalculate) {
            setTimeout(() => {
                recalculateRoutes();
            }, 500);
        }
        
        // Listen for route recalculation events from external components (e.g., POI component)
        const handleRecalculateRoute = (event) => {
            if (event.detail && event.detail.waypoint) {
                // Add waypoint from POI component
                const newWaypoint = event.detail.waypoint;
                const waypointSource = event.detail?.source || 'external';
                setWaypoints(prev => {
                    // Check if waypoint already exists
                    const exists = prev.some(wp => 
                        Math.abs(wp.lat - newWaypoint.lat) < 0.0001 && 
                        Math.abs(wp.lng - newWaypoint.lng) < 0.0001
                    );
                    if (exists) return prev;
                    return [...prev, newWaypoint];
                });
                logTelemetryEvent('routeplanner_waypoint_added', {
                    source: waypointSource,
                    lat: newWaypoint.lat,
                    lng: newWaypoint.lng,
                    name: newWaypoint.name || null,
                    type: newWaypoint.type || null,
                });
                // Recalculate routes after adding waypoint
                setTimeout(() => recalculateRoutes(), 100);
            } else {
                // Just recalculate with existing waypoints
                recalculateRoutes();
                logTelemetryEvent('routeplanner_recalculate', {
                    reason: event.detail?.reason || 'external_request',
                    waypoint_count: waypoints.length,
                });
            }
        };
        
        window.addEventListener('recalculateRoute', handleRecalculateRoute);
        
        return () => {
            window.removeEventListener('recalculateRoute', handleRecalculateRoute);
        };
    }, [map, initialStart, initialEnd, initialWaypoints, autoCalculate, hasInitialized]);

    const removeWaypoint = (waypointId) => {
        // Remove marker from map
        const waypointMarker = waypointMarkersRef.current.find(wp => wp.id === waypointId);
        if (waypointMarker && markersLayerRef.current) {
            markersLayerRef.current.removeLayer(waypointMarker.marker);
            waypointMarkersRef.current = waypointMarkersRef.current.filter(wp => wp.id !== waypointId);
        }
        
        // Remove from state
        setWaypoints(prev => prev.filter(wp => wp.id !== waypointId));
        
        // Remove search query
        setWaypointSearchQueries(prev => {
            const updated = { ...prev };
            delete updated[waypointId];
            return updated;
        });
        
        // Clear old routes when waypoints change
        if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
        }
        setRoutes({});
        setSelectedRoute(null);
        
        showToast('Waypoint removed. Click "Search Routes" to recalculate.', 'info', 3000);
        
        // Don't auto-recalculate - let user decide when to recalculate
        // This prevents errors and saves API calls
    };

    const handleStartLocationSelect = (location) => {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon || location.lng);
        const newStartPoint = { lat, lng };
        setStartPoint(newStartPoint);
        addMarker(lat, lng, 'start');
        setStartSearchQuery(location.displayName);
        // Clear old routes when start point changes
        if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
        }
        setRoutes({});
        setSelectedRoute(null);
        showToast('Start point set', 'success', 2000);
    };

    const handleEndLocationSelect = (location) => {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon || location.lng);
        const newEndPoint = { lat, lng };
        setEndPoint(newEndPoint);
        addMarker(lat, lng, 'end');
        setEndSearchQuery(location.displayName);
        // Clear old routes when end point changes
        if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
        }
        setRoutes({});
        setSelectedRoute(null);
        showToast('End point set', 'success', 2000);
    };

    const handleWaypointLocationSelect = (location, waypointId) => {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon || location.lng);
        
        setWaypoints(prev => {
            const updated = prev.map(wp => 
                wp.id === waypointId 
                    ? { ...wp, lat, lng }
                    : wp
            );
            return updated;
        });
        
        // Update marker
        const waypointMarker = waypointMarkersRef.current.find(wp => wp.id === waypointId);
        if (waypointMarker && markersLayerRef.current) {
            markersLayerRef.current.removeLayer(waypointMarker.marker);
            waypointMarkersRef.current = waypointMarkersRef.current.filter(wp => wp.id !== waypointId);
        }
        addMarker(lat, lng, 'waypoint', waypointId);
        
        // Update search query
        setWaypointSearchQueries(prev => ({
            ...prev,
            [waypointId]: location.displayName
        }));
        
        // Clear old routes when waypoint changes
        if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
        }
        setRoutes({});
        setSelectedRoute(null);
        
        showToast('Waypoint updated', 'success', 2000);
    };

    const addWaypointInput = () => {
        const newWaypoint = {
            lat: null,
            lng: null,
            id: Date.now()
        };
        setWaypoints(prev => [...prev, newWaypoint]);
        setWaypointSearchQueries(prev => ({
            ...prev,
            [newWaypoint.id]: ''
        }));
    };

    const recalculateRoutes = () => {
        const currentStart = startPoint || (initialStart ? { lat: initialStart.lat, lng: initialStart.lng } : null);
        const currentEnd = endPoint || (initialEnd ? { lat: initialEnd.lat, lng: initialEnd.lng } : null);
        const currentWaypoints = waypoints.length > 0 ? waypoints : (initialWaypoints || []);
        
        if (currentStart && currentEnd) {
            calculateRoutes(currentStart.lat, currentStart.lng, currentEnd.lat, currentEnd.lng, currentWaypoints);
        }
    };

    const calculateRoundTrip = async () => {
        if (!startPoint) {
            showToast('Please set a start point for the round trip.', 'error', 3000);
            return;
        }

        setLoading(true);
        setRoutes({});
        setSelectedRoute(null);

        try {
            const savedRoadIds = selectedSavedRoads.map(road => road.id);
            const axiosConfig = { timeout: 180000 }; // 3 minute timeout for round trip
            const requestHeaders = auth && auth.token ? { Authorization: `Bearer ${auth.token}` } : {};

            const response = await axios.post('/api/routes/round-trip', {
                start_lat: startPoint.lat,
                start_lon: startPoint.lng,
                distance_km: roundTripDistance,
                curvature_level: roundTripCurvatureLevel,
                saved_road_ids: savedRoadIds
            }, {
                ...axiosConfig,
                headers: requestHeaders
            });

            if (!response.data || !response.data.coordinates || response.data.coordinates.length === 0) {
                console.error('Round trip route has no coordinates');
                showToast('Round trip route could not be calculated. Please try again.', 'error', 4000);
                setLoading(false);
                return;
            }

            const roundTripRoute = {
                ...response.data,
                type: 'round_trip',
                routeType: 'round_trip'
            };

            // Clear existing routes and display round trip
            routeLayerRef.current.clearLayers();
            
            const coordinates = roundTripRoute.coordinates.map(coord => [coord[0], coord[1]]);
            
            // Purple solid line for round trip
            const polyline = L.polyline(coordinates, {
                color: '#9b59b6',
                weight: 5,
                opacity: 0.9,
                smoothFactor: 1
            }).addTo(routeLayerRef.current);

            // Add start/end marker (same point for round trip)
            if (startMarkerRef.current) {
                map.removeLayer(startMarkerRef.current);
            }
            const startIcon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: #9b59b6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            startMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], { icon: startIcon })
                .addTo(markersLayerRef.current);

        // Fit map to route bounds
        const bounds = polyline.getBounds();
        map.fitBounds(bounds, {
            padding: [50, 50]
        });

        // Store as a single route
        setRoutes({ round_trip: roundTripRoute });
        setSelectedRoute('round_trip');

        // Notify parent component
        if (onRouteCalculated) {
            onRouteCalculated({ ...roundTripRoute, waypoints: waypoints });
        }

        } catch (error) {
            console.error('Error calculating round trip:', error);
            let errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to calculate round trip. Please try again.';
            
            // Handle 404 - route not found
            if (error.response?.status === 404) {
                errorMessage = error.response?.data?.message || 'Could not find a valid round trip route. Try adjusting the distance or starting location.';
            }
            
            // Handle 403 - premium feature
            if (error.response?.status === 403) {
                errorMessage = error.response?.data?.message || 'Round trips over 300km require Premium or Pro subscription.';
                showToast(errorMessage, 'warning', 6000);
            } else {
                showToast(errorMessage, 'error', 5000);
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateRoutes = async (startLat, startLon, endLat, endLon, waypointsList = []) => {
        // Validation
        const distance = Math.sqrt(
            Math.pow((endLat - startLat) * 111000, 2) + 
            Math.pow((endLon - startLon) * 111000, 2)
        );
        
        if (distance < 100) {
            showToast('Start and end points are too close (minimum 100m)', 'error', 4000);
            return;
        }

        // GraphHopper API supports all regions, no bounds checking needed
        setLoading(true);
        setLoadingMessage('Preparing route calculation...');
        setLoadingProgress(10);
        
        // Clear old routes and markers BEFORE calculating new route
        if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
        }
        // Note: Don't clear markersLayerRef here - we want to keep start/end/waypoint markers
        // Only clear route polylines, not the markers
        
        setRoutes({});
        setSelectedRoute(null);
        setAlternativeRoutes([]);
        setSelectedAlternativeIndex(0);
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 5;
            });
        }, 200);

        try {
            setLoadingMessage('Analyzing route options...');
            setLoadingProgress(20);
            
            const waypointsData = waypointsList.map(wp => ({ lat: wp.lat, lon: wp.lng }));
            const savedRoadIds = selectedSavedRoads.map(road => road.id);

            // Prepare request config with auth if available
            const axiosConfig = { timeout: 120000 }; // 2 minute timeout
            const requestHeaders = auth && auth.token ? { Authorization: `Bearer ${auth.token}` } : {};
            
            setLoadingMessage('Finding best path...');
            setLoadingProgress(40);

            let calculatedRoutes = {};
            let selectedRouteType = null;
            let selectedRouteData = null;

            // Alternative routes disabled for now
            // If alternative routes are enabled, only make ONE API call
            if (false && showAlternativeRoutes) {
                try {
                    const fastestResponse = await axios.post('/api/routes/graphhopper', {
                        start_lat: startLat,
                        start_lon: startLon,
                        end_lat: endLat,
                        end_lon: endLon,
                        waypoints: waypointsData,
                        saved_road_ids: savedRoadIds,
                        curvature_level: 'straightest',
                        avoid_options: avoidOptions,
                        alternative_routes: true
                    }, { ...axiosConfig, headers: requestHeaders });

                    const responseData = fastestResponse.data;
                
                let altRoutes = [];
                
                // Check if response contains alternative routes
                if (responseData.routes && Array.isArray(responseData.routes) && responseData.routes.length > 1) {
                    // Alternative routes in routes property
                    altRoutes = responseData.routes;
                    setAlternativeRoutes(altRoutes);
                    setSelectedAlternativeIndex(0);
                    calculatedRoutes.straightest = responseData.routes[0];
                    selectedRouteType = 'straightest';
                    selectedRouteData = responseData.routes[0];
                } else if (Array.isArray(responseData) && responseData.length > 1) {
                    // Direct array response (multiple routes)
                    altRoutes = responseData;
                    setAlternativeRoutes(altRoutes);
                    setSelectedAlternativeIndex(0);
                    calculatedRoutes.straightest = responseData[0];
                    selectedRouteType = 'straightest';
                    selectedRouteData = responseData[0];
                } else {
                    // Single route or no alternatives found
                    setAlternativeRoutes([]);
                    const singleRoute = responseData.routes ? responseData.routes[0] : (Array.isArray(responseData) ? responseData[0] : responseData);
                    calculatedRoutes.straightest = singleRoute;
                    selectedRouteType = 'straightest';
                    selectedRouteData = singleRoute;
                    
                    // Notify user if alternatives were requested but not available
                    if (responseData.single_route) {
                        setAlternativeRoutesWarning('Alternative routes are not available for this route. The route may be too constrained (waypoints, saved roads, or route characteristics prevent alternatives).');
                    } else {
                        setAlternativeRoutesWarning('Alternative routes are not available for this route. Only one route option was found.');
                    }
                }
                
                // Store altRoutes for later use
                calculatedRoutes._altRoutes = altRoutes;
                } catch (error) {
                    console.error('Error calculating alternative routes:', error);
                    let errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to calculate alternative routes. Please try again.';
                    
                    // Handle 403 - premium feature
                    if (error.response?.status === 403) {
                        errorMessage = 'Alternative routes require Premium or Pro subscription. Please upgrade to access this feature.';
                        showToast(errorMessage, 'warning', 6000);
                    } else {
                        showToast(errorMessage, 'error', 5000);
                    }
                    
                    logTelemetryEvent('route_calculation_failed', {
                        stage: 'alternative_routes',
                        message: errorMessage,
                        status: error.response?.status,
                    });
                    setLoading(false);
                    return;
                }
            } else {
                // Normal mode: Calculate only the selected curvature level to save API calls
                const curvatureLevel = selectedCurvatureBeforeSearch;
                
                try {
                    const response = await axios.post('/api/routes/graphhopper', {
                        start_lat: startLat,
                        start_lon: startLon,
                        end_lat: endLat,
                        end_lon: endLon,
                        waypoints: waypointsData,
                        saved_road_ids: savedRoadIds,
                        curvature_level: curvatureLevel,
                        avoid_options: avoidOptions,
                        alternative_routes: false
                    }, { ...axiosConfig, headers: requestHeaders });

                    // Check if response has coordinates (even if error field exists)
                    // Sometimes backend returns both route and error field
                    let routeData = null;
                    
                    // Handle different response formats
                    if (response.data.route) {
                        routeData = response.data.route;
                    } else if (response.data.routes && Array.isArray(response.data.routes) && response.data.routes.length > 0) {
                        routeData = response.data.routes[0];
                    } else if (Array.isArray(response.data) && response.data.length > 0) {
                        routeData = response.data[0];
                    } else if (response.data && (response.data.coordinates || response.data.points)) {
                        // Route data is at root level - use it even if error field exists
                        routeData = response.data;
                    }
                    
                    // Log response structure for debugging
                    console.log('Route calculation response:', {
                        hasRoute: !!routeData,
                        hasCoordinates: !!(routeData?.coordinates),
                        hasPoints: !!(routeData?.points),
                        routeKeys: routeData ? Object.keys(routeData) : [],
                        coordinatesLength: routeData?.coordinates?.length || 0,
                        hasError: !!(response.data?.error)
                    });
                    
                    // Validate route has coordinates - if it does, use it even if error field exists
                    if (routeData && (routeData.coordinates || routeData.points)) {
                        // Route is valid, proceed with it
                        // Map curvature level to route key
                        let routeKey = 'straightest';
                        if (curvatureLevel === 'balanced') routeKey = 'balanced';
                        else if (curvatureLevel === 'curvy') routeKey = 'curved';
                        else if (curvatureLevel === 'extra_curvy') routeKey = 'extra_curved';
                        
                        calculatedRoutes[routeKey] = routeData;
                        selectedRouteType = routeKey;
                        selectedRouteData = routeData;
                    } else if (response.data?.error) {
                        // No route data and error exists - throw error with better message
                        let errorMsg = response.data.error || response.data.message || 'Could not calculate route with GraphHopper';
                        
                        // Handle rate limit error specifically
                        if (response.data.error === 'GraphHopper API daily limit reached' || 
                            response.data.message?.includes('rate limit') ||
                            response.data.message?.includes('limit reached')) {
                            errorMsg = response.data.message || 'GraphHopper API daily limit reached. Please try again tomorrow or upgrade your plan.';
                            showToast(errorMsg, 'warning', 8000);
                        }
                        
                        console.error('Route calculation API error:', {
                            status: response.status,
                            data: response.data,
                            error: errorMsg
                        });
                        throw new Error(errorMsg);
                    } else {
                        // No route and no error - unexpected
                        console.error('Route data structure:', response.data);
                        throw new Error('Route calculation returned invalid data: missing coordinates. Response keys: ' + Object.keys(response.data || {}).join(', '));
                    }
                } catch (error) {
                    clearInterval(progressInterval);
                    console.error('Route calculation error:', error);
                    let errorMsg = 'Failed to calculate route';
                    let errorType = 'error';
                    
                    // Handle 403 - premium feature
                    if (error?.response?.status === 403) {
                        errorMsg = error.response?.data?.message || 'This feature requires Premium or Pro subscription.';
                        errorType = 'warning';
                        showToast(errorMsg, 'warning', 6000);
                        setLoading(false);
                        return;
                    }
                    
                    // Handle 429 - rate limit (only show if GraphHopper actually returned 429)
                    if (error?.response?.status === 429) {
                        errorMsg = error.response?.data?.message || 'GraphHopper API rate limit reached. Please wait a moment and try again.';
                        errorType = 'warning';
                        showToast(errorMsg, 'warning', 8000);
                        setLoading(false);
                        return;
                    }
                    
                    // For extra_curvy routes, try fallback to curvy if route calculation fails
                    if (curvatureLevel === 'extra_curvy' && !error?.response?.data?.error?.includes('limit')) {
                        console.log('Extra curvy route failed, attempting fallback to curvy...');
                        try {
                            const fallbackResponse = await axios.post('/api/routes/graphhopper', {
                                start_lat: startLat,
                                start_lon: startLon,
                                end_lat: endLat,
                                end_lon: endLon,
                                waypoints: waypointsData,
                                saved_road_ids: savedRoadIds,
                                curvature_level: 'curvy',
                                avoid_options: avoidOptions,
                                alternative_routes: false
                            }, { ...axiosConfig, headers: requestHeaders });
                            
                            let fallbackRouteData = null;
                            if (fallbackResponse.data.route) {
                                fallbackRouteData = fallbackResponse.data.route;
                            } else if (fallbackResponse.data.routes && Array.isArray(fallbackResponse.data.routes) && fallbackResponse.data.routes.length > 0) {
                                fallbackRouteData = fallbackResponse.data.routes[0];
                            } else if (Array.isArray(fallbackResponse.data) && fallbackResponse.data.length > 0) {
                                fallbackRouteData = fallbackResponse.data[0];
                            } else if (fallbackResponse.data && (fallbackResponse.data.coordinates || fallbackResponse.data.points)) {
                                fallbackRouteData = fallbackResponse.data;
                            }
                            
                            if (fallbackRouteData && (fallbackRouteData.coordinates || fallbackRouteData.points)) {
                                // Use curvy route as fallback - display it immediately
                                calculatedRoutes['curved'] = fallbackRouteData;
                                calculatedRoutes._fallback_used = true; // Mark as fallback to prevent success toast
                                selectedRouteType = 'curved';
                                selectedRouteData = fallbackRouteData;
                                
                                // Update state and display the fallback route
                                clearInterval(progressInterval);
                                setLoadingProgress(100);
                                setLoadingMessage('Route calculated successfully!');
                                
                                // Update state with all calculated routes
                                setRoutes(calculatedRoutes);
                                
                                setTimeout(() => {
                                    setSelectedRoute('curved');
                                    // Pass fallback flag to displayRoute to make route red
                                    displayRoute(fallbackRouteData, 'curved', true); // true = isFallback
                                    setLoading(false);
                                    setLoadingProgress(0);
                                    // Show info toast (not error)
                                    showToast('Extra curvy route not available for this route. Using curvy route instead.', 'info', 5000);
                                }, 100);
                                
                                // Log telemetry
                                logTelemetryEvent('route_calculation_completed', {
                                    waypoint_count: waypointsList.length,
                                    avoid_options: avoidOptions,
                                    curvature_level: 'curvy', // Fallback level
                                    original_level: 'extra_curvy',
                                    calculated_routes: Object.keys(calculatedRoutes).length,
                                    fallback_used: true
                                });
                                
                                return; // Exit early - route displayed
                            } else {
                                throw new Error('Fallback to curvy also failed');
                            }
                        } catch (fallbackError) {
                            console.error('Fallback to curvy also failed:', fallbackError);
                            // Continue with original error handling
                        }
                    }
                    
                    if (error?.response?.data?.message) {
                        errorMsg = error.response.data.message;
                    } else if (error?.response?.data?.error) {
                        errorMsg = error.response.data.error;
                    } else if (error?.message) {
                        errorMsg = error.message;
                    } else {
                        errorMsg = 'Failed to connect to GraphHopper. Please check your connection.';
                    }
                    
                    // If waypoints are causing issues, suggest removing them
                    if (waypointsData.length > 0 && (error?.response?.status === 400 || error?.response?.status === 500)) {
                        errorMsg += ' Tip: Try removing some waypoints or adjusting their positions.';
                    }
                    
                    // Check for API limit
                    if (error?.response?.status === 429 || errorMsg.includes('limit')) {
                        errorType = 'warning';
                        errorMsg = 'API rate limit reached. Please wait a moment and try again.';
                    }
                    
                    logTelemetryEvent('route_calculation_failed', {
                        stage: curvatureLevel,
                        message: errorMsg,
                        status: error?.response?.status,
                        waypoint_count: waypointsData.length,
                    });
                    showToast(errorMsg, errorType, 5000);
                    setLoading(false);
                    setLoadingProgress(0);
                    return;
                }

            }

            // Update state with all calculated routes
            setRoutes(calculatedRoutes);
            const summarizeRoute = (route) => route ? {
                distance: route.distance || route?.paths?.[0]?.distance || null,
                duration: route.time || route.duration || route?.paths?.[0]?.time || null,
                curvature: route.curvature || null,
                coordinates: route.coordinates?.length || route?.points?.length || null,
            } : null;
            logTelemetryEvent('route_calculation_completed', {
                waypoint_count: waypointsList.length,
                avoid_options: avoidOptions,
                curvature_level: selectedCurvatureBeforeSearch,
                calculated_routes: Object.keys(calculatedRoutes).length,
                alternative_routes: (calculatedRoutes._altRoutes || []).length,
            });

            // Display the selected route
            if (selectedRouteData && selectedRouteType) {
                clearInterval(progressInterval);
                setLoadingProgress(100);
                setLoadingMessage('Route calculated successfully!');
                
                setTimeout(() => {
                    setSelectedRoute(selectedRouteType);
                    displayRoute(selectedRouteData, selectedRouteType);
                    
                    // Check API limit warnings
                    if (selectedRouteData._api_stats) {
                        const apiStats = selectedRouteData._api_stats;
                        if (apiStats.limit_reached) {
                            showToast(`GraphHopper API daily limit reached. Route calculation unavailable until tomorrow.`, 'warning', 6000);
                        } else if (apiStats.warning) {
                            showToast(`API approaching daily limit: ${apiStats.count}/${apiStats.limit} calls used (${apiStats.remaining} remaining).`, 'warning', 5000);
                        }
                    }
                    
                    // Note: With strategic waypoints, curvature should now be preserved
                    // Only show success toast if this wasn't a fallback (fallback shows error toast instead)
                    if (!calculatedRoutes._fallback_used) {
                        showToast('Route calculated successfully!', 'success', 3000);
                    }
                }, 300);
                
                // If alternative routes are enabled and we have them, display them after the main route
                const altRoutesToDisplay = calculatedRoutes._altRoutes || alternativeRoutes;
                if (showAlternativeRoutes && altRoutesToDisplay.length > 1) {
                    // Use setTimeout to ensure displayRoute completes first
                    setTimeout(() => {
                        displayAlternativeRoutes(altRoutesToDisplay, selectedAlternativeIndex);
                    }, 100);
                }
            } else {
                clearInterval(progressInterval);
                console.error('No GraphHopper routes calculated successfully');
                showToast('Failed to calculate routes. Please check your start and end points.', 'error', 4000);
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Error calculating routes:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to calculate routes. Please try again.';
            logTelemetryEvent('route_calculation_failed', {
                message: errorMessage,
                status: error.response?.status,
            });
            showToast(errorMessage, 'error', 5000);
        } finally {
            setLoading(false);
            setLoadingProgress(0);
            setLoadingMessage('Calculating routes...');
        }
    };

    const calculateSegmentCurvatureRoute = async () => {
        if (!startPoint || !endPoint) {
            alert('Please set start and end points first');
            return;
        }
        
        if (waypoints.length === 0) {
            showToast('Please add at least one waypoint to use segment-specific curvature', 'error', 3000);
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
            logTelemetryEvent('segment_curvature_calculation_started', {
                segments: curvatureLevels.slice(0, numSegments),
                waypoint_count: waypoints.length,
                avoid_options: avoidOptions,
            });
            
            const waypointsData = waypoints.map(wp => ({ lat: wp.lat, lon: wp.lng }));
            const requestHeaders = auth && auth.token ? { Authorization: `Bearer ${auth.token}` } : {};
            
            const response = await axios.post('/api/routes/graphhopper/segment-curvature', {
                start_lat: startPoint.lat,
                start_lon: startPoint.lng,
                end_lat: endPoint.lat,
                end_lon: endPoint.lng,
                waypoints: waypointsData,
                segment_curvature: curvatureLevels.slice(0, numSegments),
                avoid_options: avoidOptions
            }, { 
                timeout: 120000,
                headers: requestHeaders
            });
            
            if (response.data.error) {
                showToast(`Error: ${response.data.error}`, 'error', 5000);
                logTelemetryEvent('segment_curvature_calculation_failed', {
                    message: response.data.error,
                });
                setIsCalculatingSegmentCurvature(false);
                return;
            }
            
            const route = response.data;
            logTelemetryEvent('segment_curvature_calculation_completed', {
                distance: route.distance,
                duration: route.time || route.duration,
                curvature: route.curvature,
                segments: route._segment_curvature,
            });
            
            // Display route on map
            if (map && routeLayerRef.current && route.coordinates) {
                // Remove any previous segment-specific route and segments
                routeLayerRef.current.eachLayer((layer) => {
                    if (layer.options && (layer.options.className === 'segment-curvature-route' || layer.options.className === 'segment-curvature-segment')) {
                        routeLayerRef.current.removeLayer(layer);
                    }
                });
                
                const coords = route.coordinates.map(c => [c[0], c[1]]);
                
                // Get curvature levels for each segment
                const segmentCurvature = route._segment_curvature || segmentCurvatureLevels.slice(0, waypoints.length + 1);
                
                // Helper function to get color for curvature level
                const getCurvatureColor = (level) => {
                    switch(level) {
                        case 'straightest': return '#3b82f6'; // Blue
                        case 'balanced': return '#10b981'; // Green
                        case 'curvy': return '#f59e0b'; // Yellow/Orange
                        case 'extra_curvy': return '#ef4444'; // Red
                        default: return '#9b59b6'; // Purple fallback
                    }
                };
                
                // If we have waypoints, render segments separately
                if (waypoints.length > 0 && segmentCurvature.length > 1) {
                    // Calculate segment boundaries (waypoint positions)
                    const allPoints = [
                        [startPoint.lat, startPoint.lng],
                        ...waypoints.map(wp => [wp.lat, wp.lng]),
                        [endPoint.lat, endPoint.lng]
                    ];
                    
                    // Find closest route coordinates to each waypoint
                    const segmentBoundaries = allPoints.map((point, idx) => {
                        if (idx === 0) return 0; // Start
                        if (idx === allPoints.length - 1) return coords.length - 1; // End
                        
                        // Find closest coordinate in route to this waypoint
                        let minDist = Infinity;
                        let closestIdx = 0;
                        coords.forEach((coord, coordIdx) => {
                            const dist = Math.sqrt(
                                Math.pow(coord[0] - point[0], 2) + 
                                Math.pow(coord[1] - point[1], 2)
                            );
                            if (dist < minDist) {
                                minDist = dist;
                                closestIdx = coordIdx;
                            }
                        });
                        return closestIdx;
                    });
                    
                    // Render each segment with its color
                    const segmentLayer = L.layerGroup();
                    segmentBoundaries.forEach((endIdx, segmentIdx) => {
                        if (segmentIdx === 0) return; // Skip first boundary (start)
                        
                        const startIdx = segmentBoundaries[segmentIdx - 1];
                        const segmentCoords = coords.slice(startIdx, endIdx + 1);
                        const curvatureLevel = segmentCurvature[segmentIdx - 1] || 'balanced';
                        const segmentColor = getCurvatureColor(curvatureLevel);
                        
                        if (segmentCoords.length > 1) {
                            const segmentPolyline = L.polyline(segmentCoords, {
                                color: segmentColor,
                                weight: 6,
                                opacity: 0.9,
                                className: 'segment-curvature-segment'
                            }).bindPopup(`Segment ${segmentIdx}: ${curvatureLevel.replace('_', ' ')}`).addTo(segmentLayer);
                            
                            // Add label at midpoint of segment
                            const midIdx = Math.floor(segmentCoords.length / 2);
                            const midPoint = segmentCoords[midIdx];
                            L.marker(midPoint, {
                                icon: L.divIcon({
                                    className: 'segment-label',
                                    html: `<div style="background: ${segmentColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">S${segmentIdx}</div>`,
                                    iconSize: [40, 20],
                                    iconAnchor: [20, 10]
                                })
                            }).addTo(segmentLayer);
                        }
                    });
                    
                    segmentLayer.addTo(routeLayerRef.current);
                    
                    // Fit map to route
                    const bounds = L.latLngBounds(coords);
                    map.fitBounds(bounds, { padding: [50, 50] });
                } else {
                    // Single segment - render as one line
                    const polyline = L.polyline(coords, {
                        color: getCurvatureColor(segmentCurvature[0] || 'balanced'),
                        weight: 6,
                        opacity: 0.8,
                        className: 'segment-curvature-route'
                    }).bindPopup(`Segment-Specific Curvature Route`).addTo(routeLayerRef.current);
                    
                    // Fit map to route
                    const bounds = polyline.getBounds();
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
            
            setSegmentCurvatureRoute(route);
            
            // Notify parent component
            if (onRouteCalculated) {
                onRouteCalculated({ ...route, waypoints: waypoints });
            }
        } catch (error) {
            console.error('Error calculating segment-specific curvature route:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to calculate route. Please try again.';
            showToast(errorMessage, 'error', 5000);
            logTelemetryEvent('segment_curvature_calculation_failed', {
                message: errorMessage,
                status: error.response?.status,
            });
        } finally {
            setIsCalculatingSegmentCurvature(false);
        }
    };

    const displayRoute = (routeData, routeType, isFallback = false) => {
        if (!map || !routeLayerRef.current || !routeData.coordinates) return;

        // Always clear existing route layers before displaying new route
        // This ensures old routes don't remain visible when calculating new ones
        if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
        }

        // Handle coordinates - ensure they're in [lat, lon] format
        const coordinates = Array.isArray(routeData.coordinates) 
            ? routeData.coordinates.map(coord => {
                // Handle both [lat, lon] and [lon, lat] formats
                if (Array.isArray(coord) && coord.length >= 2) {
                    return [coord[0], coord[1]];
                }
                return coord;
            })
            : [];
        
        // Route colors based on curvature level
        // If it's a fallback from extra_curvy to curvy, make it red
        // Otherwise, use normal colors
        let color = '#3b82f6'; // Blue for straightest
        if (isFallback && routeType === 'curved') {
            color = '#ef4444'; // Red for fallback from extra curvy
        } else if (routeType === 'balanced') {
            color = '#10b981'; // Green for balanced
        } else if (routeType === 'curved') {
            color = '#f59e0b'; // Yellow/Orange for curvy (normal selection)
        } else if (routeType === 'extra_curved') {
            color = '#ef4444'; // Red for extra curvy
        }

        const polyline = L.polyline(coordinates, {
            color,
            weight: 10, // Increased for easier clicking
            opacity: 0.9, // Slightly transparent for better map visibility
            smoothFactor: 1,
            className: 'main-route',
            interactive: true // Make clickable for adding waypoints
        }).addTo(routeLayerRef.current);

        // Store reference to polyline for editing
        editableRoutePolylineRef.current = polyline;

        // Make polyline editable using Leaflet.Draw
        // Clean up existing edit control first
        if (routeEditControlRef.current && map) {
            map.removeControl(routeEditControlRef.current);
            routeEditControlRef.current = null;
        }
        
        // Remove existing edit event listeners
        map.off(L.Draw.Event.EDITED);
        
        // Make polyline editable using Leaflet.Draw
        // Clean up existing edit control first
        if (routeEditControlRef.current && map) {
            map.removeControl(routeEditControlRef.current);
            routeEditControlRef.current = null;
        }
        
        // Remove existing edit event listeners
        map.off(L.Draw.Event.EDITED);
        
        // Allow users to click on route to add waypoints, then drag those waypoints
        polyline.on('click', (e) => {
            // Allow clicking route to add waypoints when not in other click modes
            if (clickMode === null || clickMode === 'waypoint') {
                const clickedLat = e.latlng.lat;
                const clickedLng = e.latlng.lng;
                
                // Find closest point on route to clicked location
                let closestPoint = null;
                let minDist = Infinity;
                coordinates.forEach((coord) => {
                    const dist = Math.sqrt(
                        Math.pow((coord[0] - clickedLat) * 111000, 2) + 
                        Math.pow((coord[1] - clickedLng) * 111000, 2)
                    );
                    if (dist < minDist) {
                        minDist = dist;
                        closestPoint = { lat: coord[0], lng: coord[1] };
                    }
                });
                
                if (closestPoint && minDist < 1000) { // Within 1km of route
                    // Helper function to reverse geocode coordinates to location name
                    const reverseGeocode = async (lat, lng) => {
                        try {
                            const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                                params: {
                                    lat,
                                    lon: lng,
                                    format: 'json',
                                    addressdetails: 1,
                                    'accept-language': 'en'
                                },
                                withCredentials: false,
                                headers: { 'Accept': 'application/json' }
                            });
                            
                            if (response.data && response.data.address) {
                                const addr = response.data.address;
                                const parts = [];
                                if (addr.city || addr.town || addr.village || addr.municipality) {
                                    parts.push(addr.city || addr.town || addr.village || addr.municipality);
                                }
                                if (addr.county) {
                                    parts.push(addr.county);
                                } else if (addr.state || addr.region) {
                                    parts.push(addr.state || addr.region);
                                }
                                if (addr.country) {
                                    parts.push(addr.country);
                                }
                                if (parts.length > 0) {
                                    return parts.join(', ');
                                }
                                return response.data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                            }
                        } catch (error) {
                            console.warn('Reverse geocoding failed:', error);
                        }
                        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    };
                    
                    // Add waypoint - no limit due to direct routing strategy
                    const newWaypoint = {
                        lat: closestPoint.lat,
                        lng: closestPoint.lng,
                        id: Date.now()
                    };
                    
                    setWaypoints(prev => [...prev, newWaypoint]);
                    
                    addMarker(closestPoint.lat, closestPoint.lng, 'waypoint', newWaypoint.id);
                    
                    // Reverse geocode to get location name
                    reverseGeocode(closestPoint.lat, closestPoint.lng).then(locationName => {
                        setWaypointSearchQueries(prev => ({
                            ...prev,
                            [newWaypoint.id]: locationName
                        }));
                    });
                    
                    showToast('Waypoint added. Drag to adjust, then click "Search Routes" to recalculate.', 'success', 3000);
                }
            }
        });

        // Fit map to route bounds
        const bounds = polyline.getBounds();
        map.fitBounds(bounds, {
            padding: [50, 50]
        });


        // Notify parent component
        if (onRouteCalculated) {
            onRouteCalculated({
                ...routeData,
                type: routeType,
                waypoints: waypoints
            });
        }
    };

    const displayAlternativeRoutes = (routes, selectedIndex) => {
        if (!map || !routeLayerRef.current || !routes || routes.length <= 1) return;

        // Clear existing alternative route layers
        routeLayerRef.current.eachLayer((layer) => {
            if (layer.options && layer.options.className === 'alternative-route') {
                routeLayerRef.current.removeLayer(layer);
            }
        });

        // Display all alternative routes with different colors and reduced opacity
        routes.forEach((route, index) => {
            if (index === selectedIndex) return; // Skip selected route (already displayed)
            
            if (!route.coordinates || route.coordinates.length === 0) return;

            const coordinates = route.coordinates.map(coord => [coord[0], coord[1]]);
            
            // Use gray colors for alternatives with reduced opacity
            const colors = ['#888888', '#aaaaaa', '#cccccc'];
            const color = colors[index % colors.length];

            const polyline = L.polyline(coordinates, {
                color,
                weight: 4,
                opacity: 0.4, // Semi-transparent for alternatives
                smoothFactor: 1,
                className: 'alternative-route',
                dashArray: '5, 5' // Dashed line for alternatives
            }).bindPopup(`Alternative Route ${index + 1}`).addTo(routeLayerRef.current);
        });
    };

    // Function to display a single route on map with color and popup
    const showRouteOnMap = (route, routeIndex, routeName, routeDescription) => {
        if (!map || !routeLayerRef.current || !route || !route.coordinates || route.coordinates.length === 0) return;

        // Clear any existing "show-on-map" routes
        routeLayerRef.current.eachLayer((layer) => {
            if (layer.options && layer.options.className === 'show-on-map-route') {
                routeLayerRef.current.removeLayer(layer);
            }
        });

        const coordinates = route.coordinates.map(coord => [coord[0], coord[1]]);
        
        // Determine color based on route index (matching card border colors)
        // Selected route uses blue-500 (#3b82f6), others use gray-400 (#9ca3af) for better visibility
        const isSelected = routeIndex === selectedAlternativeIndex;
        const color = isSelected ? '#3b82f6' : '#9ca3af'; // blue-500 for selected, gray-400 for unselected (darker than gray-200 for visibility)

        // Create route name and description
        const name = routeName || route.name || `Route ${routeIndex + 1}`;
        const description = routeDescription || route.description || 
            (route.distance ? `Distance: ${formatDistance(route.distance, 'metric')}` : '') +
            (route.time ? ` • Duration: ${formatDuration(route.time)}` : '');

        // Create popup content
        const popupContent = `
            <div style="min-width: 200px;">
                <h3 style="font-weight: bold; margin-bottom: 8px; color: #1f2937;">${name}</h3>
                ${description ? `<p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${description}</p>` : ''}
                ${route.distance ? `<p style="font-size: 12px; color: #6b7280; margin: 2px 0;">Distance: ${formatDistance(route.distance, 'metric')}</p>` : ''}
                ${route.time ? `<p style="font-size: 12px; color: #6b7280; margin: 2px 0;">Duration: ${formatDuration(route.time)}</p>` : ''}
                ${route.curvature !== undefined ? `<p style="font-size: 12px; color: #6b7280; margin: 2px 0;">Curvature: ${route.curvature.toFixed(4)} (${getCurvatureLabel(route.curvature)})</p>` : ''}
            </div>
        `;

        const polyline = L.polyline(coordinates, {
            color,
            weight: 10,
            opacity: 0.9,
            smoothFactor: 1,
            className: 'show-on-map-route'
        }).bindPopup(popupContent).addTo(routeLayerRef.current);

        // Fit map to route bounds
        const bounds = polyline.getBounds();
        map.fitBounds(bounds, {
            padding: [50, 50]
        });

        // Open popup at the middle of the route
        const center = bounds.getCenter();
        polyline.openPopup(center);
    };

    const handleAlternativeSelect = (index) => {
        if (!alternativeRoutes || index < 0 || index >= alternativeRoutes.length) return;
        
        setSelectedAlternativeIndex(index);
        
        // Update the main route with selected alternative
        const selectedAlt = alternativeRoutes[index];
        const currentRouteType = selectedRoute || 'straightest';
        
        // Update routes object
        setRoutes(prev => ({
            ...prev,
            [currentRouteType]: selectedAlt
        }));
        logTelemetryEvent('routeplanner_alternative_selected', {
            index,
            route_type: currentRouteType,
            distance: selectedAlt?.distance || null,
            duration: selectedAlt?.time || selectedAlt?.duration || null,
            curvature: selectedAlt?.curvature || null,
        });
        
        // Display the selected alternative as main route
        displayRoute(selectedAlt, currentRouteType);
        
        // Redisplay other alternatives
        displayAlternativeRoutes(alternativeRoutes, index);
    };

    const handleRouteSelect = (routeType) => {
        setRouteMode(routeType);
        setSelectedRoute(routeType);
        
        const route = routes[routeType];
        if (route) {
            displayRoute(route, routeType);
        }
    };

    const clearRoute = () => {
        if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
        }
        if (markersLayerRef.current) {
            markersLayerRef.current.clearLayers();
        }
        // Clean up edit control
        if (routeEditControlRef.current && map) {
            map.removeControl(routeEditControlRef.current);
            routeEditControlRef.current = null;
        }
        // Remove edit event listeners
        if (map) {
            map.off(L.Draw.Event.EDITED);
        }
        editableRoutePolylineRef.current = null;
        startMarkerRef.current = null;
        endMarkerRef.current = null;
        waypointMarkersRef.current = [];
        setRoutes({});
        setSelectedRoute(null);
        setStartPoint(null);
        setEndPoint(null);
        setWaypoints([]);
        setStartSearchQuery('');
        setEndSearchQuery('');
        setClickMode(null);
        setSelectedSavedRoads([]);
    };

    const handleClose = () => {
        clearRoute();
        if (onClose) {
            onClose();
        }
    };

    const getRouteInfo = (routeType) => {
        const route = routes[routeType];
        if (!route) return null;

        return {
            distance: formatDistance(route.distance, 'metric'),
            duration: formatDuration(route.duration),
            curvature: getCurvatureLabel(route.curvature || 0)
        };
    };

    const getSelectedRouteName = () => {
        if (!selectedRoute) return 'Route';
        if (selectedRoute === 'round_trip') {
            return `Round Trip (${roundTripDistance}km)`;
        }
        const labelMap = {
            straightest: 'Straightest',
            balanced: 'Balanced',
            curved: 'Curvy',
            extra_curved: 'Extra Curvy'
        };
        const label = labelMap[selectedRoute] || 'Route';
        return `${label} Route`;
    };

    // Function to add a saved road to the route (can be called from parent component)
    const addSavedRoadToRoute = (road) => {
        if (!road || !road.id) return;
        
        // Check if already added
        if (selectedSavedRoads.some(sr => sr.id === road.id)) {
            return;
        }
        
        // Add to selected saved roads
        setSelectedSavedRoads(prev => [...prev, road]);
        
        // If we have start and end points, recalculate routes
        if (startPoint && endPoint) {
            setTimeout(() => recalculateRoutes(), 100);
        }
    };

    // Expose function to parent via ref or make it available through a callback
    // For now, we'll use a useEffect to listen for external events
    useEffect(() => {
        const handleAddSavedRoad = (event) => {
            if (event.detail && event.detail.road) {
                addSavedRoadToRoute(event.detail.road);
            }
        };
        
        window.addEventListener('addSavedRoadToRoute', handleAddSavedRoad);
        return () => {
            window.removeEventListener('addSavedRoadToRoute', handleAddSavedRoad);
        };
    }, [startPoint, endPoint, selectedSavedRoads]);

    // Handle sidebar rendering with portal
    // Find sidebar container - retry if not found immediately
    useEffect(() => {
        if (renderInSidebar && isActive) {
            let retryCount = 0;
            const maxRetries = 30; // Try for up to 1.5 seconds (30 * 50ms)
            
            const findContainer = () => {
                const containers = document.querySelectorAll('.route-planner-sidebar-content');
                // Find the visible container (not the hidden one used for portal storage)
                let container = null;
                for (let el of containers) {
                    const style = window.getComputedStyle(el);
                    if (style.display !== 'none') {
                        container = el;
                        break;
                    }
                }
                
                if (container) {
                    sidebarContainerRef.current = container;
                    setContainerFound(true);
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    // Retry after a short delay if container not found
                    setTimeout(findContainer, 50);
                } else {
                    // Max retries reached, log error
                    console.warn('RoutePlanner: Could not find visible sidebar container after', maxRetries, 'retries');
                }
            };
            
            // Try immediately
            findContainer();
            
            // Also try after a short delay to handle DOM updates
            const timer = setTimeout(findContainer, 100);
            return () => {
                clearTimeout(timer);
                setContainerFound(false);
            };
        } else {
            sidebarContainerRef.current = null;
            setContainerFound(false);
        }
    }, [renderInSidebar, isActive]);

    // Don't return null if we're in sidebar mode - let the portal handle it
    if (!isActive && !renderInSidebar) return null;

    const panelContent = (
        <div className={`route-planner-panel ${renderInSidebar ? 'w-full h-full overflow-y-auto' : 'absolute top-4 right-4 z-[900] max-w-sm max-h-[90vh] overflow-y-auto'} bg-white p-4 rounded-lg shadow-lg`}>
            {!renderInSidebar && (
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                        <FaRoute className="mr-2" />
                        Route Planner
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* GraphHopper Status indicator removed */}

            {/* Click mode instruction banner */}
            {clickMode && (
                <div className={`mb-3 p-3 rounded-lg border-2 ${
                    clickMode === 'start' ? 'bg-green-50 border-green-300' :
                    clickMode === 'end' ? 'bg-red-50 border-red-300' :
                    'bg-blue-50 border-blue-300'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className={
                                clickMode === 'start' ? 'text-green-600' :
                                clickMode === 'end' ? 'text-red-600' :
                                'text-blue-600'
                            } />
                            <span className={`text-sm font-medium ${
                                clickMode === 'start' ? 'text-green-800' :
                                clickMode === 'end' ? 'text-red-800' :
                                'text-blue-800'
                            }`}>
                                {clickMode === 'start' && 'Click on map to set start point'}
                                {clickMode === 'end' && 'Click on map to set end point'}
                                {clickMode === 'waypoint' && (clickModeWaypointId ? `Click on map to set waypoint ${waypoints.findIndex(wp => wp.id === clickModeWaypointId) + 1}` : 'Click on map to add waypoint')}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setClickMode(null);
                                setClickModeWaypointId(null);
                            }}
                            className="text-gray-500 hover:text-gray-700"
                            title="Cancel"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}


            {/* Round Trip Toggle - At the top */}
            <FeatureGate feature="round_trip" user={auth?.user}>
                <div className="mb-4 p-3 bg-indigo-50 rounded border border-indigo-200">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-indigo-700 text-sm">🔄 Round Trip Mode</h4>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isRoundTrip}
                                onChange={(e) => {
                                    const newValue = e.target.checked;
                                    setIsRoundTrip(newValue);
                                    
                                    // Clear routes and route display when switching modes
                                    setRoutes({});
                                    setSelectedRoute(null);
                                    if (routeLayerRef.current) {
                                        routeLayerRef.current.clearLayers();
                                    }
                                    
                                    if (newValue) {
                                        // Clear end point and its marker when enabling round trip
                                        setEndPoint(null);
                                        if (endMarkerRef.current && markersLayerRef.current) {
                                            markersLayerRef.current.removeLayer(endMarkerRef.current);
                                            endMarkerRef.current = null;
                                        }
                                        // Clear waypoints for round trip mode
                                        setWaypoints([]);
                                        waypointMarkersRef.current.forEach(m => {
                                            if (m && markersLayerRef.current) {
                                                markersLayerRef.current.removeLayer(m);
                                            }
                                        });
                                        waypointMarkersRef.current = [];
                                    }
                                    // Keep start point marker - user may want to reuse it
                                }}
                                className="mr-2"
                            />
                            <span className="text-xs text-gray-700">Enable</span>
                        </label>
                    </div>
                    {isRoundTrip && (
                        <div className="space-y-2 mt-3">
                            <div>
                                <label className="text-xs text-gray-700 mb-1 block">
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
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>50 km</span>
                                    <span>500 km</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-700 mb-1 block">Curvature Level:</label>
                                {(() => {
                                    const isLoggedIn = auth?.user !== null && auth?.user !== undefined;
                                    const subscriptionPlan = auth?.user?.subscription?.plan;
                                    const hasExtraCurvyAccess = isLoggedIn && (subscriptionPlan === 'premium' || subscriptionPlan === 'pro');
                                    
                                    // Reset to balanced if extra_curvy selected but no access
                                    if (roundTripCurvatureLevel === 'extra_curvy' && !hasExtraCurvyAccess) {
                                        setRoundTripCurvatureLevel('balanced');
                                    }
                                    
                                    return (
                                        <select
                                            value={roundTripCurvatureLevel}
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                if (newValue === 'extra_curvy' && !hasExtraCurvyAccess) {
                                                    // Don't allow selection, show message
                                                    showToast('Extra Curvy requires Premium subscription', 'warning', 3000);
                                                    return;
                                                }
                                                setRoundTripCurvatureLevel(newValue);
                                            }}
                                            className={`w-full bg-white text-gray-800 px-2 py-1 rounded text-xs border border-gray-300 ${
                                                !hasExtraCurvyAccess ? '' : ''
                                            }`}
                                        >
                                            <option value="balanced">Balanced</option>
                                            <option value="curvy">Curved</option>
                                            <option 
                                                value="extra_curvy" 
                                                disabled={!hasExtraCurvyAccess}
                                                style={{ 
                                                    color: hasExtraCurvyAccess ? 'inherit' : '#9ca3af',
                                                    backgroundColor: hasExtraCurvyAccess ? 'inherit' : '#f3f4f6'
                                                }}
                                            >
                                                Extra Curved {!hasExtraCurvyAccess ? '(Premium)' : ''}
                                            </option>
                                        </select>
                                    );
                                })()}
                                {(() => {
                                    const isLoggedIn = auth?.user !== null && auth?.user !== undefined;
                                    const subscriptionPlan = auth?.user?.subscription?.plan;
                                    const hasExtraCurvyAccess = isLoggedIn && (subscriptionPlan === 'premium' || subscriptionPlan === 'pro');
                                    
                                    if (!hasExtraCurvyAccess && roundTripCurvatureLevel !== 'extra_curvy') {
                                        return (
                                            <div className="mt-1 text-xs text-orange-600">
                                                🔒 Extra Curved requires Premium - <Link href="/subscription" className="underline">Upgrade</Link>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            {startPoint && (
                                <div className="text-xs text-gray-600 mt-2 p-2 bg-white rounded">
                                    Start: {startPoint.lat.toFixed(4)}, {startPoint.lng.toFixed(4)}<br/>
                                    Route will loop back to start point
                                    {selectedSavedRoads.length > 0 && (
                                        <><br/>Using {selectedSavedRoads.length} saved road(s)</>
                                    )}
                                </div>
                            )}
                            {startPoint && (
                                <button
                                    onClick={calculateRoundTrip}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded flex items-center justify-center font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    <FaRoute className="mr-2" />
                                    {loading ? 'Calculating Round Trip...' : 'Calculate Round Trip'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </FeatureGate>

            <div className="mb-4 space-y-3">
                <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">
                        Start Point
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <SearchInput
                                placeholder="Search or click on map"
                                onLocationSelect={handleStartLocationSelect}
                                initialValue={startSearchQuery}
                                className="text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setClickMode(clickMode === 'start' ? null : 'start')}
                            className={`px-3 py-2 rounded border transition-all ${
                                clickMode === 'start'
                                    ? 'bg-green-100 border-green-500 text-green-700 shadow-md'
                                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Click on map to set start point"
                        >
                            <FaMapMarkerAlt />
                        </button>
                    </div>
                    {!startPoint && (
                        <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Start point required</span>
                        </div>
                    )}
                </div>

                {!isRoundTrip && (
                    <>
                        {/* Waypoints between start and end */}
                        {waypoints.map((wp, index) => (
                            <React.Fragment key={wp.id}>
                                {/* Add Waypoint Button (before each waypoint) */}
                                <div className="flex items-center justify-center py-1">
                                    <button
                                        onClick={addWaypointInput}
                                        className="px-3 py-1 text-xs rounded border bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                                        title="Add waypoint here"
                                    >
                                        <FaPlus className="text-xs" />
                                        Add Waypoint
                                    </button>
                                </div>
                                
                                {/* Waypoint Input */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">
                                        Waypoint {index + 1}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <SearchInput
                                                placeholder="Search or click on map"
                                                onLocationSelect={(location) => handleWaypointLocationSelect(location, wp.id)}
                                                initialValue={waypointSearchQueries[wp.id] || (wp.lat && wp.lng ? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}` : '')}
                                                className="text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                setClickMode(clickMode === 'waypoint' && clickModeWaypointId === wp.id ? null : 'waypoint');
                                                setClickModeWaypointId(clickMode === 'waypoint' && clickModeWaypointId === wp.id ? null : wp.id);
                                            }}
                                            className={`px-3 py-2 rounded border transition-all ${
                                                clickMode === 'waypoint' && clickModeWaypointId === wp.id
                                                    ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-md'
                                                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                            }`}
                                            title="Click on map to set waypoint"
                                        >
                                            <FaMapMarkerAlt />
                                        </button>
                                        <button
                                            onClick={() => removeWaypoint(wp.id)}
                                            className="px-3 py-2 rounded border bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
                                            title="Remove waypoint"
                                        >
                                            <FaTrash className="text-xs" />
                                        </button>
                                    </div>
                                    {!wp.lat || !wp.lng ? (
                                        <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                                            <span>⚠️</span>
                                            <span>Waypoint not set</span>
                                        </div>
                                    ) : null}
                                </div>
                            </React.Fragment>
                        ))}
                        
                        {/* Add Waypoint Button (after last waypoint, before end) */}
                        {waypoints.length > 0 && (
                            <div className="flex items-center justify-center py-1">
                                <button
                                    onClick={addWaypointInput}
                                    className="px-3 py-1 text-xs rounded border bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                                    title="Add waypoint here"
                                >
                                    <FaPlus className="text-xs" />
                                    Add Waypoint
                                </button>
                            </div>
                        )}
                        
                        {/* Add First Waypoint Button (always visible when no waypoints) */}
                        {waypoints.length === 0 && startPoint && endPoint && (
                            <div className="flex items-center justify-center py-2">
                                <button
                                    onClick={addWaypointInput}
                                    className="px-4 py-2 text-sm rounded border-2 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                                    title="Add your first waypoint"
                                >
                                    <FaPlus />
                                    Add Waypoint
                                </button>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">
                                End Point
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <SearchInput
                                        placeholder="Search or click on map"
                                        onLocationSelect={handleEndLocationSelect}
                                        initialValue={endSearchQuery}
                                        className="text-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setClickMode(clickMode === 'end' ? null : 'end');
                                        setClickModeWaypointId(null);
                                    }}
                                    className={`px-3 py-2 rounded border transition-all ${
                                        clickMode === 'end'
                                            ? 'bg-red-100 border-red-500 text-red-700 shadow-md'
                                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    title="Click on map to set end point"
                                >
                                    <FaMapMarkerAlt />
                                </button>
                            </div>
                            {!endPoint && (
                                <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <span>⚠️</span>
                                    <span>End point required</span>
                                </div>
                            )}
                            {startPoint && endPoint && (() => {
                                const distance = Math.sqrt(
                                    Math.pow((endPoint.lat - startPoint.lat) * 111000, 2) + 
                                    Math.pow((endPoint.lng - startPoint.lng) * 111000, 2)
                                );
                                if (distance < 100) {
                                    return (
                                        <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                                            <span>⚠️</span>
                                            <span>Points are very close (less than 100m). Route may not calculate properly.</span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </>
                )}

                {/* Route Curvature Selection - Before Calculation */}
                {!isRoundTrip && (
                    <div className="border-t pt-3 mt-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Route Curvature
                        </label>
                        <div className="text-xs text-gray-600 mb-2">
                            Select a curvature level, then click "Search Routes"
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {/* Straightest - Always free */}
                            <button
                                onClick={() => setSelectedCurvatureBeforeSearch('straightest')}
                                className={`p-2 rounded text-xs text-left transition-all ${
                                    selectedCurvatureBeforeSearch === 'straightest'
                                        ? 'bg-blue-500 border-2 border-blue-600 text-white shadow-md'
                                        : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                                }`}
                            >
                                <span className={`font-semibold ${selectedCurvatureBeforeSearch === 'straightest' ? 'text-white' : 'text-blue-700'}`}>
                                    🟦 Straightest Route
                                </span>
                                <div className={`mt-0.5 ${selectedCurvatureBeforeSearch === 'straightest' ? 'text-blue-100' : 'text-gray-600'}`}>
                                    Fastest and most direct path
                                </div>
                            </button>
                            
                            {/* Balanced - Always free */}
                            <button
                                onClick={() => setSelectedCurvatureBeforeSearch('balanced')}
                                className={`p-2 rounded text-xs text-left transition-all ${
                                    selectedCurvatureBeforeSearch === 'balanced'
                                        ? 'bg-green-500 border-2 border-green-600 text-white shadow-md'
                                        : 'bg-green-50 border border-green-200 hover:bg-green-100'
                                }`}
                            >
                                <span className={`font-semibold ${selectedCurvatureBeforeSearch === 'balanced' ? 'text-white' : 'text-green-700'}`}>
                                    🟩 Balanced Route
                                </span>
                                <div className={`mt-0.5 ${selectedCurvatureBeforeSearch === 'balanced' ? 'text-green-100' : 'text-gray-600'}`}>
                                    Good balance of speed and curves
                                </div>
                            </button>
                            
                            {/* Curved - Always free */}
                            <button
                                onClick={() => setSelectedCurvatureBeforeSearch('curvy')}
                                className={`p-2 rounded text-xs text-left transition-all ${
                                    selectedCurvatureBeforeSearch === 'curvy'
                                        ? 'bg-yellow-500 border-2 border-yellow-600 text-white shadow-md'
                                        : 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                                }`}
                            >
                                <span className={`font-semibold ${selectedCurvatureBeforeSearch === 'curvy' ? 'text-white' : 'text-yellow-700'}`}>
                                    🟨 Curved Route
                                </span>
                                <div className={`mt-0.5 ${selectedCurvatureBeforeSearch === 'curvy' ? 'text-yellow-100' : 'text-gray-600'}`}>
                                    More curves and scenic roads
                                </div>
                            </button>
                            
                            {/* Extra Curved - Premium/Pro only */}
                            {(() => {
                                const isLoggedIn = auth?.user !== null && auth?.user !== undefined;
                                const subscriptionPlan = auth?.user?.subscription?.plan;
                                const hasAccess = isLoggedIn && (subscriptionPlan === 'premium' || subscriptionPlan === 'pro');
                                
                                // If user selects extra_curvy but doesn't have access, reset to balanced
                                if (selectedCurvatureBeforeSearch === 'extra_curvy' && !hasAccess) {
                                    setSelectedCurvatureBeforeSearch('balanced');
                                }
                                
                                return (
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                if (hasAccess) {
                                                    setSelectedCurvatureBeforeSearch('extra_curvy');
                                                } else {
                                                    // Navigate to subscription page if not logged in or not premium
                                                    window.location.href = '/subscription';
                                                }
                                            }}
                                            disabled={!hasAccess}
                                            className={`p-2 rounded text-xs text-left transition-all w-full ${
                                                !hasAccess
                                                    ? 'bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                                                    : selectedCurvatureBeforeSearch === 'extra_curvy'
                                                    ? 'bg-red-500 border-2 border-red-600 text-white shadow-md'
                                                    : 'bg-red-50 border border-red-200 hover:bg-red-100'
                                            }`}
                                        >
                                            <span className={`font-semibold ${selectedCurvatureBeforeSearch === 'extra_curvy' ? 'text-white' : !hasAccess ? 'text-gray-400' : 'text-red-700'}`}>
                                                🟥 Extra Curved Route
                                            </span>
                                            <div className={`mt-0.5 ${selectedCurvatureBeforeSearch === 'extra_curvy' ? 'text-red-100' : !hasAccess ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Maximum curves and twisty roads
                                            </div>
                                            {!hasAccess && (
                                                <div className="mt-1 text-xs text-orange-600 font-medium">
                                                    🔒 {!isLoggedIn ? 'Login required' : 'Premium feature'} - <Link href="/subscription" className="underline">Upgrade</Link>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Info banner for waypoints - HIDDEN */}
                {false && !isRoundTrip && waypoints.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                            💡 <strong>Route Editing:</strong> Click anywhere on the route line to add waypoints. Drag waypoint markers to adjust. Click "Search Routes" to recalculate.
                            <br />
                            <strong>Multi-Segment Routing:</strong> With 2+ waypoints, each segment is calculated separately with full strategic waypoints. Balanced: 1 per segment, Curvy: 2 per segment, Extra Curvy: 3 per segment. This preserves full curviness regardless of waypoint count!
                        </div>
                    </div>
                )}


                {/* Alternative Routes - DISABLED FOR NOW */}
                {false && !isRoundTrip && (
                    <div className="border-t pt-3 mt-3">
                        <label className={`flex items-center gap-2 text-sm ${auth?.user?.subscription?.plan === 'premium' || auth?.user?.subscription?.plan === 'pro' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                            <input
                                type="checkbox"
                                checked={showAlternativeRoutes && !alternativeRoutesBlocked}
                                disabled={true} // Disabled for now
                                onChange={(e) => {
                                    // Disabled
                                }}
                                className="rounded"
                            />
                            <span className="font-medium text-gray-700">Show Alternative Routes</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Get 2-3 alternative route options for comparison</p>
                    </div>
                )}

                {/* Avoid Roads Section */}
                {!isRoundTrip && (
                    <div className="border-t pt-3 mt-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Avoid
                        </label>
                        {(() => {
                            const hasAccess = auth?.user?.subscription?.plan === 'premium' || auth?.user?.subscription?.plan === 'pro';
                            return (
                                <>
                                    <div className="space-y-2">
                                        {['highways', 'tolls', 'ferries', 'unpaved'].map((option) => (
                                            <label key={option} className={`flex items-center gap-2 text-sm ${hasAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={avoidOptions.includes(option)}
                                                    disabled={!hasAccess}
                                                    onChange={(e) => {
                                                        if (!hasAccess) return;
                                                        if (e.target.checked) {
                                                            setAvoidOptions([...avoidOptions, option]);
                                                            logTelemetryEvent('routeplanner_avoid_toggle', {
                                                                option,
                                                                enabled: true,
                                                            });
                                                        } else {
                                                            setAvoidOptions(avoidOptions.filter(o => o !== option));
                                                            logTelemetryEvent('routeplanner_avoid_toggle', {
                                                                option,
                                                                enabled: false,
                                                            });
                                                        }
                                                    }}
                                                    className="rounded"
                                                />
                                                <span className={`capitalize font-medium ${hasAccess ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    {option}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {!hasAccess && (
                                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                                            🔒 <strong>Premium Feature:</strong> Avoid options require Premium or Pro tier. <Link href="/subscription" className="underline font-semibold">Upgrade now</Link>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Alternative Routes - DISABLED FOR NOW */}
                {/* Hidden - functionality disabled temporarily */}
                
                {/* OLD Alternative Routes Code - DISABLED */}
                {false && !isRoundTrip && (
                    <div className="border-t pt-3 mt-3">
                        {(() => {
                            const hasAccess = auth?.user?.subscription?.plan === 'premium' || auth?.user?.subscription?.plan === 'pro';
                            return (
                                <>
                                    <label className={`flex items-center gap-2 text-sm ${hasAccess && !alternativeRoutesBlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                        <input
                                            type="checkbox"
                                            checked={showAlternativeRoutes && !alternativeRoutesBlocked}
                                            disabled={true} // Disabled for now
                                            onChange={(e) => {
                                                // Disabled
                                                if (!hasAccess) return;
                                                
                                                // Check for incompatible features before enabling
                                                const hasSavedRoads = selectedSavedRoads && selectedSavedRoads.length > 0;
                                                const hasPoiWaypoints = waypoints && waypoints.some(wp => wp.isPoi || wp.poiId);
                                                
                                                if (e.target.checked && (hasSavedRoads || hasPoiWaypoints)) {
                                                    const reasons = [];
                                                    if (hasSavedRoads) reasons.push('saved roads');
                                                    if (hasPoiWaypoints) reasons.push('POI waypoints');
                                                    
                                                    setAlternativeRoutesBlocked(true);
                                                    setAlternativeRoutesWarning(`Alternative routes cannot be used with ${reasons.join(' or ')}. Please remove ${reasons.join(' and ')} first.`);
                                                    setShowAlternativeRoutes(false);
                                                    logTelemetryEvent('routeplanner_alternative_blocked', {
                                                        reasons,
                                                        saved_roads: hasSavedRoads,
                                                        poi_waypoints: hasPoiWaypoints,
                                                    });
                                                    return;
                                                }
                                                
                                                setShowAlternativeRoutes(e.target.checked);
                                                setAlternativeRoutesBlocked(false);
                                                setAlternativeRoutesWarning(null);
                                                logTelemetryEvent('routeplanner_alternative_toggle', {
                                                    enabled: e.target.checked,
                                                    waypoint_count: waypoints.length,
                                                    saved_roads: selectedSavedRoads.length,
                                                });
                                                if (!e.target.checked) {
                                                    // Clear alternatives when unchecked
                                                    setAlternativeRoutes([]);
                                                    setSelectedAlternativeIndex(0);
                                                    // Clear alternative route layers from map
                                                    if (routeLayerRef.current) {
                                                        routeLayerRef.current.eachLayer((layer) => {
                                                            if (layer.options && layer.options.className === 'alternative-route') {
                                                                routeLayerRef.current.removeLayer(layer);
                                                            }
                                                        });
                                                    }
                                                }
                                            }}
                                            className="rounded"
                                        />
                                        <span className={`font-semibold ${!hasAccess || alternativeRoutesBlocked ? 'text-gray-400' : ''}`}>
                                            Show Alternative Routes
                                        </span>
                                    </label>
                                    <p className={`text-xs mt-1 ${hasAccess ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Get 2-3 alternative route options for comparison
                                    </p>
                                    
                                    {!hasAccess && (
                                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                                            🔒 <strong>Premium Feature:</strong> Alternative routes require Premium or Pro tier. <Link href="/subscription" className="underline font-semibold">Upgrade now</Link>
                                        </div>
                                    )}
                                    
                                    {/* Warning when blocked */}
                                    {alternativeRoutesBlocked && hasAccess && (
                                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                            <strong>⚠️ Not Available:</strong> Alternative routes cannot be used with saved roads or POI waypoints. Please remove these features first.
                                        </div>
                                    )}
                                    
                                    {/* Warning when alternatives not available */}
                                    {alternativeRoutesWarning && !alternativeRoutesBlocked && hasAccess && (
                            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                                <strong>ℹ️ Info:</strong> {alternativeRoutesWarning}
                            </div>
                        )}
                        
                        {/* Alternative Routes Display - Enhanced Comparison */}
                        {showAlternativeRoutes && alternativeRoutes.length > 1 && (
                            <div className="mt-3 space-y-2">
                                <div className="text-xs font-semibold text-gray-700 mb-2">
                                    Alternative Routes ({alternativeRoutes.length}) - Compare Options
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {alternativeRoutes.map((route, index) => {
                                        const isSelected = index === selectedAlternativeIndex;
                                        const baseRoute = alternativeRoutes[0];
                                        const distanceDiff = route.distance && baseRoute.distance 
                                            ? ((route.distance - baseRoute.distance) / baseRoute.distance * 100).toFixed(1)
                                            : null;
                                        const timeDiff = route.time && baseRoute.time
                                            ? ((route.time - baseRoute.time) / baseRoute.time * 100).toFixed(1)
                                            : null;
                                        
                                        // Get route name and description
                                        const routeName = route.name || `Route ${index + 1}`;
                                        const routeDescription = route.description || 
                                            `${route.distance ? formatDistance(route.distance, 'metric') : ''}${route.time ? ` • ${formatDuration(route.time)}` : ''}`;

                                        return (
                                            <div
                                                key={index}
                                                className={`w-full p-3 rounded border-2 transition-all ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <button
                                                        onClick={() => handleAlternativeSelect(index)}
                                                        className="flex-1 text-left"
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className={`font-semibold text-sm ${
                                                                isSelected ? 'text-blue-700' : 'text-gray-800'
                                                            }`}>
                                                                {routeName}
                                                            </div>
                                                            {isSelected && (
                                                                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-semibold">
                                                                    Selected
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Side-by-side comparison metrics */}
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="bg-white p-2 rounded border border-gray-200">
                                                                <div className="text-gray-500 mb-0.5">Distance</div>
                                                                <div className="font-semibold text-gray-800">
                                                                    {route.distance ? formatDistance(route.distance, 'metric') : 'N/A'}
                                                                </div>
                                                                {distanceDiff && index > 0 && (
                                                                    <div className={`text-xs mt-0.5 ${
                                                                        parseFloat(distanceDiff) > 0 ? 'text-red-600' : 'text-green-600'
                                                                    }`}>
                                                                        {parseFloat(distanceDiff) > 0 ? '+' : ''}{distanceDiff}%
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="bg-white p-2 rounded border border-gray-200">
                                                                <div className="text-gray-500 mb-0.5">Duration</div>
                                                                <div className="font-semibold text-gray-800">
                                                                    {route.time ? formatDuration(route.time) : route.duration ? formatDuration(route.duration) : 'N/A'}
                                                                </div>
                                                                {timeDiff && index > 0 && (
                                                                    <div className={`text-xs mt-0.5 ${
                                                                        parseFloat(timeDiff) > 0 ? 'text-red-600' : 'text-green-600'
                                                                    }`}>
                                                                        {parseFloat(timeDiff) > 0 ? '+' : ''}{timeDiff}%
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {route.curvature !== undefined && (
                                                                <div className="bg-white p-2 rounded border border-gray-200">
                                                                    <div className="text-gray-500 mb-0.5">Curvature</div>
                                                                    <div className="font-semibold text-gray-800">
                                                                        {route.curvature.toFixed(4)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                                        {getCurvatureLabel(route.curvature)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {route.corner_count !== undefined && (
                                                                <div className="bg-white p-2 rounded border border-gray-200">
                                                                    <div className="text-gray-500 mb-0.5">Corners</div>
                                                                    <div className="font-semibold text-gray-800">
                                                                        {route.corner_count}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {route.elevation_gain !== undefined && route.elevation_gain !== null && route.elevation_gain > 0 && (
                                                                <div className="bg-white p-2 rounded border border-gray-200">
                                                                    <div className="text-gray-500 mb-0.5">Elevation Gain</div>
                                                                    <div className="font-semibold text-gray-800">
                                                                        {Math.round(route.elevation_gain)}m
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {route.elevation_loss !== undefined && route.elevation_loss !== null && route.elevation_loss > 0 && (
                                                                <div className="bg-white p-2 rounded border border-gray-200">
                                                                    <div className="text-gray-500 mb-0.5">Elevation Loss</div>
                                                                    <div className="font-semibold text-gray-800">
                                                                        {Math.round(route.elevation_loss)}m
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                    
                                                    {/* Show on Map button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            showRouteOnMap(route, index, routeName, routeDescription);
                                                        }}
                                                        className={`ml-2 px-3 py-1 text-xs rounded font-semibold transition-colors flex items-center gap-1 border-2 ${
                                                            isSelected
                                                                ? 'bg-blue-500 text-white hover:bg-blue-600 border-blue-500'
                                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-200'
                                                        }`}
                                                        title="Show route on map"
                                                    >
                                                        <FaMap className="text-xs" />
                                                        Show on Map
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* POI Search Section */}
                {!isRoundTrip && startPoint && endPoint && (
                    <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                Add POIs to Route
                            </label>
                            <button
                                onClick={() => {
                                    const nextState = !showPoiSearch;
                                    setShowPoiSearch(nextState);
                                    logTelemetryEvent('routeplanner_poi_toggle', {
                                        enabled: nextState,
                                        waypoint_count: waypoints.length,
                                    });
                                }}
                                className="px-2 py-1 text-xs rounded border bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                                title="Toggle POI search"
                            >
                                <FaSearch className="text-xs" />
                                {showPoiSearch ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        
                        {showPoiSearch && (
                            <div className="space-y-3 mt-2">
                                {/* POI Type Selection */}
                                <div>
                                    <label className="text-xs text-gray-700 mb-1 block">POI Type:</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPoiSearchType('tourism')}
                                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                                poiSearchType === 'tourism'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        >
                                            <FaCamera className="inline mr-1" />
                                            Tourism
                                        </button>
                                        <button
                                            onClick={() => setPoiSearchType('fuel')}
                                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                                poiSearchType === 'fuel'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        >
                                            <FaGasPump className="inline mr-1" />
                                            Fuel
                                        </button>
                                        <button
                                            onClick={() => setPoiSearchType('charging')}
                                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                                poiSearchType === 'charging'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        >
                                            <FaBolt className="inline mr-1" />
                                            Charging
                                        </button>
                                    </div>
                                </div>

                                {/* Search Location */}
                                <div>
                                    <label className="text-xs text-gray-700 mb-1 block">Search Location:</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setPoiSearchLocation('start')}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                                poiSearchLocation === 'start'
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                            disabled={!startPoint}
                                        >
                                            Near Start
                                        </button>
                                        <button
                                            onClick={() => setPoiSearchLocation('end')}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                                poiSearchLocation === 'end'
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                            disabled={!endPoint}
                                        >
                                            Near End
                                        </button>
                                        <button
                                            onClick={() => setPoiSearchLocation('midpoint')}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                                poiSearchLocation === 'midpoint'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        >
                                            Midpoint
                                        </button>
                                    </div>
                                </div>

                                {/* Search Radius */}
                                <div>
                                    <label className="text-xs text-gray-700 mb-1 block">
                                        Search Radius: {poiSearchRadius} km
                                    </label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        step="5"
                                        value={poiSearchRadius}
                                        onChange={(e) => setPoiSearchRadius(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Search Button */}
                                <button
                                    onClick={async () => {
                                        if (!startPoint || !endPoint) {
                                            showToast('Please set start and end points first', 'error', 3000);
                                            return;
                                        }
                                        
                                        setPoiLoading(true);
                                        setFoundPois([]);
                                        
                                        try {
                                            let searchLat, searchLon;
                                            
                                            // Determine search location based on user selection
                                            if (poiSearchLocation === 'start' && startPoint) {
                                                searchLat = startPoint.lat;
                                                searchLon = startPoint.lng;
                                            } else if (poiSearchLocation === 'end' && endPoint) {
                                                searchLat = endPoint.lat;
                                                searchLon = endPoint.lng;
                                            } else {
                                                // Default to midpoint
                                                searchLat = (startPoint.lat + endPoint.lat) / 2;
                                                searchLon = (startPoint.lng + endPoint.lng) / 2;
                                            }
                                            
                                            console.log(`Searching POIs at: ${searchLat.toFixed(4)}, ${searchLon.toFixed(4)} (${poiSearchLocation})`);
                                            console.log(`POI Type: ${poiSearchType}, Radius: ${poiSearchRadius}km`);
                                            
                                            let response;
                                            let endpoint = '';
                                            
                                            // Use the appropriate fetch endpoint based on POI type
                                            if (poiSearchType === 'tourism') {
                                                endpoint = '/api/fetch-tourism';
                                                response = await axios.get(endpoint, {
                                                    params: {
                                                        lat: searchLat,
                                                        lon: searchLon,
                                                        radius: poiSearchRadius
                                                    },
                                                    timeout: 30000 // 30 second timeout
                                                });
                                            } else if (poiSearchType === 'fuel') {
                                                endpoint = '/api/fetch-fuel-stations';
                                                response = await axios.get(endpoint, {
                                                    params: {
                                                        lat: searchLat,
                                                        lon: searchLon,
                                                        radius: poiSearchRadius
                                                    },
                                                    timeout: 30000
                                                });
                                            } else if (poiSearchType === 'charging') {
                                                endpoint = '/api/fetch-charging-stations';
                                                response = await axios.get(endpoint, {
                                                    params: {
                                                        lat: searchLat,
                                                        lon: searchLon,
                                                        radius: poiSearchRadius
                                                    },
                                                    timeout: 30000
                                                });
                                            }
                                            
                                            console.log(`API Endpoint: ${endpoint}`);
                                            console.log('POI API Response Status:', response?.status);
                                            console.log('POI API Response Data:', response?.data);
                                            console.log('Response Data Type:', Array.isArray(response?.data) ? 'Array' : typeof response?.data);
                                            console.log('Response Data Length:', Array.isArray(response?.data) ? response.data.length : 'N/A');
                                            
                                            // Process the response - these endpoints return arrays directly
                                            const pois = response?.data || [];
                                            
                                            // Transform the data to match our expected format
                                            const formattedPois = pois.map(poi => ({
                                                id: poi.id || poi.osm_id || `poi_${Date.now()}_${Math.random()}`,
                                                name: poi.name || poi.displayName || 'Unnamed POI',
                                                type: poiSearchType,
                                                subtype: poi.subtype || poi.type || null,
                                                latitude: poi.latitude || poi.lat,
                                                longitude: poi.longitude || poi.lon || poi.lng,
                                                properties: poi.properties
                                            }));
                                            
                                            console.log(`Found ${formattedPois.length} POIs`);
                                            setFoundPois(formattedPois);
                                            
                                            if (formattedPois.length === 0) {
                                                console.warn('No POIs found. Search details:', { 
                                                    searchLat, 
                                                    searchLon, 
                                                    radius: poiSearchRadius,
                                                    location: poiSearchLocation,
                                                    type: poiSearchType
                                                });
                                                console.warn('Raw API Response:', response?.data);
                                                console.warn('Response is array?', Array.isArray(response?.data));
                                                
                                                // Show helpful message
                                                if (response?.data && Array.isArray(response.data) && response.data.length === 0) {
                                                    showToast(`No ${poiSearchType} POIs found. Try increasing radius, changing type, or different location.`, 'warning', 5000);
                                                } else if (response?.data) {
                                                    console.warn('Unexpected response format:', response.data);
                                                    showToast('Unexpected response format. Check browser console (F12) for details.', 'error', 5000);
                                                }
                                            } else {
                                                console.log(`✅ Successfully found ${formattedPois.length} POIs`);
                                            }
                                        } catch (error) {
                                            console.error('❌ Error fetching POIs:', error);
                                            console.error('Error details:', error.response?.data);
                                            console.error('Error status:', error.response?.status);
                                            console.error('Error config:', error.config);
                                            
                                            let errorMessage = `Failed to fetch POIs: ${error.response?.data?.error || error.message}`;
                                            
                                            if (error.code === 'ECONNABORTED') {
                                                errorMessage += '\n\nRequest timed out. The Overpass API may be slow. Try again or reduce search radius.';
                                            } else if (error.response?.status === 429) {
                                                errorMessage += '\n\nRate limited. Please wait a moment and try again.';
                                            } else if (!error.response) {
                                                errorMessage += '\n\nNo response from server. Check your internet connection.';
                                            }
                                            
                                            showToast(errorMessage + ' Check browser console (F12) for more details.', 'error', 6000);
                                        } finally {
                                            setPoiLoading(false);
                                        }
                                    }}
                                    disabled={poiLoading}
                                    className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                                >
                                    {poiLoading ? (
                                        <>
                                            <span className="loading-spinner loading-spinner-sm"></span>
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <FaSearch />
                                            Search POIs
                                        </>
                                    )}
                                </button>

                                {/* Found POIs List */}
                                {foundPois.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                                        <div className="text-xs text-gray-600 mb-2 font-semibold">
                                            Found {foundPois.length} POI(s)
                                        </div>
                                        <div className="space-y-2">
                                            {foundPois.map((poi) => (
                                                <div
                                                    key={poi.id}
                                                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-medium text-gray-800 truncate">
                                                            {poi.name || 'Unnamed POI'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {poi.type} {poi.subtype && `• ${poi.subtype}`}
                                                        </div>
                                                        {poi.properties?.brand && (
                                                            <div className="text-xs text-gray-400">
                                                                {poi.properties.brand}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            // Add POI as waypoint
                                                            const newWaypoint = {
                                                                id: Date.now() + Math.random(),
                                                                lat: parseFloat(poi.latitude),
                                                                lng: parseFloat(poi.longitude),
                                                                name: poi.name || 'Unnamed POI',
                                                                poiId: poi.id,
                                                                type: poi.type || poiSearchType,
                                                                subtype: poi.subtype || null,
                                                                isPoi: true
                                                            };
                                                            setWaypoints(prev => [...prev, newWaypoint]);
                                                            addMarker(newWaypoint.lat, newWaypoint.lng, 'waypoint', newWaypoint.id);
                                                            
                                                            // Remove from found POIs
                                                            setFoundPois(foundPois.filter(p => p.id !== poi.id));
                                                            showToast('Waypoint added from POI', 'success', 2000);
                                                        }}
                                                        className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                                                        title="Add as waypoint"
                                                    >
                                                        <FaPlus className="text-xs" />
                                                        Add
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {foundPois.length === 0 && !poiLoading && (
                                    <div className="text-xs text-gray-500 text-center py-2 bg-yellow-50 p-2 rounded">
                                        No POIs found in this area. Try:
                                        <ul className="text-left mt-1 ml-4 list-disc">
                                            <li>Increasing the search radius</li>
                                            <li>Changing the POI type</li>
                                            <li>Searching in a different location</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Saved Roads Section */}
                {auth && auth.token && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-semibold text-gray-700">
                                Saved Roads & Routes ({savedRoads.length})
                            </label>
                            <button
                                onClick={() => setShowSavedRoads(!showSavedRoads)}
                                className="px-2 py-1 text-xs rounded border bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                                title="Toggle saved roads list"
                            >
                                <FaRoad className="text-xs" />
                                {showSavedRoads ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {showSavedRoads && (
                            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                                {savedRoadsLoading ? (
                                    <div className="text-xs text-gray-600 text-center py-2">Loading saved roads...</div>
                                ) : savedRoads.length === 0 ? (
                                    <div className="text-xs text-gray-600 text-center py-2">No saved roads or routes found</div>
                                ) : (
                                    savedRoads.map((road) => {
                                        const isSelected = selectedSavedRoads.some(sr => sr.id === road.id);
                                        // Use route_type field - should be set when saving
                                        const isRoute = road.route_type === 'route';
                                        return (
                                            <div
                                                key={road.id}
                                                className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-green-100 border border-green-500'
                                                        : 'bg-white border border-gray-200 hover:bg-gray-100'
                                                }`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedSavedRoads(prev => prev.filter(sr => sr.id !== road.id));
                                                    } else {
                                                        setSelectedSavedRoads(prev => [...prev, road]);
                                                        showToast(`${road.road_name || 'Road'} added to route. Click "Search Routes" to calculate.`, 'success', 3000);
                                                    }
                                                }}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium text-gray-800">{road.road_name || 'Unnamed Road'}</div>
                                                        {isRoute ? (
                                                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-semibold" title="Saved Route">
                                                                ROUTE
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-semibold" title="Saved Road">
                                                                ROAD
                                                            </span>
                                                        )}
                                                    </div>
                                                    {road.length && (
                                                        <div className="text-xs text-gray-600">
                                                            {formatDistance(road.length, 'metric')}
                                                            {road.twistiness != null && typeof road.twistiness === 'number' && ` • Twistiness: ${road.twistiness.toFixed(3)}`}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isSelected) {
                                                            setSelectedSavedRoads(prev => prev.filter(sr => sr.id !== road.id));
                                                            showToast(`${road.road_name || 'Road'} removed from route`, 'info', 2000);
                                                        } else {
                                                            setSelectedSavedRoads(prev => [...prev, road]);
                                                            showToast(`${road.road_name || 'Road'} added to route. Click "Search Routes" to calculate.`, 'success', 3000);
                                                        }
                                                    }}
                                                    className={`ml-2 px-2 py-1 text-xs rounded ${
                                                        isSelected
                                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                                    title={isSelected ? 'Remove from route' : 'Add to route'}
                                                >
                                                    {isSelected ? <FaTrash /> : <FaPlus />}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                        {selectedSavedRoads.length > 0 && (
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                {selectedSavedRoads.map((road) => (
                                    <div
                                        key={road.id}
                                        className="flex items-center justify-between p-2 bg-green-50 rounded text-sm border border-green-200"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-700 font-medium">{road.road_name || 'Unnamed Road'}</span>
                                            {road.route_type === 'route' ? (
                                                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-semibold" title="Saved Route">
                                                    ROUTE
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-semibold" title="Saved Road">
                                                    ROAD
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setSelectedSavedRoads(prev => prev.filter(sr => sr.id !== road.id))}
                                            className="text-red-600 hover:text-red-800 ml-2"
                                            title="Remove saved road from route"
                                        >
                                            <FaTrash className="text-xs" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}


                {clickMode && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        {clickMode === 'start' && 'Click on map to set start point'}
                        {clickMode === 'end' && !isRoundTrip && 'Click on map to set end point'}
                        {clickMode === 'waypoint' && !isRoundTrip && 'Click on map to add waypoint'}
                    </div>
                )}

            {/* Search Routes Button - Only show for regular routes */}
            {!isRoundTrip && startPoint && endPoint && (
                <button
                    onClick={() => recalculateRoutes()}
                    disabled={loading || !startPoint || !endPoint}
                    className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded flex items-center justify-center font-semibold mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    title={
                        !startPoint ? 'Start point required' :
                        !endPoint ? 'End point required' :
                        loading ? 'Calculating route...' :
                        'Calculate route with selected curvature level'
                    }
                >
                    <FaRoute className="mr-2" />
                    {loading ? 'Searching Routes...' : 'Search Routes'}
                </button>
            )}

            {/* Toast Container - rendered at end of panel */}

            {loading && (
                <div className="text-center py-4 space-y-3">
                    <div className="text-gray-700 font-medium">{loadingMessage}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                    <div className="text-xs text-gray-500">{loadingProgress}%</div>
                </div>
            )}

            {/* Empty state */}
            {!loading && !startPoint && !endPoint && Object.keys(routes).length === 0 && (
                <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FaMapMarkerAlt className="mx-auto text-4xl text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Plan Your Route</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Start by setting a start point and end point to calculate your route.
                    </p>
                    <div className="flex flex-col gap-2 text-xs text-gray-500">
                        <p>• Search for locations or click on the map</p>
                        <p>• Choose your preferred route curvature</p>
                        <p>• Add waypoints for custom stops</p>
                    </div>
                </div>
            )}


            {Object.keys(routes).length > 0 && (
                <div className="route-options">
                    <h4 className="font-semibold mb-2">Route Options:</h4>
                    <div className="space-y-2">
                        {routes.round_trip && (
                            <FeatureGate feature="round_trip" user={auth?.user}>
                                <button
                                    onClick={() => handleRouteSelect('round_trip')}
                                    className={`w-full text-left p-3 rounded border-2 transition-colors ${
                                        selectedRoute === 'round_trip'
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="font-semibold text-purple-600">Round Trip</div>
                                    {getRouteInfo('round_trip') && (
                                        <div className="text-sm text-gray-600 mt-1">
                                            {getRouteInfo('round_trip').distance} • {getRouteInfo('round_trip').duration}
                                            {getRouteInfo('round_trip').curvature && ` • ${getRouteInfo('round_trip').curvature}`}
                                        </div>
                                    )}
                                </button>
                            </FeatureGate>
                        )}
                        {routes.straightest && (
                            <button
                                onClick={() => handleRouteSelect('straightest')}
                                onMouseEnter={() => {
                                    setHoveredRoute('straightest');
                                    // Preview route on map
                                    if (routes.straightest && routes.straightest.coordinates && previewRouteLayerRef.current) {
                                        previewRouteLayerRef.current.clearLayers();
                                        const coordinates = routes.straightest.coordinates.map(coord => [coord[0], coord[1]]);
                                        L.polyline(coordinates, {
                                            color: '#3b82f6',
                                            weight: 4,
                                            opacity: 0.6,
                                            dashArray: '10, 5',
                                            className: 'preview-route'
                                        }).addTo(previewRouteLayerRef.current);
                                    }
                                }}
                                onMouseLeave={() => {
                                    setHoveredRoute(null);
                                    if (previewRouteLayerRef.current) {
                                        previewRouteLayerRef.current.clearLayers();
                                    }
                                }}
                                className={`w-full text-left p-3 rounded border-2 transition-colors ${
                                    selectedRoute === 'straightest'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="font-semibold text-blue-600">Straightest Route</div>
                                {getRouteInfo('straightest') && (
                                    <div className="text-sm text-gray-600 mt-1">
                                        {getRouteInfo('straightest').distance} • {getRouteInfo('straightest').duration}
                                    </div>
                                )}
                                {hoveredRoute === 'straightest' && hoveredRoute !== selectedRoute && (
                                    <div className="text-xs text-blue-600 mt-1 italic">Previewing on map...</div>
                                )}
                            </button>
                        )}
                        {routes.balanced && (
                            <button
                                onClick={() => handleRouteSelect('balanced')}
                                onMouseEnter={() => {
                                    setHoveredRoute('balanced');
                                    if (routes.balanced && routes.balanced.coordinates && previewRouteLayerRef.current) {
                                        previewRouteLayerRef.current.clearLayers();
                                        const coordinates = routes.balanced.coordinates.map(coord => [coord[0], coord[1]]);
                                        L.polyline(coordinates, {
                                            color: '#10b981',
                                            weight: 4,
                                            opacity: 0.6,
                                            dashArray: '10, 5',
                                            className: 'preview-route'
                                        }).addTo(previewRouteLayerRef.current);
                                    }
                                }}
                                onMouseLeave={() => {
                                    setHoveredRoute(null);
                                    if (previewRouteLayerRef.current) {
                                        previewRouteLayerRef.current.clearLayers();
                                    }
                                }}
                                className={`w-full text-left p-3 rounded border-2 transition-colors ${
                                    selectedRoute === 'balanced'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="font-semibold text-green-600">🟩 Balanced Route</div>
                                {getRouteInfo('balanced') && (
                                    <div className="text-sm text-gray-600 mt-1">
                                        {getRouteInfo('balanced').distance} • {getRouteInfo('balanced').duration} • {getRouteInfo('balanced').curvature}
                                    </div>
                                )}
                                {hoveredRoute === 'balanced' && hoveredRoute !== selectedRoute && (
                                    <div className="text-xs text-green-600 mt-1 italic">Previewing on map...</div>
                                )}
                            </button>
                        )}
                        {routes.curved && (
                            <FeatureGate feature="curved_routes" user={auth?.user}>
                                <button
                                    onClick={() => handleRouteSelect('curved')}
                                    onMouseEnter={() => {
                                        setHoveredRoute('curved');
                                        if (routes.curved && routes.curved.coordinates && previewRouteLayerRef.current) {
                                            previewRouteLayerRef.current.clearLayers();
                                            const coordinates = routes.curved.coordinates.map(coord => [coord[0], coord[1]]);
                                            L.polyline(coordinates, {
                                                color: '#f59e0b',
                                                weight: 4,
                                                opacity: 0.6,
                                                dashArray: '10, 5',
                                                className: 'preview-route'
                                            }).addTo(previewRouteLayerRef.current);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredRoute(null);
                                        if (previewRouteLayerRef.current) {
                                            previewRouteLayerRef.current.clearLayers();
                                        }
                                    }}
                                    className={`w-full text-left p-3 rounded border-2 transition-colors ${
                                        selectedRoute === 'curved'
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="font-semibold text-red-600">Curvy</div>
                                    {getRouteInfo('curved') && (
                                        <div className="text-sm text-gray-600 mt-1">
                                            {getRouteInfo('curved').distance} • {getRouteInfo('curved').duration} • {getRouteInfo('curved').curvature}
                                        </div>
                                    )}
                                    {hoveredRoute === 'curved' && hoveredRoute !== selectedRoute && (
                                        <div className="text-xs text-yellow-600 mt-1 italic">Previewing on map...</div>
                                    )}
                                </button>
                            </FeatureGate>
                        )}
                        {routes.extra_curved && (
                            <FeatureGate feature="extra_curvy" user={auth?.user}>
                                <button
                                    onClick={() => handleRouteSelect('extra_curved')}
                                    onMouseEnter={() => {
                                        setHoveredRoute('extra_curved');
                                        if (routes.extra_curved && routes.extra_curved.coordinates && previewRouteLayerRef.current) {
                                            previewRouteLayerRef.current.clearLayers();
                                            const coordinates = routes.extra_curved.coordinates.map(coord => [coord[0], coord[1]]);
                                            L.polyline(coordinates, {
                                                color: '#ef4444',
                                                weight: 4,
                                                opacity: 0.6,
                                                dashArray: '10, 5',
                                                className: 'preview-route'
                                            }).addTo(previewRouteLayerRef.current);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredRoute(null);
                                        if (previewRouteLayerRef.current) {
                                            previewRouteLayerRef.current.clearLayers();
                                        }
                                    }}
                                    className={`w-full text-left p-3 rounded border-2 transition-colors ${
                                        selectedRoute === 'extra_curved'
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="font-semibold text-purple-600">Extra Curvy</div>
                                    {getRouteInfo('extra_curved') && (
                                        <div className="text-sm text-gray-600 mt-1">
                                            {getRouteInfo('extra_curved').distance} • {getRouteInfo('extra_curved').duration} • {getRouteInfo('extra_curved').curvature}
                                        </div>
                                    )}
                                    {hoveredRoute === 'extra_curved' && hoveredRoute !== selectedRoute && (
                                        <div className="text-xs text-red-600 mt-1 italic">Previewing on map...</div>
                                    )}
                                </button>
                            </FeatureGate>
                        )}
                    </div>
                </div>
            )}

            {/* Enhanced Route Statistics */}
            {selectedRoute && routes[selectedRoute] && (
                <div className="mt-4">
                    <EnhancedRouteStatistics route={routes[selectedRoute]} />
                </div>
            )}

            {selectedRoute && routes[selectedRoute] && selectedRoute !== 'round_trip' && (
                <div className="mt-4 space-y-2">
                    {/* Route Actions */}
                    <div className="p-3 bg-blue-50 rounded border border-blue-200 mb-2">
                        <div className="text-xs font-semibold text-blue-800 mb-1">💾 Route Actions</div>
                        <div className="text-xs text-blue-700">
                            Save your route for later or export as GPX file
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSaveRouteDialog(true)}
                            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center font-medium"
                        >
                            <FaSave className="mr-2" />
                            Save Route
                        </button>
                        <button
                            onClick={() => setShowShareRoute(true)}
                            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded flex items-center justify-center font-medium"
                        >
                            <FaShare className="mr-2" />
                            Share
                        </button>
                    </div>
                    <div className="mt-2">
                        <RouteExport
                            route={routes[selectedRoute]}
                            routeName={getSelectedRouteName()}
                            routeDescription={routes[selectedRoute]?.description || ''}
                            auth={auth}
                            onExportComplete={() => showToast('GPX exported', 'success', 2000)}
                        />
                    </div>
                </div>
            )}
            
            {selectedRoute === 'round_trip' && routes.round_trip && (
                <div className="mt-4 space-y-2">
                    {/* Send to Navigation removed - monetization feature: use Android app for navigation */}
                    <button
                        onClick={() => setShowShareRoute(true)}
                        className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded flex items-center justify-center"
                    >
                        <FaShare className="mr-2" />
                        Share Route
                    </button>
                    <div className="mt-2">
                        <RouteExport
                            route={routes.round_trip}
                            routeName={getSelectedRouteName()}
                            routeDescription={routes.round_trip?.description || ''}
                            auth={auth}
                            onExportComplete={() => showToast('GPX exported', 'success', 2000)}
                        />
                    </div>
                </div>
            )}

            {(startPoint || endPoint || waypoints.length > 0) && (
                <button
                    onClick={clearRoute}
                    className="mt-2 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                    Clear Route
                </button>
            )}

            {showShareRoute && selectedRoute && routes[selectedRoute] && (
                <div className="mt-4">
                    <ShareRoute
                        route={routes[selectedRoute]}
                        routeName={getSelectedRouteName()}
                        routeDescription={null}
                        auth={auth}
                        onClose={() => setShowShareRoute(false)}
                    />
                </div>
            )}

            {showSaveRouteDialog && selectedRoute && routes[selectedRoute] && (
                <SaveRouteDialog
                    route={routes[selectedRoute]}
                    routeName={getSelectedRouteName()}
                    auth={auth}
                    onClose={() => setShowSaveRouteDialog(false)}
                    onSaved={(savedRoad) => {
                        showToast('Route saved successfully!', 'success', 3000);
                    }}
                />
            )}

            </div>
        </div>
    );
    
    if (renderInSidebar) {
        // Try to find container if ref is not set (fallback for immediate render)
        if (!sidebarContainerRef.current && isActive) {
            // Find all containers and pick the one that's visible
            const containers = document.querySelectorAll('.route-planner-sidebar-content');
            for (let el of containers) {
                const style = window.getComputedStyle(el);
                if (style.display !== 'none') {
                    sidebarContainerRef.current = el;
                    setContainerFound(true);
                    break;
                }
            }
        }
        
        // If we found the container, render via portal
        if (sidebarContainerRef.current && containerFound) {
            return createPortal(panelContent, sidebarContainerRef.current);
        }
        
        // Fallback: If container not found but we're in active state, return the content directly
        // This prevents the empty state issue when switching to Plan Route view
        if (isActive) {
            return panelContent;
        }
        
        // Return hidden placeholder to keep component mounted
        return <div style={{ display: 'none' }} data-route-planner-placeholder />;
    }

    return (
        <>
            {isActive && (
                <div 
                    className="route-planner-backdrop" 
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.1)',
                        zIndex: 899,
                        pointerEvents: 'auto'
                    }}
                />
            )}
            {panelContent}
            <ToastContainer />
        </>
    );
}
