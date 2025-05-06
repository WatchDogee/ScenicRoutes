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
import { UserSettingsContext } from '../Contexts/UserSettingsContext';
import usePointsOfInterest from '../Hooks/usePointsOfInterest';

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
    // Local state for settings that need to be tracked in this component
    const [localSettings, setLocalSettings] = useState({
        default_search_radius: 10,
        default_search_type: 'town',
        show_community_by_default: false,
    });

    // Initialize auth state from localStorage
    useEffect(() => {
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
                    const response = await axios.get('/api/saved-roads', {
                        headers: { Authorization: `Bearer ${auth.token}` }
                    });
                    setSavedRoads(response.data);
                } catch (error) {
                    console.error('Error loading saved roads:', error);
                    if (error.response?.status === 401) {
                        // If unauthorized, clear auth state
                        localStorage.removeItem('token');
                        delete axios.defaults.headers.common['Authorization'];
                        setAuth({ user: null, token: null });
                    }
                }
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

    const handleRadiusChange = (e) => {
        const newRadius = Number(e.target.value);
        setRadius(newRadius);
        // Also update our persistent radius reference directly
        radiusRef.current = newRadius;
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setRadius(newRadius * 1000);
        }
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

        const map = mapRef.current;
        if (!map) return;

        const latlng = e.latlng;

        // Use the persistent radius reference
        const currentRadius = radiusRef.current;

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
            markerRef.current.setLatLng(latlng);
        } else {
            // Create the marker for the first time
            markerRef.current = L.marker(latlng, {
                icon: markerIconRef.current,
                zIndexOffset: 1000 // Ensure marker stays on top
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
            // First get a CSRF token
            await axios.get('/sanctum/csrf-cookie');

            // Use the form data directly - send as login field to ensure username login works
            const response = await axios.post('/api/login', {
                login: loginForm.login, // Send as login field, not email
                password: loginForm.password
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                withCredentials: true
            });

            if (response.data && response.data.user && response.data.token) {
                const { user, token } = response.data;
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setAuth({ user, token });
                setLoginForm({ login: '', password: '' });

                // Load saved roads immediately after login
                const roadsResponse = await axios.get('/api/saved-roads', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSavedRoads(roadsResponse.data);

                // Stay on the map page, no need to redirect
                alert("Successfully logged in!");
            }
        } catch (error) {
            console.error("Login error:", error.response?.data || error.message);

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
            const response = await axios.get(`/api/saved-roads/${roadId}`, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
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
                alert("Failed to delete road. Please try again.");
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
                                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                    >
                                        Delete
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

        leafletMap.on('click', handleMapClick);

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

        window.addEventListener('viewRoadOnMap', handleViewRoadOnMapEvent);

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

            // Remove the event listener when component unmounts
            window.removeEventListener('viewRoadOnMap', handleViewRoadOnMapEvent);
        };
    }, []); // Empty dependency array to ensure map is initialized only once

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
                    radius
                }
            });

            // Ensure average_rating is properly formatted and user data is present
            const formattedRoads = response.data.map(road => ({
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

            const response = await axios.get('/api/public-roads', {
                params: {
                    lat,
                    lon,
                    radius: searchRadius,
                    length_filter: lengthFilter,
                    curviness_filter: curvinessFilter,
                    min_rating: minRating,
                    sort_by: sortBy
                }
            });

            setPublicRoads(response.data);
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
        const currentRadius = radius;

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
    const handleRateRoad = async (roadId) => {
        if (!auth.user) {
            alert('Please log in to rate roads');
            return;
        }
        try {
            const response = await axios.get(`/api/saved-roads/${roadId}`);
            const road = response.data;
        // Check if user has already reviewed this road
        const existingReview = road.reviews?.find(review => review.user?.id === auth.user.id);
        if (existingReview) {
            setLocalRating(existingReview.rating);
            setLocalComment(existingReview.comment || '');
        } else {
            setLocalRating(0);
            setLocalComment('');
        }
        setSelectedRoadForReview(road);
        setRatingModalOpen(true);
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

    // Log when social modal state changes
    useEffect(() => {
        console.log('Social modal state changed:', showSocialModal);
    }, [showSocialModal]);

    // Toggle sidebar collapse
    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="flex h-screen relative">
            {/* Main Sidebar */}
            <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} transition-all duration-300 bg-white shadow-md overflow-y-auto overflow-x-hidden z-20 flex flex-col relative`}>
                {/* Sidebar toggle button */}
                <button
                    onClick={toggleSidebar}
                    className="absolute top-4 right-2 p-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
                    style={{
                        zIndex: 9999,
                        position: 'absolute !important',
                        display: 'block !important',
                        visibility: 'visible !important',
                        opacity: 1,
                        pointerEvents: 'auto'
                    }}
                >
                    {sidebarCollapsed ? '→' : '←'}
                </button>

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
                        className="w-full mb-4 cursor-pointer"
                        style={{
                            appearance: 'none',
                            height: '8px',
                            borderRadius: '4px',
                            background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
                            outline: 'none'
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
                        className="bg-green-500 text-white w-full p-2 rounded hover:bg-green-600 transition-colors"
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
                        </div>

                        {/* Search Button */}
                        <button
                            onClick={() => handleSearchPublicRoads(null, null)}
                                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                            Search Roads
                            </button>
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
                        {publicRoads.length === 0 ? (
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
                                                    (road.average_rating || road.reviews_avg_rating).toFixed(1) :
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
                                            onClick={() => handleRateRoad(road.id)}
                                            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                        <div className="flex justify-between items-start mb-4">
                            <NavigationAppSelector
                                coordinates={selectedRoad.road_coordinates}
                                roadName={selectedRoad.road_name}
                                onClose={() => {
                                    setSelectedRoad(null);
                                }}
                            />
                            <button
                                onClick={() => {
                                    setSelectedRoad(null);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Social Modal */}
            {showSocialModal && (
                <SocialModal
                    isOpen={showSocialModal}
                    onClose={() => {
                        console.log('Closing social modal');
                        setShowSocialModal(false);
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
            <RatingModal
                isOpen={ratingModalOpen}
                onClose={() => setRatingModalOpen(false)}
                onSubmit={handleSubmitReview}
                road={selectedRoadForReview}
                auth={auth}
                initialRating={localRating}
                initialComment={localComment}
            />

            {/* Self Profile Modal */}
            <SelfProfileModal
                isOpen={showSelfProfileModal}
                onClose={() => setShowSelfProfileModal(false)}
                auth={auth}
            />
        </div>
    );
}