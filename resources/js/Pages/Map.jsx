import React, { useState, useEffect, useRef, useContext } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw/dist/leaflet.draw';
import axios from 'axios';
import { getTile, createTileUrl } from '../utils/tileCache';
import NavigationAppSelector from '../Components/NavigationAppSelector';
import PhotoGallery from '../Components/PhotoGallery';
import PhotoUploader from '../Components/PhotoUploader';
import PoiControls from '../Components/PoiControls';
import PoiDetails from '../Components/PoiDetails';
import RatingModal from '../Components/RatingModal';
import SocialModal from '../Components/SocialModal';
import SelfProfileModal from '../Components/SelfProfileModal';
import UserProfileModal from '../Components/UserProfileModal';
import SettingsModal from '../Components/SettingsModal';
import SaveToCollectionModal from '../Components/SaveToCollectionModal';
import DirectRoadDrawer from '../Components/DirectRoadDrawer';
import SaveRoadModal from '../Components/SaveRoadModal';
import StarRating from '../Components/StarRating';
import RoutePlanner from '../Components/RoutePlanner';
import GPXImport from '../Components/GPXImport';
import RouteExport from '../Components/RouteExport';
import DesktopHeader from '../Components/DesktopHeader';
import SubscriptionWarningBanner from '../Components/SubscriptionWarningBanner';
import { UserSettingsContext } from '../Contexts/UserSettingsContext';
import usePointsOfInterest from '../Hooks/usePointsOfInterest';
import { EmptySavedRoads } from '../Components/EmptyState';
import { useNotification } from '../Contexts/NotificationContext';
import { showToast } from '../Components/ToastContainer';
import { FaTag, FaTimes, FaChevronDown, FaPencilAlt, FaDrawPolygon, FaRoute, FaMap, FaBan, FaUsers, FaCog, FaArrowLeft } from 'react-icons/fa';
import { fixMapTiles, fixDrawingModeTiles, applyDrawingModeEnterFix, applyDrawingModeExitFix } from '../utils/mapTileFix';
import { logTelemetryEvent } from '../utils/telemetry';
import CollapsibleFilterByTags from '../Components/CollapsibleFilterByTags';
function TagCategoryCollapsible({ tags, onTagSelect, selectedTagIds = [] }) {
    const [expanded, setExpanded] = useState(false);
    const initialVisibleCount = 5;
    const hasMoreTags = tags.length > initialVisibleCount;
    const visibleTags = expanded ? tags : tags.slice(0, initialVisibleCount);
    return (
        <div className="tag-category-collapsible">
            <div className="flex flex-wrap gap-1">
                {visibleTags.map(tag => (
                    <div
                        key={tag.id}
                        className={`tag-filter-option tag-${tag.type || 'default'} ${
                            selectedTagIds.includes(tag.id) ? 'selected' : ''
                        }`}
                        onClick={() => onTagSelect(tag)}
                    >
                        <FaTag className="mr-1 text-xs" />
                        {tag.name}
                    </div>
                ))}
                {hasMoreTags && (
                    <button
                        type="button"
                        className="px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 flex items-center tag-expand-button"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? 'Show Less' : `+${tags.length - initialVisibleCount} more`}
                        <FaChevronDown
                            className={`ml-1 text-xs transition-transform icon ${expanded ? 'expanded' : ''}`}
                        />
                    </button>
                )}
            </div>
        </div>
    );
}

