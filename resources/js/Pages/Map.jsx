import React, { useState, useEffect, useRef, useContext } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import NavigationAppSelector from '../Components/NavigationAppSelector';
import PhotoGallery from '../Components/PhotoGallery';
import PhotoUploader from '../Components/PhotoUploader';
import PoiControls from '../Components/PoiControls';
import PoiDetails from '../Components/PoiDetails';
import RatingModal from '../Components/RatingModal';
import SocialModal from '../Components/SocialModal';
import SelfProfileModal from '../Components/SelfProfileModal';
import StarRating from '../Components/StarRating';
import SaveToCollectionModal from '../Components/SaveToCollectionModal';
import MapWeatherDisplay from '../Components/MapWeatherDisplay';
import { UserSettingsContext } from '../Contexts/UserSettingsContext';
import usePointsOfInterest from '../Hooks/usePointsOfInterest';
import { FaTag, FaTimes, FaChevronDown } from 'react-icons/fa';
import CollapsibleFilterByTags from '../Components/CollapsibleFilterByTags';

// TagCategoryCollapsible component for displaying tags with collapsible functionality
function TagCategoryCollapsible({ tags, onTagSelect, selectedTagIds = [] }) {
    const [expanded, setExpanded] = useState(false);
    const initialVisibleCount = 5;
    const hasMoreTags = tags.length > initialVisibleCount;

    // Get visible tags based on expanded state
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

export default function Map() {
    const { userSettings } = useContext(UserSettingsContext);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const radiusCircleRef = useRef(null);
    const roadsLayerRef = useRef(null);

    // POI state and hooks
    const [selectedPoiId, setSelectedPoiId] = useState(null);
    const [selectedPoi, setSelectedPoi] = useState(null);
    const [poiControlsKey, setPoiControlsKey] = useState(Date.now()); // For forcing re-render
    const [currentPoiLocation, setCurrentPoiLocation] = useState(null); // Track current location for POIs
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

    // Helper function to get twistiness label
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
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
    const [savedRoads, setSavedRoads] = useState([]); // List of saved roads
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
    const [showNavigationSelector, setShowNavigationSelector] = useState(false);
    const [lengthFilter, setLengthFilter] = useState('all');
    const [curvinessFilter, setCurvinessFilter] = useState('all');
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState('rating');
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [roadToAddToCollection, setRoadToAddToCollection] = useState(null);
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [mapCenter, setMapCenter] = useState({ lat: 57.1, lng: 27.1 });
    // Local state for settings that need to be tracked in this component
    const [localSettings, setLocalSettings] = useState({
        default_search_radius: 10,
        default_search_type: 'town',
        show_community_by_default: false,
    });

    // Initialize auth state from localStorage and check for login_required parameter
    useEffect(() => {
        // Check for login_required parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const loginRequired = urlParams.get('login_required');

        if (loginRequired === 'true') {
            // Show login message
            alert('You need to log in to access this feature. Please log in to continue.');
            // Remove the parameter from URL without refreshing the page
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }

        const token = localStorage.getItem('token');
        if (token) {
            // Set axios default authorization header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Fetch user data to verify token and restore session
            axios.get('/api/user', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => {
                setAuth({ user: response.data, token });
            })
            .catch(() => {
                // If token is invalid, clear it
                localStorage.removeItem('token');
                delete axios.defaults.headers.common['Authorization'];
                setAuth({ user: null, token: null });
            });
        }
    }, []); // Run only once on component mount

    // Effect for loading saved roads when auth state changes
    useEffect(() => {
        const loadSavedRoads = async () => {
            if (auth.token) {
                try {
                    console.log("Loading saved roads with token:", auth.token);
                    const response = await axios.get('/api/saved-roads', {
                        headers: { Authorization: `Bearer ${auth.token}` }
                    });
                    console.log("Saved roads response:", response.data);

                    if (Array.isArray(response.data)) {
                        setSavedRoads(response.data);
                        console.log("Saved roads set to:", response.data.length, "roads");
                    } else {
                        console.error("Saved roads response is not an array:", response.data);
                        setSavedRoads([]);
                    }
                } catch (error) {
                    console.error('Error loading saved roads:', error);
                    console.error('Error details:', error.response?.data);

                    if (error.response?.status === 401) {
                        // If unauthorized, clear auth state
                        console.log("Unauthorized, clearing auth state");
                        localStorage.removeItem('token');
                        delete axios.defaults.headers.common['Authorization'];
                        setAuth({ user: null, token: null });
                    }
                }
            } else {
                console.log("No auth token available, skipping saved roads fetch");
            }
        };

        loadSavedRoads();
    }, [auth.token]); // Reload when auth token changes

    // Effect to apply user settings from context
    useEffect(() => {
        if (userSettings) {
            // Apply settings to the UI
            setRadius(userSettings.default_search_radius);
            setSearchType(userSettings.default_search_type);
            setShowCommunity(userSettings.show_community_by_default);

            // Update local settings
            setLocalSettings({
                default_search_radius: userSettings.default_search_radius,
                default_search_type: userSettings.default_search_type,
                show_community_by_default: userSettings.show_community_by_default,
            });

            // Apply theme if needed
            if (userSettings.theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, [userSettings]); // Reload when userSettings changes

    // Fetch available tags
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await axios.get('/api/tags');
                setAvailableTags(response.data);
            } catch (error) {
                console.error('Error fetching tags:', error);
            }
        };

        fetchTags();
    }, []);

    // Define category order and names
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

    // Group tags by category
    const groupTagsByCategory = () => {
        const groupedTags = availableTags.reduce((acc, tag) => {
            const category = tag.type || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(tag);
            return acc;
        }, {});

        // Sort categories according to categoryOrder
        return Object.fromEntries(
            // First get entries from groupedTags that are in categoryOrder (in that order)
            categoryOrder
                .filter(category => groupedTags[category] && groupedTags[category].length > 0)
                .map(category => [category, groupedTags[category]])
                // Then add any remaining categories not in categoryOrder
                .concat(
                    Object.entries(groupedTags)
                        .filter(([category]) => !categoryOrder.includes(category))
                )
        );
    };

    // Get category display name
    const getCategoryName = (category) => {
        return categoryNames[category] || category;
    };

    const handleRadiusChange = (e) => {
        const newRadius = Number(e.target.value);
        setRadius(newRadius);
        // Also update our persistent radius reference directly
        radiusRef.current = newRadius;
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setRadius(newRadius * 1000);
        }

        // Update the range progress CSS variable
        const percentage = ((newRadius - 1) / (50 - 1)) * 100;
        e.target.style.setProperty('--range-progress', `${percentage}%`);
    };

    // Store the marker icon and radius as refs to persist them between renders
    const markerIconRef = useRef(null);
    const radiusRef = useRef(radius);

    // Update radiusRef whenever radius state changes
    useEffect(() => {
        radiusRef.current = radius;
    }, [radius]);

    const handleMapClick = (e) => {
        // Check if the click is on a control element
        if (e.originalEvent.target.closest('.poi-controls') ||
            e.originalEvent.target.closest('.leaflet-control') ||
            e.originalEvent.target.closest('button') ||
            e.originalEvent.target.closest('.poi-details')) { // Also check for POI details panel
            console.log('Click on control element, ignoring map click');
            return;
        }

        // Only drop a marker if in marker drop mode
        if (!markerDropMode) {
            console.log('Not in marker drop mode, ignoring map click for marker placement');
            return;
        }

        console.log('Marker drop mode is active, processing map click');

        const map = mapRef.current;
        if (!map) {
            console.error('Map reference is not available');
            return;
        }

        const latlng = e.latlng;
        console.log('Map clicked at coordinates:', latlng);

        // Use the persistent radius reference
        const currentRadius = radiusRef.current;

        try {
            // Create a custom marker icon with higher z-index if not already created
            if (!markerIconRef.current) {
                markerIconRef.current = L.icon({
                    iconUrl: '/images/marker-icon.png',
                    iconRetinaUrl: '/images/marker-icon-2x.png',
                    shadowUrl: '/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                    className: 'main-location-marker' // Custom class for styling
                });
            }

            if (markerRef.current) {
                // Just update the position, don't recreate the marker
                console.log('Updating existing marker position');
                markerRef.current.setLatLng(latlng);
            } else {
                // Create the marker for the first time
                console.log('Creating new marker');
                markerRef.current = L.marker(latlng, {
                    icon: markerIconRef.current,
                    zIndexOffset: 1000 // Ensure marker stays on top
                }).addTo(map);
            }

            if (radiusCircleRef.current) {
                console.log('Updating existing radius circle');
                radiusCircleRef.current.setLatLng(latlng).setRadius(currentRadius * 1000);
            } else {
                console.log('Creating new radius circle');
                radiusCircleRef.current = L.circle(latlng, {
                    radius: currentRadius * 1000,
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.05,
                    zIndex: 100 // Lower than marker but still high
                }).addTo(map);
            }

            // Log the current location for debugging
            console.log('Map clicked at:', latlng);
            console.log('Current location for POI search:', latlng);

            // Update the current location for POI search
            setCurrentPoiLocation({
                lat: latlng.lat,
                lon: latlng.lng
            });

            // Only update the POI controls key if there's no marker yet
            // This prevents the POI window from expanding each time a marker is dropped
            if (!markerRef.current) {
                setPoiControlsKey(Date.now());
            }

            // Always close any open POI details when placing a new marker
            if (selectedPoi) {
                setSelectedPoi(null);
                setSelectedPoiId(null);
            }

            // Turn off marker drop mode after placing a marker
            setMarkerDropMode(false);

            console.log('Marker placed successfully');
        } catch (error) {
            console.error('Error placing marker:', error);
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
            alert("Please select a location on the map first!");
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
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();
            roadsLayerRef.current.clearLayers();

            const newRoads = [];
            data.elements.forEach((way) => {
                if (!way.geometry) return;

                const roadLength = getRoadLength(way.geometry);
                if (roadLength < 1750) return;

                const twistinessData = calculateTwistiness(way.geometry);
                if (twistinessData === 0) return;

                if (curvatureType === "curvy" && twistinessData.twistiness <= 0.007) return;
                if (curvatureType === "moderate" && (twistinessData.twistiness < 0.0035 || twistinessData.twistiness > 0.007)) return;
                if (curvatureType === "mellow" && twistinessData.twistiness > 0.0035) return;

                const coordinates = way.geometry.map(point => [point.lat, point.lon]);
                const name = way.tags.name || "Unnamed Road";

                let color = "green";
                if (twistinessData.twistiness > 0.007) color = "red";
                else if (twistinessData.twistiness > 0.0035) color = "yellow";

                const polyline = L.polyline(coordinates, { color, weight: 8 }).addTo(roadsLayerRef.current);

                // Convert distance based on user settings
                const distanceInKm = roadLength / 1000;
                const distanceInMiles = distanceInKm * 0.621371;
                const displayDistance = userSettings.measurement_units === 'imperial'
                    ? `${distanceInMiles.toFixed(2)} miles`
                    : `${distanceInKm.toFixed(2)} km`;

                // Get elevation data from the API response if available
                const elevationGain = way.elevation_gain ?
                    userSettings.measurement_units === 'imperial' ?
                        `${Math.round(way.elevation_gain * 3.28084)} ft` :
                        `${Math.round(way.elevation_gain)} m` :
                    'N/A';

                const elevationLoss = way.elevation_loss ?
                    userSettings.measurement_units === 'imperial' ?
                        `${Math.round(way.elevation_loss * 3.28084)} ft` :
                        `${Math.round(way.elevation_loss)} m` :
                    'N/A';

                const maxElevation = way.max_elevation ?
                    userSettings.measurement_units === 'imperial' ?
                        `${Math.round(way.max_elevation * 3.28084)} ft` :
                        `${Math.round(way.max_elevation)} m` :
                    'N/A';

                const popupContent = `
                    <div class="road-popup">
                        <h3 class="font-bold">${name}</h3>
                        <p>Length: ${displayDistance}</p>
                        <p>Corners: ${twistinessData.corner_count}</p>
                        <p>Curve Score: ${twistinessData.twistiness.toFixed(4)}</p>
                        <p>Elevation Gain: ${elevationGain} ↑</p>
                        <p>Elevation Loss: ${elevationLoss} ↓</p>
                        <p>Max Elevation: ${maxElevation}</p>
                        <p class="text-xs text-gray-500">Debug: ${JSON.stringify({
                            gain: way.elevation_gain,
                            loss: way.elevation_loss,
                            max: way.max_elevation,
                            min: way.min_elevation
                        })}</p>
                        ${auth.user ?
                            `<button id="save-road-${way.id}" class="bg-blue-500 text-white px-2 py-1 rounded mt-2">Save Road</button>` :
                            '<p class="text-sm text-gray-500 mt-2">Log in to save roads</p>'
                        }
                    </div>
                `;

                const popup = L.popup().setContent(popupContent);
                polyline.bindPopup(popup);

                if (auth.user) {
                    polyline.on("popupopen", () => {
                        document.getElementById(`save-road-${way.id}`)?.addEventListener('click', () =>
                            saveRoad({
                                name,
                                coordinates,
                                twistiness: twistinessData.twistiness,
                                corner_count: twistinessData.corner_count,
                                length: roadLength,
                                elevation_gain: way.elevation_gain,
                                elevation_loss: way.elevation_loss,
                                max_elevation: way.max_elevation,
                                min_elevation: way.min_elevation
                            })
                        );
                    });
                }

                newRoads.push({ id: way.id, name, coordinates });
            });

            setRoads(newRoads);
        } catch (error) {
            console.error("Error fetching roads:", error);
            alert("Failed to fetch roads. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const saveRoad = async (road) => {
        if (!auth.token) {
            alert("Please log in to save roads");
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
            alert("Road saved successfully!");
        } catch (error) {
            console.error("Error saving road:", error.response?.data || error.message);
            if (error.response?.data?.errors) {
                alert(
                    Object.values(error.response.data.errors)
                        .flat()
                        .join('\n')
                );
            } else {
                alert("Failed to save road.");
            }
        }
    };

    const addReview = async (roadId, rating) => {
        try {
            await axios.post(`/api/saved-roads/${roadId}/review`, { rating }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            alert("Review added successfully!");
        } catch (error) {
            console.error("Error adding review:", error);
            alert("Failed to add review.");
        }
    };

    const addComment = async (roadId, comment) => {
        try {
            await axios.post(`/api/saved-roads/${roadId}/comment`, { comment }, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            alert("Comment added successfully!");
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Failed to add comment.");
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            console.log("Attempting login with:", loginForm);

            // Ensure we have a fresh CSRF token
            if (window.refreshCSRFToken) {
                const success = await window.refreshCSRFToken();
                if (!success) {
                    console.warn('Failed to refresh CSRF token, but will try to continue anyway');
                }
            }

            // Try multiple approaches to login
            let loginSuccess = false;
            let userData = null;
            let authToken = null;
            let errorMessage = null;

            // First try: Direct form submission (most reliable)
            try {
                const formData = new FormData();
                formData.append('login', loginForm.login);
                formData.append('password', loginForm.password);

                const response = await fetch('/api/login', {
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
                console.warn('Form submission login failed, trying axios:', formError);

                // Second try: Axios with JSON
                try {
                    const response = await axios.post('/api/login', {
                        login: loginForm.login,
                        password: loginForm.password
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        withCredentials: true
                    });

                    console.log("Login response:", response.data);

                    if (response.data && response.data.user && response.data.token) {
                        loginSuccess = true;
                        userData = response.data.user;
                        authToken = response.data.token;
                    } else {
                        errorMessage = response.data.message || 'Login successful but user data is missing';
                    }
                } catch (axiosError) {
                    console.error("Axios login failed:", axiosError);
                    errorMessage = axiosError.response?.data?.message || axiosError.message || 'Login failed';
                    throw axiosError;
                }
            }

            // If login was successful with any method
            if (loginSuccess && userData && authToken) {
                localStorage.setItem('token', authToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
                setAuth({ user: userData, token: authToken });
                setLoginForm({ login: '', password: '' });

                // Load saved roads immediately after login
                try {
                    console.log("Fetching saved roads after login...");
                    const roadsResponse = await axios.get('/api/saved-roads', {
                        headers: { Authorization: `Bearer ${authToken}` }
                    });
                    console.log("Fetched saved roads:", roadsResponse.data);
                    setSavedRoads(roadsResponse.data);
                } catch (roadsError) {
                    console.error("Error fetching saved roads after login:", roadsError);
                }

                // Stay on the map page, no need to redirect
                alert("Successfully logged in!");
            } else {
                throw new Error(errorMessage || 'Login failed for unknown reason');
            }
        } catch (error) {
            console.error("Login error:", error);
            console.error("Login error details:", error.response?.data || error.message);

            // Check if this is an email verification error
            if (error.response?.data?.verification_needed) {
                // Determine if login is an email or username
                const loginValue = loginForm.login;
                const isEmail = loginValue.includes('@');
                const email = isEmail ? loginValue : error.response?.data?.email || loginValue;

                const message = `Please verify your email address before logging in. We've sent a verification link to ${email}.`;
                alert(message);

                // Show option to resend verification email
                if (confirm("Would you like us to resend the verification email?")) {
                    try {
                        await axios.post('/api/email/verification-notification', { email }, {
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });
                        alert("Verification email has been resent. Please check your inbox.\n\nIf you're having trouble with the verification link, please check your spam folder or contact support.");
                    } catch (resendError) {
                        console.error("Error resending verification email:", resendError);
                        alert("Failed to resend verification email. Please try again later.");
                    }
                }
            } else {
                alert(error.response?.data?.message || "Failed to log in.");
            }
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout', {}, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setAuth({ user: null, token: null });
            setSavedRoads([]); // Clear saved roads on logout
            alert("Logged out successfully!");
        } catch (error) {
            console.error("Logout error:", error);
            // Still clear local state even if the server request fails
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setAuth({ user: null, token: null });
            setSavedRoads([]);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/register', registerForm, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                withCredentials: true
            });

            alert("Registration successful! Please check your email to verify your account before logging in.");
            setAuthMode('login');
            setRegisterForm({ name: '', email: '', password: '', password_confirmation: '' });
        } catch (error) {
            console.error("Registration error:", error.response?.data || error.message);
            if (error.response?.data?.errors) {
                alert(Object.values(error.response.data.errors).flat().join('\n'));
            } else {
                alert(error.response?.data?.message || "Failed to register.");
            }
        }
    };

    const displayRoadOnMap = (road) => {
        if (!mapRef.current) return;

        // Clear existing layers
        roadsLayerRef.current.clearLayers();

        // Add the road's polyline to the map
        const coordinates = JSON.parse(road.road_coordinates);
        const polyline = L.polyline(coordinates, { color: 'blue', weight: 8 }).addTo(roadsLayerRef.current);

        // Zoom to the road
        mapRef.current.fitBounds(polyline.getBounds());
    };

    const handleRoadClick = async (roadId) => {
        try {
            // Use the public endpoint to view road details without requiring authentication
            const response = await axios.get(`/api/public-roads/${roadId}`);
            setSelectedRoad(response.data);
            displayRoadOnMap(response.data);
        } catch (error) {
            console.error("Error fetching road details:", error);
            alert("Failed to fetch road details.");
        }
    };

    // Move edit form to be part of each road item
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

        // Update editData and roadPhotos when road prop changes
        useEffect(() => {
            try {
                setEditData({
                    road_name: road.road_name || '',
                    description: road.description || ''
                });
                setRoadPhotos(road.photos || []);
            } catch (error) {
                console.error("Error updating road data:", error);
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
                    // Remove road from savedRoads
                    setSavedRoads(prevRoads => prevRoads.filter(r => r.id !== roadId));

                    // Remove from publicRoads if present
                    setPublicRoads(prevRoads => prevRoads.filter(r => r.id !== roadId));

                    // Clear the road from the map if it was selected
                    if (selectedRoadId === roadId) {
                        roadsLayerRef.current.clearLayers();
                        setSelectedRoadId(null);
                    }

                    alert("Road deleted successfully!");
                }
            } catch (error) {
                console.error("Error deleting road:", error);

                // Extract the error message from the response if available
                let errorMessage = "Failed to delete road. Please try again.";
                if (error.response) {
                    if (error.response.status === 404) {
                        errorMessage = "Road not found or you don't have permission to delete it.";
                    } else if (error.response.data && error.response.data.message) {
                        errorMessage = error.response.data.message;
                    }
                }

                alert(errorMessage);
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

                    // Update the road in savedRoads
                    setSavedRoads(prevRoads =>
                        prevRoads.map(r => r.id === road.id ? updatedRoad : r)
                    );

                    // Update the road in publicRoads if it exists there
                    setPublicRoads(prevRoads =>
                        prevRoads.map(r => r.id === road.id ? updatedRoad : r)
                    );

                    setIsEditing(false);
                    alert("Road updated successfully!");
                }
            } catch (error) {
                console.error("Error updating road:", error);
                const errorMessage = error.response?.data?.error || "Failed to update road.";
                alert(errorMessage);
            }
        };

        const formatLength = (meters) => {
            if (userSettings.measurement_units === 'imperial') {
                return ((meters / 1000) * 0.621371).toFixed(2) + ' miles';
            }
            return (meters / 1000).toFixed(2) + ' km';
        };

        const formatElevation = (meters) => {
            if (!meters && meters !== 0) return 'N/A';
            if (userSettings.measurement_units === 'imperial') {
                return Math.round(meters * 3.28084) + ' ft';
            }
            return Math.round(meters) + ' m';
        };

        const handleViewOnMap = () => {
            onNavigateClick(road.id);
            if (mapRef.current && road.road_coordinates) {
                const coordinates = JSON.parse(road.road_coordinates);

                // Clear existing layers and add the new road
                roadsLayerRef.current.clearLayers();
                const polyline = L.polyline(coordinates, {
                    color: selectedRoadId === road.id ? '#2563eb' : '#4ade80', // Blue when selected, green otherwise
                    weight: 6,
                    opacity: 0.8
                }).addTo(roadsLayerRef.current);

                // Fit map to the road bounds
                mapRef.current.fitBounds(polyline.getBounds(), {
                    padding: [50, 50] // Add some padding around the bounds
                });
            }
        };

        const handleNavigateClick = () => {
            // Set the selected road at the Map component level
            setSelectedRoad({
                ...road,
                road_coordinates: road.road_coordinates
            });
            // Open the navigation selector modal at the Map component level
            setShowNavigationSelector(true);
        };

        const handlePhotoUploaded = (data) => {
            if (data.photo && data.road) {
                // Update the road photos
                setRoadPhotos([...roadPhotos, data.photo]);

                // Update the road in savedRoads to include the new photo
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
            // Remove the photo from roadPhotos
            setRoadPhotos(roadPhotos.filter(photo => photo.id !== photoId));

            // Update the road in savedRoads
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

        // Add this inside the expanded view, before the edit/delete buttons
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
            if (isDeleting) return; // Prevent multiple clicks

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
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateClick();
                            }}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            Navigate
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

                {/* Navigation modal is now handled at the Map component level */}
            </li>
        );
    };

    // Function to handle viewing a road on the map
    const handleViewOnMap = (road) => {
        if (!mapRef.current || !road.road_coordinates) return;

        try {
            const coordinates = JSON.parse(road.road_coordinates);

            // Clear existing layers and add the new road
            roadsLayerRef.current.clearLayers();
            const polyline = L.polyline(coordinates, {
                color: '#2563eb', // Blue color
                weight: 6,
                opacity: 0.8
            }).addTo(roadsLayerRef.current);

            // Fit map to the road bounds
            mapRef.current.fitBounds(polyline.getBounds(), {
                padding: [50, 50] // Add some padding around the bounds
            });

            // Set the selected road ID
            setSelectedRoadId(road.id);
        } catch (error) {
            console.error("Error displaying road on map:", error);
            alert("Failed to display road on map. Invalid coordinates format.");
        }
    };

    // State for marker drop mode
    const [markerDropMode, setMarkerDropMode] = useState(false);

    // Initialize map only once
    useEffect(() => {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || mapRef.current) return;

        console.log('Initializing map...');

        // Create the map with specific options to prevent errors
        const leafletMap = L.map(mapContainer, {
            center: [57.1, 27.1],
            zoom: 10,
            zoomControl: false, // Disable default zoom control, we'll add it manually
            attributionControl: true,
            fadeAnimation: true,
            zoomAnimation: true,
            markerZoomAnimation: true
        });

        // Add zoom control to the bottom-right corner
        L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
            updateWhenIdle: true,
            updateWhenZooming: false,
            updateInterval: 250,
        }).addTo(leafletMap);

        // Force a resize event after map initialization
        setTimeout(() => {
            leafletMap.invalidateSize();
            console.log('Map resized');
        }, 500);

        // We'll set up the click handler in a separate useEffect to ensure it has access to the current state

        // Add event listener for map move end to update mapCenter
        leafletMap.on('moveend', () => {
            const center = leafletMap.getCenter();
            setMapCenter({ lat: center.lat, lng: center.lng });
        });

        // Add event listener for POI popup clicks
        leafletMap.on('popupopen', (e) => {
            const popup = e.popup;
            const content = popup._contentNode;

            // Find any POI view buttons in the popup
            const poiButtons = content.querySelectorAll('[id^="view-poi-"]');
            poiButtons.forEach(button => {
                const poiId = button.id.replace('view-poi-', '');
                button.addEventListener('click', () => {
                    // Find the POI data from our state
                    const allPois = [...tourism, ...fuelStations, ...chargingStations];
                    const poi = allPois.find(p => p.osm_id?.toString() === poiId || p.id?.toString() === poiId);

                    if (poi) {
                        setSelectedPoiId(poiId);
                        setSelectedPoi(poi);
                        console.log('Selected POI:', poi);
                    } else {
                        console.warn('POI not found with ID:', poiId);
                        console.log('Available POIs:', allPois);
                    }
                });
            });
        });

        mapRef.current = leafletMap;

        const newLayerGroup = L.layerGroup().addTo(leafletMap);
        roadsLayerRef.current = newLayerGroup;

        // Add event listener for custom viewRoadOnMap event
        const handleViewRoadOnMapEvent = (event) => {
            if (event.detail && event.detail.road) {
                handleViewOnMap(event.detail.road);
            }
        };

        // Add event listeners for collection actions
        const handleViewCollectionDetailsEvent = (event) => {
            if (event.detail && event.detail.collection) {
                console.log("View collection details:", event.detail.collection);
                // For now, just show an alert
                alert(`Collection details: ${event.detail.collection.name} (${event.detail.collection.roads?.length || 0} roads)`);
                // TODO: Implement proper collection details view
            }
        };

        const handleEditCollectionEvent = (event) => {
            if (event.detail && event.detail.collection) {
                console.log("Edit collection:", event.detail.collection);
                // For now, just show an alert
                alert(`Edit collection: ${event.detail.collection.name}`);
                // TODO: Implement proper collection editing
            }
        };

        window.addEventListener('viewRoadOnMap', handleViewRoadOnMapEvent);
        window.addEventListener('viewCollectionDetails', handleViewCollectionDetailsEvent);
        window.addEventListener('editCollection', handleEditCollectionEvent);

        // Add Font Awesome CSS for POI markers
        if (!document.getElementById('font-awesome-css')) {
            const link = document.createElement('link');
            link.id = 'font-awesome-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(link);
        }

        return () => {
            leafletMap.off();
            leafletMap.remove();
            mapRef.current = null;
            markerRef.current = null;
            radiusCircleRef.current = null;
            roadsLayerRef.current = null;

            // Remove the event listeners when component unmounts
            window.removeEventListener('viewRoadOnMap', handleViewRoadOnMapEvent);
            window.removeEventListener('viewCollectionDetails', handleViewCollectionDetailsEvent);
            window.removeEventListener('editCollection', handleEditCollectionEvent);
        };
    }, []); // Empty dependency array to ensure map is initialized only once

    // Set up map click handler in a separate useEffect to ensure it has access to the current markerDropMode state
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove any existing click handlers to prevent duplicates
        mapRef.current.off('click');

        // Add the click handler with access to the current markerDropMode state
        mapRef.current.on('click', (e) => {
            // Check if the click is on a control element
            if (e.originalEvent.target.closest('.poi-controls') ||
                e.originalEvent.target.closest('.leaflet-control') ||
                e.originalEvent.target.closest('button') ||
                e.originalEvent.target.closest('.poi-details')) { // Also check for POI details panel
                console.log('Click on control element, ignoring map click');
                return;
            }

            // Only drop a marker if in marker drop mode
            if (!markerDropMode) {
                console.log('Not in marker drop mode, ignoring map click for marker placement');
                return;
            }

            console.log('Marker drop mode is active, processing map click');

            const map = mapRef.current;
            if (!map) {
                console.error('Map reference is not available');
                return;
            }

            const latlng = e.latlng;
            console.log('Map clicked at coordinates:', latlng);

            // Use the persistent radius reference
            const currentRadius = radiusRef.current;

            try {
                // Create a custom marker icon with higher z-index if not already created
                if (!markerIconRef.current) {
                    markerIconRef.current = L.icon({
                        iconUrl: '/images/marker-icon.png',
                        iconRetinaUrl: '/images/marker-icon-2x.png',
                        shadowUrl: '/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41],
                        className: 'main-location-marker' // Custom class for styling
                    });
                }

                if (markerRef.current) {
                    // Just update the position, don't recreate the marker
                    console.log('Updating existing marker position');
                    markerRef.current.setLatLng(latlng);
                } else {
                    // Create the marker for the first time
                    console.log('Creating new marker');
                    markerRef.current = L.marker(latlng, {
                        icon: markerIconRef.current,
                        zIndexOffset: 1000 // Ensure marker stays on top
                    }).addTo(map);
                }

                if (radiusCircleRef.current) {
                    console.log('Updating existing radius circle');
                    radiusCircleRef.current.setLatLng(latlng).setRadius(currentRadius * 1000);
                } else {
                    console.log('Creating new radius circle');
                    radiusCircleRef.current = L.circle(latlng, {
                        radius: currentRadius * 1000,
                        color: 'blue',
                        fillColor: 'blue',
                        fillOpacity: 0.05,
                        zIndex: 100 // Lower than marker but still high
                    }).addTo(map);
                }

                // Log the current location for debugging
                console.log('Map clicked at:', latlng);
                console.log('Current location for POI search:', latlng);

                // Update the current location for POI search
                setCurrentPoiLocation({
                    lat: latlng.lat,
                    lon: latlng.lng
                });

                // Only update the POI controls key if there's no marker yet
                // This prevents the POI window from expanding each time a marker is dropped
                if (!markerRef.current) {
                    setPoiControlsKey(Date.now());
                }

                // Always close any open POI details when placing a new marker
                if (selectedPoi) {
                    setSelectedPoi(null);
                    setSelectedPoiId(null);
                }

                // Turn off marker drop mode after placing a marker
                setMarkerDropMode(false);

                console.log('Marker placed successfully');
            } catch (error) {
                console.error('Error placing marker:', error);
            }
        });

        return () => {
            // Clean up the click handler when the component unmounts or markerDropMode changes
            if (mapRef.current) {
                mapRef.current.off('click');
            }
        };
    }, [markerDropMode, selectedPoi]); // Re-attach the handler when markerDropMode changes

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

            console.log('Fetching public roads with params:', { lat, lon, radius, tags: selectedTagIds });

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

            // Check if response.data is an array or an object with a roads property
            let roadsData = response.data;
            if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                roadsData = response.data.roads;
                console.log(`Found ${roadsData.length} roads from response`);
            } else if (!Array.isArray(response.data)) {
                console.error('Unexpected response format:', response.data);
                setSearchError('Unexpected response format from server');
                return;
            }

            // Ensure average_rating is properly formatted and user data is present
            const formattedRoads = roadsData.map(road => ({
                ...road,
                average_rating: road.reviews_avg_rating ? parseFloat(road.reviews_avg_rating) : null,
                user: road.user || { name: 'Unknown User' }
            }));

            setPublicRoads(formattedRoads);
        } catch (error) {
            console.error('Error fetching public roads:', error);
            // Show error popup
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

            // Determine search parameters based on search type
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

            // If search type is country, try to get the country name
            if (searchType === 'country') {
                try {
                    // Reverse geocode to get country
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
                        // Add country to search params
                        searchParams.country = geocodeResponse.data.address.country;
                        console.log(`Searching by country: ${searchParams.country}`);
                    }
                } catch (geocodeError) {
                    console.error('Error getting country from coordinates:', geocodeError);
                    // Continue with radius-based search if geocoding fails
                }
            }

            const response = await axios.get('/api/public-roads', {
                params: searchParams
            });

            // Check if response.data is an array or an object with a roads property
            let roadsData = response.data;
            if (response.data && response.data.roads && Array.isArray(response.data.roads)) {
                roadsData = response.data.roads;
            } else if (!Array.isArray(response.data)) {
                console.error('Unexpected response format:', response.data);
                setSearchError('Unexpected response format from server');
                return;
            }

            setPublicRoads(roadsData);
        } catch (error) {
            console.error('Error fetching public roads:', error);
            setSearchError('Failed to fetch public roads. Please try again.');
        }
    };

    const toggleRoadPublic = async (roadId) => {
        try {
            const response = await axios.post(`/api/saved-roads/${roadId}/toggle-public`, {}, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });

            // Update the road's public status in the local state
            setSavedRoads(prevRoads =>
                prevRoads.map(road =>
                    road.id === roadId
                        ? { ...road, is_public: response.data.is_public }
                        : road
                )
            );

            // Show success message
            alert(response.data.message);
        } catch (error) {
            console.error('Error toggling road public status:', error);
            alert(error.response?.data?.message || 'Failed to update road visibility');
        }
    };

    // Update the main search handler
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

    // Add community search handler
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

    // Update searchLocation to handle different result states
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

            const formattedResults = response.data
                .filter(result => result.type !== 'house' && result.type !== 'postcode')
                .map(result => ({
                    ...result,
                    displayName: formatLocationName(result)
                }));

            setResults(formattedResults);
        } catch (error) {
            console.error('Error searching location:', error);
            setSearchError('Failed to search location. Please try again.');
            setResults([]);
        } finally {
            setSearchingState(false);
        }
    };

    // Helper function to format location names
    const formatLocationName = (result) => {
        const address = result.address;
        const parts = [];

        // Add the most specific location first
        if (address.city || address.town || address.village || address.municipality) {
            parts.push(address.city || address.town || address.village || address.municipality);
        }

        // Add county/state/region if available
        if (address.county) {
            parts.push(address.county);
        } else if (address.state || address.region) {
            parts.push(address.state || address.region);
        }

        // Always add country
        if (address.country) {
            parts.push(address.country);
        }

        // If no parts were added (e.g., for natural features), use the display name
        if (parts.length === 0) {
            return result.display_name.split(',').slice(0, 3).join(',');
        }

        return parts.join(', ');
    };

    // Update location selection handlers
    const handleMainLocationSelect = (location) => {
        setSearchQuery(location.displayName);
        setSearchResults([]); // Clear results immediately

        // Store the current radius value to preserve it
        const currentRadius = radius;

        // Update the map location with the preserved radius
        updateMapLocation(location, currentRadius);
    };

    const handleCommunityLocationSelect = (location) => {
        setCommunitySearchQuery(location.displayName);
        setCommunitySearchResults([]); // Clear results immediately

        // Store the current radius value to preserve it
        const currentRadius = searchType === 'city' ? 10 :
                             searchType === 'regional' ? 50 :
                             searchType === 'country' ? 200 : radius;

        // Update the map location with the preserved radius
        updateMapLocation(location, currentRadius);

        if (showCommunity) {
            handleSearchPublicRoads(location.lat, location.lon);
        }
    };

    // Helper function to update map location
    const updateMapLocation = (location, preservedRadius = null) => {
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);

        // Use the preserved radius if provided, otherwise use the persistent radius reference
        const currentRadius = preservedRadius !== null ? preservedRadius : radiusRef.current;

        if (mapRef.current) {
            // Create a custom marker icon with higher z-index if not already created
            if (!markerIconRef.current) {
                markerIconRef.current = L.icon({
                    iconUrl: '/images/marker-icon.png',
                    iconRetinaUrl: '/images/marker-icon-2x.png',
                    shadowUrl: '/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                    className: 'main-location-marker' // Custom class for styling
                });
            }

            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lon]);
            } else {
                markerRef.current = L.marker([lat, lon], {
                    icon: markerIconRef.current,
                    zIndexOffset: 1000 // Ensure marker stays on top
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
                    zIndex: 100 // Lower than marker but still high
                }).addTo(mapRef.current);
            }

            // Center the map on the location
            mapRef.current.setView([lat, lon], 13);

            // Log the updated location for debugging
            console.log('Map location updated to:', [lat, lon]);
            console.log('Current location for POI search:', [lat, lon]);
            console.log('Using radius:', currentRadius);

            // Update the current location for POI search
            setCurrentPoiLocation({
                lat: lat,
                lon: lon
            });
        }
    };

    // Helper function to get current location from marker
    const getCurrentLocation = () => {
        if (markerRef.current) {
            const latLng = markerRef.current.getLatLng();
            console.log('Current location for POI search from marker:', latLng);
            return {
                lat: latLng.lat,
                lon: latLng.lng
            };
        } else if (mapRef.current) {
            // If no marker, use the center of the map
            const center = mapRef.current.getCenter();
            console.log('Using map center for POI search:', center);
            return { lat: center.lat, lon: center.lng };
        }
        console.warn('No location available for POI search');
        return null;
    };

    // Force re-render of POI controls when marker changes
    useEffect(() => {
        // This empty dependency array ensures this only runs once on mount
    }, [markerRef.current]);

    // Add these functions for handling ratings and comments
    const handleRateRoad = async (roadId, e = null) => {
        // If an event was passed, prevent propagation and default behavior
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        try {
            // Use the public endpoint to view road details without requiring authentication
            const response = await axios.get(`/api/public-roads/${roadId}`);
            const road = response.data;

            // If user is logged in, check for existing review
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

            // Open the rating modal without closing the social modal
            setRatingModalOpen(true);

            // Important: Do not close the social modal
            console.log('Rating modal opened, social modal should remain open');
        } catch (error) {
            console.error('Error fetching road details:', error);
            alert('Failed to load road details');
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
            // Refresh the public roads list
            if (showCommunity) {
                handleSearchPublicRoads();
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to submit review');
        }
    };

    // Global navigation handler used by community tab
    const handleNavigateClick = (road) => {
        if (!road.road_coordinates) {
            alert('No coordinates available for this road');
            return;
        }
        // Set the selected road and open the navigation modal
        setSelectedRoad(road);
        setShowNavigationSelector(true);
    };

    // Add state for sidebar collapse
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Add state for social modal
    const [showSocialModal, setShowSocialModal] = useState(false);

    // Add state for self profile modal
    const [showSelfProfileModal, setShowSelfProfileModal] = useState(false);

    // Add state for collection details
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);

    // Add state for road editing
    const [editingRoad, setEditingRoad] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Log when social modal state changes and reset roadToAddToCollection when closing
    useEffect(() => {
        console.log('Social modal state changed:', showSocialModal);

        // Reset roadToAddToCollection when opening the social modal directly
        // (not through SaveToCollectionModal's onCreateNew)
        if (showSocialModal && !roadToAddToCollection) {
            console.log('Opening social modal without a road to add');
        } else if (!showSocialModal) {
            // Reset when closing the modal
            setRoadToAddToCollection(null);
        }
    }, [showSocialModal]);

    // Set global authentication state for components that need it
    useEffect(() => {
        // Make authentication state available globally for components that can't access props
        window.isUserAuthenticated = auth?.user ? true : false;
        window.userId = auth?.user?.id || null;
        console.log('Global auth state set:', window.isUserAuthenticated);
        console.log('Global user ID set:', window.userId);
    }, [auth?.user]);

    // Add event listeners for collection and road actions from SelfProfileModal
    useEffect(() => {
        const handleViewCollectionDetails = (event) => {
            console.log('View collection details event received:', event.detail);
            const { collection } = event.detail;
            if (collection && collection.id) {
                // Explicitly set roadToAddToCollection to null when opening for collection details
                setRoadToAddToCollection(null);
                // Open the collection details modal through the social modal
                setShowSocialModal(true);
                setSelectedCollectionId(collection.id);
            }
        };

        const handleEditCollection = (event) => {
            console.log('Edit collection event received:', event.detail);
            const { collection } = event.detail;
            if (collection && collection.id) {
                // Explicitly set roadToAddToCollection to null when opening for collection editing
                setRoadToAddToCollection(null);
                // Open the social modal with collections tab active and set the collection ID
                setShowSocialModal(true);
                setSelectedCollectionId(collection.id);
            }
        };

        const handleEditRoad = (event) => {
            console.log('Edit road event received:', event.detail);
            const { road } = event.detail;
            if (road && road.id) {
                // Open the road edit modal
                setEditingRoad(road);
                setShowEditModal(true);
            }
        };

        const handleViewRoadDetails = (event) => {
            console.log('View road details event received:', event.detail);
            const { roadId } = event.detail;
            if (roadId) {
                // Prevent event propagation and default behavior to avoid closing modals or navigating
                if (event.preventDefault) {
                    event.preventDefault();
                }
                if (event.stopPropagation) {
                    event.stopPropagation();
                }

                // Open the rating modal with the road details
                // Pass the event to handleRateRoad to prevent propagation
                handleRateRoad(roadId, event);

                // Important: Do not close the social modal
                // The rating modal will appear on top due to higher z-index
            }
        };

        const handleNavigateToRoad = (event) => {
            console.log('Navigate to road event received:', event.detail);
            const { road } = event.detail;
            if (road && road.road_coordinates) {
                // Set the selected road and open the navigation modal
                setSelectedRoad(road);
                setShowNavigationSelector(true);
            }
        };

        const handleViewRoadOnMap = (event) => {
            console.log('View road on map event received:', event.detail);
            const { road } = event.detail;
            if (road && road.road_coordinates) {
                try {
                    // Close any open modals
                    setShowSocialModal(false);

                    // Parse the road coordinates
                    const coordinates = typeof road.road_coordinates === 'string'
                        ? JSON.parse(road.road_coordinates)
                        : road.road_coordinates;

                    if (coordinates && coordinates.length > 0) {
                        // Calculate the center of the road
                        const bounds = L.latLngBounds(coordinates.map(coord => [coord[0], coord[1]]));
                        const center = bounds.getCenter();

                        // Set the map view to the road
                        if (mapRef.current) {
                            mapRef.current.setView([center.lat, center.lng], 13);

                            // Draw the road on the map
                            if (roadsLayerRef.current) {
                                roadsLayerRef.current.clearLayers();
                            }

                            L.polyline(coordinates, {
                                color: '#3388ff',
                                weight: 5,
                                opacity: 0.8
                            }).addTo(roadsLayerRef.current);

                            // Fit the map to the road bounds
                            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                        }
                    }
                } catch (error) {
                    console.error('Error viewing road on map:', error);
                }
            }
        };

        const handleSaveRoadToCollection = (event) => {
            console.log('Save road to collection event received:', event.detail);
            const { road } = event.detail;

            // Check if user is authenticated - use both auth.user and localStorage token
            const token = localStorage.getItem('token');

            if (auth.user || token) {
                console.log('User is authenticated, opening save to collection modal');

                // Set global auth state for child components
                window.isUserAuthenticated = true;
                window.userId = auth.user?.id;

                // Store auth state in localStorage for components that might not have access to auth prop
                if (!token && auth.user) {
                    // If we have auth.user but no token, store a temporary token
                    localStorage.setItem('temp_auth_state', 'true');
                }

                // Set the road to add to a collection
                setRoadToAddToCollection(road);

                // Only open the SaveToCollectionModal - it will have options for both
                // adding to existing collections and creating a new one
                setShowSaveToCollectionModal(true);

                // Make sure social modal is closed to prevent modal stacking issues
                setShowSocialModal(false);
            } else {
                console.log('User is not authenticated');
                alert('You need to be logged in to save roads to collections');
            }
        };

        // Add event listeners
        window.addEventListener('viewCollectionDetails', handleViewCollectionDetails);
        window.addEventListener('editCollection', handleEditCollection);
        window.addEventListener('editRoad', handleEditRoad);
        window.addEventListener('viewRoadDetails', handleViewRoadDetails);
        window.addEventListener('navigateToRoad', handleNavigateToRoad);
        window.addEventListener('viewRoadOnMap', handleViewRoadOnMap);
        window.addEventListener('saveRoadToCollection', handleSaveRoadToCollection);

        // Clean up
        return () => {
            window.removeEventListener('viewCollectionDetails', handleViewCollectionDetails);
            window.removeEventListener('editCollection', handleEditCollection);
            window.removeEventListener('editRoad', handleEditRoad);
            window.removeEventListener('viewRoadDetails', handleViewRoadDetails);
            window.removeEventListener('navigateToRoad', handleNavigateToRoad);
            window.removeEventListener('viewRoadOnMap', handleViewRoadOnMap);
            window.removeEventListener('saveRoadToCollection', handleSaveRoadToCollection);
        };
    }, []);

    // Toggle sidebar collapse
    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="flex h-screen relative">
            {/* Main Sidebar */}
            <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} transition-all duration-300 bg-white shadow-md overflow-y-auto overflow-x-hidden z-20 flex flex-col relative`}>
                {/* Sidebar toggle button removed - using only the "Hide Sidebar" button */}

                {/* Collapsed sidebar content - show icons only */}
                {sidebarCollapsed && (
                    <div className="flex flex-col items-center pt-16 space-y-6">
                        {/* User profile icon */}
                        <button onClick={() => setShowSelfProfileModal(true)} title="My Profile">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-blue-500">
                                {auth.user?.profile_picture_url ? (
                                    <img
                                        src={auth.user.profile_picture_url}
                                        alt={auth.user.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : auth.user ? (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-sm font-medium">
                                        {auth.user.name.charAt(0).toUpperCase()}
                                    </div>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            </div>
                        </button>

                        {/* Search icon */}
                        <button
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                            title="Search"
                            onClick={toggleSidebar}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        {/* Filters icon */}
                        <button
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                            title="Filters"
                            onClick={toggleSidebar}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </button>

                        {/* Saved roads icon */}
                        {auth.user && (
                            <button
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                                title="Saved Roads"
                                onClick={toggleSidebar}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                {/* Expanded sidebar content */}
                <div className={`${sidebarCollapsed ? 'hidden' : 'block'} p-4`}>
                {/* Search bar with dropdown */}
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

                {/* Auth Section - Moved to top */}
                {!auth.user ? (
                    <div className="mb-6 pb-4 border-b">
                        {authMode === 'login' ? (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold">Login</h3>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode('register')}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Create Account
                                    </button>
                                </div>
                                <form onSubmit={handleLogin} className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Email or Username"
                                        value={loginForm.login}
                                        onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={loginForm.password}
                                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    >
                                        Log In
                                    </button>
                                    <div className="text-center mt-2">
                                        <a
                                            href="/forgot-password"
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            Forgot your password?
                                        </a>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold">Create Account</h3>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode('login')}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                                <form onSubmit={handleRegister} className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={registerForm.name}
                                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1 mb-2">This will be your display name and login username</p>
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={registerForm.email}
                                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={registerForm.password}
                                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirm Password"
                                        value={registerForm.password_confirmation}
                                        onChange={(e) => setRegisterForm({ ...registerForm, password_confirmation: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                    >
                                        Register
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                                {auth.user?.profile_picture_url ? (
                                    <img
                                        src={auth.user.profile_picture_url}
                                        alt={auth.user.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-sm font-medium">
                                        {auth.user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">{auth.user.name}</h3>
                                <div className="flex gap-3 mt-1 text-sm">
                                    <button
                                        onClick={() => setShowSelfProfileModal(true)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        My Profile
                                    </button>
                                    <a
                                        href="/settings"
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        Settings
                                    </a>
                                    <button
                                        onClick={handleLogout}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Marker Drop Button */}
                <div className="mb-6">
                    <button
                        onClick={() => {
                            console.log('Setting marker drop mode to:', !markerDropMode);
                            console.log('Map reference exists:', !!mapRef.current);
                            setMarkerDropMode(!markerDropMode);
                        }}
                        className={`w-full p-2 rounded transition-colors mb-4 ${
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
                    {markerRef.current && (
                        <div className="mb-4 p-2 bg-green-100 border border-green-300 rounded text-sm">
                            <p className="font-medium text-green-800">Marker placed at:</p>
                            <p className="text-green-700">
                                Lat: {markerRef.current.getLatLng().lat.toFixed(5)},
                                Lng: {markerRef.current.getLatLng().lng.toFixed(5)}
                            </p>
                        </div>
                    )}
                    {!markerRef.current && !markerDropMode && (
                        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
                            <p className="text-yellow-700">
                                Please drop a marker on the map first to search for roads.
                            </p>
                        </div>
                    )}
                </div>

                {/* Filters Section */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-2">Search Filters</h3>
                    <label className="block mb-1">
                        Search Radius: {radius} {userSettings.measurement_units === 'imperial' ? 'miles' : 'km'}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={radius}
                        onChange={handleRadiusChange}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="w-full mb-4 cursor-pointer blue-range"
                        ref={(el) => {
                            if (el) {
                                // Set the CSS variable for the range progress
                                const percentage = ((radius - 1) / (50 - 1)) * 100;
                                el.style.setProperty('--range-progress', `${percentage}%`);
                            }
                        }}
                    />
                    <label className="block mb-1">Road Type</label>
                    <select
                        value={roadType}
                        onChange={(e) => setRoadType(e.target.value)}
                        className="w-full mb-2 p-2 border rounded"
                    >
                        <option value="all">All Roads</option>
                        <option value="primary">Primary Roads</option>
                        <option value="secondary">Secondary Roads</option>
                    </select>
                    <label className="block mb-1">Curvature Type</label>
                    <select
                        value={curvatureType}
                        onChange={(e) => setCurvatureType(e.target.value)}
                        className="w-full mb-2 p-2 border rounded"
                    >
                        <option value="all">All Curves</option>
                        <option value="curvy">Very Curved</option>
                        <option value="moderate">Moderately Curved</option>
                        <option value="mellow">Mellow</option>
                    </select>
                    <button
                        onClick={searchRoads}
                        disabled={!markerRef.current}
                        className={`w-full p-2 rounded transition-colors ${
                            !markerRef.current
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                    >
                        Search Roads
                    </button>
                    {loading && <p className="text-center text-gray-500 mt-2">Loading roads...</p>}
                </div>

                {/* Saved Roads Section - Only for logged in users */}
                {auth.user && (
                    <div className="mt-4">
                        <div
                            className="flex justify-between items-center cursor-pointer py-2"
                            onClick={() => setIsSavedRoadsExpanded(!isSavedRoadsExpanded)}
                        >
                            <h3 className="font-semibold">Saved Roads</h3>
                            <span className="text-gray-500">
                                {isSavedRoadsExpanded ? '▼' : '▶'}
                            </span>
                        </div>
                        {isSavedRoadsExpanded && (
                            <ul className="mt-2 space-y-4">
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
            </div>

            {/* Map */}
            <div className="flex-1 relative" id="map" style={{ zIndex: 10, pointerEvents: 'auto', position: 'relative', overflow: 'visible' }}>
                {/* Sidebar toggle button - positioned at the top */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent map click event
                        toggleSidebar();
                    }}
                    className="absolute top-4 left-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors font-semibold"
                    style={{
                        zIndex: 2000,
                        border: '2px solid white',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
                </button>

                {/* Community toggle button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent map click event
                        setShowCommunity(!showCommunity);
                    }}
                    className="absolute top-4 right-4 px-4 py-2 bg-purple-500 text-white rounded-lg shadow-lg hover:bg-purple-600 transition-colors font-semibold"
                    style={{
                        zIndex: 2000,
                        border: '2px solid white',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {showCommunity ? 'Hide Community' : 'Show Community'}
                </button>

                {/* Social Hub button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent map click event
                        console.log('Social Hub button clicked');
                        // Explicitly set roadToAddToCollection to null when opening directly
                        setRoadToAddToCollection(null);
                        setShowSocialModal(true);
                    }}
                    className="absolute top-16 right-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition-colors font-semibold"
                    style={{
                        zIndex: 2000,
                        border: '2px solid white',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    Social Hub
                </button>

                {/* Weather Display */}
                <MapWeatherDisplay
                    mapCenter={mapCenter}
                    units={userSettings?.measurement_units === 'imperial' ? 'imperial' : 'metric'}
                />

                {/* POI Controls - positioned below the sidebar toggle button */}
                <div
                    className="absolute top-20 left-4 max-w-[250px]"
                    style={{ zIndex: 2000, pointerEvents: 'auto' }}
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
                    />
                </div>

                {/* POI Details */}
                {selectedPoi && (
                    <div
                        className="absolute top-20 right-4 max-w-md"
                        style={{ zIndex: 1001, pointerEvents: 'auto' }}
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

            {/* Community Sidebar */}
            {showCommunity && (
                <div className="w-96 p-4 bg-white shadow-md overflow-y-auto z-20">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Community Roads</h2>
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
                                            onClick={() => {
                                                console.log('Setting marker drop mode to:', !markerDropMode);
                                                console.log('Map reference exists:', !!mapRef.current);
                                                setMarkerDropMode(!markerDropMode);
                                            }}
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
                                    <option value="short">Short (less than 5km)</option>
                                    <option value="medium">Medium (5-15km)</option>
                                    <option value="long">Long (over 15km)</option>
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
                                            // Don't trigger search here, let the user click the search button
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
                                            onClick={() => handleNavigateClick(road)}
                                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                        >
                                            Navigate
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault(); // Prevent default navigation
                                                e.stopPropagation(); // Prevent event bubbling
                                                handleRateRoad(road.id, e);
                                            }}
                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-md"
                                        >
                                            View Details
                                        </button>
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
                        // Close the social modal if it's open
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
                        console.log('Closing social modal');
                        setShowSocialModal(false);
                        setSelectedCollectionId(null); // Reset collection ID when closing
                        setRoadToAddToCollection(null); // Reset road to add when closing
                    }}
                    selectedCollectionId={selectedCollectionId}
                    roadToAdd={roadToAddToCollection}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onViewRoadDetails={(roadId, e) => {
                        try {
                            console.log("View road details from social modal:", roadId);
                            // Make sure we have the event object
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                            // Pass the event to handleRateRoad
                            handleRateRoad(roadId, e);
                            // Don't close the social modal automatically
                        } catch (error) {
                            console.error("Error viewing road details:", error);
                        }
                    }}
                    onViewRoad={(road) => {
                        if (road && road.road_coordinates) {
                            // Display the road on the map
                            try {
                                const coordinates = Array.isArray(road.road_coordinates)
                                    ? road.road_coordinates.map(coord => [coord.lat, coord.lon])
                                    : JSON.parse(road.road_coordinates);

                                // Clear existing layers
                                roadsLayerRef.current.clearLayers();

                                // Add the new road
                                const polyline = L.polyline(coordinates, {
                                    color: 'blue',
                                    weight: 8
                                }).addTo(roadsLayerRef.current);

                                // Fit map to the road bounds
                                mapRef.current.fitBounds(polyline.getBounds());

                                // Close the social modal after viewing the road
                                setShowSocialModal(false);
                            } catch (error) {
                                console.error("Error displaying road:", error);
                                alert("Could not display this road on the map. Invalid coordinates format.");
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
                        console.log('Closing rating modal');
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
                        console.log('Road added to collection:', collection);
                        setShowSaveToCollectionModal(false);
                        setRoadToAddToCollection(null);
                        alert(`Road added to collection "${collection.name}" successfully!`);
                    }}
                    onCreateNew={(road) => {
                        console.log('Creating new collection with road:', road);
                        // Set the road to add to a collection
                        setRoadToAddToCollection(road);
                        // Open the SocialModal with collections tab
                        setActiveTab('collections');
                        setShowSocialModal(true);
                    }}
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
                                    console.log('Updating road:', editingRoad);

                                    // Get token from localStorage
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                        throw new Error('Authentication token not found');
                                    }

                                    // Update the road
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

                                    console.log('Road update response:', response.data);

                                    // Update the road in the saved roads list
                                    const updatedRoads = savedRoads.map(road =>
                                        road.id === editingRoad.id ? response.data : road
                                    );
                                    setSavedRoads(updatedRoads);

                                    setShowEditModal(false);
                                } catch (error) {
                                    console.error('Error updating road:', error);
                                    alert('Failed to update road. Please try again.');
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
    );
}