import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

export default function Map() {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const radiusCircleRef = useRef(null);
    const roadsLayerRef = useRef(null);
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
    const [selectedRoad, setSelectedRoad] = useState(null); // Selected road for display/edit
    const [editForm, setEditForm] = useState({ road_name: '', description: '', pictures: [] });
    const [selectedRoadId, setSelectedRoadId] = useState(null);

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

        setLoading(true); // Show loading indicator
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
                if (roadLength < 1750) return; // Filter roads by length

                const twistinessData = calculateTwistiness(way.geometry);
                if (twistinessData === 0) return; // Skip if twistiness calculation fails

                // Apply user-selected curvature type filters
                if (curvatureType === "curvy" && twistinessData.twistiness <= 0.007) return;
                if (curvatureType === "moderate" && (twistinessData.twistiness < 0.0035 || twistinessData.twistiness > 0.007)) return;
                if (curvatureType === "mellow" && twistinessData.twistiness > 0.0035) return;

                const coordinates = way.geometry.map(point => [point.lat, point.lon]);
                const name = way.tags.name || "Unnamed Road";

                let color = "green"; 
                if (twistinessData.twistiness > 0.007) color = "red"; // Very Curvy
                else if (twistinessData.twistiness > 0.0035) color = "yellow"; // Moderately Curvy

                const polyline = L.polyline(coordinates, { color, weight: 8 }).addTo(roadsLayerRef.current);

                const popupContent = `
                    <b>${name}</b><br>
                    Length: ${(roadLength / 1000).toFixed(2)} km<br>
                    Corners: ${twistinessData.corner_count}<br>
                    Curve Score: ${twistinessData.twistiness.toFixed(4)}<br>
                    <button id="save-road-${way.id}">Save Road</button>
                `;

                polyline.bindPopup(popupContent);
                polyline.on("popupopen", () => {
                    document.getElementById(`save-road-${way.id}`).addEventListener('click', () => saveRoad({ 
                        name, 
                        coordinates, 
                        twistiness: twistinessData.twistiness, 
                        corner_count: twistinessData.corner_count, 
                        length: roadLength 
                    }));
                });

                newRoads.push({ id: way.id, name, coordinates });
            });

            setRoads(newRoads);
        } catch (error) {
            console.error("Error fetching roads:", error);
        } finally {
            setLoading(false); // Hide loading indicator
        }
    };

    const saveRoad = async (road) => {
        if (!auth.token) {
            alert("Please log in to save roads.");
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
            setSavedRoads([...savedRoads, response.data]); // Add road to saved list
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
                alert("Login successful!");
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
    const RoadItem = ({ road, isSelected, onSelect }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [isExpanded, setIsExpanded] = useState(false);
        const [isDeleting, setIsDeleting] = useState(false);
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

        const handleDelete = async () => {
            try {
                await axios.delete(`/api/saved-roads/${road.id}`, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                
                // Remove road from the list
                setSavedRoads(savedRoads.filter(r => r.id !== road.id));
                
                // Clear the road from the map if it was selected
                if (isSelected) {
                    roadsLayerRef.current.clearLayers();
                    onSelect(null);
                }
            } catch (error) {
                console.error("Error deleting road:", error);
                alert("Failed to delete road.");
            }
        };

        const handleEdit = async (e) => {
            e.preventDefault();
            try {
                const response = await axios.put(
                    `/api/saved-roads/${road.id}`,
                    editData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${auth.token}`
                        }
                    }
                );

                // Update the road in the saved roads list with all fields from response
                const updatedRoad = response.data.road;
                setSavedRoads(prevRoads => 
                    prevRoads.map(r => r.id === road.id ? updatedRoad : r)
                );

                setIsEditing(false);
                alert("Road updated successfully!");
            } catch (error) {
                console.error("Error updating road:", error);
                alert("Failed to update road.");
            }
        };

        const formatLength = (meters) => {
            return (meters / 1000).toFixed(2) + ' km';
        };

        const getTwistinessLabel = (twistiness) => {
            if (twistiness > 0.007) return 'Very Curvy';
            if (twistiness > 0.0035) return 'Moderately Curvy';
            return 'Mellow';
        };

        const handleViewOnMap = () => {
            onSelect(road.id);
            if (mapRef.current && road.road_coordinates) {
                const coordinates = JSON.parse(road.road_coordinates);
                
                // Clear existing layers and add the new road
                roadsLayerRef.current.clearLayers();
                const polyline = L.polyline(coordinates, { 
                    color: isSelected ? '#2563eb' : '#4ade80', // Blue when selected, green otherwise
                    weight: 6,
                    opacity: 0.8
                }).addTo(roadsLayerRef.current);

                // Fit map to the road bounds
                mapRef.current.fitBounds(polyline.getBounds(), {
                    padding: [50, 50] // Add some padding around the bounds
                });
            }
        };

        return (
            <li 
                className={`mb-4 p-4 border rounded-lg transition-colors duration-200 cursor-pointer ${
                    isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={handleViewOnMap}
            >
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <h2 className="text-lg font-semibold">{road.road_name || 'Unnamed Road'}</h2>
                        <div className="mt-1 text-sm text-gray-600 space-y-1">
                            <p>Length: {formatLength(road.length)}</p>
                            <p>Curve Rating: {getTwistinessLabel(road.twistiness)} ({(road.twistiness * 1000).toFixed(2)})</p>
                            <p>Corners: {road.corner_count}</p>
                            {road.description && !isEditing && (
                                <p className="mt-2 text-gray-700">{road.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent list item click
                                setIsExpanded(!isExpanded);
                            }}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                            {isExpanded ? 'Hide Details' : 'Show Details'}
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                {isDeleting && (
                    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
                        <div className="fixed inset-0 bg-black bg-opacity-50"></div>
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 relative">
                            <h3 className="text-lg font-semibold mb-4">Delete Road</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete "{road.road_name || 'Unnamed Road'}"? 
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDeleting(false);
                                    }}
                                    className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete();
                                        setIsDeleting(false);
                                    }}
                                    className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isExpanded && (
                    <div 
                        className="mt-4 border-t pt-4"
                        onClick={(e) => e.stopPropagation()} // Prevent list item click when interacting with form
                    >
                        {!isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700">Description</h3>
                                    <p className="mt-1 text-gray-600">
                                        {road.description || 'No description provided'}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditing(true);
                                        }}
                                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                    >
                                        Edit Details
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsDeleting(true);
                                        }}
                                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                                    >
                                        Delete Road
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => {
                                e.stopPropagation();
                                handleEdit(e);
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        value={editData.road_name}
                                        onChange={(e) => setEditData({ ...editData, road_name: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        rows={3}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditing(false);
                                        }}
                                        className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
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

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-80 p-4 bg-white shadow-md overflow-y-auto">
                {auth.user ? (
                    <div>
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0"></div>
                            <div className="ml-3">
                                <h3 className="font-semibold">{auth.user.name}</h3>
                                <button
                                    onClick={() => window.location.href = '/profile'}
                                    className="text-sm text-blue-600"
                                >
                                    Settings
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-1 mt-2 rounded hover:bg-red-600 transition-colors"
                        >
                            Log Out
                        </button>
                        <h3 className="font-semibold mt-4">Saved Roads</h3>
                        <ul className="mt-2 space-y-4">
                            {savedRoads.map((road) => (
                                <RoadItem 
                                    key={road.id} 
                                    road={road}
                                    isSelected={road.id === selectedRoadId}
                                    onSelect={setSelectedRoadId}
                                />
                            ))}
                        </ul>
                    </div>
                ) : authMode === 'login' ? (
                    <form onSubmit={handleLogin}>
                        <h3 className="font-semibold mb-2">Login</h3>
                        <input
                            type="email"
                            placeholder="Email"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <button type="submit" className="bg-blue-500 text-white w-full p-1">
                            Log In
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthMode('register')}
                            className="text-sm text-blue-600 mt-2"
                        >
                            Don't have an account? Register
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        <h3 className="font-semibold mb-2">Register</h3>
                        <input
                            type="text"
                            placeholder="Name"
                            value={registerForm.name}
                            onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={registerForm.password_confirmation}
                            onChange={(e) => setRegisterForm({ ...registerForm, password_confirmation: e.target.value })}
                            className="w-full mb-2 p-1 border"
                            required
                        />
                        <button type="submit" className="bg-green-500 text-white w-full p-1">
                            Register
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthMode('login')}
                            className="text-sm text-blue-600 mt-2"
                        >
                            Already have an account? Log In
                        </button>
                    </form>
                )}

                <h3 className="font-semibold mt-4 mb-2">Filters</h3>
                <label>Search Radius: {radius} km</label>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={handleRadiusChange}
                    className="w-full mb-4"
                />
                <label>Road Type</label>
                <select
                    value={roadType}
                    onChange={(e) => setRoadType(e.target.value)}
                    className="w-full mb-2"
                >
                    <option value="all">All Roads</option>
                    <option value="primary">Primary Roads</option>
                    <option value="secondary">Secondary Roads</option>
                </select>
                <label>Curvature Type</label>
                <select
                    value={curvatureType}
                    onChange={(e) => setCurvatureType(e.target.value)}
                    className="w-full mb-2"
                >
                    <option value="all">All Curves</option>
                    <option value="curvy">Very Curved</option>
                    <option value="moderate">Moderately Curved</option>
                    <option value="mellow">Mellow</option>
                </select>
                <button onClick={searchRoads} className="bg-green-500 text-white w-full p-1 mt-2">
                    Search Roads
                </button>
                {loading && <p className="text-center text-gray-500 mt-2">Loading roads...</p>}
            </div>

            {/* Map */}
            <div className="flex-1" id="map"></div>
        </div>
    );
}