const DRAWING_FEATURE_ENABLED = false;
const POI_PANEL_ENABLED = false;
const Map = () => {
    const { userSettings, loadUserSettings } = useContext(UserSettingsContext);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const radiusCircleRef = useRef(null);
    const roadsLayerRef = useRef(null);
    const [selectedPoiId, setSelectedPoiId] = useState(null);
    const [selectedPoi, setSelectedPoi] = useState(null);
    const [poiControlsKey, setPoiControlsKey] = useState(Date.now()); 
    const [currentPoiLocation, setCurrentPoiLocation] = useState(null); 
    const {
        tourism,
        fuelStations,
        chargingStations,
        loading: poiLoading,
        error: poiError,
        showTourism,
        showFuelStations,
        showChargingStations,
        setShowTourism,
        setShowFuelStations,
        setShowChargingStations,
        fetchTourism,
        fetchFuelStations,
        fetchChargingStations,
        fetchAllPois,
        clearAllPois
    } = usePointsOfInterest(mapRef);
    const getTwistinessLabel = (twistiness) => {
        if (twistiness > 0.007) return 'Very Curvy';
        if (twistiness > 0.0035) return 'Moderately Curvy';
        return 'Mellow';
    };
    const [radius, setRadius] = useState(10);
    const [roadType, setRoadType] = useState('all');
    const [curvatureType, setCurvatureType] = useState('all');
    const [loading, setLoading] = useState(false);
    const [roads, setRoads] = useState([]);
    const [auth, setAuth] = useState({ user: null, token: null });
    const [loginForm, setLoginForm] = useState({ login: '', password: '' });
    const [authMode, setAuthMode] = useState('login'); 
    const [registerForm, setRegisterForm] = useState({ username: '', email: '', name: '', password: '', password_confirmation: '' });
    const [savedRoads, setSavedRoads] = useState([]); 
    const [savedRoadsLoading, setSavedRoadsLoading] = useState(false);
    const [selectedRoad, setSelectedRoad] = useState(null);
    const [editForm, setEditForm] = useState({ road_name: '', description: '', pictures: [] });
    const [selectedRoadId, setSelectedRoadId] = useState(null);
    const [showCommunity, setShowCommunity] = useState(false);
    const [publicRoads, setPublicRoads] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [communitySearchQuery, setCommunitySearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [communitySearchResults, setCommunitySearchResults] = useState([]);
    const [selectedRoadForReview, setSelectedRoadForReview] = useState(null);
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [localRating, setLocalRating] = useState(0);
    const [localComment, setLocalComment] = useState('');
    const [showSaveToCollectionModal, setShowSaveToCollectionModal] = useState(false);
    const searchTimeoutRef = useRef(null);
    const communitySearchTimeoutRef = useRef(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isCommunitySearching, setIsCommunitySearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [searchType, setSearchType] = useState('town');
    const [searchRadius, setSearchRadius] = useState(10);
    const [isSavedRoadsExpanded, setIsSavedRoadsExpanded] = useState(true);
    const [isCommunityRoadsExpanded, setIsCommunityRoadsExpanded] = useState(false);
    const [communitySearchMode, setCommunitySearchMode] = useState('marker'); // 'marker' or 'search'
    const [sidebarMode, setSidebarMode] = useState('default'); // 'default', 'findRoads', 'planRoute', 'savedRoads', 'communityRoads', 'importGpx'
    const [showNavigationSelector, setShowNavigationSelector] = useState(false);
    const [lengthFilter, setLengthFilter] = useState('all');
    const [curvinessFilter, setCurvinessFilter] = useState('all');
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState('rating');
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [roadToAddToCollection, setRoadToAddToCollection] = useState(null);
    // activeTab removed - using socialModalTab instead
    const [mapCenter, setMapCenter] = useState({ lat: 57.1, lng: 27.1 });
    const [markerDropMode, setMarkerDropMode] = useState(false);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [importedRoute, setImportedRoute] = useState(null);
    const [currentRoute, setCurrentRoute] = useState(null);
    const [routeWaypoints, setRouteWaypoints] = useState([]);
    const [drawnRoadData, setDrawnRoadData] = useState(null);
    const [showSaveRoadModal, setShowSaveRoadModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [localSettings, setLocalSettings] = useState({
        default_search_radius: 10,
        default_search_type: 'town',
        show_community_by_default: false,
        default_map_view: 'standard',
    });
    
    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);


    // Close community search popup when navigating away from community tab
    useEffect(() => {
        if (sidebarMode !== 'communityRoads' && showCommunity) {
            setShowCommunity(false);
        }
    }, [sidebarMode]);
    
    const { addNotification } = useNotification();
    
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Handle subscription success redirect
        if (urlParams.get('subscription') === 'success') {
            // Clean URL first
            window.history.replaceState({}, '', '/map');
            
            // Show success message with toast
            setTimeout(() => {
                addNotification('🎉 Subscription activated successfully! Welcome to Premium!', { 
                    type: 'success', 
                    duration: 6000 
                });
            }, 300);
            
            // Reload user data to get updated subscription
            const token = localStorage.getItem('token');
            if (token) {
                axios.get('/api/user', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                .then(response => {
                    setAuth({ user: response.data, token });
                })
                .catch(() => {
                    // Handle error
                });
            }
        }
        
        // Handle subscription canceled redirect
        if (urlParams.get('subscription') === 'canceled') {
            // Clean URL first
            window.history.replaceState({}, '', '/map');
            
            // Show cancel message with toast
            setTimeout(() => {
                addNotification('Subscription checkout was canceled. You can try again anytime.', { 
                    type: 'info', 
                    duration: 5000 
                });
            }, 300);
        }
        
        // Handle login required
        const loginRequired = urlParams.get('login_required');
        if (loginRequired === 'true') {
            addNotification('You need to log in to access this feature. Please log in to continue.', { 
                type: 'warning', 
                duration: 5000 
            });
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            axios.get('/api/user', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => {
                setAuth({ user: response.data, token });
                
                // Store subscription status for banner display
                // Only show notifications for subscriptions that are actually ending
                if (response.data.subscription_status) {
                    const subStatus = response.data.subscription_status;
                    
                    // Use localStorage to ensure notification only shows once (not per session)
                    // For expired subscriptions, use a more permanent key based on subscription ID
                    const subscriptionId = response.data.subscription?.id;
                    let notificationKey;
                    
                    if (subStatus.status === 'expired') {
                        // For expired subscriptions, use subscription ID to ensure it's truly once per subscription
                        notificationKey = `sub_expired_notification_shown_${subscriptionId || 'unknown'}_${subStatus.expired_at}`;
                    } else {
                        // For expiring subscriptions, use the expiration date
                        notificationKey = `sub_notification_shown_${subStatus.status}_${subStatus.expires_at}`;
                    }
                    
                    const hasShown = localStorage.getItem(notificationKey);
                    
                    if (!hasShown) {
                        // Show notification once
                        setSubscriptionStatus(subStatus);
                        
                        if (subStatus.status === 'expired') {
                            const daysAgo = subStatus.days_ago || 0;
                            const expiredDate = new Date(subStatus.expired_at).toLocaleDateString();
                            
                            setTimeout(() => {
                                addNotification(
                                    `Your subscription expired ${daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`} (${expiredDate}). Renew now to restore premium features!`,
                                    { 
                                        type: 'warning', 
                                        duration: 10000,
                                        isImportant: true
                                    }
                                );
                                // Mark as shown - this will persist across sessions
                                localStorage.setItem(notificationKey, 'true');
                            }, 1000);
                        } else if (subStatus.status === 'expiring' && subStatus.is_expiring_soon) {
                            const daysRemaining = subStatus.days_remaining;
                            const expiresDate = new Date(subStatus.expires_at).toLocaleDateString();
                            
                            let message = '';
                            if (daysRemaining === 0) {
                                message = `Your subscription expires today (${expiresDate}). Renew now to continue enjoying premium features!`;
                            } else if (daysRemaining === 1) {
                                message = `Your subscription expires tomorrow (${expiresDate}). Renew now to avoid losing access!`;
                            } else {
                                message = `Your subscription expires in ${daysRemaining} days (${expiresDate}). Renew now to continue enjoying premium features!`;
                            }
                            
                            setTimeout(() => {
                                addNotification(message, { 
                                    type: 'warning', 
                                    duration: 10000,
                                    isImportant: true
                                });
                                localStorage.setItem(notificationKey, 'true');
                            }, 1000);
                        }
                    } else {
                        // Already shown, don't show banner or notification again
                        setSubscriptionStatus(null);
                    }
                } else {
                    setSubscriptionStatus(null);
                }
            })
            .catch(() => {
                localStorage.removeItem('token');
                delete axios.defaults.headers.common['Authorization'];
                setAuth({ user: null, token: null });
            });
        }
    }, []); 
    useEffect(() => {
        loadUserSettings();

        // Add event listener for user profile updates
        const handleUserUpdated = async (event) => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await axios.get('/api/user', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setAuth({ user: response.data, token });
                } catch (error) {
                    console.error('Failed to refresh user data:', error);
                }
            }
        };

        window.addEventListener('userProfileUpdated', handleUserUpdated);
        return () => {
            window.removeEventListener('userProfileUpdated', handleUserUpdated);
        };
    }, []);
    // Redraw imported route whenever it's set
    useEffect(() => {
        if (!importedRoute || !roadsLayerRef.current || !mapRef.current) return;
        
        try {
            // The polyline is already drawn and zoomed in handleZoomToRoute
            // This effect ensures it persists if the layer gets cleared by other operations
        } catch (error) {
            console.error('Failed to manage imported route:', error);
        }
    }, [importedRoute]);
    const loadSavedRoads = async () => {
        if (auth.token) {
            try {
                setSavedRoadsLoading(true);
                axios.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`;
                const response = await axios.get('/api/saved-roads', {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                if (Array.isArray(response.data)) {
                    setSavedRoads(response.data);
                } else {
                    setSavedRoads([]);
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    delete axios.defaults.headers.common['Authorization'];
                    setAuth({ user: null, token: null });
                }
            } finally {
                setSavedRoadsLoading(false);
            }
        }
    };

    useEffect(() => {
        loadSavedRoads();
    }, [auth.token]);

    // Listen for saved roads/routes updates
    useEffect(() => {
        const handleUpdate = () => {
            loadSavedRoads();
        };
        window.addEventListener('savedRoadsUpdated', handleUpdate);
        return () => window.removeEventListener('savedRoadsUpdated', handleUpdate);
    }, [auth.token]); 
    useEffect(() => {
        if (userSettings) {
            setRadius(userSettings.default_search_radius);
            setSearchType(userSettings.default_search_type);
            setShowCommunity(userSettings.show_community_by_default);
            setLocalSettings({
                default_search_radius: userSettings.default_search_radius,
                default_search_type: userSettings.default_search_type,
                show_community_by_default: userSettings.show_community_by_default,
                default_map_view: userSettings.default_map_view,
            });
            if (userSettings.theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            if (mapRef.current && window.mapTileLayers) {
                const mapView = userSettings.default_map_view || 'standard';
                Object.values(window.mapTileLayers).forEach(layer => {
                    if (mapRef.current.hasLayer(layer)) {
                        mapRef.current.removeLayer(layer);
                    }
                });
                window.mapTileLayers[mapView].addTo(mapRef.current);
            }
        }
    }, [userSettings]); 
    
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await axios.get('/api/tags');
                setAvailableTags(response.data);
            } catch (error) {
            }
        };
        fetchTags();
    }, []);
    const categoryOrder = [
        'road_characteristic',
        'surface_type',
        'scenery',
        'experience',
        'vehicle',
        'other'
    ];
    const categoryNames = {
        'road_characteristic': 'Road Characteristics',
        'surface_type': 'Surface Types',
        'scenery': 'Scenery Types',
        'experience': 'Experience Types',
        'vehicle': 'Vehicle Suitability',
        'other': 'Other Tags'
    };
    const groupTagsByCategory = () => {
        const groupedTags = availableTags.reduce((acc, tag) => {
            const category = tag.type || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(tag);
            return acc;
        }, {});
        return Object.fromEntries(
            categoryOrder
                .filter(category => groupedTags[category] && groupedTags[category].length > 0)
                .map(category => [category, groupedTags[category]])
                .concat(
                    Object.entries(groupedTags)
                        .filter(([category]) => !categoryOrder.includes(category))
                )
        );
    };
    const getCategoryName = (category) => {
        return categoryNames[category] || category;
    };
    const handleRadiusChange = (e) => {
        const newRadius = Number(e.target.value);
        setRadius(newRadius);
        radiusRef.current = newRadius;
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setRadius(newRadius * 1000); // Convert km to meters
            if (mapRef.current) {
                radiusCircleRef.current.redraw();
            }
        }
        const percentage = ((newRadius - 1) / (50 - 1)) * 100;
        e.target.style.setProperty('--range-progress', `${percentage}%`);
    };
    const markerIconRef = useRef(null);
    const radiusRef = useRef(radius);
    useEffect(() => {
        radiusRef.current = radius;
    }, [radius]);
    const [markerLocation, setMarkerLocation] = useState(null); 
    const handleMapClick = (e) => {
        if (e.originalEvent.target.closest('.poi-controls') ||
            e.originalEvent.target.closest('.leaflet-control') ||
            e.originalEvent.target.closest('button') ||
            e.originalEvent.target.closest('.poi-details')) { 
            return;
        }
        if (!markerDropMode) {
            return;
        }
        const map = mapRef.current;
        if (!map) {
            return;
        }
        const latlng = e.latlng;
        const currentRadius = radiusRef.current;
        try {
            if (!markerIconRef.current) {
                markerIconRef.current = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                    className: 'main-location-marker' 
                });
            }
            if (markerRef.current) {
                markerRef.current.setLatLng(latlng);
            } else {
                markerRef.current = L.marker(latlng, {
                    icon: markerIconRef.current,
                    zIndexOffset: 1000 
                }).addTo(map);
            }
            if (radiusCircleRef.current) {
                radiusCircleRef.current.setLatLng(latlng).setRadius(currentRadius * 1000);
            } else {
                radiusCircleRef.current = L.circle(latlng, {
                    radius: currentRadius * 1000,
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.05,
                    zIndex: 100 
                }).addTo(map);
            }
            setCurrentPoiLocation({
                lat: latlng.lat,
                lon: latlng.lng
            });
            if (!markerRef.current) {
                setPoiControlsKey(Date.now());
            }
            if (selectedPoi) {
                setSelectedPoi(null);
                setSelectedPoiId(null);
            }
            setMarkerDropMode(false);
            setMarkerLocation({ lat: latlng.lat, lng: latlng.lng }); 
        } catch (error) {
        }
    };
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const earthRadius = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) ** 2;
        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const getRoadLength = (geometry) => {
        let length = 0;
        for (let i = 1; i < geometry.length; i++) {
            length += getDistance(
                geometry[i - 1].lat, geometry[i - 1].lon,
                geometry[i].lat, geometry[i].lon
            );
        }
        return length;
    };
    const calculateTwistiness = (geometry) => {
        let totalAngle = 0;
        let totalDistance = 0;
        let cornerCount = 0;
        for (let i = 1; i < geometry.length - 1; i++) {
            const prev = geometry[i - 1];
            const curr = geometry[i];
            const next = geometry[i + 1];
            const segmentDistance = getDistance(curr.lat, curr.lon, next.lat, next.lon);
            totalDistance += segmentDistance;
            const angle1 = Math.atan2(curr.lat - prev.lat, curr.lon - prev.lon);
            const angle2 = Math.atan2(next.lat - curr.lat, next.lon - curr.lon);
            let angle = Math.abs(angle2 - angle1);
            if (angle > Math.PI) angle = 2 * Math.PI - angle;
            if (angle > 0.087) cornerCount++;
            totalAngle += angle;
        }
        if (totalDistance === 0) return 0;
        const twistiness = totalAngle / totalDistance;
        return twistiness < 0.0025 && cornerCount < 1 ? 0 : { twistiness, corner_count: cornerCount };
    };
    const searchRoads = async () => {
        const map = mapRef.current;
        if (!markerRef.current || !map) {
            showToast("Please select a location on the map first!", 'warning', 3000);
            return;
        }
        setLoading(true);
        const lat = markerRef.current.getLatLng().lat;
        const lon = markerRef.current.getLatLng().lng;
        const roadFilters = {
            "all": "motorway|primary|secondary|tertiary|unclassified",
            "primary": "motorway|primary",
            "secondary": "secondary|tertiary"
        };
        const selectedRoadFilter = roadFilters[roadType] || roadFilters["all"];
        const query = `[out:json];way['highway'~'${selectedRoadFilter}'](around:${radius * 1000},${lat},${lon});out tags geom;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        try {
            // Increase timeout for Overpass API (30 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            roadsLayerRef.current.clearLayers();
            const roadSegments = [];
            data.elements.forEach((way) => {
                if (!way.geometry) return;
                const roadLength = getRoadLength(way.geometry);
                if (roadLength < 2000) return;
                const twistinessData = calculateTwistiness(way.geometry);
                if (twistinessData === 0) return;
                if (curvatureType === "curvy" && twistinessData.twistiness <= 0.007) return;
                if (curvatureType === "moderate" && (twistinessData.twistiness < 0.0035 || twistinessData.twistiness > 0.007)) return;
                if (curvatureType === "mellow" && twistinessData.twistiness > 0.0035) return;
                const isUrban = way.tags && (
                    way.tags.highway === 'residential' ||
                    way.tags.highway === 'living_street' ||
                    (way.tags.maxspeed && parseInt(way.tags.maxspeed) <= 50)
                );
                if (isUrban && twistinessData.twistiness <= 0.007) return;
                const lengthInKm = roadLength / 1000;
                if (lengthFilter === "short" && (lengthInKm < 2 || lengthInKm >= 5)) return;
                if (lengthFilter === "medium" && (lengthInKm < 5 || lengthInKm >= 15)) return;
                if (lengthFilter === "long" && lengthInKm < 15) return;
                roadSegments.push({
                    id: way.id,
                    name: way.tags.name || "Unnamed Road",
                    geometry: way.geometry,
                    tags: way.tags,
                    twistiness: twistinessData.twistiness,
                    corner_count: twistinessData.corner_count,
                    length: roadLength,
                    elevation_gain: way.elevation_gain,
                    elevation_loss: way.elevation_loss,
                    max_elevation: way.max_elevation,
                    min_elevation: way.min_elevation
                });
            });
            const processedSegments = new Set();
            const connectedRoads = [];
            for (let i = 0; i < roadSegments.length; i++) {
                if (processedSegments.has(roadSegments[i].id)) continue;
                let currentRoad = roadSegments[i];
                let hasConnected = true;
                while (hasConnected) {
                    hasConnected = false;
                    for (let j = 0; j < roadSegments.length; j++) {
                        if (i === j || processedSegments.has(roadSegments[j].id)) continue;
                        const canConnect = (() => {
                            if (currentRoad.name && roadSegments[j].name &&
                                currentRoad.name !== 'Unnamed Road' && roadSegments[j].name !== 'Unnamed Road' &&
                                currentRoad.name !== roadSegments[j].name) {
                                return false;
                            }
                            const road1Start = currentRoad.geometry[0];
                            const road1End = currentRoad.geometry[currentRoad.geometry.length - 1];
                            const road2Start = roadSegments[j].geometry[0];
                            const road2End = roadSegments[j].geometry[roadSegments[j].geometry.length - 1];
                            const connectionThreshold = 50; // 50 metri
                            const connections = [
                                { from: road1End, to: road2Start },
                                { from: road1Start, to: road2End },
                                { from: road1End, to: road2End },
                                { from: road1Start, to: road2Start }
                            ];
                            for (const conn of connections) {
                                const distance = getDistance(
                                    conn.from.lat, conn.from.lon,
                                    conn.to.lat, conn.to.lon
                                );
                                if (distance <= connectionThreshold) {
                                    return true;
                                }
                            }
                            return false;
                        })();
                        if (canConnect) {
                            const road1Start = currentRoad.geometry[0];
                            const road1End = currentRoad.geometry[currentRoad.geometry.length - 1];
                            const road2Start = roadSegments[j].geometry[0];
                            const road2End = roadSegments[j].geometry[roadSegments[j].geometry.length - 1];
                            const connections = [
                                { type: 'end-start', from: road1End, to: road2Start, distance: getDistance(road1End.lat, road1End.lon, road2Start.lat, road2Start.lon) },
                                { type: 'start-end', from: road1Start, to: road2End, distance: getDistance(road1Start.lat, road1Start.lon, road2End.lat, road2End.lon) },
                                { type: 'end-end', from: road1End, to: road2End, distance: getDistance(road1End.lat, road1End.lon, road2End.lat, road2End.lon) },
                                { type: 'start-start', from: road1Start, to: road2Start, distance: getDistance(road1Start.lat, road1Start.lon, road2Start.lat, road2Start.lon) }
                            ];
                            connections.sort((a, b) => a.distance - b.distance);
                            const closestConnection = connections[0];
                            let newGeometry = [];
                            if (closestConnection.type === 'end-start') {
                                newGeometry = [...currentRoad.geometry, ...roadSegments[j].geometry];
                            } else if (closestConnection.type === 'start-end') {
                                newGeometry = [...roadSegments[j].geometry, ...currentRoad.geometry];
                            } else if (closestConnection.type === 'end-end') {
                                newGeometry = [...currentRoad.geometry, ...roadSegments[j].geometry.slice().reverse()];
                            } else if (closestConnection.type === 'start-start') {
                                newGeometry = [...currentRoad.geometry.slice().reverse(), ...roadSegments[j].geometry];
                            }
                            currentRoad = {
                                id: `${currentRoad.id}_${roadSegments[j].id}`,
                                name: currentRoad.name || roadSegments[j].name || 'Unnamed Road',
                                geometry: newGeometry,
                                tags: { ...currentRoad.tags, ...roadSegments[j].tags },
                                is_connected: true
                            };
                            processedSegments.add(roadSegments[j].id);
                            hasConnected = true;
                            break;
                        }
                    }
                }
                const roadLength = getRoadLength(currentRoad.geometry);
                const twistinessData = calculateTwistiness(currentRoad.geometry);
                connectedRoads.push({
                    id: currentRoad.id,
                    name: currentRoad.name,
                    geometry: currentRoad.geometry,
                    tags: currentRoad.tags,
                    twistiness: twistinessData.twistiness,
                    corner_count: twistinessData.corner_count,
                    length: roadLength,
                    is_connected: currentRoad.is_connected || false,
                    elevation_gain: currentRoad.elevation_gain,
                    elevation_loss: currentRoad.elevation_loss,
                    max_elevation: currentRoad.max_elevation,
                    min_elevation: currentRoad.min_elevation
                });
                processedSegments.add(roadSegments[i].id);
            }
            connectedRoads.sort((a, b) => b.length - a.length);
            const newRoads = [];
            connectedRoads.forEach(road => {
                if (lengthFilter === "connected" && !road.is_connected) return;
                const coordinates = road.geometry.map(point => [point.lat, point.lon]);
                const name = road.name;
                const lengthInKm = road.length / 1000;
                let weight = 6; 
                if (lengthInKm >= 15) {
                    weight = 8; 
                } else if (lengthInKm >= 5) {
                    weight = 7; 
                }
                let color = "green";
                if (road.twistiness > 0.007) color = "#FF0000"; // Bright red
                else if (road.twistiness > 0.0035) color = "#FF6600"; // Bright orange
                const polyline = L.polyline(coordinates, {
                    color,
                    weight,
                    originalWeight: weight, 
                    smoothFactor: 1, 
                    className: 'road-polyline', 
                    interactive: true, 
                    bubblingMouseEvents: false, 
                    renderer: L.svg({ padding: 0.5 }), 
                    lineCap: 'round', 
                    lineJoin: 'round' 
                }).addTo(roadsLayerRef.current);
                const distanceInKm = road.length / 1000;
                const distanceInMiles = distanceInKm * 0.621371;
                const displayDistance = userSettings.measurement_units === 'imperial'
                    ? `${distanceInMiles.toFixed(2)} miles`
                    : `${distanceInKm.toFixed(2)} km`;
                const elevationGain = road.elevation_gain !== undefined && road.elevation_gain !== null ?
                    userSettings.measurement_units === 'imperial' ?
                        `${Math.round(road.elevation_gain * 3.28084)} ft` :
                        `${Math.round(road.elevation_gain)} m` :
                    'N/A';
                const elevationLoss = road.elevation_loss !== undefined && road.elevation_loss !== null ?
                    userSettings.measurement_units === 'imperial' ?
                        `${Math.round(road.elevation_loss * 3.28084)} ft` :
                        `${Math.round(road.elevation_loss)} m` :
                    'N/A';
                const maxElevation = road.max_elevation !== undefined && road.max_elevation !== null ?
                    userSettings.measurement_units === 'imperial' ?
                        `${Math.round(road.max_elevation * 3.28084)} ft` :
                        `${Math.round(road.max_elevation)} m` :
                    'N/A';
                const roadTypeInfo = road.is_connected ?
                    '<span class="text-blue-500">(Connected Road)</span>' : '';
                let lengthCategory = '';
                if (distanceInKm >= 15) {
                    lengthCategory = '<span class="text-purple-500">(Long Road)</span>';
                } else if (distanceInKm >= 5) {
                    lengthCategory = '<span class="text-blue-500">(Medium Road)</span>';
                }
                const popupContent = `
                    <div class="road-popup">
                        <h3 class="font-bold">${name} ${roadTypeInfo} ${lengthCategory}</h3>
                        <p>Length: ${displayDistance}</p>
                        <p>Corners: ${road.corner_count}</p>
                        <p>Curve Score: ${road.twistiness.toFixed(4)}</p>
                        <p>Elevation Gain: ${elevationGain} ↑</p>
                        <p>Elevation Loss: ${elevationLoss} ↓</p>
                        <p>Max Elevation: ${maxElevation}</p>
                        ${auth.user ?
                            `<button id="save-road-${road.id}" class="bg-blue-500 text-white px-2 py-1 rounded mt-2">Save Road</button>` :
                            '<p class="text-sm text-gray-500 mt-2">Log in to save roads</p>'
                        }
                    </div>
                `;
                const popup = L.popup().setContent(popupContent);
                polyline.bindPopup(popup);
                if (auth.user) {
                    polyline.on("popupopen", () => {
                        document.getElementById(`save-road-${road.id}`)?.addEventListener('click', () =>
                            saveRoad({
                                name,
                                coordinates,
                                twistiness: road.twistiness,
                                corner_count: road.corner_count,
                                length: road.length,
                                elevation_gain: road.elevation_gain,
                                elevation_loss: road.elevation_loss,
                                max_elevation: road.max_elevation,
                                min_elevation: road.min_elevation
                            })
                        );
                    });
                }
                newRoads.push({
                    id: road.id,
                    name,
                    coordinates,
                    length: road.length,
                    twistiness: road.twistiness,
                    is_connected: road.is_connected
                });
            });
            setRoads(newRoads);
        } catch (error) {
            addNotification("Failed to fetch roads. Please try again.", { type: 'error' });
        } finally {
            setLoading(false);
        }
    };
    const saveRoad = async (road) => {
        if (!auth.token) {
            showToast("Please log in to save roads", 'warning', 3000);
            return;
        }
        try {
            const payload = {
                road_name: road.name || "Unnamed Road",
                coordinates: road.coordinates,
                twistiness: road.twistiness,
                corner_count: road.corner_count,
                length: road.length,
                elevation_gain: road.elevation_gain,
                elevation_loss: road.elevation_loss,
                max_elevation: road.max_elevation,
                min_elevation: road.min_elevation,
            };
            const response = await axios.post('/api/saved-roads', payload, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            setSavedRoads([...savedRoads, response.data]);
            showToast("Road saved successfully!", 'success', 3000);
        } catch (error) {
            if (error.response?.data?.errors) {
                showToast(
                    Object.values(error.response.data.errors)
                        .flat()
                        .join(', '),
                    'error',
                    5000
                );
            } else {
                showToast("Failed to save road.", 'error', 4000);
            }
        }
    };
    const addReview = async (roadId, rating) => {
        try {
            await axios.post(`/api/saved-roads/${roadId}/review`, { rating }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            showToast("Review added successfully!", 'success', 3000);
        } catch (error) {
            showToast("Failed to add review.", 'error', 4000);
        }
    };
    const addComment = async (roadId, comment) => {
        try {
            await axios.post(`/api/saved-roads/${roadId}/comment`, { comment }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            showToast("Comment added successfully!", 'success', 3000);
        } catch (error) {
            showToast("Failed to add comment.", 'error', 4000);
        }
    };
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            if (window.refreshCSRFToken) {
                const success = await window.refreshCSRFToken();
                if (!success) {
                }
            }
            let loginSuccess = false;
            let userData = null;
            let authToken = null;
            let errorMessage = null;
            try {
                const formData = new FormData();
                formData.append('login', loginForm.login);
                formData.append('password', loginForm.password);
                const apiUrl = `${window.location.origin}/api/login`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'same-origin'
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.user && data.token) {
                        loginSuccess = true;
                        userData = data.user;
                        authToken = data.token;
                    } else {
                        errorMessage = data.message || 'Login successful but user data is missing';
                    }
                } else {
                    const errorData = await response.json();
                    errorMessage = errorData.message || `Login failed with status ${response.status}`;
                    throw new Error(errorMessage);
                }
            } catch (formError) {
                try {
                    const apiUrl = `${window.location.origin}/api/login`;
                    const response = await axios.post(apiUrl, {
                        login: loginForm.login,
                        password: loginForm.password
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        withCredentials: true
                    });
                    if (response.data && response.data.user && response.data.token) {
                        loginSuccess = true;
                        userData = response.data.user;
                        authToken = response.data.token;
                    } else {
                        errorMessage = response.data.message || 'Login successful but user data is missing';
                    }
                } catch (axiosError) {
                    errorMessage = axiosError.response?.data?.message || axiosError.message || 'Login failed';
                    throw axiosError;
                }
            }
            if (loginSuccess && userData && authToken) {
                localStorage.setItem('token', authToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
                setAuth({ user: userData, token: authToken });
                setLoginForm({ login: '', password: '' });
                try {
                    const roadsResponse = await axios.get('/api/saved-roads', {
                        headers: { Authorization: `Bearer ${authToken}` }
                    });
                    setSavedRoads(roadsResponse.data);
                } catch (roadsError) {
                }
            } else {
                throw new Error(errorMessage || 'Login failed for unknown reason');
            }
        } catch (error) {
            if (error.response?.data?.verification_needed) {
                const loginValue = loginForm.login;
                const isEmail = loginValue.includes('@');
                const email = isEmail ? loginValue : error.response?.data?.email || loginValue;
                const message = `Please verify your email address before logging in. We've sent a verification link to ${email}.`;
                showToast(message, 'warning', 6000);
                if (window.confirm("Would you like us to resend the verification email?")) {
                    try {
                        const apiUrl = `${window.location.origin}/api/email/verification-notification`;
                        await axios.post(apiUrl, { email }, {
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });
                        showToast("Verification email has been resent. Please check your inbox. If you're having trouble, check your spam folder.", 'success', 6000);
                    } catch (resendError) {
                        showToast("Failed to resend verification email. Please try again later.", 'error', 4000);
                    }
                }
            } else {
                showToast(error.response?.data?.message || "Failed to log in.", 'error', 4000);
            }
        }
    };
    const handleLogout = async () => {
        try {
            const apiUrl = `${window.location.origin}/api/logout`;
            await axios.post(apiUrl, {}, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setAuth({ user: null, token: null });
            setSavedRoads([]);
            showToast("Logged out successfully!", 'success', 3000);
        } catch (error) {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setAuth({ user: null, token: null });
            setSavedRoads([]);
        }
    };
    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = `${window.location.origin}/api/register`;
            const response = await axios.post(apiUrl, registerForm, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                withCredentials: true
            });
            showToast("Registration successful! Please check your email to verify your account before logging in.", 'success', 6000);
            setAuthMode('login');
            setRegisterForm({ username: '', email: '', name: '', password: '', password_confirmation: '' });
        } catch (error) {
            if (error.response?.data?.errors) {
                showToast(Object.values(error.response.data.errors).flat().join(', '), 'error', 5000);
            } else {
                showToast(error.response?.data?.message || "Failed to register.", 'error', 4000);
            }
        }
    };
    const displayRoadOnMap = (road) => {
        if (!mapRef.current) return;
        roadsLayerRef.current.clearLayers();
        const coordinates = JSON.parse(road.road_coordinates);
        const polyline = L.polyline(coordinates, {
            color: 'blue',
            weight: 9, 
            originalWeight: 9, 
            smoothFactor: 1, 
            className: 'road-polyline', 
            interactive: true, 
            bubblingMouseEvents: false, 
            renderer: L.svg({ padding: 0.5 }), 
            lineCap: 'round', 
            lineJoin: 'round' 
        }).addTo(roadsLayerRef.current);
        mapRef.current.fitBounds(polyline.getBounds());
    };
    const handleRoadClick = async (roadId) => {
        try {
            const response = await axios.get(`/api/saved-roads/${roadId}`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setSelectedRoad(response.data);
            displayRoadOnMap(response.data);
        } catch (error) {
            showToast("Failed to fetch road details.", 'error', 4000);
        }
    };
    const RoadItem = ({ road, onNavigateClick }) => {
        const [showReviewModal, setShowReviewModal] = useState(false);
        const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
        const [showEditModal, setShowEditModal] = useState(false);
        const [showShareModal, setShowShareModal] = useState(false);
        const [isEditing, setIsEditing] = useState(false);
        const [isExpanded, setIsExpanded] = useState(false);
        const [isDeleting, setIsDeleting] = useState(false);
        const [showNavigationSelector, setShowNavigationSelector] = useState(false);
        const [editData, setEditData] = useState({
            road_name: road.road_name || '',
            description: road.description || ''
        });
        const [roadPhotos, setRoadPhotos] = useState(road.photos || []);
        
        // Helper function to determine if a saved road is actually a route
        const getRoadType = (road) => {
            // Use route_type field - this should always be set when saving
            if (road.route_type === 'route') {
                return 'route';
            }
            // Default to 'road' if route_type is 'road' or null/undefined (legacy entries)
            return 'scenic_road';
        };
        useEffect(() => {
            try {
                setEditData({
                    road_name: road.road_name || '',
                    description: road.description || ''
                });
                setRoadPhotos(road.photos || []);
            } catch (error) {
                setEditData({
                    road_name: road.road_name || '',
                    description: road.description || ''
                });
                setRoadPhotos([]);
            }
        }, [road]);
        const handleDelete = async (roadId) => {
            try {
                setIsDeleting(true);
                const response = await axios.delete(`/api/saved-roads/${roadId}`, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                if (response.status === 200) {
                    setSavedRoads(prevRoads => prevRoads.filter(r => r.id !== roadId));
                    setPublicRoads(prevRoads => prevRoads.filter(r => r.id !== roadId));
                    if (selectedRoadId === roadId) {
                        roadsLayerRef.current.clearLayers();
                        setSelectedRoadId(null);
                    }
                    showToast("Road deleted successfully!", 'success', 3000);
                }
            } catch (error) {
                let errorMessage = "Failed to delete road. Please try again.";
                if (error.response) {
                    if (error.response.status === 404) {
                        errorMessage = "Road not found or you don't have permission to delete it.";
                    } else if (error.response.data && error.response.data.message) {
                        errorMessage = error.response.data.message;
                    }
                }
                showToast(errorMessage, 'error', 4000);
            } finally {
                setIsDeleting(false);
            }
        };
        const handleEdit = async (e, road, editData) => {
            e.preventDefault();
            try {
                const response = await axios.put(
                    `/api/saved-roads/${road.id}`,
                    {
                        road_name: editData.road_name,
                        description: editData.description
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${auth.token}`
                        }
                    }
                );
                if (response.data && response.data.road) {
                    const updatedRoad = response.data.road;
                    setSavedRoads(prevRoads =>
                        prevRoads.map(r => r.id === road.id ? updatedRoad : r)
                    );
                    setPublicRoads(prevRoads =>
                        prevRoads.map(r => r.id === road.id ? updatedRoad : r)
                    );
                    setIsEditing(false);
                    showToast("Road updated successfully!", 'success', 3000);
                }
            } catch (error) {
                const errorMessage = error.response?.data?.error || "Failed to update road.";
                showToast(errorMessage, 'error', 4000);
            }
        };
        const formatLength = (meters) => {
            if (userSettings.measurement_units === 'imperial') {
                return ((meters / 1000) * 0.621371).toFixed(2) + ' miles';
            }
            return (meters / 1000).toFixed(2) + ' km';
        };
        const formatElevation = (meters) => {
            if (meters === undefined || meters === null) return 'N/A';
            if (userSettings.measurement_units === 'imperial') {
                return Math.round(meters * 3.28084) + ' ft';
            }
            return Math.round(meters) + ' m';
        };
        const handleViewOnMap = () => {
            onNavigateClick(road.id);
            if (mapRef.current && road.road_coordinates) {
                const coordinates = JSON.parse(road.road_coordinates);
                roadsLayerRef.current.clearLayers();
                const polyline = L.polyline(coordinates, {
                    color: selectedRoadId === road.id ? '#2563eb' : '#4ade80', 
                    weight: 8, 
                    originalWeight: 8, 
                    opacity: 0.8,
                    smoothFactor: 1, 
                    className: 'road-polyline', 
                    interactive: true, 
                    bubblingMouseEvents: false, 
                    renderer: L.svg({ padding: 0.5 }), 
                    lineCap: 'round', 
                    lineJoin: 'round'
                }).addTo(roadsLayerRef.current);
                mapRef.current.fitBounds(polyline.getBounds(), {
                    padding: [50, 50] 
                });
            }
        };
        const handleNavigateClick = () => {
            setSelectedRoad({
                ...road,
                road_coordinates: road.road_coordinates
            });
            setShowNavigationSelector(true);
        };
        const handlePhotoUploaded = (data) => {
            if (data.photo && data.road) {
                setRoadPhotos([...roadPhotos, data.photo]);
                setSavedRoads(prevRoads =>
                    prevRoads.map(r => {
                        if (r.id === road.id) {
                            const updatedRoad = { ...r };
                            if (!updatedRoad.photos) {
                                updatedRoad.photos = [];
                            }
                            updatedRoad.photos = [...updatedRoad.photos, data.photo];
                            return updatedRoad;
                        }
                        return r;
                    })
                );
            }
        };
        const handlePhotoDeleted = (photoId, photoType) => {
            setRoadPhotos(roadPhotos.filter(photo => photo.id !== photoId));
            setSavedRoads(prevRoads =>
                prevRoads.map(r => {
                    if (r.id === road.id && r.photos) {
                        const updatedRoad = { ...r };
                        updatedRoad.photos = updatedRoad.photos.filter(photo => photo.id !== photoId);
                        return updatedRoad;
                    }
                    return r;
                })
            );
        };
        const publicToggleButton = (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleRoadPublic(road.id);
                }}
                className={`px-3 py-1 text-sm ${
                    road.is_public
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-500 hover:bg-gray-600'
                } text-white rounded transition-colors`}
            >
                {road.is_public ? 'Make Private' : 'Make Public'}
            </button>
        );
        const handleDeleteClick = async (e) => {
            e.stopPropagation();
            if (isDeleting) return; 
            if (window.confirm(`Are you sure you want to delete "${road.road_name || 'Unnamed Road'}"? This action cannot be undone.`)) {
                await handleDelete(road.id);
            }
        };
        return (
            <li
                className={`mb-2 border rounded-lg transition-colors duration-200 ${
                    selectedRoadId === road.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
                }`}
            >
                <div
                    className="p-3 flex justify-between items-center cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                            {isExpanded ? '▼' : '▶'}
                        </span>
                        <h2 className="font-medium">{road.road_name || 'Unnamed Road'}</h2>
                        {getRoadType(road) === 'route' ? (
                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-semibold" title="Saved Route">
                                ROUTE
                            </span>
                        ) : (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-semibold" title="Saved Road">
                                ROAD
                            </span>
                        )}
                        </div>
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewOnMap();
                            }}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            View on Map
                        </button>
                    </div>
                </div>
                {isExpanded && (
                    <div
                        className="px-3 pb-3 border-t"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <p>Length: {formatLength(road.length)}</p>
                            <p>Curve Rating: {getTwistinessLabel(road.twistiness)} ({(road.twistiness * 1000).toFixed(2)})</p>
                            <p>Corners: {road.corner_count}</p>
                            {road.elevation_gain && road.elevation_loss && (
                                <p>Elevation Change: {formatElevation(road.elevation_gain)} ↑ {formatElevation(road.elevation_loss)} ↓</p>
                            )}
                            {road.max_elevation && road.min_elevation && (
                                <p>Elevation Range: {formatElevation(road.min_elevation)} - {formatElevation(road.max_elevation)}</p>
                            )}
                        </div>
                        {!isEditing ? (
                            <div className="mt-3 space-y-3">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700">Description</h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {road.description || 'No description provided'}
                                    </p>
                                </div>
                                {/* Road Photos */}
                                <div className="mt-3">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Photos</h3>
                                    <PhotoGallery
                                        photos={roadPhotos}
                                        onPhotoDeleted={handlePhotoDeleted}
                                        canDelete={true}
                                        className="mb-3"
                                    />
                                    <PhotoUploader
                                        endpoint={`/api/saved-roads/${road.id}/photos`}
                                        onPhotoUploaded={handlePhotoUploaded}
                                        existingPhotos={roadPhotos}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {publicToggleButton}
                                    <button
                                        onClick={() => handleRateRoad(road.id)}
                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        View Details
                                    </button>
                                    <RouteExport
                                        route={{
                                            coordinates: road.road_coordinates ? JSON.parse(road.road_coordinates) : []
                                        }}
                                        routeName={road.road_name || 'Unnamed Road'}
                                        routeDescription={road.description || ''}
                                        auth={auth}
                                        compact={true}
                                    />
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleDeleteClick}
                                        disabled={isDeleting}
                                        className={`px-2 py-1 text-xs ${isDeleting ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'} text-white rounded`}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => handleEdit(e, road, editData)} className="mt-3">
                                    <input
                                        type="text"
                                        value={editData.road_name}
                                        onChange={(e) => setEditData({ ...editData, road_name: e.target.value })}
                                    className="w-full p-2 border rounded mb-2"
                                    placeholder="Road name"
                                    />
                                    <textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    className="w-full p-2 border rounded mb-2"
                                    placeholder="Description"
                                    rows="3"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
                {/* Navigation modal  */}
            </li>
        );
    };
    const handleViewOnMap = (road) => {
        if (!mapRef.current || !road.road_coordinates) return;
        try {
            const coordinates = JSON.parse(road.road_coordinates);
            roadsLayerRef.current.clearLayers();
            const polyline = L.polyline(coordinates, {
                color: '#2563eb', // Blue 
                weight: 8, 
                originalWeight: 8, 
                opacity: 0.8,
                smoothFactor: 1, 
                className: 'road-polyline', 
                interactive: true,
                bubblingMouseEvents: false, 
                renderer: L.svg({ padding: 0.5 }), 
                lineCap: 'round', 
                lineJoin: 'round' 
            }).addTo(roadsLayerRef.current);
            mapRef.current.fitBounds(polyline.getBounds(), {
                padding: [50, 50] 
            });
            setSelectedRoadId(road.id);
        } catch (error) {
            showToast("Failed to display road on map. Invalid coordinates format.", 'error', 4000);
        }
    };
    const toggleDrawingMode = () => {
        if (isRoutePlanningMode) {
            setIsRoutePlanningMode(false);
        }
                const mapContainer = document.getElementById('map');
        if (isDrawingMode) {
            if (mapContainer) mapContainer.classList.remove('drawing-mode');
                    document.body.classList.remove('drawing-mode');
                setIsDrawingMode(false);
            } else {
            if (mapContainer) mapContainer.classList.add('drawing-mode');
            document.body.classList.add('drawing-mode');
            setIsDrawingMode(true);
        }
    };
    const toggleRoutePlanningMode = () => {
        if (isDrawingMode) {
            setIsDrawingMode(false);
            const mapContainer = document.getElementById('map');
            if (mapContainer) mapContainer.classList.remove('drawing-mode');
            document.body.classList.remove('drawing-mode');
        }
        if (markerDropMode) {
            setMarkerDropMode(false);
            removeMarker();
        }
        const newMode = !isRoutePlanningMode;
        setIsRoutePlanningMode(newMode);
        if (newMode) {
            setSidebarMode('planRoute');
        } else {
            setSidebarMode('default');
            setCurrentRoute(null);
        }
    };
    const handleRouteCalculated = (route) => {
        setCurrentRoute(route);
        // Extract waypoints from route if available
        if (route && route.waypoints) {
            setRouteWaypoints(route.waypoints);
        }
    };
    
    const handleAddWaypoint = (newWaypoint) => {
        setRouteWaypoints(prev => [...prev, newWaypoint]);
        const source = newWaypoint?.source || 'external';
        logTelemetryEvent('map_waypoint_added', {
            source,
            lat: newWaypoint.lat,
            lng: newWaypoint.lng,
            name: newWaypoint.name || null,
            type: newWaypoint.type || null,
        });
        // Trigger route recalculation in RoutePlanner if needed
        window.dispatchEvent(new CustomEvent('recalculateRoute', { detail: { waypoint: newWaypoint, source } }));
    };
    
    const handleRecalculateRoute = () => {
        // Trigger route recalculation - this will be handled by RoutePlanner
        window.dispatchEvent(new CustomEvent('recalculateRoute'));
    };
    const handleRoadDrawn = (roadData) => {
        if (!roadData) {
            setDrawnRoadData(null);
            return;
        }
        setDrawnRoadData(roadData);
        setShowSaveRoadModal(true);
    };
    const handleSaveCustomRoad = (savedRoad) => {
        setSavedRoads(prevRoads => [savedRoad, ...prevRoads]);
        setShowSaveRoadModal(false);
        
        const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
        if (sidebar) {

            sidebar.style.visibility = 'visible';
            sidebar.style.opacity = '1';
            sidebar.style.zIndex = '2000';
            sidebar.style.display = 'flex';
            sidebar.style.pointerEvents = 'auto';
            sidebar.style.width = sidebarCollapsed ? '4rem' : '20rem'; 
            sidebar.style.display = 'none';
            void sidebar.offsetHeight; 
            sidebar.style.display = 'flex';
        }

        const altSidebar = document.querySelector(sidebarCollapsed ? '.w-16' : '.w-80');
        if (altSidebar) {

            altSidebar.style.visibility = 'visible';
            altSidebar.style.opacity = '1';
            altSidebar.style.zIndex = '2000';
            altSidebar.style.display = 'flex';
            altSidebar.style.pointerEvents = 'auto';
        }

        const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
        if (sidebarToggleButton) {

            sidebarToggleButton.style.visibility = 'visible';
            sidebarToggleButton.style.opacity = '1';
            sidebarToggleButton.style.zIndex = '3000';
            sidebarToggleButton.style.display = 'block';
            sidebarToggleButton.style.pointerEvents = 'auto';
            sidebarToggleButton.style.display = 'none';
            void sidebarToggleButton.offsetHeight; 
            sidebarToggleButton.style.display = 'block';
        }
        const mapContainer = document.getElementById('map');
        if (mapContainer) {

            mapContainer.classList.remove('drawing-mode');
        }
        document.body.classList.remove('drawing-mode');
        document.body.classList.add('sidebar-visible');
        setIsDrawingMode(false);
        setDrawnRoadData(null);

        const editMarkers = document.querySelectorAll('.leaflet-editing-icon, .leaflet-marker-icon:not(.main-location-marker), .leaflet-marker-shadow, .leaflet-draw-guide-dash');
        editMarkers.forEach(marker => {
            marker.remove();
        });

        const drawControls = document.querySelectorAll('.leaflet-draw, .leaflet-draw-toolbar, .leaflet-draw-section, .leaflet-draw-actions');
        drawControls.forEach(control => {
            control.remove();
        });

        setTimeout(() => {

            const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
            if (sidebar) {
                sidebar.style.visibility = 'visible';
                sidebar.style.opacity = '1';
                sidebar.style.zIndex = '2000';
                sidebar.style.display = 'flex';
                sidebar.style.pointerEvents = 'auto';
            }
            const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
            if (sidebarToggleButton) {
                sidebarToggleButton.style.visibility = 'visible';
                sidebarToggleButton.style.opacity = '1';
                sidebarToggleButton.style.zIndex = '3000';
                sidebarToggleButton.style.display = 'block';
                sidebarToggleButton.style.pointerEvents = 'auto';
            }
            const communityButton = document.querySelector('.absolute.top-4.right-4, button[class*="absolute top-4"][class*="right-4"]');
            if (communityButton) {
                communityButton.style.visibility = 'visible';
                communityButton.style.opacity = '1';
                communityButton.style.zIndex = '3000';
                communityButton.style.display = 'block';
                communityButton.style.pointerEvents = 'auto';
            }
            const socialButton = document.querySelector('.absolute.top-16.right-4, button[class*="absolute top-16"][class*="right-4"]');
            if (socialButton) {
                socialButton.style.visibility = 'visible';
                socialButton.style.opacity = '1';
                socialButton.style.zIndex = '3000';
                socialButton.style.display = 'block';
                socialButton.style.pointerEvents = 'auto';
            }
        }, 200);
        showToast('Road saved successfully!', 'success', 3000);
    };

    useEffect(() => {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || mapRef.current) return;
        const leafletMap = L.map(mapContainer, {
            center: [57.1, 27.1],
            zoom: 10,
            zoomControl: false,
            attributionControl: true,
            fadeAnimation: false,
            zoomAnimation: true,
            markerZoomAnimation: true,
            editable: true,
            preferCanvas: true,
            renderer: L.canvas({
                padding: 0.5,
                tolerance: 10
            }),
            worldCopyJump: true,
            maxBoundsViscosity: 1.0,
            inertia: true,
            updateWhenIdle: false,
            updateWhenZooming: true,
            updateInterval: 100,
            keepBuffer: 4
        });
        L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);
        
        // Create offline-aware tile layer
        const createOfflineTileLayer = (url, options) => {
            const OfflineTileLayer = L.TileLayer.extend({
                createTile: function(coords, done) {
                    const tile = document.createElement('img');
                    const z = coords.z;
                    const x = coords.x;
                    const y = coords.y;
                    const layer = options.layer || 'standard';
                    
                    L.DomEvent.on(tile, 'load', () => {
                        done(null, tile);
                    });
                    
                    L.DomEvent.on(tile, 'error', async () => {
                        // Try to get from cache on error
                        try {
                            const cachedBlob = await getTile(layer, z, x, y);
                            if (cachedBlob) {
                                const blobUrl = createTileUrl(cachedBlob);
                                tile.src = blobUrl;
                            } else {
                                done(new Error('Tile failed to load'), tile);
                            }
                        } catch (error) {
                            done(new Error('Tile failed to load'), tile);
                        }
                    });

                    // Try to get tile URL (cache first, then online)
                    (async () => {
                        try {
                            const cachedBlob = await getTile(layer, z, x, y);
                            if (cachedBlob) {
                                const blobUrl = createTileUrl(cachedBlob);
                                tile.src = blobUrl;
                            } else {
                                // Fallback to online - handle different URL patterns
                                let tileUrl = url;
                                if (url.includes('{z}/{y}/{x}')) {
                                    // ArcGIS format (satellite) - order is z/y/x
                                    tileUrl = url.replace('{z}', z).replace('{y}', y).replace('{x}', x);
                                } else if (url.includes('{s}')) {
                                    // Standard OSM format with subdomain
                                    tileUrl = url.replace('{s}', 'a').replace('{z}', z).replace('{x}', x).replace('{y}', y);
                                } else {
                                    // Standard format
                                    tileUrl = url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
                                }
                                tile.src = tileUrl;
                            }
                        } catch (error) {
                            // Fallback to online on error
                            let tileUrl = url;
                            if (url.includes('{z}/{y}/{x}')) {
                                // ArcGIS format (satellite)
                                tileUrl = url.replace('{z}', z).replace('{y}', y).replace('{x}', x);
                            } else if (url.includes('{s}')) {
                                // Standard OSM format with subdomain
                                tileUrl = url.replace('{s}', 'a').replace('{z}', z).replace('{x}', x).replace('{y}', y);
                            } else {
                                // Standard format
                                tileUrl = url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
                            }
                            tile.src = tileUrl;
                        }
                    })();

                    return tile;
                }
            });
            
            return new OfflineTileLayer(url, options);
        };
        
        const tileLayers = {
            standard: createOfflineTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                maxNativeZoom: 18,
                keepBuffer: 2, 
                attribution: '&copy; OpenStreetMap contributors',
                crossOrigin: true,
                layer: 'standard'
            }),
            terrain: createOfflineTileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenTopoMap contributors',
                maxZoom: 17,
                updateWhenIdle: false,
                updateWhenZooming: true,
                updateInterval: 100,
                keepBuffer: 4,
                className: 'map-tiles',
                zIndex: 1,
                opacity: 1,
                detectRetina: true,
                crossOrigin: true,
                layer: 'terrain'
            }),
            satellite: createOfflineTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
                maxZoom: 19,
                updateWhenIdle: false,
                updateWhenZooming: true,
                updateInterval: 100,
                keepBuffer: 4,
                className: 'map-tiles',
                zIndex: 1,
                opacity: 1,
                detectRetina: true,
                crossOrigin: true,
                layer: 'satellite'
            })
        };
        const defaultMapView = 'standard';
        tileLayers[defaultMapView].addTo(leafletMap);
        tileLayers[defaultMapView].setZIndex(100);
        window.mapTileLayers = tileLayers;
        const baseMaps = {
            "Standard": tileLayers.standard,
            "Terrain": tileLayers.terrain,
            "Satellite": tileLayers.satellite
        };
        const layerToSetting = {
            [tileLayers.standard._leaflet_id]: 'standard',
            [tileLayers.terrain._leaflet_id]: 'terrain',
            [tileLayers.satellite._leaflet_id]: 'satellite'
        };
        L.control.layers(baseMaps, {}, { position: 'bottomleft' }).addTo(leafletMap);
        leafletMap.on('baselayerchange', function(e) {
            const selectedMapView = layerToSetting[e.layer._leaflet_id];
            if (selectedMapView) {
                setLocalSettings(prev => ({
                    ...prev,
                    default_map_view: selectedMapView
                }));
            }
        });
        setTimeout(() => {
            leafletMap.invalidateSize();
        }, 500);
        mapRef.current = leafletMap;
        const newLayerGroup = L.layerGroup().addTo(leafletMap);
        roadsLayerRef.current = newLayerGroup;
        leafletMap.on('moveend', () => {
            const center = leafletMap.getCenter();
            setMapCenter({ lat: center.lat, lng: center.lng });
        });
        leafletMap.on('zoomend', () => {
            const currentZoom = leafletMap.getZoom();
            if (roadsLayerRef.current) {
                let layerCount = 0;
                let polylineCount = 0;
                roadsLayerRef.current.eachLayer(layer => {
                    layerCount++;
                    if (layer instanceof L.Polyline) {
                        polylineCount++;
                        const originalWeight = layer.options.originalWeight || layer.options.weight;
                        const bounds = leafletMap.getBounds();
                        const east = bounds.getEast();
                        const west = bounds.getWest();
                        const north = bounds.getNorth();
                        const mapWidthInMeters = leafletMap.distance(
                            [north, west],
                            [north, east]
                        );
                        const scaleFactor = Math.min(Math.max(mapWidthInMeters / 5000, 0.1), 2);
                        const adjustedWeight = originalWeight * scaleFactor;
                        layer.setStyle({ weight: adjustedWeight });
                    }
                });
            }
            if (radiusCircleRef.current) {
                radiusCircleRef.current.redraw();
            }
        });
        return () => {
            if (leafletMap) {
                leafletMap.remove();
            }
        };
    }, []);
    const ensureMapButtonsVisible = () => {
        if (sidebarCollapsed) {
            document.body.classList.add('sidebar-collapsed');
        } else {
            document.body.classList.remove('sidebar-collapsed');
        }
        const communityButton = document.querySelector('.absolute.top-4.right-4, button[class*="absolute top-4"][class*="right-4"]');
        if (communityButton) {
            communityButton.style.visibility = 'visible';
            communityButton.style.opacity = '1';
            communityButton.style.zIndex = '9999';
            communityButton.style.display = 'block';
            communityButton.style.pointerEvents = 'auto';
            communityButton.style.display = 'none';
            void communityButton.offsetHeight; 
            communityButton.style.display = 'block';
        }
        const socialButton = document.querySelector('.absolute.top-16.right-4, button[class*="absolute top-16"][class*="right-4"]');
        if (socialButton) {
            socialButton.style.visibility = 'visible';
            socialButton.style.opacity = '1';
            socialButton.style.zIndex = '9999';
            socialButton.style.display = 'block';
            socialButton.style.pointerEvents = 'auto';
            socialButton.style.display = 'none';
            void socialButton.offsetHeight; 
            socialButton.style.display = 'block';
        }
        if (isDrawingMode) {
            const drawingModeCommunityButton = document.querySelector('button[class*="absolute top-32"][class*="right-12"]');
            if (drawingModeCommunityButton) {
                drawingModeCommunityButton.style.visibility = 'visible';
                drawingModeCommunityButton.style.opacity = '1';
                drawingModeCommunityButton.style.zIndex = '9999';
                drawingModeCommunityButton.style.display = 'block';
                drawingModeCommunityButton.style.pointerEvents = 'auto';
                drawingModeCommunityButton.style.right = '1rem';
                drawingModeCommunityButton.style.top = '4rem';
                drawingModeCommunityButton.style.display = 'none';
                void drawingModeCommunityButton.offsetHeight; 
                drawingModeCommunityButton.style.display = 'block';
            }
            const drawingModeSocialButton = document.querySelector('button[class*="absolute top-44"][class*="right-12"]');
            if (drawingModeSocialButton) {
                drawingModeSocialButton.style.visibility = 'visible';
                drawingModeSocialButton.style.opacity = '1';
                drawingModeSocialButton.style.zIndex = '9999';
                drawingModeSocialButton.style.display = 'block';
                drawingModeSocialButton.style.pointerEvents = 'auto';
                drawingModeSocialButton.style.right = '1rem';
                drawingModeSocialButton.style.top = '8rem';
                drawingModeSocialButton.style.display = 'none';
                void drawingModeSocialButton.offsetHeight; 
                drawingModeSocialButton.style.display = 'block';
            }
            if (communityButton) {
                communityButton.style.right = '1rem';
                communityButton.style.top = '4rem';
            }
            if (socialButton) {
                socialButton.style.right = '1rem';
                socialButton.style.top = '8rem';
            }
        }
        if (isDrawingMode && (!document.querySelector('button[class*="absolute top-32"][class*="right-12"]') ||
                             !document.querySelector('button[class*="absolute top-44"][class*="right-12"]'))) {
            if (communityButton) {
                communityButton.style.visibility = 'visible';
                communityButton.style.opacity = '1';
                communityButton.style.zIndex = '9999';
                communityButton.style.display = 'block';
                communityButton.style.right = '1rem';
                communityButton.style.top = '4rem';
                communityButton.style.position = 'absolute';
                communityButton.style.display = 'none';
                void communityButton.offsetHeight; 
                communityButton.style.display = 'block';
            }
            if (socialButton) {
                socialButton.style.visibility = 'visible';
                socialButton.style.opacity = '1';
                socialButton.style.zIndex = '9999';
                socialButton.style.display = 'block';
                socialButton.style.right = '1rem';
                socialButton.style.top = '8rem';
                socialButton.style.position = 'absolute';
                socialButton.style.display = 'none';
                void socialButton.offsetHeight; 
                socialButton.style.display = 'block';
            }
        }
    };
    useEffect(() => {
        ensureMapButtonsVisible();
        const intervalId = setInterval(ensureMapButtonsVisible, 1000);
        const timeouts = [
            setTimeout(ensureMapButtonsVisible, 100),
            setTimeout(ensureMapButtonsVisible, 300),
            setTimeout(ensureMapButtonsVisible, 500),
            setTimeout(ensureMapButtonsVisible, 1000),
        ];
        return () => {
            clearInterval(intervalId);
            timeouts.forEach(clearTimeout);
        };
    }, [isDrawingMode, sidebarCollapsed]); 
    useEffect(() => {
        if (!mapRef.current) return;
        
        // Store the handler function so we can remove it properly
        const mapClickHandler = (e) => {
            if (e.originalEvent.target.closest('.poi-controls') ||
                e.originalEvent.target.closest('.leaflet-control') ||
                e.originalEvent.target.closest('button') ||
                e.originalEvent.target.closest('.poi-details') ||
                e.originalEvent.target.closest('.route-planner-panel')) { 
                return;
            }
            // Don't handle clicks when route planning mode is active - let RoutePlanner handle them
            if (isRoutePlanningMode) {
                return;
            }
            if (isDrawingMode) {
                return;
            }
            if (!markerDropMode) {
                return;
            }
            const map = mapRef.current;
            if (!map) {
                return;
            }
            const latlng = e.latlng;
            const currentRadius = radiusRef.current;
            try {
                if (!markerIconRef.current) {
                    markerIconRef.current = L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41],
                        className: 'main-location-marker' 
                    });
                }
                if (markerRef.current) {
                    markerRef.current.setLatLng(latlng);
                } else {
                    markerRef.current = L.marker(latlng, {
                        icon: markerIconRef.current,
                        zIndexOffset: 1000 
                    }).addTo(map);
                }
                if (radiusCircleRef.current) {
                    radiusCircleRef.current.setLatLng(latlng).setRadius(currentRadius * 1000);
                    radiusCircleRef.current.redraw();
                } else {
                    radiusCircleRef.current = L.circle(latlng, {
                        radius: currentRadius * 1000, 
                        color: 'blue',
                        fillColor: 'blue',
                        fillOpacity: 0.05,
                        zIndex: 100,
                        interactive: false, 
                        pane: 'overlayPane' 
                    }).addTo(map);
                }
                setCurrentPoiLocation({
                    lat: latlng.lat,
                    lon: latlng.lng
                });
                if (!markerRef.current) {
                    setPoiControlsKey(Date.now());
                }
                if (selectedPoi) {
                    setSelectedPoi(null);
                    setSelectedPoiId(null);
                }
                setMarkerDropMode(false);
            } catch (error) {
            }
        };
        
        // Remove only our specific handler, not all handlers
        if (mapRef.current._mapClickHandler) {
            mapRef.current.off('click', mapRef.current._mapClickHandler);
        }
        
        mapRef.current.on('click', mapClickHandler);
        mapRef.current._mapClickHandler = mapClickHandler;
        
        return () => {
            if (mapRef.current && mapRef.current._mapClickHandler) {
                mapRef.current.off('click', mapRef.current._mapClickHandler);
                delete mapRef.current._mapClickHandler;
            }
        };
        }, [markerDropMode, selectedPoi, isDrawingMode, isRoutePlanningMode]);
    useEffect(() => {
        if (!mapRef.current) return;
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            ensureMapButtonsVisible();

            if (isDrawingMode) {
                mapContainer.classList.add('drawing-mode');
                document.body.classList.add('drawing-mode');

                if (showCommunity) {
                    setTimeout(forceCommunitySidebarVisibility, 100);
                }
                
                const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
                if (sidebar) {
                    sidebar.style.visibility = 'visible';
                    sidebar.style.opacity = '1';
                    sidebar.style.zIndex = '2000';
                    sidebar.style.display = 'flex';
                    sidebar.style.pointerEvents = 'auto';
                    sidebar.style.width = sidebarCollapsed ? '4rem' : '20rem'; 
                    sidebar.style.display = 'none';
                    void sidebar.offsetHeight; 
                    sidebar.style.display = 'flex';
                }
                const altSidebar = document.querySelector(sidebarCollapsed ? '.w-16' : '.w-80');
                if (altSidebar) {
                    altSidebar.style.visibility = 'visible';
                    altSidebar.style.opacity = '1';
                    altSidebar.style.zIndex = '2000';
                    altSidebar.style.display = 'flex';
                    altSidebar.style.pointerEvents = 'auto';
                }
                const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
                if (sidebarToggleButton) {
                    sidebarToggleButton.style.visibility = 'visible';
                    sidebarToggleButton.style.opacity = '1';
                    sidebarToggleButton.style.zIndex = '3000';
                    sidebarToggleButton.style.display = 'block';
                    sidebarToggleButton.style.pointerEvents = 'auto';
                    sidebarToggleButton.style.display = 'none';
                    void sidebarToggleButton.offsetHeight;
                    sidebarToggleButton.style.display = 'block';
                }
                
                const editMarkers = document.querySelectorAll('.leaflet-editing-icon, .leaflet-marker-icon:not(.main-location-marker), .leaflet-marker-shadow, .leaflet-draw-guide-dash');
                editMarkers.forEach(marker => {
                    marker.remove();
                });

                const drawControls = document.querySelectorAll('.leaflet-draw, .leaflet-draw-toolbar, .leaflet-draw-section, .leaflet-draw-actions');
                drawControls.forEach(control => {
                    control.remove();
                });

                const guideLines = document.querySelectorAll('.leaflet-draw-guide-dash, .leaflet-draw-tooltip');
                guideLines.forEach(line => {
                    line.remove();
                });

                setTimeout(() => {
                    if (mapRef.current) {
                        if (mapRef.current._handlers) {
                            for (const key in mapRef.current._handlers) {
                                const handler = mapRef.current._handlers[key];
                                if (handler && handler.disable && (
                                    handler instanceof L.Draw.Polyline ||
                                    handler instanceof L.Edit.Poly ||
                                    (handler.constructor && handler.constructor.name &&
                                     (handler.constructor.name.includes('Draw') ||
                                      handler.constructor.name.includes('Edit')))
                                )) {
                                    handler.disable();
                                }
                            }
                        }
                        fixMapTiles(mapRef.current);
                        if (window.mapTileLayers) {
                            Object.values(window.mapTileLayers).forEach(layer => {
                                if (mapRef.current.hasLayer(layer)) {
                                    layer.redraw();
                                }
                            });
                        }
                        mapRef.current.invalidateSize();
                        setTimeout(() => {
                            const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
                            if (sidebar) {
                                sidebar.style.visibility = 'visible';
                                sidebar.style.opacity = '1';
                                sidebar.style.zIndex = '2000';
                                sidebar.style.display = 'flex';
                                sidebar.style.pointerEvents = 'auto';
                                sidebar.style.width = sidebarCollapsed ? '4rem' : '20rem';
                            }
                            const altSidebar = document.querySelector(sidebarCollapsed ? '.w-16' : '.w-80');
                            if (altSidebar) {
                                altSidebar.style.visibility = 'visible';
                                altSidebar.style.opacity = '1';
                                altSidebar.style.zIndex = '2000';
                                altSidebar.style.display = 'flex';
                                altSidebar.style.pointerEvents = 'auto';
                            }
                            const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
                            if (sidebarToggleButton) {
                                sidebarToggleButton.style.visibility = 'visible';
                                sidebarToggleButton.style.opacity = '1';
                                sidebarToggleButton.style.zIndex = '3000';
                                sidebarToggleButton.style.display = 'block';
                                sidebarToggleButton.style.pointerEvents = 'auto';
                            }

                            if (showCommunity) {
                                const communitySidebar = document.querySelector('.w-96.p-4.bg-white.shadow-md.overflow-y-auto');
                                if (!communitySidebar || communitySidebar.style.display === 'none') {
                                    setShowCommunity(false);
                                    setTimeout(() => {
                                        setShowCommunity(true);
                                    }, 50);
                                }
                            }
                        }, 200);
                    }
                }, 100);
            } else {
                applyDrawingModeExitFix(mapRef.current);

                mapContainer.classList.remove('drawing-mode');
                document.body.classList.remove('drawing-mode');
                document.body.classList.add('sidebar-visible');

                if (showCommunity) {
                    setTimeout(forceCommunitySidebarVisibility, 100);
                }

                const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
                if (sidebar) {
                    sidebar.style.visibility = 'visible';
                    sidebar.style.opacity = '1';
                    sidebar.style.zIndex = '2000';
                    sidebar.style.display = 'flex';
                    sidebar.style.pointerEvents = 'auto';
                    sidebar.style.width = sidebarCollapsed ? '4rem' : '20rem'; 
                    sidebar.style.display = 'none';
                    void sidebar.offsetHeight; 
                    sidebar.style.display = 'flex';
                }
                const altSidebar = document.querySelector(sidebarCollapsed ? '.w-16' : '.w-80');
                if (altSidebar) {
                    altSidebar.style.visibility = 'visible';
                    altSidebar.style.opacity = '1';
                    altSidebar.style.zIndex = '2000';
                    altSidebar.style.display = 'flex';
                    altSidebar.style.pointerEvents = 'auto';
                }
                const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
                if (sidebarToggleButton) {
                    sidebarToggleButton.style.visibility = 'visible';
                    sidebarToggleButton.style.opacity = '1';
                    sidebarToggleButton.style.zIndex = '3000';
                    sidebarToggleButton.style.display = 'block';
                    sidebarToggleButton.style.pointerEvents = 'auto';
                    sidebarToggleButton.style.display = 'none';
                    void sidebarToggleButton.offsetHeight; 
                    sidebarToggleButton.style.display = 'block';
                }
                const editMarkers = document.querySelectorAll('.leaflet-editing-icon, .leaflet-marker-icon:not(.main-location-marker), .leaflet-marker-shadow, .leaflet-draw-guide-dash');
                editMarkers.forEach(marker => {
                    marker.remove();
                });

                const drawControls = document.querySelectorAll('.leaflet-draw, .leaflet-draw-toolbar, .leaflet-draw-section, .leaflet-draw-actions');
                drawControls.forEach(control => {
                    control.remove();
                });

                const guideLines = document.querySelectorAll('.leaflet-draw-guide-dash, .leaflet-draw-tooltip');
                guideLines.forEach(line => {
                    line.remove();
                });

                setTimeout(() => {
                    if (mapRef.current) {
                        if (mapRef.current._handlers) {
                            for (const key in mapRef.current._handlers) {
                                const handler = mapRef.current._handlers[key];
                                if (handler && handler.disable && (
                                    handler instanceof L.Draw.Polyline ||
                                    handler instanceof L.Edit.Poly ||
                                    (handler.constructor && handler.constructor.name &&
                                     (handler.constructor.name.includes('Draw') ||
                                      handler.constructor.name.includes('Edit')))
                                )) {
                                    handler.disable();
                                }
                            }
                        }

                        fixMapTiles(mapRef.current);

                        if (window.mapTileLayers) {
                            Object.values(window.mapTileLayers).forEach(layer => {
                                if (mapRef.current.hasLayer(layer)) {
                                    layer.redraw();
                                }
                            });
                        }
                        mapRef.current.invalidateSize();
                        setTimeout(() => {
                            const sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
                            if (sidebar) {
                                sidebar.style.visibility = 'visible';
                                sidebar.style.opacity = '1';
                                sidebar.style.zIndex = '2000';
                                sidebar.style.display = 'flex';
                                sidebar.style.pointerEvents = 'auto';
                                sidebar.style.width = sidebarCollapsed ? '4rem' : '20rem';
                            }
                            const altSidebar = document.querySelector(sidebarCollapsed ? '.w-16' : '.w-80');
                            if (altSidebar) {
                                altSidebar.style.visibility = 'visible';
                                altSidebar.style.opacity = '1';
                                altSidebar.style.zIndex = '2000';
                                altSidebar.style.display = 'flex';
                                altSidebar.style.pointerEvents = 'auto';
                            }
                            const sidebarToggleButton = document.querySelector('.absolute.top-4.left-4, .absolute.top-4.left-40');
                            if (sidebarToggleButton) {
                                sidebarToggleButton.style.visibility = 'visible';
                                sidebarToggleButton.style.opacity = '1';
                                sidebarToggleButton.style.zIndex = '3000';
                                sidebarToggleButton.style.display = 'block';
                                sidebarToggleButton.style.pointerEvents = 'auto';
                            }

                            if (showCommunity) {
                                const communitySidebar = document.querySelector('.w-96.p-4.bg-white.shadow-md.overflow-y-auto');
                                if (!communitySidebar || communitySidebar.style.display === 'none') {
                                    console.log('Community sidebar should be visible but is not - forcing refresh');
                                    setShowCommunity(false);
                                    setTimeout(() => {
                                        setShowCommunity(true);
                                    }, 50);
                                }
                            }
                        }, 200);
                    }
                }, 100);
            }
        }
    }, [isDrawingMode, sidebarCollapsed]);
    const forceCommunitySidebarVisibility = () => {
        if (!showCommunity) return;

        console.log('Forcing community sidebar visibility');
        const sidebar = document.getElementById('community-sidebar');
        if (sidebar) {
            sidebar.style.display = 'block';
            sidebar.style.visibility = 'visible';
            sidebar.style.opacity = '1';
            sidebar.style.zIndex = '1000';
            sidebar.style.position = 'absolute';
            sidebar.style.top = '0';
            sidebar.style.right = '0';
            sidebar.style.bottom = '0';
            sidebar.style.height = '100vh';
            sidebar.style.paddingTop = '50px'; 
            sidebar.style.pointerEvents = 'auto';
            sidebar.style.width = '24rem'; 
            sidebar.style.display = 'none';
            void sidebar.offsetHeight; 
            sidebar.style.display = 'block';

            sidebar.setAttribute('style', sidebar.getAttribute('style') +
                '; display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 1000 !important; padding-top: 50px !important;');

            console.log('Community sidebar visibility enforced');
        } else {
            console.log('Community sidebar element not found');

            if (showCommunity) {
                setShowCommunity(false);
                setTimeout(() => {
                    setShowCommunity(true);
                }, 50);
            }
        }
    };

    useEffect(() => {
        if (showCommunity) {
            document.body.classList.add('community-shown');
            setTimeout(forceCommunitySidebarVisibility, 50);
        } else {
            document.body.classList.remove('community-shown');
        }
    }, [showCommunity]);
    useEffect(() => {
        if (showCommunity && markerRef.current) {
            const lat = markerRef.current.getLatLng().lat;
            const lon = markerRef.current.getLatLng().lng;
            fetchPublicRoads(lat, lon);
        }
    }, [showCommunity, searchType, searchRadius]);
    const fetchPublicRoads = async (lat, lon) => {
        try {
            setSearchError(null);
            const radius = searchType === 'town' ? Math.min(searchRadius, 20) : searchRadius;
            const response = await axios.get('/api/public-roads', {
                params: {
                    lat,
                    lon,
                    radius,
                    tags: selectedTagIds.length > 0 ? selectedTagIds.join(',') : null,
                    length_filter: lengthFilter,
                    curviness_filter: curvinessFilter,
                    min_rating: minRating,
                    sort_by: sortBy
                }
            });
            let roadsData = response.data;
            if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                roadsData = response.data.roads;
            } else if (!Array.isArray(response.data)) {
                setSearchError('Unexpected response format from server');
                return;
            }
            const formattedRoads = roadsData.map(road => ({
                ...road,
                average_rating: road.reviews_avg_rating ? parseFloat(road.reviews_avg_rating) : null,
                user: road.user || { name: 'Unknown User' }
            }));
            setPublicRoads(formattedRoads);
        } catch (error) {
            setSearchError('Failed to fetch public roads. Please try again.');
        }
    };
    const handleSearchPublicRoads = async (providedLat, providedLon) => {
        if (!markerRef.current && !providedLat) {
            setSearchError("Please select a location first");
            return;
        }
        try {
            setSearchError(null);
            const lat = providedLat || markerRef.current.getLatLng().lat;
            const lon = providedLon || markerRef.current.getLatLng().lng;
            let searchParams = {
                lat,
                lon,
                radius: searchRadius,
                length_filter: lengthFilter,
                curviness_filter: curvinessFilter,
                min_rating: minRating,
                sort_by: sortBy,
                tags: selectedTagIds.length > 0 ? selectedTagIds.join(',') : null
            };
            if (searchType === 'country') {
                try {
                    const geocodeResponse = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
                        params: {
                            lat,
                            lon,
                            format: 'json',
                            addressdetails: 1,
                            'accept-language': 'en'
                        },
                        withCredentials: false
                    });
                    if (geocodeResponse.data && geocodeResponse.data.address && geocodeResponse.data.address.country) {
                        searchParams.country = geocodeResponse.data.address.country;
                    }
                } catch (geocodeError) {
                }
            }
            const response = await axios.get('/api/public-roads', {
                params: searchParams
            });
            let roadsData = response.data;
            if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                roadsData = response.data.roads;
            } else if (!Array.isArray(response.data)) {
                setSearchError('Unexpected response format from server');
                return;
            }
            setPublicRoads(roadsData);
        } catch (error) {
            setSearchError('Failed to fetch public roads. Please try again.');
        }
    };
    const toggleRoadPublic = async (roadId) => {
        try {
            const response = await axios.post(`/api/saved-roads/${roadId}/toggle-public`, {}, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setSavedRoads(prevRoads =>
                prevRoads.map(road =>
                    road.id === roadId
                        ? { ...road, is_public: response.data.is_public }
                        : road
                )
            );
            showToast(response.data.message, 'success', 3000);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to update road visibility', 'error', 4000);
        }
    };
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        if (!value.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchLocation(value, setSearchResults, setIsSearching);
        }, 300);
    };
    const handleCommunitySearchChange = (e) => {
        const value = e.target.value;
        setCommunitySearchQuery(value);
        if (communitySearchTimeoutRef.current) {
            clearTimeout(communitySearchTimeoutRef.current);
        }
        if (!value.trim()) {
            setCommunitySearchResults([]);
            setIsCommunitySearching(false);
            return;
        }
        communitySearchTimeoutRef.current = setTimeout(() => {
            searchLocation(value, setCommunitySearchResults, setIsCommunitySearching);
        }, 300);
    };
    const searchLocation = async (query, setResults, setSearchingState) => {
        if (!query.trim()) {
            setResults([]);
            setSearchingState(false);
            return;
        }
        setSearchingState(true);
        setSearchError(null);
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 10,
                    addressdetails: 1,
                    'accept-language': 'en',
                    dedupe: 1
                },
                withCredentials: false,
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (response.data.length === 0) {
                setResults([]);
                return;
            }
            // Filter results based on searchType (city, region, country)
            let filteredResults = response.data.filter(result => result.type !== 'house' && result.type !== 'postcode');
            if (searchType === 'city' || searchType === 'town') {
                filteredResults = filteredResults.filter(result => [
                    'city', 'town', 'village', 'municipality', 'locality', 'hamlet', 'suburb'
                ].includes(result.type));
            } else if (searchType === 'region') {
                filteredResults = filteredResults.filter(result => [
                    'region', 'state', 'county', 'province', 'district', 'administrative', 'territory'
                ].includes(result.type));
            } else if (searchType === 'country') {
                filteredResults = filteredResults.filter(result => result.type === 'country');
            }
            const formattedResults = filteredResults.map(result => ({
                ...result,
                displayName: formatLocationName(result)
            }));
            setResults(formattedResults);
        } catch (error) {
            setSearchError('Failed to search location. Please try again.');
            setResults([]);
        } finally {
            setSearchingState(false);
        }
    };
    const formatLocationName = (result) => {
        const address = result.address;
        const parts = [];
        if (address.city || address.town || address.village || address.municipality) {
            parts.push(address.city || address.town || address.village || address.municipality);
        }
        if (address.county) {
            parts.push(address.county);
        } else if (address.state || address.region) {
            parts.push(address.state || address.region);
        }
        if (address.country) {
            parts.push(address.country);
        }
        if (parts.length === 0) {
            return result.display_name.split(',').slice(0, 3).join(',');
        }
        return parts.join(', ');
    };
    const handleMainLocationSelect = (location) => {
        setSearchQuery(location.displayName);
        setSearchResults([]); 
        const currentRadius = radius;
        updateMapLocation(location, currentRadius);
    };
    const handleCommunityLocationSelect = (location) => {
        setCommunitySearchQuery(location.displayName);
        setCommunitySearchResults([]); 
        const currentRadius = searchType === 'city' ? 10 :
                             searchType === 'regional' ? 50 :
                             searchType === 'country' ? 200 : radius;
        updateMapLocation(location, currentRadius);
        // Always search for public roads when location is selected
        handleSearchPublicRoads(location.lat, location.lon);
    };
    const updateMapLocation = (location, preservedRadius = null) => {
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        const currentRadius = preservedRadius !== null ? preservedRadius : radiusRef.current;
        if (mapRef.current) {
            if (!markerIconRef.current) {
                markerIconRef.current = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                    className: 'main-location-marker' 
                });
            }
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lon]);
            } else {
                markerRef.current = L.marker([lat, lon], {
                    icon: markerIconRef.current,
                    zIndexOffset: 1000 
                }).addTo(mapRef.current);
            }
            if (radiusCircleRef.current) {
                radiusCircleRef.current.setLatLng([lat, lon]).setRadius(currentRadius * 1000);
            } else {
                radiusCircleRef.current = L.circle([lat, lon], {
                    radius: currentRadius * 1000,
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.05,
                    zIndex: 100 
                }).addTo(mapRef.current);
            }
            mapRef.current.setView([lat, lon], 13);
            setCurrentPoiLocation({
                lat: lat,
                lon: lon
            });
            setMarkerLocation({ lat: lat, lng: lon });
        }
    };
    const getCurrentLocation = () => {
        if (markerRef.current) {
            const latLng = markerRef.current.getLatLng();
            return {
                lat: latLng.lat,
                lon: latLng.lng
            };
        } else if (mapRef.current) {
            const center = mapRef.current.getCenter();
            return { lat: center.lat, lon: center.lng };
        } else if (currentPoiLocation) {
            return currentPoiLocation;
        }
        return { lat: 57.1, lon: 27.1 }; // Default location in Latvia
    };
    useEffect(() => {
    }, [markerRef.current]);
    const handleRateRoad = async (roadId, e = null) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        try {
            let response;
            // Use public endpoint if not logged in, authenticated endpoint if logged in
            if (auth.token) {
                response = await axios.get(`/api/saved-roads/${roadId}`, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                }).catch((error) => {
                    // If auth fails, try public endpoint
                    if (error.response?.status === 401 || error.response?.status === 403) {
                        return axios.get(`/api/public-roads/${roadId}`).catch(() => null);
                    }
                    throw error;
                });
            } else {
                // User not logged in - use public endpoint
                response = await axios.get(`/api/public-roads/${roadId}`).catch(() => null);
            }
            
            if (!response || !response.data) {
                // Road not found or not public
                return;
            }
            
            const road = response.data;
            if (auth.user) {
                const existingReview = road.reviews?.find(review => review.user?.id === auth.user.id);
                if (existingReview) {
                    setLocalRating(existingReview.rating);
                    setLocalComment(existingReview.comment || '');
                } else {
                    setLocalRating(0);
                    setLocalComment('');
                }
            } else {
                setLocalRating(0);
                setLocalComment('');
            }
            setSelectedRoadForReview(road);
            setRatingModalOpen(true);
        } catch (error) {
            showToast('Failed to load road details', 'error', 4000);
        }
    };
    const handleCloseRatingModal = () => {
        setRatingModalOpen(false);
        setSelectedRoadForReview(null);
        setLocalRating(0);
        setLocalComment('');
    };
    const handleSubmitReview = async (rating, comment) => {
        try {
            await axios.post(`/api/saved-roads/${selectedRoadForReview.id}/review`, {
                rating,
                comment
            }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            handleCloseRatingModal();
            if (showCommunity) {
                handleSearchPublicRoads();
            }
        } catch (error) {
            showToast('Failed to submit review', 'error', 4000);
        }
    };
    const handleNavigateClick = (road) => {
        if (!road.road_coordinates) {
            showToast('No coordinates available for this road', 'warning', 3000);
            return;
        }
        // Get user location, then calculate and display navigation info
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    const coordinates = typeof road.road_coordinates === 'string'
                        ? JSON.parse(road.road_coordinates)
                        : road.road_coordinates;
                    if (!coordinates || coordinates.length === 0) {
                        showToast('Invalid road coordinates', 'error', 3000);
                        return;
                    }
                    // Calculate distance/time to start
                    const start = coordinates[0];
                    const toStartDistance = getDistance(userLat, userLng, start.lat || start[0], start.lon || start[1]);
                    // Assume average speed 60km/h for time estimate
                    const toStartDuration = toStartDistance / 1000 / 60 * 60; // minutes
                    // Calculate route length
                    const routeLength = getRoadLength(coordinates);
                    const routeDuration = routeLength / 1000 / 60 * 60; // minutes
                    // Store for UI (could use state or modal props)
                    setSelectedRoad({
                        ...road,
                        navInfo: {
                            toStartDistance,
                            toStartDuration,
                            routeLength,
                            routeDuration
                        }
                    });
                    setShowNavigationSelector(true);
                    // Draw navigation line: user -> start, then route
                    if (mapRef.current && roadsLayerRef.current) {
                        roadsLayerRef.current.clearLayers();
                        const navLineCoords = [
                            [userLat, userLng],
                            [start.lat || start[0], start.lon || start[1]],
                            ...coordinates.map(pt => [pt.lat || pt[0], pt.lon || pt[1]])
                        ];
                        const navPolyline = L.polyline(navLineCoords, {
                            color: '#f59e42',
                            weight: 7,
                            dashArray: '8 8',
                            opacity: 0.9,
                            className: 'navigation-polyline',
                        }).addTo(roadsLayerRef.current);
                        mapRef.current.fitBounds(navPolyline.getBounds(), { padding: [50, 50] });
                    }
                },
                (error) => {
                    showToast('Could not get your location for navigation.', 'warning', 4000);
                    setSelectedRoad(road);
                    setShowNavigationSelector(true);
                }
            );
        } else {
            showToast('Geolocation is not supported by your browser.', 'warning', 4000);
            setSelectedRoad(road);
            setShowNavigationSelector(true);
        }
    };
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [socialModalTab, setSocialModalTab] = useState('leaderboard'); // 'leaderboard', 'collections', 'feed'
    const [showSelfProfileModal, setShowSelfProfileModal] = useState(false);
    const [showUserProfileModal, setShowUserProfileModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [dismissedWarning, setDismissedWarning] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);
    const [editingRoad, setEditingRoad] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    useEffect(() => {
        if (showSocialModal && !roadToAddToCollection) {
        } else if (!showSocialModal) {
            setRoadToAddToCollection(null);
        }
    }, [showSocialModal]);
    useEffect(() => {
        window.isUserAuthenticated = auth?.user ? true : false;
        window.userId = auth?.user?.id || null;
    }, [auth?.user]);
    useEffect(() => {
        const handleViewUserProfile = (event) => {
            const { userId } = event.detail;
            if (userId) {
                setSelectedUserId(userId);
                setShowUserProfileModal(true);
            }
        };

        const handleViewCollectionDetails = (event) => {
            const { collection } = event.detail;
            if (collection && collection.id) {
                setRoadToAddToCollection(null);
                setShowSocialModal(true);
                setSelectedCollectionId(collection.id);
            }
        };
        const handleEditCollection = (event) => {
            const { collection } = event.detail;
            if (collection && collection.id) {
                setRoadToAddToCollection(null);
                setShowSocialModal(true);
                setSelectedCollectionId(collection.id);
            }
        };
        const handleEditRoad = (event) => {
            const { road } = event.detail;
            if (road && road.id) {
                setEditingRoad(road);
                setShowEditModal(true);
            }
        };
        const handleViewRoadDetails = (event) => {
            const { roadId } = event.detail;
            if (roadId) {
                if (event.preventDefault) {
                    event.preventDefault();
                }
                if (event.stopPropagation) {
                    event.stopPropagation();
                }
                handleRateRoad(roadId, event);
            }
        };
        const handleNavigateToRoad = (event) => {
            const { road } = event.detail;
            if (road && road.road_coordinates) {
                setSelectedRoad(road);
                setShowNavigationSelector(true);
            }
        };
        const handleViewRoadOnMap = (event) => {
            const { road } = event.detail;
            if (road && road.road_coordinates) {
                try {
                    setShowSocialModal(false);
                    const coordinates = typeof road.road_coordinates === 'string'
                        ? JSON.parse(road.road_coordinates)
                        : road.road_coordinates;
                    if (coordinates && coordinates.length > 0) {
                        const bounds = L.latLngBounds(coordinates.map(coord => [coord[0], coord[1]]));
                        const center = bounds.getCenter();
                        if (mapRef.current) {
                            mapRef.current.setView([center.lat, center.lng], 13);
                            if (roadsLayerRef.current) {
                                roadsLayerRef.current.clearLayers();
                            }
                            L.polyline(coordinates, {
                                color: '#3388ff',
                                weight: 10, 
                                originalWeight: 10, 
                                opacity: 0.8,
                                smoothFactor: 1, 
                                className: 'road-polyline', 
                                interactive: true, 
                                bubblingMouseEvents: false, 
                                renderer: L.svg({ padding: 0.5 }), 
                                lineCap: 'round', 
                                lineJoin: 'round' 
                            }).addTo(roadsLayerRef.current);
                            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                        }
                    }
                } catch (error) {
                }
            }
        };
        const handleSaveRoadToCollection = (event) => {
            const { road } = event.detail;
            const token = localStorage.getItem('token');
            if (auth.user || token) {
                window.isUserAuthenticated = true;
                window.userId = auth.user?.id;
                if (!token && auth.user) {
                    localStorage.setItem('temp_auth_state', 'true');
                }
                setRoadToAddToCollection(road);
                setShowSaveToCollectionModal(true);
                setShowSocialModal(false);
            } else {
                showToast('You need to be logged in to save roads to collections', 'warning', 3000);
            }
        };
        const handleZoomToRoute = (event) => {
            const { coordinates } = event.detail;
            if (!coordinates || coordinates.length === 0) return;
            
            try {
                // Store route in state for persistence
                setImportedRoute(coordinates);
                
                // Clear previous layers
                if (roadsLayerRef.current) {
                    roadsLayerRef.current.clearLayers();
                }
                
                // Draw the imported route - coordinates are {lat, lng} objects
                const latLngs = coordinates.map(c => [c.lat, c.lng]);
                L.polyline(latLngs, {
                    color: '#0d47a1',
                    weight: 10,
                    originalWeight: 10,
                    opacity: 1,
                    smoothFactor: 1,
                    className: 'road-polyline',
                    interactive: true,
                    bubblingMouseEvents: false,
                    renderer: L.svg({ padding: 0.5 }),
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(roadsLayerRef.current);
                
                // Zoom to bounds
                const bounds = L.latLngBounds(latLngs);
                if (mapRef.current) {
                    mapRef.current.flyToBounds(bounds, {
                        padding: [50, 50],
                        duration: 1.5,
                        easeLinearity: 0.25
                    });
                }
            } catch (error) {
                console.error('Failed to zoom to imported route:', error);
            }
        };
        window.addEventListener('viewUserProfile', handleViewUserProfile);
        window.addEventListener('viewCollectionDetails', handleViewCollectionDetails);
        window.addEventListener('editCollection', handleEditCollection);
        window.addEventListener('editRoad', handleEditRoad);
        window.addEventListener('viewRoadDetails', handleViewRoadDetails);
        window.addEventListener('navigateToRoad', handleNavigateToRoad);
        window.addEventListener('viewRoadOnMap', handleViewRoadOnMap);
        window.addEventListener('saveRoadToCollection', handleSaveRoadToCollection);
        window.addEventListener('zoomToRoute', handleZoomToRoute);
        return () => {
            window.removeEventListener('viewUserProfile', handleViewUserProfile);
            window.removeEventListener('viewCollectionDetails', handleViewCollectionDetails);
            window.removeEventListener('editCollection', handleEditCollection);
            window.removeEventListener('editRoad', handleEditRoad);
            window.removeEventListener('viewRoadDetails', handleViewRoadDetails);
            window.removeEventListener('navigateToRoad', handleNavigateToRoad);
            window.removeEventListener('viewRoadOnMap', handleViewRoadOnMap);
            window.removeEventListener('saveRoadToCollection', handleSaveRoadToCollection);
            window.removeEventListener('zoomToRoute', handleZoomToRoute);
        };
    }, []);
    const toggleSidebar = () => {
        const newCollapsedState = !sidebarCollapsed;
        setSidebarCollapsed(newCollapsedState);
        if (newCollapsedState) {
            document.body.classList.add('sidebar-collapsed');
        } else {
            document.body.classList.remove('sidebar-collapsed');
        }
        setTimeout(() => {
            let sidebar = document.querySelector('.flex.h-screen.relative > div:first-child');
            if (!sidebar) {
                sidebar = document.querySelector(newCollapsedState ? '.w-16' : '.w-80');
            }
            if (!sidebar) {
                sidebar = document.querySelector('[class*="sidebar"], [id*="sidebar"], .flex.h-screen.relative > div');
            }
            if (sidebar) {

                const newWidth = newCollapsedState ? '4rem' : '20rem';
                sidebar.style.minWidth = newWidth;
                sidebar.style.width = newWidth;
                sidebar.style.maxWidth = newWidth;
                sidebar.style.flexBasis = newWidth;
                sidebar.style.flexShrink = '0';
                sidebar.style.flexGrow = '0';
                sidebar.style.display = 'flex';
                sidebar.style.visibility = 'visible';
                sidebar.style.opacity = '1';
                sidebar.style.zIndex = '2000';
                sidebar.style.pointerEvents = 'auto';
                sidebar.style.overflow = 'visible';
                if (newCollapsedState) {
                    sidebar.classList.remove('w-80');
                    sidebar.classList.add('w-16');
                } else {
                    sidebar.classList.remove('w-16');
                    sidebar.classList.add('w-80');
                }
                sidebar.style.display = 'none';
                void sidebar.offsetHeight; 
                sidebar.style.display = 'flex';

            } else {
            }
            ensureMapButtonsVisible();            setTimeout(ensureMapButtonsVisible, 100);
            setTimeout(ensureMapButtonsVisible, 300);
            setTimeout(ensureMapButtonsVisible, 500);
        }, 50);
    };
    const renderFixedButtons = () => {
        const handleCommunityToggle = (e) => {
            if (isDrawingMode) return;
            e.stopPropagation();
            const newValue = !showCommunity;
            setShowCommunity(newValue);
            if (auth.token) {
                axios.post('/api/settings', {
                    key: 'show_community_by_default',
                    value: newValue
                }, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                }).catch(() => {
                    /* noop */
                });
            }
        };


        const floatingButtons = [];

        return (
            <div id="fixed-map-buttons" className="floating-controls">
                {floatingButtons.map((btn) => {
                    const Icon = btn.icon;
                    return (
                        <button
                            key={btn.id}
                            onClick={btn.onClick}
                            disabled={btn.disabled}
                            className={`floating-control ${btn.active ? 'active' : ''} ${btn.disabled ? 'disabled' : ''}`}
                            title={btn.title}
                        >
                            <span className="floating-icon">
                                <Icon />
                            </span>
                            <div className="floating-text">
                                <span className="floating-label">{btn.label}</span>
                                <span className="floating-subtext">{btn.subtitle}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const removeMarker = () => {
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
            setMarkerLocation(null); 
        }
        if (radiusCircleRef.current) {
            radiusCircleRef.current.remove();
            radiusCircleRef.current = null;
        }
    };

    const toggleMarkerDropMode = () => {
        // If entering marker drop mode, only switch to findRoads if we're in default mode
        // Don't change mode if we're in communityRoads or other specific modes
        if (!markerDropMode && sidebarMode === 'default') {
            setSidebarMode('findRoads');
        }
        // If exiting marker drop mode, only return to default if we're in findRoads mode
        // Don't change mode if we're in communityRoads or other specific modes
        if (markerDropMode && sidebarMode === 'findRoads') {
            setSidebarMode('default');
        }
        if (markerDropMode) {
            removeMarker();
        }
        setMarkerDropMode(!markerDropMode);
    };

    return (
        <div className="flex flex-col h-screen relative" style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
            {/* Subscription Warning Banner */}
            {auth?.user && subscriptionStatus && !dismissedWarning && (
                <div className="fixed top-16 left-0 right-0 z-40 px-4">
                    <SubscriptionWarningBanner 
                        subscriptionStatus={subscriptionStatus}
                        onDismiss={() => setDismissedWarning(true)}
                    />
                </div>
            )}
            
            {/* Desktop Header */}
            <DesktopHeader 
                auth={auth} 
                currentPage="map"
                onOpenCommunity={() => {
                    setSocialModalTab('feed');
                    setShowSocialModal(true);
                }}
                onOpenCollections={() => {
                    setSocialModalTab('collections');
                    setShowSocialModal(true);
                }}
                onOpenLeaderboard={() => {
                    setSocialModalTab('leaderboard');
                    setShowSocialModal(true);
                }}
                onOpenProfile={() => setShowSelfProfileModal(true)}
                onOpenSettings={() => setShowSettingsModal(true)}
            />
            
            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden" style={{ marginTop: '60px', height: 'calc(100vh - 60px)' }}>
            {/* Main Sidebar */}
            <div
                className={`${sidebarCollapsed ? 'w-16' : 'w-80'} transition-all duration-300 bg-white shadow-md overflow-y-auto overflow-x-hidden z-20 flex flex-col relative`}
                style={{
                    minWidth: sidebarCollapsed ? '4rem' : '20rem',
                    width: sidebarCollapsed ? '4rem' : '20rem',
                    flexBasis: sidebarCollapsed ? '4rem' : '20rem',
                    flexShrink: 0,
                    flexGrow: 0,
                    display: 'flex',
                    visibility: 'visible',
                    opacity: 1
                }}>
                {/* Sidebar toggle button  */}
                {/* Collapsed sidebar content  */}
                {sidebarCollapsed && (
                    <div className="flex flex-col items-center pt-16 space-y-4">
                        {/* Find Curved Roads icon */}
                        <button
                            onClick={() => {
                                setSidebarMode('findRoads');
                                setMarkerDropMode(true);
                                setSidebarCollapsed(false);
                            }}
                            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                            title="Find Curved Roads"
                        >
                            <FaRoute className="h-5 w-5" />
                        </button>
                        {/* Plan Route icon */}
                        <button
                            onClick={() => {
                                setSidebarMode('planRoute');
                                setIsRoutePlanningMode(true);
                                setSidebarCollapsed(false);
                            }}
                            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                            title="Plan Route"
                            disabled={isDrawingMode || markerDropMode}
                        >
                            <FaRoute className="h-5 w-5" />
                        </button>
                        {/* Community Roads icon */}
                        <button
                            onClick={() => {
                                setSidebarMode('communityRoads');
                                setSidebarCollapsed(false);
                            }}
                            className="p-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                            title="Community Roads"
                        >
                            <FaUsers className="h-5 w-5" />
                        </button>
                        {/* My Saved Roads icon */}
                        {auth.user && (
                            <button
                                onClick={() => {
                                    setSidebarMode('savedRoads');
                                    setSidebarCollapsed(false);
                                }}
                                className="p-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                                title={`My Saved Roads (${savedRoads.length})`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                {/* Expanded sidebar content */}
                <div className={`${sidebarCollapsed ? 'hidden' : 'block'} p-4`}>
                {/* Default/Main View */}
                {sidebarMode === 'default' && (
                    <div className="space-y-4">
                        <h2 className="section-title">What would you like to do?</h2>
                        
                        <button
                            onClick={() => {
                                setSidebarMode('findRoads');
                                setMarkerDropMode(true);
                            }}
                            className="btn-primary"
                        >
                            <FaRoute />
                            Find Curved Roads
                        </button>

                        <button
                            onClick={() => {
                                setSidebarMode('planRoute');
                                setIsRoutePlanningMode(true);
                            }}
                            className="btn-primary"
                            disabled={isDrawingMode || markerDropMode}
                        >
                            <FaRoute />
                            Plan Route
                        </button>

                        <button
                            onClick={() => setSidebarMode('communityRoads')}
                            className="btn-secondary"
                        >
                            <FaUsers />
                            Community Roads
                        </button>

                        {/* My Saved Roads button - only show if user is logged in */}
                        {auth.user && (
                            <button
                                onClick={() => setSidebarMode('savedRoads')}
                                className="btn-secondary"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                My Saved Roads {savedRoads.length > 0 && `(${savedRoads.length})`}
                            </button>
                        )}

                        {/* Import GPX button */}
                        <button
                            onClick={() => setSidebarMode('importGpx')}
                            className="btn-secondary"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Import GPX
                        </button>

                    </div>
                )}

                {/* Find Curved Roads View */}
                {sidebarMode === 'findRoads' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <button
                                onClick={() => {
                                    setSidebarMode('default');
                                    setMarkerDropMode(false);
                                }}
                                className="btn-neutral"
                                title="Back to main menu"
                            >
                                <FaArrowLeft className="text-sm" />
                                <span className="text-sm">Back</span>
                            </button>
                            <h2 className="section-title flex-1 text-gray-900">Find Curved Roads</h2>
                        </div>

                        {/* Location Search */}
                        <div className="mb-4 relative">
                            <input
                                type="text"
                                placeholder="Search for any location..."
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                role="combobox"
                                aria-expanded={searchResults.length > 0}
                                aria-autocomplete="list"
                                aria-controls="search-results-list"
                                autoComplete="off"
                                spellCheck="false"
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-2.5 text-gray-400">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            )}
                            {searchResults.length > 0 && (
                                <div
                                    id="search-results-list"
                                    role="listbox"
                                    className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
                                >
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={`${result.place_id}-${index}`}
                                            role="option"
                                            aria-selected={false}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors duration-150"
                                            onClick={() => handleMainLocationSelect(result)}
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            <div className="font-medium">{result.displayName}</div>
                                            <div className="text-sm text-gray-600 truncate">{result.display_name}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Marker Drop Button */}
                        <button
                            onClick={toggleMarkerDropMode}
                            className={`w-full p-3 rounded transition-colors mb-4 ${
                                markerDropMode
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {markerDropMode
                                ? 'Cancel Marker Placement'
                                : markerRef.current
                                    ? 'Move Marker Location'
                                    : 'Drop Marker on Map'
                            }
                        </button>

                        {/* Marker Location Display */}
                        {markerRef.current && (
                            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-sm">
                                <p className="font-medium text-green-800">Marker placed at:</p>
                                <p className="text-green-700">
                                    Lat: {markerRef.current.getLatLng().lat.toFixed(5)},
                                    Lng: {markerRef.current.getLatLng().lng.toFixed(5)}
                                </p>
                            </div>
                        )}

                        {/* Filters Section */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-3 text-gray-900">Search Filters</h3>
                            <label className="block mb-2 text-gray-700 font-medium">
                                Search Radius: <span className="font-semibold text-gray-900">{radius}</span> {userSettings.measurement_units === 'imperial' ? 'miles' : 'km'}
                            </label>
                            <div className="mb-4">
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={radius}
                                    onChange={handleRadiusChange}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    className="w-full cursor-pointer blue-range"
                                    ref={(el) => {
                                        if (el) {
                                            const percentage = ((radius - 1) / (50 - 1)) * 100;
                                            el.style.setProperty('--range-progress', `${percentage}%`);
                                        }
                                    }}
                                />
                                <div className="flex justify-between text-xs text-gray-600 mt-1">
                                    <span>1 {userSettings.measurement_units === 'imperial' ? 'mi' : 'km'}</span>
                                    <span>50 {userSettings.measurement_units === 'imperial' ? 'mi' : 'km'}</span>
                                </div>
                            </div>
                            <label className="block mb-1 text-gray-700 font-medium">Road Type</label>
                            <select
                                value={roadType}
                                onChange={(e) => setRoadType(e.target.value)}
                                className="w-full mb-3 p-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Roads</option>
                                <option value="primary">Primary Roads</option>
                                <option value="secondary">Secondary Roads</option>
                            </select>
                            <label className="block mb-1 text-gray-700 font-medium">Curvature Type</label>
                            <select
                                value={curvatureType}
                                onChange={(e) => setCurvatureType(e.target.value)}
                                className="w-full mb-3 p-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Curves</option>
                                <option value="curvy">Very Curved</option>
                                <option value="moderate">Moderately Curved</option>
                                <option value="mellow">Mellow</option>
                            </select>
                            <label className="block mb-1 text-gray-700 font-medium">Road Length</label>
                            <select
                                value={lengthFilter}
                                onChange={(e) => setLengthFilter(e.target.value)}
                                className="w-full mb-3 p-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Lengths</option>
                                <option value="short">Short (2-5km)</option>
                                <option value="medium">Medium (5-15km)</option>
                                <option value="long">Long (over 15km)</option>
                            </select>
                            <button
                                onClick={searchRoads}
                                disabled={!markerRef.current || loading}
                                className={`btn-success ${loading ? 'btn-loading' : ''}`}
                            >
                                {loading ? 'Searching...' : 'Search Roads'}
                            </button>
                            {loading && (
                                <div className="loading-text mt-2">
                                    <div className="loading-spinner loading-spinner-sm"></div>
                                    <span>Loading roads...</span>
                                </div>
                            )}
                        </div>

                        {/* Saved Roads Section */}
                        {auth.user && (
                            <div className="mt-6 border-t pt-4">
                                <h3 className="font-semibold mb-3">
                                    My Saved Roads ({savedRoads.length})
                                    {savedRoadsLoading && <span className="ml-2 inline-block animate-spin">⟳</span>}
                                </h3>
                                {savedRoadsLoading ? (
                                    <div className="p-4 text-center">
                                        <div className="loading-spinner mx-auto mb-3 text-blue-500"></div>
                                        <p className="loading-text">Loading saved roads...</p>
                                    </div>
                                ) : savedRoads.length === 0 ? (
                                    <EmptySavedRoads 
                                        onFindRoads={() => {
                                            setSidebarMode('findRoads');
                                            setMarkerDropMode(true);
                                        }}
                                    />
                                ) : (
                                    <ul className="space-y-3 max-h-64 overflow-y-auto">
                                        {savedRoads.map((road) => (
                                            <RoadItem
                                                key={road.id}
                                                road={road}
                                                onNavigateClick={setSelectedRoadId}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Plan Route View */}
                {sidebarMode === 'planRoute' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <button
                                onClick={() => {
                                    setSidebarMode('default');
                                    setIsRoutePlanningMode(false);
                                }}
                                className="btn-neutral"
                                title="Back to main menu"
                            >
                                <FaArrowLeft className="text-sm" />
                                <span className="text-sm">Back</span>
                            </button>
                            <h2 className="section-title flex-1">Plan Route</h2>
                        </div>
                        {/* RoutePlanner will render its UI here via a prop or we'll extract it */}
                        <div className="route-planner-sidebar-content">
                            {/* RoutePlanner controls will be rendered here */}
                        </div>
                    </div>
                )}

                {/* Saved Roads View */}
                {sidebarMode === 'savedRoads' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <button
                                onClick={() => setSidebarMode('default')}
                                className="btn-neutral"
                                title="Back to main menu"
                            >
                                <FaArrowLeft className="text-sm" />
                                <span className="text-sm">Back</span>
                            </button>
                            <h2 className="section-title flex-1">My Saved Roads & Routes</h2>
                        </div>
                        {savedRoadsLoading ? (
                            <div className="p-4 text-center">
                                <div className="loading-spinner mx-auto mb-3 text-blue-500"></div>
                                <p className="loading-text">Loading saved roads...</p>
                            </div>
                        ) : savedRoads.length === 0 ? (
                            <EmptySavedRoads 
                                onFindRoads={() => {
                                    setSidebarMode('findRoads');
                                    setMarkerDropMode(true);
                                }}
                            />
                        ) : (
                            <>
                                <ul className="space-y-4">
                                    {savedRoads.map((road) => (
                                        <RoadItem
                                            key={road.id}
                                            road={road}
                                            onNavigateClick={setSelectedRoadId}
                                        />
                                    ))}
                                </ul>
                                <button
                                    onClick={() => {
                                        const loadSavedRoads = async () => {
                                            if (auth.token) {
                                                try {
                                                    setSavedRoadsLoading(true);
                                                    axios.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`;
                                                    const response = await axios.get('/api/saved-roads', {
                                                        headers: { Authorization: `Bearer ${auth.token}` }
                                                    });
                                                    if (Array.isArray(response.data)) {
                                                        setSavedRoads(response.data);
                                                    } else {
                                                        setSavedRoads([]);
                                                    }
                                                } catch (error) {
                                                    showToast('Failed to refresh saved roads. Please try again.', 'error', 4000);
                                                } finally {
                                                    setSavedRoadsLoading(false);
                                                }
                                            }
                                        };
                                        loadSavedRoads();
                                    }}
                                    disabled={savedRoadsLoading}
                                    className={`w-full px-4 py-2 text-sm rounded transition-colors ${
                                        savedRoadsLoading
                                        ? 'bg-gray-400 cursor-not-allowed text-white'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                >
                                    {savedRoadsLoading ? 'Refreshing...' : 'Refresh Saved Roads'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Import GPX View */}
                {sidebarMode === 'importGpx' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <button
                                onClick={() => setSidebarMode('default')}
                                className="btn-neutral"
                                title="Back to main menu"
                            >
                                <FaArrowLeft className="text-sm" />
                                <span className="text-sm">Back</span>
                            </button>
                            <h2 className="section-title flex-1">Import GPX</h2>
                        </div>
                        <GPXImport auth={auth} />
                    </div>
                )}

                {/* Community Roads View */}
                {sidebarMode === 'communityRoads' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <button
                                onClick={() => setSidebarMode('default')}
                                className="btn-neutral"
                                title="Back to main menu"
                            >
                                <FaArrowLeft className="text-sm" />
                                <span className="text-sm">Back</span>
                            </button>
                            <h2 className="section-title flex-1">Community Roads</h2>
                        </div>
                        <div className="mt-2 space-y-4">
                            {/* Search Mode Toggle */}
                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => setCommunitySearchMode('marker')}
                                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                                        communitySearchMode === 'marker'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    Use Marker
                                </button>
                                <button
                                    onClick={() => setCommunitySearchMode('search')}
                                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                                        communitySearchMode === 'search'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    Search Location
                                </button>
                            </div>

                            {/* Location Input (for search mode) */}
                            {communitySearchMode === 'search' && (
                                <div className="relative mb-2">
                                    <input
                                        type="text"
                                        placeholder="Enter city, region, or place..."
                                        value={communitySearchQuery}
                                        onChange={handleCommunitySearchChange}
                                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {communitySearchResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {communitySearchResults.map((result, index) => (
                                                <button
                                                    key={`${result.place_id}-${index}`}
                                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                                                    onClick={() => handleCommunityLocationSelect(result)}
                                                >
                                                    <div className="font-medium">{result.displayName}</div>
                                                    <div className="text-sm text-gray-600 truncate">
                                                        {result.display_name}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Marker Drop Button (for marker mode) */}
                            {communitySearchMode === 'marker' && (
                                <button
                                    onClick={toggleMarkerDropMode}
                                    className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                                        markerDropMode
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                >
                                    {markerDropMode
                                        ? 'Cancel Marker Placement'
                                        : markerRef.current
                                            ? 'Move Marker Location'
                                            : 'Drop a Marker on Map'
                                    }
                                </button>
                            )}

                            {/* Marker Location Display */}
                            {markerRef.current && (
                                <div className="p-2 bg-green-100 border border-green-300 rounded text-sm">
                                    <p className="font-medium text-green-800">Marker placed at:</p>
                                    <p className="text-green-700">
                                        Lat: {markerRef.current.getLatLng().lat.toFixed(5)},
                                        Lng: {markerRef.current.getLatLng().lng.toFixed(5)}
                                    </p>
                                </div>
                            )}

                            {/* Search Area Type */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        setSearchType('city');
                                        setSearchRadius(20);
                                    }}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        searchType === 'city'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    City
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchType('region');
                                        setSearchRadius(75);
                                    }}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        searchType === 'region'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    Region
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchType('country');
                                        setSearchRadius(200);
                                    }}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        searchType === 'country'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    Country
                                </button>
                            </div>

                            {/* Search Button */}
                            <button
                                onClick={async () => {
                                    if (communitySearchMode === 'marker' && !markerRef.current) {
                                        showToast('Please drop a marker first or switch to search mode', 'warning', 3000);
                                        return;
                                    }
                                    if (communitySearchMode === 'search' && !communitySearchQuery) {
                                        showToast('Please enter a location to search', 'warning', 3000);
                                        return;
                                    }
                                    if (communitySearchMode === 'marker' && markerRef.current) {
                                        const lat = markerRef.current.getLatLng().lat;
                                        const lng = markerRef.current.getLatLng().lng;
                                        await handleSearchPublicRoads(lat, lng);
                                    } else if (communitySearchMode === 'search' && communitySearchQuery) {
                                        // If in search mode but no location selected yet, show message
                                        if (communitySearchResults.length === 0) {
                                            showToast('Please select a location from the search results', 'warning', 3000);
                                            return;
                                        }
                                    }
                                }}
                                disabled={(communitySearchMode === 'marker' && !markerRef.current) || (communitySearchMode === 'search' && !communitySearchQuery)}
                                className="btn-success w-full"
                            >
                                Search Community Roads
                            </button>

                            {/* Public Roads Results */}
                            {publicRoads.length > 0 && (
                                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                                    {publicRoads.map((road) => (
                                        <div key={road.id} className="p-3 border rounded hover:bg-gray-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-sm">{road.road_name || 'Unnamed Road'}</h4>
                                                {road.average_rating && (
                                                    <span className="text-xs text-yellow-600">★ {road.average_rating.toFixed(1)}</span>
                                                )}
                                            </div>
                                            {road.description && (
                                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{road.description}</p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (road.road_coordinates) {
                                                            const event = new CustomEvent('viewRoadOnMap', {
                                                                detail: { road: road }
                                                            });
                                                            window.dispatchEvent(event);
                                                        }
                                                    }}
                                                    className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    View on Map
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleRateRoad(road.id, e);
                                                    }}
                                                    className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchError && (
                                <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                                    {searchError}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                </div>
            </div>
            {/* Map */}
            <div className={`flex-1 relative ${isDrawingMode ? 'drawing-mode' : ''}`} id="map" style={{
                pointerEvents: 'auto',
                position: 'relative',
                overflow: 'visible',
                background: '#f0f0f0',
                filter: 'none',
                visibility: 'visible',
                opacity: 1
            }}>
                {/* Sidebar toggle button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent map click event
                        toggleSidebar();
                    }}
                    className="absolute top-4 left-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 font-semibold transition-all duration-300"
                    style={{
                        zIndex: 1500,
                        border: '2px solid white',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
                </button>
                {/* Render the fixed buttons */}
                {renderFixedButtons()}
                {/* POI Controls */}
                {POI_PANEL_ENABLED && (
                    <div
                        className="absolute top-20 left-4 max-w-[250px] transition-all duration-300"
                        style={{ zIndex: 1500, pointerEvents: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <PoiControls
                            showTourism={showTourism}
                            showFuelStations={showFuelStations}
                            showChargingStations={showChargingStations}
                            setShowTourism={setShowTourism}
                            setShowFuelStations={setShowFuelStations}
                            setShowChargingStations={setShowChargingStations}
                            fetchAllPois={fetchAllPois}
                            clearAllPois={clearAllPois}
                            loading={poiLoading}
                            currentLocation={currentPoiLocation || getCurrentLocation()}
                            error={poiError}
                            auth={auth}
                        />
                    </div>
                )}
                {/* POI Details */}
                {POI_PANEL_ENABLED && selectedPoi && (
                    <div
                        className="absolute top-20 right-4 max-w-md transition-all duration-300"
                        style={{ zIndex: 1500, pointerEvents: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <PoiDetails
                            poi={selectedPoi}
                            onClose={() => {
                                setSelectedPoiId(null);
                                setSelectedPoi(null);
                            }}
                        />
                    </div>
                )}
            </div>
            {/* Old Community Sidebar - Removed, functionality moved to main sidebar */}
            {false && (
                <div id="community-sidebar" className="w-96 p-4 bg-white shadow-md overflow-y-auto" style={{
                    zIndex: 1000, 
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    height: '100vh',
                    paddingTop: '50px' 
                }}>
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">Community Roads</h2>
                        <button
                            onClick={() => setShowCommunity(false)}
                            className="p-1 rounded-full hover:bg-gray-200"
                            aria-label="Close community panel"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {/* Roads Tab Content */}
                    <div>
                        {/* Search Controls */}
                        <div className="mb-6 space-y-4">
                            {/* Location Search */}
                            <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Search Location
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            onClick={toggleMarkerDropMode}
                                            className={`px-3 py-2 rounded transition-colors ${
                                                markerDropMode
                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                        >
                                            {markerDropMode
                                                ? 'Cancel'
                                                : markerRef.current
                                                    ? 'Move Marker'
                                                    : 'Drop Marker'
                                            }
                                        </button>
                                        <input
                                            type="text"
                                            placeholder="Enter city, region, or place..."
                                            value={communitySearchQuery}
                                            onChange={handleCommunitySearchChange}
                                            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                            {communitySearchResults.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {communitySearchResults.map((result, index) => (
                                        <button
                                            key={`${result.place_id}-${index}`}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                                            onClick={() => handleCommunityLocationSelect(result)}
                                        >
                                            <div className="font-medium">{result.displayName}</div>
                                            <div className="text-sm text-gray-600 truncate">
                                                {result.display_name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Marker Location Display */}
                        {markerRef.current && (
                            <div className="mb-4 p-2 bg-green-100 border border-green-300 rounded text-sm">
                                <p className="font-medium text-green-800">Marker placed at:</p>
                                <p className="text-green-700">
                                    Lat: {markerRef.current.getLatLng().lat.toFixed(5)},
                                    Lng: {markerRef.current.getLatLng().lng.toFixed(5)}
                                </p>
                                <p className="text-green-700 mt-1">
                                    Search radius: {searchRadius} km ({searchType} search)
                                </p>
                            </div>
                        )}
                        {/* Search Area Type */}
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => {
                                    setSearchType('city');
                                    setSearchRadius(20);
                                }}
                                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                                    searchType === 'city'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                            >
                                City Area
                            </button>
                            <button
                                onClick={() => {
                                    setSearchType('region');
                                    setSearchRadius(75);
                                }}
                                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                                    searchType === 'region'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                            >
                                Regional
                            </button>
                            <button
                                onClick={() => {
                                    setSearchType('country');
                                    setSearchRadius(200);
                                }}
                                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                                    searchType === 'country'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                            >
                                Country
                            </button>
                        </div>
                        {/* Advanced Filters */}
                        <div className="border rounded-md p-4 space-y-4">
                            <h3 className="font-medium text-gray-700">Advanced Filters</h3>
                            {/* Road Length */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Road Length</label>
                            <select
                                    className="w-full px-3 py-2 border rounded-md"
                                    value={lengthFilter}
                                    onChange={(e) => setLengthFilter(e.target.value)}
                                >
                                    <option value="all">All Lengths</option>
                                    <option value="short">Short (2-5km)</option>
                                    <option value="medium">Medium (5-15km)</option>
                                    <option value="long">Long (over 15km)</option>
                                    <option value="connected">Connected Roads</option>
                            </select>
                        </div>
                            {/* Curviness */}
                        <div>
                                <label className="block text-sm text-gray-600 mb-1">Curviness</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md"
                                    value={curvinessFilter}
                                    onChange={(e) => setCurvinessFilter(e.target.value)}
                                >
                                    <option value="all">All Types</option>
                                    <option value="mellow">Mellow</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="very">Very Curvy</option>
                                </select>
                        </div>
                            {/* Rating Filter */}
                        <div>
                                <label className="block text-sm text-gray-600 mb-1">Minimum Rating</label>
                                <StarRating
                                    rating={minRating}
                                    interactive={true}
                                    onRatingChange={setMinRating}
                                    allowClear={true}
                                />
                            </div>
                            {/* Sort Options */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Sort By</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="rating">Highest Rated</option>
                                    <option value="reviews">Most Reviewed</option>
                                    <option value="recent">Recently Added</option>
                                    <option value="length">Longest Routes</option>
                                </select>
                            </div>
                            {/* Tags Filter */}
                            <div>
                                <div className="tag-filter-section">
                                    <CollapsibleFilterByTags
                                        availableTags={availableTags}
                                        selectedTagIds={selectedTagIds}
                                        setSelectedTagIds={setSelectedTagIds}
                                        onTagsChange={(newTagIds) => {
                                            setSelectedTagIds(newTagIds);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Search Button */}
                        <button
                            onClick={() => handleSearchPublicRoads(null, null)}
                            disabled={!markerRef.current}
                            className={`w-full px-4 py-2 rounded-lg transition-colors ${
                                !markerRef.current
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            Search Roads
                        </button>
                        {!markerRef.current && (
                            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
                                <p className="text-yellow-700">
                                    Please drop a marker on the map first to search for roads.
                                </p>
                            </div>
                        )}
                            {searchError && (
                                <p className="mt-2 text-sm text-red-600">{searchError}</p>
                            )}
                        </div>
                    {/* Results Count */}
                    {publicRoads.length > 0 && (
                        <div className="mb-4 text-sm text-gray-600">
                            Found {publicRoads.length} roads
                    </div>
                    )}
                    {/* Public Roads List */}
                    <div className="space-y-4">
                        {!publicRoads || !Array.isArray(publicRoads) ? (
                            <p className="text-gray-500 text-center">
                                Loading public roads...
                            </p>
                        ) : publicRoads.length === 0 ? (
                            <p className="text-gray-500 text-center">
                                No public roads found in this area. Try adjusting your search criteria.
                            </p>
                        ) : (
                            publicRoads.map(road => (
                                <div key={road.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                    <h3 className="font-semibold text-lg">{road.road_name}</h3>
                                    <div className="flex items-center mt-2 space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                                            {road.user?.profile_picture_url ? (
                                                <img
                                                    src={road.user.profile_picture_url}
                                                    alt={road.user.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-sm font-medium">
                                                    {road.user?.name ? road.user.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            Added by {road.user?.name || 'Unknown User'}
                                        </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-4">
                                        <div className="text-sm">
                                            <p>Length: {userSettings.measurement_units === 'imperial'
                                                ? ((road.length / 1000) * 0.621371).toFixed(2) + ' miles'
                                                : (road.length / 1000).toFixed(2) + ' km'}</p>
                                            <p>Corners: {road.corner_count}</p>
                                            <p>Curve Rating: {getTwistinessLabel(road.twistiness)}</p>
                                        </div>
                                        <div className="text-sm text-right">
                                            <p className="flex items-center justify-end">
                                                <span className="text-yellow-400 mr-1">★</span>
                                                {road.average_rating || road.reviews_avg_rating ?
                                                    (typeof (road.average_rating || road.reviews_avg_rating) === 'number' ?
                                                        (road.average_rating || road.reviews_avg_rating).toFixed(1) :
                                                        road.average_rating || road.reviews_avg_rating) :
                                                    (road.reviews && road.reviews.length > 0 ?
                                                        (road.reviews.reduce((sum, review) => sum + review.rating, 0) / road.reviews.length).toFixed(1) :
                                                        'No ratings')
                                                }
                                                <span className="text-gray-500 ml-1">
                                                    ({road.reviews?.length || 0} reviews)
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    {/* Tags */}
                                    {road.tags && road.tags.length > 0 && (
                                        <div className="mt-2 tag-list">
                                            {road.tags.map(tag => (
                                                <div key={tag.id} className={`tag-item tag-${tag.type || 'default'}`}>
                                                    <FaTag className="tag-item-icon" />
                                                    {tag.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => handleViewOnMap(road)}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            View on Map
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                                handleRateRoad(road.id, e);
                                            }}
                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-md"
                                        >
                                            View Details
                                        </button>
                                        <RouteExport
                                            route={{
                                                coordinates: road.road_coordinates ? JSON.parse(road.road_coordinates) : []
                                            }}
                                            routeName={road.road_name || 'Unnamed Road'}
                                            routeDescription={road.description || ''}
                                            auth={auth}
                                            compact={true}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    </div>
                </div>
            )}
            {/* Navigation App Selector Modal */}
            {selectedRoad && (
                <NavigationAppSelector
                    coordinates={selectedRoad.road_coordinates}
                    roadName={selectedRoad.road_name}
                    onClose={() => {
                        setSelectedRoad(null);
                        if (showSocialModal) {
                            setShowSocialModal(false);
                        }
                    }}
                />
            )}
            {/* Social Modal */}
            {showSocialModal && (
                <SocialModal
                    isOpen={showSocialModal}
                    onClose={() => {
                        setShowSocialModal(false);
                        setSelectedCollectionId(null); 
                        setRoadToAddToCollection(null); 
                    }}
                    selectedCollectionId={selectedCollectionId}
                    roadToAdd={roadToAddToCollection}
                    activeTab={socialModalTab}
                    setActiveTab={setSocialModalTab}
                    onViewRoadDetails={(roadId, e) => {
                        try {
                           
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                            handleRateRoad(roadId, e);
                        } catch (error) {
                        }
                    }}
                    onViewRoad={(road) => {
                        if (road && road.road_coordinates) {
                            try {
                                const coordinates = Array.isArray(road.road_coordinates)
                                    ? road.road_coordinates.map(coord => [coord.lat, coord.lon])
                                    : JSON.parse(road.road_coordinates);
                                roadsLayerRef.current.clearLayers();
                                const polyline = L.polyline(coordinates, {
                                    color: 'blue',
                                    weight: 8,
                                    originalWeight: 8, 
                                    smoothFactor: 1, 
                                    className: 'road-polyline', 
                                    interactive: true, 
                                    bubblingMouseEvents: false 
                                }).addTo(roadsLayerRef.current);

                                mapRef.current.fitBounds(polyline.getBounds());
                                setShowSocialModal(false);
                            } catch (error) {
                                showToast("Could not display this road on the map. Invalid coordinates format.", 'error', 4000);
                            }
                        }
                    }}
            />
            )}
            {/* Rating Modal */}
            {ratingModalOpen && selectedRoadForReview && (
                <RatingModal
                    isOpen={ratingModalOpen}
                    onClose={() => {
                        setRatingModalOpen(false);
                        setSelectedRoadForReview(null);
                    }}
                    onSubmit={handleSubmitReview}
                    road={selectedRoadForReview}
                    auth={auth}
                    initialRating={localRating}
                    initialComment={localComment}
                />
            )}
            {/* Self Profile Modal */}
            <SelfProfileModal
                isOpen={showSelfProfileModal}
                onClose={() => setShowSelfProfileModal(false)}
                auth={auth}
            />

            {/* User Profile Modal */}
            {showUserProfileModal && selectedUserId && (
                <UserProfileModal
                    isOpen={showUserProfileModal}
                    onClose={() => {
                        setShowUserProfileModal(false);
                        setSelectedUserId(null);
                    }}
                    userId={selectedUserId}
                    currentUserId={auth?.user?.id}
                />
            )}
            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                auth={auth}
            />
            {/* Save To Collection Modal */}
            {showSaveToCollectionModal && roadToAddToCollection && (
                <SaveToCollectionModal
                    isOpen={showSaveToCollectionModal}
                    onClose={() => {
                        setShowSaveToCollectionModal(false);
                        setRoadToAddToCollection(null);
                    }}
                    roadToAdd={roadToAddToCollection}
                    onSuccess={(collection) => {
                        setShowSaveToCollectionModal(false);
                        setRoadToAddToCollection(null);
                        showToast(`Road added to collection "${collection.name}" successfully!`, 'success', 3000);
                    }}
                    onCreateNew={(road) => {
                        setRoadToAddToCollection(road);
                        setSocialModalTab('collections');
                        setShowSocialModal(true);
                    }}
                />
            )}
            {/* Direct Road Drawer */}
            {mapRef.current && (
                <>
                {DRAWING_FEATURE_ENABLED && (
                    <DirectRoadDrawer
                        map={mapRef.current}
                        isDrawingMode={isDrawingMode}
                        setIsDrawingMode={setIsDrawingMode}
                        onRoadDrawn={handleRoadDrawn}
                    />
                )}
                    {/* RoutePlanner - only render when in planRoute sidebar mode */}
                    {sidebarMode === 'planRoute' && (
                        <RoutePlanner
                            map={mapRef.current}
                            isActive={isRoutePlanningMode}
                            onRouteCalculated={handleRouteCalculated}
                            onClose={() => {
                                setIsRoutePlanningMode(false);
                                setSidebarMode('default');
                            }}
                            auth={auth}
                            renderInSidebar={true}
                        />
                    )}
                    {/* Enhanced POI Along Route - removed per user request */}
                </>
            )}
            
            {/* Connectivity Indicator - show only when offline */}
            {!isOnline && (
                <div className="offline-indicator">
                    <FaBan />
                    <div>
                        <p className="offline-title">Offline mode</p>
                        <p className="offline-text">Changes sync once you reconnect.</p>
                    </div>
                </div>
            )}
            {/* Save Road Modal (only when drawing feature enabled) */}
            {DRAWING_FEATURE_ENABLED && showSaveRoadModal && drawnRoadData && (
                <SaveRoadModal
                    isOpen={showSaveRoadModal}
                    onClose={() => {
                        setShowSaveRoadModal(false);
                        setDrawnRoadData(null);
                    }}
                    roadData={drawnRoadData}
                    onSave={handleSaveCustomRoad}
                    auth={auth}
                    userSettings={userSettings}
                />
            )}
            {/* Road Edit Modal */}
            {showEditModal && editingRoad && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[30000] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">Edit Road</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <span className="text-xl">✕</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                        throw new Error('Authentication token not found');
                                    }
                                    const response = await axios.put(
                                        `/api/saved-roads/${editingRoad.id}`,
                                        {
                                            road_name: editingRoad.road_name,
                                            description: editingRoad.description,
                                            is_public: editingRoad.is_public
                                        },
                                        {
                                            headers: { Authorization: `Bearer ${token}` }
                                        }
                                    );
                                    const updatedRoads = savedRoads.map(road =>
                                        road.id === editingRoad.id ? response.data : road
                                    );
                                    setSavedRoads(updatedRoads);
                                    setShowEditModal(false);
                                } catch (error) {
                                    showToast('Failed to update road. Please try again.', 'error', 4000);
                                }
                            }}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Road Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editingRoad.road_name}
                                        onChange={(e) => setEditingRoad({...editingRoad, road_name: e.target.value})}
                                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={editingRoad.description || ''}
                                        onChange={(e) => setEditingRoad({...editingRoad, description: e.target.value})}
                                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                        rows="4"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={editingRoad.is_public}
                                            onChange={(e) => setEditingRoad({...editingRoad, is_public: e.target.checked})}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Make this road public</span>
                                    </label>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            </div>
        </div>
    );
};

export default Map;

