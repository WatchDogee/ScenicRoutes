import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import RatingModal from '../Components/RatingModal';
import NavigationAppSelector from '../Components/NavigationAppSelector';
import { Link } from '@inertiajs/react';

export default function Map() {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const radiusCircleRef = useRef(null);
    const roadsLayerRef = useRef(null);

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
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
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

    const handleRadiusChange = (e) => {
        setRadius(Number(e.target.value));
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setRadius(Number(e.target.value) * 1000);
        }
    };

    const handleMapClick = (e) => {
        const map = mapRef.current;
        if (!map) return;

        const latlng = e.latlng;

        if (markerRef.current) {
            markerRef.current.setLatLng(latlng);
        } else {
            markerRef.current = L.marker(latlng).addTo(map);
        }

        if (radiusCircleRef.current) {
            radiusCircleRef.current.setLatLng(latlng).setRadius(radius * 1000);
        } else {
            radiusCircleRef.current = L.circle(latlng, {
                radius: radius * 1000,
                color: 'blue',
                fillColor: 'blue',
                fillOpacity: 0.05,
            }).addTo(map);
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

                const popupContent = `
                    <div class="road-popup">
                        <h3 class="font-bold">${name}</h3>
                        <p>Length: ${(roadLength / 1000).toFixed(2)} km</p>
                        <p>Corners: ${twistinessData.corner_count}</p>
                        <p>Curve Score: ${twistinessData.twistiness.toFixed(4)}</p>
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
                                length: roadLength 
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
            const response = await axios.post('/api/login', loginForm, {
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
                setLoginForm({ email: '', password: '' });
                
                // Load saved roads immediately after login
                const roadsResponse = await axios.get('/api/saved-roads', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSavedRoads(roadsResponse.data);

                // Redirect to map page if not already there
                if (window.location.pathname !== '/map') {
                    window.location.href = '/map';
                }
            }
        } catch (error) {
            console.error("Login error:", error.response?.data || error.message);
            alert(error.response?.data?.message || "Failed to log in.");
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

            alert("Registration successful! Please log in.");
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

        // Update editData when road prop changes
        useEffect(() => {
            setEditData({
                road_name: road.road_name || '',
                description: road.description || ''
            });
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
            return (meters / 1000).toFixed(2) + ' km';
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
            setShowNavigationSelector(true);
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
                        </div>
                        
                        {!isEditing ? (
                            <div className="mt-3 space-y-3">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700">Description</h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {road.description || 'No description provided'}
                                    </p>
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

                {showNavigationSelector && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                            <div className="flex justify-between items-start mb-4">
                                <NavigationAppSelector 
                                    coordinates={JSON.parse(road.road_coordinates)}
                                    roadName={road.road_name}
                                />
                                <button 
                                    onClick={() => {
                                        setShowNavigationSelector(false);
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
            </li>
        );
    };

    useEffect(() => {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        const leafletMap = L.map(mapContainer).setView([57.1, 27.1], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
            updateWhenIdle: false,
            updateWhenZooming: false,
            updateInterval: 250,
        }).addTo(leafletMap);

        // Force a resize event after map initialization
        setTimeout(() => {
            leafletMap.invalidateSize();
        }, 100);

        leafletMap.on('click', handleMapClick);
        mapRef.current = leafletMap;

        const newLayerGroup = L.layerGroup().addTo(leafletMap);
        roadsLayerRef.current = newLayerGroup;

        return () => {
            leafletMap.off();
            leafletMap.remove();
            mapRef.current = null;
            markerRef.current = null;
            radiusCircleRef.current = null;
            roadsLayerRef.current = null;
        };
    }, []);

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
            // Don't show error popup for background refreshes
            if (!isSubmitting) {
                setSearchError('Failed to fetch public roads. Please try again.');
            }
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
        updateMapLocation(location);
    };

    const handleCommunityLocationSelect = (location) => {
        setCommunitySearchQuery(location.displayName);
        setCommunitySearchResults([]); // Clear results immediately
        updateMapLocation(location);
        if (showCommunity) {
            handleSearchPublicRoads(location.lat, location.lon);
            }
        };

    // Helper function to update map location
    const updateMapLocation = (location) => {
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);

        if (mapRef.current) {
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lon]);
            } else {
                markerRef.current = L.marker([lat, lon]).addTo(mapRef.current);
            }

            if (radiusCircleRef.current) {
                radiusCircleRef.current.setLatLng([lat, lon]);
            } else {
                radiusCircleRef.current = L.circle([lat, lon], {
                    radius: radius * 1000,
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.05,
                }).addTo(mapRef.current);
            }

            mapRef.current.setView([lat, lon], 13);
            }
    };

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

    const handleNavigateClick = (road) => {
        if (!road.road_coordinates) {
            alert('No coordinates available for this road');
            return;
        }
        setSelectedRoad(road);
        setShowNavigationSelector(true);
    };

    return (
        <div className="flex h-screen relative">
            {/* Main Sidebar */}
            <div className="w-80 p-4 bg-white shadow-md overflow-y-auto z-20 flex flex-col">
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
                                        type="email"
                                        placeholder="Email"
                                        value={loginForm.email}
                                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
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
                                        placeholder="Name"
                                        value={registerForm.name}
                                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
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
                                    <Link
                                        href={route('settings')}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        Settings
                                    </Link>
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
                    <label className="block mb-1">Search Radius: {radius} km</label>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={radius}
                        onChange={handleRadiusChange}
                        className="w-full mb-4"
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

            {/* Map */}
            <div className="flex-1 relative" id="map" style={{ zIndex: 10 }}>
                <button
                    onClick={() => setShowCommunity(!showCommunity)}
                    className="absolute top-4 right-4 px-4 py-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                    style={{ zIndex: 1000 }}
                >
                    {showCommunity ? 'Hide Community' : 'Show Community'}
                </button>
            </div>

            {/* Community Sidebar */}
            {showCommunity && (
                <div className="w-96 p-4 bg-white shadow-md overflow-y-auto z-20">
                    <h2 className="text-xl font-bold mb-4">Community Roads</h2>
                    
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
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                            key={star}
                                            onClick={() => setMinRating(star)}
                                            className={`text-2xl ${
                                                star <= minRating ? 'text-yellow-400' : 'text-gray-300'
                                            } hover:text-yellow-400 transition-colors`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
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
                                            {road.user?.profile_picture ? (
                                                <img 
                                                    src={road.user.profile_picture} 
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
                                            <p>Length: {(road.length / 1000).toFixed(2)} km</p>
                                            <p>Corners: {road.corner_count}</p>
                                            <p>Curve Rating: {getTwistinessLabel(road.twistiness)}</p>
                                        </div>
                                        <div className="text-sm text-right">
                                            <p className="flex items-center justify-end">
                                                <span className="text-yellow-400 mr-1">★</span>
                                                {typeof road.average_rating === 'number' ? 
                                                    road.average_rating.toFixed(1) : 
                                                    'No ratings'
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
            )}

            {/* Rating Modal */}
            <RatingModal
                isOpen={ratingModalOpen}
                onClose={handleCloseRatingModal}
                onSubmit={handleSubmitReview}
                road={selectedRoadForReview}
                auth={auth}
                initialRating={localRating}
                initialComment={localComment}
            />

            {/* Navigation App Selector Modal */}
            {showNavigationSelector && selectedRoad && (
                            <NavigationAppSelector 
                    isOpen={showNavigationSelector}
                    onClose={() => setShowNavigationSelector(false)}
                    coordinates={selectedRoad.road_coordinates}
                />
            )}
        </div>
    );
}